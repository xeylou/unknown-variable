import { EmbedBuilder, type Client, type SendableChannels } from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';
import { createLogger } from '../../utils/logger';
import { getConfig, setConfig } from '../../utils/configCache';
import { noMentions } from '../../utils/mentions';
import { ghGet } from './api';
import { runIcon } from './format';
import type { ApiPull, ApiRelease, ApiRun } from './normalize';
import type { RepoState } from './types';

const log = createLogger('github:digest');

const TICK_MS = 10 * 60_000;

// Clés guild_config utilisées par le digest.
const K_CHANNEL = 'github_digest_channel';
const K_FREQ = 'github_digest_freq'; // 'daily' | 'weekly'
const K_HOUR = 'github_digest_hour';
const K_LAST = 'github_digest_last';

let clientRef: Client<true> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

/** Vrai s'il est l'heure de publier le digest pour cette guilde. */
function isDue(freq: string, hour: number, lastMs: number, now: number): boolean {
  const d = new Date(now);
  if (d.getHours() !== hour) return false;
  if (freq === 'weekly') {
    if (d.getDay() !== 1) return false; // lundi
    if (lastMs && now - lastMs < 6 * 24 * 3_600_000) return false;
  } else {
    if (lastMs && now - lastMs < 20 * 3_600_000) return false;
  }
  return true;
}

function stateOf(stateJson: string | null): RepoState {
  if (!stateJson) return {};
  try { return JSON.parse(stateJson) as RepoState; }
  catch { return {}; }
}

/** Construit la ligne de récap d'un dépôt sur la période. */
async function repoSummary(owner: string, repo: string, branch: string, sinceIso: string): Promise<string> {
  const commits = await ghGet<unknown[]>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${sinceIso}&per_page=100`);
  const commitCount = commits.data?.length ?? 0;

  const pulls = await ghGet<ApiPull[]>(`/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`);
  const sinceMs = Date.parse(sinceIso);
  const merged = (pulls.data ?? []).filter((p) => p.merged_at && Date.parse(p.merged_at) >= sinceMs).length;

  const releases = await ghGet<ApiRelease[]>(`/repos/${owner}/${repo}/releases?per_page=20`);
  const newReleases = (releases.data ?? []).filter((r) => !r.draft).slice(0, 5)
    .filter((r) => {
      const pub = (r as ApiRelease & { published_at?: string }).published_at;
      return pub ? Date.parse(pub) >= sinceMs : false;
    }).length;

  const runs = await ghGet<{ workflow_runs?: ApiRun[] }>(`/repos/${owner}/${repo}/actions/runs?per_page=1`);
  const topRun = runs.data?.workflow_runs?.[0];
  const ci = topRun ? runIcon(topRun.status, topRun.conclusion) : '—';

  return `**[${owner}/${repo}](https://github.com/${owner}/${repo})** — ` +
    `${commitCount} commit(s) · ${merged} PR fusionnée(s) · ${newReleases} release(s) · CI ${ci}`;
}

async function runForGuild(client: Client<true>, guildId: string): Promise<void> {
  const channelId = await getConfig(guildId, K_CHANNEL);
  if (!channelId) return;
  const freq = (await getConfig(guildId, K_FREQ)) ?? 'daily';
  const hour = Number((await getConfig(guildId, K_HOUR)) ?? '9');
  const lastMs = Number((await getConfig(guildId, K_LAST)) ?? '0');
  const now = Date.now();
  if (!isDue(freq, hour, lastMs, now)) return;

  const repos = await prisma.github_repos.findMany({ where: { guild_id: guildId } });
  if (!repos.length) { await setConfig(guildId, K_LAST, now); return; }

  const periodMs = freq === 'weekly' ? 7 * 24 * 3_600_000 : 24 * 3_600_000;
  const sinceIso = new Date(now - periodMs).toISOString();

  // Dédoublonne les dépôts (plusieurs abonnements peuvent viser le même repo).
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of repos) {
    const k = `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const branch = stateOf(r.state).defaultBranch ?? 'main';
    lines.push(await repoSummary(r.owner, r.repo, branch, sinceIso).catch(() => `**${r.owner}/${r.repo}** — indisponible`));
  }

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || !ch.isSendable()) { await setConfig(guildId, K_LAST, now); return; }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`📊 Digest ${freq === 'weekly' ? 'hebdomadaire' : 'quotidien'} — activité GitHub`)
    .setDescription(lines.join('\n') || 'Aucune activité.')
    .setTimestamp(new Date());
  await (ch as SendableChannels).send({ embeds: [embed], allowedMentions: noMentions }).catch(() => {});
  await setConfig(guildId, K_LAST, now);
  log.info(`digest publié pour la guilde ${guildId}`);
}

async function tick(): Promise<void> {
  if (!clientRef) return;
  for (const guild of clientRef.guilds.cache.values()) {
    await runForGuild(clientRef, guild.id).catch((e) => log.warn('digest guilde échoué', e));
  }
}

/** Démarre le scheduler de digest (nécessite un token pour agréger via l'API). */
export function start(client: Client<true>): void {
  if (!config.github.token) return; // l'agrégation passe par l'API GitHub
  clientRef = client;
  timer = setInterval(() => { tick().catch((e) => log.error(e)); }, TICK_MS);
  timer.unref();
}

export function stop(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
