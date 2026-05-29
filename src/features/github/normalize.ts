import { slug, dedupKey, branchFromRef, canonicalPrAction } from './format';
import type { CanonicalEvent, CommitInfo } from './types';

/**
 * Normalisation des données brutes (webhook OU polling) vers `CanonicalEvent[]`.
 *
 * Règle d'or : pour un même événement réel, les deux transports DOIVENT produire
 * les mêmes clés de dédup. Voir les `dedupKey(...)` ci-dessous — ils sont alignés
 * entre `fromWebhook` et les `fromPoll*`.
 */

// --- Formes brutes minimales (champs réellement lus, tout optionnel) ---

interface GhUser { login?: string; name?: string }
interface GhCommitWebhook {
  id?: string;
  message?: string;
  url?: string;
  author?: { username?: string; name?: string };
}
interface GhWebhookPayload {
  ref?: string;
  action?: string;
  compare?: string;
  commits?: GhCommitWebhook[];
  head_commit?: GhCommitWebhook | null;
  pusher?: { name?: string };
  repository?: { owner?: GhUser; name?: string; full_name?: string };
  pull_request?: {
    number?: number; title?: string; html_url?: string; merged?: boolean;
    state?: string; user?: GhUser; head?: { ref?: string }; base?: { ref?: string };
  };
  workflow_run?: {
    id?: number; name?: string; status?: string; conclusion?: string | null;
    head_branch?: string; html_url?: string; run_attempt?: number; head_sha?: string;
    actor?: GhUser; run_started_at?: string; updated_at?: string;
    head_commit?: { message?: string };
  };
  release?: {
    id?: number; tag_name?: string; name?: string | null; html_url?: string;
    author?: GhUser; body?: string | null; prerelease?: boolean; draft?: boolean;
  };
  issue?: { number?: number; title?: string; html_url?: string; user?: GhUser };
  review?: { id?: number; state?: string; html_url?: string; user?: GhUser };
}

function ownerRepo(p: GhWebhookPayload): { owner: string; repo: string } | null {
  const owner = p.repository?.owner?.login ?? p.repository?.owner?.name;
  const repo = p.repository?.name;
  if (!owner || !repo) return null;
  return { owner, repo };
}

function toCommitInfo(c: GhCommitWebhook): CommitInfo | null {
  if (!c.id) return null;
  return {
    sha: c.id,
    message: c.message ?? '',
    url: c.url ?? '',
    authorLogin: c.author?.username || undefined,
    authorName: c.author?.name ?? 'inconnu'
  };
}

