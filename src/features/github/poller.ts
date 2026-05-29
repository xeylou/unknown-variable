import { type Client } from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { createLogger } from '../../utils/logger';
import { ghGet } from './api';
import { announce } from './announce';
import {
  fromPollCommits, fromPollRuns, fromPollPulls, fromPollReleases, fromPollIssues,
  type ApiCommit, type ApiRun, type ApiPull, type ApiRelease, type ApiIssue
} from './normalize';
import type { github_repos as RepoRow } from '@prisma/client';
import type { CanonicalEvent, RepoState } from './types';

const log = createLogger('github:poller');

const PARALLEL = 3;

let clientRef: Client<true> | null = null;
let polling = false;
let timer: ReturnType<typeof setInterval> | null = null;

function readState(row: RepoRow): RepoState {
  if (!row.state) return {};
  try { return JSON.parse(row.state) as RepoState; }
  catch { return {}; }
}

async function saveState(id: number, state: RepoState): Promise<void> {
  await prisma.github_repos.update({ where: { id }, data: { state: JSON.stringify(state) } }).catch(() => {});
}

/** Pool d'`await` parallèles bornés (calqué sur notifications.ts). */
async function runPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = items.slice();
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      try { await worker(item); }
      catch (e) { log.warn('worker error', e); }
    }
  });
  await Promise.all(workers);
}

/**
 * Premier passage : enregistre les curseurs courants SANS annoncer (évite le
 * flood de tout l'historique au branchement). Calque l'`isFirstCheck` de
 * notifications.ts.
 */
async function prime(row: RepoRow, state: RepoState): Promise<void> {
  const { owner, repo } = row;

  const meta = await ghGet<{ default_branch?: string }>(`/repos/${owner}/${repo}`);
  const branch = meta.data?.default_branch ?? 'main';
  state.defaultBranch = branch;

  const commits = await ghGet<ApiCommit[]>(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`);
  if (commits.data?.length) state.lastCommitSha = commits.data[0].sha;
  if (commits.etag) state.commitEtag = commits.etag;

  const runs = await ghGet<{ workflow_runs?: ApiRun[] }>(`/repos/${owner}/${repo}/actions/runs?per_page=1`);
  const topRun = runs.data?.workflow_runs?.[0];
  if (topRun) state.runsCursor = topRun.id;
  if (runs.etag) state.runsEtag = runs.etag;

  const pulls = await ghGet<ApiPull[]>(`/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=1`);
  if (pulls.data?.length) state.pullsCursor = Date.parse(pulls.data[0].updated_at);
  if (pulls.etag) state.pullsEtag = pulls.etag;

  const releases = await ghGet<ApiRelease[]>(`/repos/${owner}/${repo}/releases?per_page=1`);
  if (releases.data?.length) state.releasesCursor = releases.data[0].id;
  if (releases.etag) state.releasesEtag = releases.etag;

  const issues = await ghGet<ApiIssue[]>(`/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc&per_page=1`);
  const topIssue = issues.data?.find((i) => !i.pull_request);
  if (topIssue) state.issuesCursor = Date.parse(topIssue.updated_at);
  if (issues.etag) state.issuesEtag = issues.etag;

  state.primed = true;
  await saveState(row.id, state);
  log.info(`dépôt #${row.id} ${owner}/${repo} amorcé (branche par défaut: ${branch})`);
}

async function emitAll(row: RepoRow, events: CanonicalEvent[]): Promise<void> {
  if (!clientRef) return;
  for (const ev of events) {
    await announce(clientRef, row, ev).catch((e) => log.warn('announce échoué', e));
  }
}

/** Cycle de polling normal d'un dépôt déjà amorcé. */
async function pollRepo(row: RepoRow): Promise<void> {
  const state = readState(row);
  if (!state.primed) { await prime(row, state); return; }

  const { owner, repo } = row;
  const branch = state.defaultBranch ?? 'main';

  // --- Commits (branche par défaut) ---
  const commits = await ghGet<ApiCommit[]>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=20`, state.commitEtag);
  if (!commits.notModified && commits.data) {
    const { events, newSha } = fromPollCommits(owner, repo, branch, commits.data, state.lastCommitSha);
    await emitAll(row, events);
    if (newSha) state.lastCommitSha = newSha;
    state.commitEtag = commits.etag ?? state.commitEtag;
  }

  // --- Runs CI/CD ---
  const runs = await ghGet<{ workflow_runs?: ApiRun[] }>(`/repos/${owner}/${repo}/actions/runs?per_page=20`, state.runsEtag);
  if (!runs.notModified && runs.data?.workflow_runs) {
    const { events, newCursor } = fromPollRuns(owner, repo, runs.data.workflow_runs, state.runsCursor);
    await emitAll(row, events);
    if (newCursor) state.runsCursor = newCursor;
    state.runsEtag = runs.etag ?? state.runsEtag;
  }

  // --- Pull requests ---
  const pulls = await ghGet<ApiPull[]>(
    `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=20`, state.pullsEtag);
  if (!pulls.notModified && pulls.data) {
    const { events, newCursor } = fromPollPulls(owner, repo, pulls.data, state.pullsCursor);
    await emitAll(row, events);
    if (newCursor) state.pullsCursor = newCursor;
    state.pullsEtag = pulls.etag ?? state.pullsEtag;
  }

  // --- Releases ---
  const releases = await ghGet<ApiRelease[]>(`/repos/${owner}/${repo}/releases?per_page=10`, state.releasesEtag);
  if (!releases.notModified && releases.data) {
    const { events, newCursor } = fromPollReleases(owner, repo, releases.data, state.releasesCursor);
    await emitAll(row, events);
    if (newCursor) state.releasesCursor = newCursor;
    state.releasesEtag = releases.etag ?? state.releasesEtag;
  }

  // --- Issues ---
  const issues = await ghGet<ApiIssue[]>(
    `/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc&per_page=20`, state.issuesEtag);
  if (!issues.notModified && issues.data) {
    const { events, newCursor } = fromPollIssues(owner, repo, issues.data, state.issuesCursor);
    await emitAll(row, events);
    if (newCursor) state.issuesCursor = newCursor;
    state.issuesEtag = issues.etag ?? state.issuesEtag;
  }

  await saveState(row.id, state);
}

async function poll(): Promise<void> {
  if (polling) { log.debug('poll ignoré — cycle précédent en cours'); return; }
  polling = true;
  try {
    const rows = await prisma.github_repos.findMany();
    await runPool(rows, PARALLEL, pollRepo);
  } finally {
    polling = false;
  }
}

/**
 * Démarre le polling si `GITHUB_TOKEN` est défini. Intervalle adaptatif : court
 * (primaire) sans webhooks, long (réconciliation) si les webhooks sont actifs.
 */
export function start(client: Client<true>): void {
  if (!config.github.token) return;
  clientRef = client;
  const intervalMs = config.github.webhookSecret ? 10 * 60_000 : 2 * 60_000;
  timer = setInterval(() => { poll().catch((e) => log.error(e)); }, intervalMs);
  timer.unref();
  setTimeout(() => { poll().catch((e) => log.error(e)); }, 15_000).unref();
  log.info(`polling GitHub actif (intervalle ${intervalMs / 60_000} min)`);
}

/** Stoppe la boucle de polling (arrêt du bot). */
export function stop(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