/** Convertit une livraison webhook en événements canoniques. */
export function fromWebhook(event: string, payload: GhWebhookPayload): CanonicalEvent[] {
  const or = ownerRepo(payload);
  if (!or) return [];
  const s = slug(or.owner, or.repo);

  switch (event) {
    case 'push': {
      // Seuls les pushes de branche (refs/heads/*) — on ignore les tags ici.
      if (!payload.ref?.startsWith('refs/heads/')) return [];
      const commits = (payload.commits ?? [])
        .map(toCommitInfo)
        .filter((c): c is CommitInfo => c !== null);
      if (!commits.length) return [];
      return [{
        data: {
          kind: 'push',
          branch: branchFromRef(payload.ref),
          commits,
          compareUrl: payload.compare,
          pusher: payload.pusher?.name ?? 'inconnu'
        },
        keys: commits.map((c) => dedupKey(s, 'commit', c.sha))
      }];
    }

    case 'pull_request': {
      const pr = payload.pull_request;
      if (!pr?.number) return [];
      const action = canonicalPrAction({ webhookAction: payload.action, merged: pr.merged });
      if (!action) return [];
      return [{
        data: {
          kind: 'pull_request',
          action,
          number: pr.number,
          title: pr.title ?? '',
          url: pr.html_url ?? '',
          authorLogin: pr.user?.login,
          branchFrom: pr.head?.ref,
          branchTo: pr.base?.ref,
          merged: pr.merged
        },
        keys: [dedupKey(s, 'pr', pr.number, action)]
      }];
    }

    case 'workflow_run': {
      const r = payload.workflow_run;
      // On n'annonce que les runs terminés (pas le bruit queued/in_progress).
      if (!r?.id || r.status !== 'completed') return [];
      const startedAt = r.run_started_at;
      const endedAt = r.updated_at;
      const durationMs = startedAt && endedAt ? Date.parse(endedAt) - Date.parse(startedAt) : undefined;
      return [{
        data: {
          kind: 'workflow_run',
          name: r.name ?? 'workflow',
          status: r.status ?? 'completed',
          conclusion: r.conclusion ?? null,
          branch: r.head_branch ?? '',
          url: r.html_url ?? '',
          actorLogin: r.actor?.login,
          headSha: r.head_sha ?? '',
          headCommitMessage: r.head_commit?.message,
          runAttempt: r.run_attempt ?? 1,
          runId: r.id,
          durationMs: durationMs && durationMs > 0 ? durationMs : undefined
        },
        keys: [dedupKey(s, 'workflow_run', r.id, r.run_attempt ?? 1)],
        important: r.conclusion === 'failure' || r.conclusion === 'timed_out'
      }];
    }

    case 'release': {
      const rel = payload.release;
      if (!rel?.id || payload.action !== 'published' || rel.draft) return [];
      return [{
        data: {
          kind: 'release',
          id: rel.id,
          tag: rel.tag_name ?? '',
          name: rel.name ?? undefined,
          url: rel.html_url ?? '',
          authorLogin: rel.author?.login,
          body: rel.body ?? undefined,
          prerelease: rel.prerelease
        },
        keys: [dedupKey(s, 'release', rel.id)]
      }];
    }

    case 'issues': {
      const iss = payload.issue;
      const action = payload.action;
      if (!iss?.number || !action || !['opened', 'closed', 'reopened'].includes(action)) return [];
      return [{
        data: {
          kind: 'issues',
          action,
          number: iss.number,
          title: iss.title ?? '',
          url: iss.html_url ?? '',
          authorLogin: iss.user?.login
        },
        keys: [dedupKey(s, 'issue', iss.number, action)]
      }];
    }

    case 'pull_request_review': {
      const rev = payload.review;
      const pr = payload.pull_request;
      if (payload.action !== 'submitted' || !rev?.id || !pr?.number) return [];
      const state = (rev.state ?? '').toLowerCase();
      // On ignore les simples « commented » (trop bruyant).
      if (state !== 'approved' && state !== 'changes_requested') return [];
      return [{
        data: {
          kind: 'review',
          state,
          prNumber: pr.number,
          prTitle: pr.title ?? '',
          url: rev.html_url ?? '',
          reviewerLogin: rev.user?.login
        },
        keys: [dedupKey(s, 'review', pr.number, rev.id)]
      }];
    }

    default:
      return [];
  }
}

// --- Polling : formes API REST minimales ---

export interface ApiCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { name?: string } };
  author?: { login?: string } | null;
}
export interface ApiRun {
  id: number; name: string; status: string; conclusion: string | null;
  head_branch: string; html_url: string; run_attempt: number; head_sha: string;
  actor?: { login?: string }; run_started_at?: string; updated_at?: string;
  head_commit?: { message?: string };
}
export interface ApiPull {
  number: number; title: string; html_url: string; state: string;
  merged_at: string | null; user?: { login?: string };
  head?: { ref?: string }; base?: { ref?: string }; updated_at: string;
}
export interface ApiRelease {
  id: number; tag_name: string; name: string | null; html_url: string;
  author?: { login?: string }; body: string | null; prerelease: boolean; draft: boolean;
}
export interface ApiIssue {
  number: number; title: string; html_url: string; state: string;
  user?: { login?: string }; updated_at: string; pull_request?: unknown;
}

/** Commits depuis l'API (newest first) → un event push groupé des nouveaux commits. */
export function fromPollCommits(
  owner: string, repo: string, branch: string, commits: ApiCommit[], lastSha?: string
): { events: CanonicalEvent[]; newSha?: string } {
  if (!commits.length) return { events: [] };
  const newSha = commits[0].sha;
  // Garde les commits jusqu'au dernier déjà vu (exclu).
  const fresh: ApiCommit[] = [];
  for (const c of commits) {
    if (lastSha && c.sha === lastSha) break;
    fresh.push(c);
  }
  if (!fresh.length) return { events: [], newSha };
  const s = slug(owner, repo);
  const infos: CommitInfo[] = fresh.reverse().map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    url: c.html_url,
    authorLogin: c.author?.login || undefined,
    authorName: c.commit.author?.name ?? 'inconnu'
  }));
  return {
    events: [{
      data: { kind: 'push', branch, commits: infos, pusher: infos[infos.length - 1].authorName },
      keys: infos.map((c) => dedupKey(s, 'commit', c.sha))
    }],
    newSha
  };
}

/** Runs Actions depuis l'API → events workflow_run (terminés, id > curseur). */
export function fromPollRuns(
  owner: string, repo: string, runs: ApiRun[], cursor?: number
): { events: CanonicalEvent[]; newCursor?: number } {
  const s = slug(owner, repo);
  const events: CanonicalEvent[] = [];
  let max = cursor ?? 0;
  for (const r of runs) {
    if (r.id > max) max = r.id;
    if (cursor !== undefined && r.id <= cursor) continue;
    if (r.status !== 'completed') continue;
    const durationMs = r.run_started_at && r.updated_at
      ? Date.parse(r.updated_at) - Date.parse(r.run_started_at) : undefined;
    events.push({
      data: {
        kind: 'workflow_run', name: r.name, status: r.status, conclusion: r.conclusion,
        branch: r.head_branch, url: r.html_url, actorLogin: r.actor?.login,
        headSha: r.head_sha, headCommitMessage: r.head_commit?.message,
        runAttempt: r.run_attempt, runId: r.id,
        durationMs: durationMs && durationMs > 0 ? durationMs : undefined
      },
      keys: [dedupKey(s, 'workflow_run', r.id, r.run_attempt)],
      important: r.conclusion === 'failure' || r.conclusion === 'timed_out'
    });
  }
  return { events, newCursor: max || undefined };
}

/** PR depuis l'API (updated desc) → events pour les PR modifiées depuis le curseur. */
export function fromPollPulls(
  owner: string, repo: string, pulls: ApiPull[], cursor?: number
): { events: CanonicalEvent[]; newCursor?: number } {
  const s = slug(owner, repo);
  const events: CanonicalEvent[] = [];
  let max = cursor ?? 0;
  for (const p of pulls) {
    const ts = Date.parse(p.updated_at);
    if (ts > max) max = ts;
    if (cursor !== undefined && ts <= cursor) continue;
    const action = canonicalPrAction({ state: p.state, merged: !!p.merged_at });
    if (!action) continue;
    events.push({
      data: {
        kind: 'pull_request', action, number: p.number, title: p.title, url: p.html_url,
        authorLogin: p.user?.login, branchFrom: p.head?.ref, branchTo: p.base?.ref,
        merged: !!p.merged_at
      },
      keys: [dedupKey(s, 'pr', p.number, action)]
    });
  }
  return { events, newCursor: max || undefined };
}

/** Releases depuis l'API → events pour les nouvelles releases (id > curseur). */
export function fromPollReleases(
  owner: string, repo: string, releases: ApiRelease[], cursor?: number
): { events: CanonicalEvent[]; newCursor?: number } {
  const s = slug(owner, repo);
  const events: CanonicalEvent[] = [];
  let max = cursor ?? 0;
  for (const r of releases) {
    if (r.id > max) max = r.id;
    if (r.draft) continue;
    if (cursor !== undefined && r.id <= cursor) continue;
    events.push({
      data: {
        kind: 'release', id: r.id, tag: r.tag_name, name: r.name ?? undefined,
        url: r.html_url, authorLogin: r.author?.login, body: r.body ?? undefined,
        prerelease: r.prerelease
      },
      keys: [dedupKey(s, 'release', r.id)]
    });
  }
  return { events, newCursor: max || undefined };
}

/** Issues depuis l'API (updated desc) → events (en filtrant les PR). */
export function fromPollIssues(
  owner: string, repo: string, issues: ApiIssue[], cursor?: number
): { events: CanonicalEvent[]; newCursor?: number } {
  const s = slug(owner, repo);
  const events: CanonicalEvent[] = [];
  let max = cursor ?? 0;
  for (const i of issues) {
    if (i.pull_request) continue; // l'endpoint /issues inclut les PR
    const ts = Date.parse(i.updated_at);
    if (ts > max) max = ts;
    if (cursor !== undefined && ts <= cursor) continue;
    const action = i.state === 'closed' ? 'closed' : 'opened';
    events.push({
      data: {
        kind: 'issues', action, number: i.number, title: i.title,
        url: i.html_url, authorLogin: i.user?.login
      },
      keys: [dedupKey(s, 'issue', i.number, action)]
    });
  }
  return { events, newCursor: max || undefined };
}
