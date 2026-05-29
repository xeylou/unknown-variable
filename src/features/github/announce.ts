import { type Client, type SendableChannels } from 'discord.js';
import { prisma } from '../../database';
import { createLogger } from '../../utils/logger';
import { noMentions } from '../../utils/mentions';
import { renderEvent, pipelineStatusEmbed, type MentionResolver } from './embeds';
import { dedupKey, slug } from './format';
import type { github_repos as RepoRow } from '@prisma/client';
import type { CanonicalEvent, CommitInfo, PushData, WorkflowRunData } from './types';

const log = createLogger('github:announce');

// --- Cache des liaisons GitHub↔Discord par guilde (TTL court) ---
const linkCache = new Map<string, { map: Map<string, string>; expiresAt: number }>();
const LINK_TTL = 60_000;

async function mentionResolver(guildId: string): Promise<MentionResolver> {
  const hit = linkCache.get(guildId);
  let map: Map<string, string>;
  if (hit && hit.expiresAt > Date.now()) {
    map = hit.map;
  } else {
    const links = await prisma.github_links.findMany({ where: { guild_id: guildId } }).catch(() => []);
    map = new Map(links.map((l) => [l.github_login.toLowerCase(), l.user_id]));
    linkCache.set(guildId, { map, expiresAt: Date.now() + LINK_TTL });
  }
  return (login?: string) => {
    if (!login) return '';
    const id = map.get(login.toLowerCase());
    return id ? `<@${id}>` : '';
  };
}

/** Invalide le cache des liaisons d'une guilde (appelé après /gitlink). */
export function invalidateLinks(guildId: string): void {
  linkCache.delete(guildId);
}

/** Abonnements correspondant à un dépôt (comparaison insensible à la casse). */
export async function findReposBySlug(owner: string, repo: string): Promise<RepoRow[]> {
  const all = await prisma.github_repos.findMany().catch(() => [] as RepoRow[]);
  const o = owner.toLowerCase();
  const r = repo.toLowerCase();
  return all.filter((row) => row.owner.toLowerCase() === o && row.repo.toLowerCase() === r);
}

async function fetchSendable(client: Client<true>, id: string): Promise<SendableChannels | null> {
  const ch = await client.channels.fetch(id).catch(() => null);
  return ch && ch.isSendable() ? ch : null;
}

/** Insère une clé de dédup ; renvoie `true` si elle est NEUVE (jamais annoncée). */
async function markSeenIfNew(key: string): Promise<boolean> {
  try {
    await prisma.github_seen.create({ data: { key, seen_at: Date.now() } });
    return true;
  } catch {
    return false; // contrainte d'unicité → déjà vu (webhook ou polling l'a déjà traité)
  }
}

/** Liste des types d'events activés pour ce dépôt, ou `null` = tous. */
function enabledKinds(row: RepoRow): Set<string> | null {
  if (!row.events) return null;
  try {
    const arr = JSON.parse(row.events) as string[];
    return Array.isArray(arr) && arr.length ? new Set(arr) : null;
  } catch { return null; }
}

/** Branches suivies pour le push, ou `null` = toutes. */
function watchedBranches(row: RepoRow): Set<string> | null {
  if (!row.branches) return null;
  try {
    const arr = JSON.parse(row.branches) as string[];
    return Array.isArray(arr) && arr.length ? new Set(arr) : null;
  } catch { return null; }
}

/**
 * Préfixe une clé de dédup par l'id de l'abonnement : deux dépôts suivis vers
 * des salons différents dédupliquent indépendamment, tout en gardant des clés
 * identiques entre webhook et polling (qui itèrent sur les mêmes lignes).
 */
function rowKey(row: RepoRow, key: string): string {
  return `${row.id}:${key}`;
}

/**
 * Point d'entrée unique d'annonce. Déduplique via `github_seen`, applique le
 * filtre d'events, route vers le salon, ping le rôle sur échec CI, met à jour le
 * message « statut pipeline » live. Appelé indifféremment par le webhook et le poller.
 */
export async function announce(client: Client<true>, row: RepoRow, ev: CanonicalEvent): Promise<void> {
  const kinds = enabledKinds(row);
  if (kinds && !kinds.has(ev.data.kind)) return;

  if (ev.data.kind === 'push') {
    await announcePush(client, row, ev.data);
    return;
  }

  // Events à clé unique : on n'annonce qu'une fois.
  const key = ev.keys[0];
  if (!key || !(await markSeenIfNew(rowKey(row, key)))) return;

  const resolve = await mentionResolver(row.guild_id);
  const embed = renderEvent(row.owner, row.repo, ev.data, resolve);

  const channel = await fetchSendable(client, row.discord_channel);
  if (!channel) {
    log.warn(`dépôt #${row.id} : salon ${row.discord_channel} introuvable`);
    return;
  }
  await channel.send({ embeds: [embed], allowedMentions: noMentions }).catch((e) => log.warn('send échoué', e));

  // CI : message statut live + ping rôle sur échec.
  if (ev.data.kind === 'workflow_run') {
    await updatePipelineStatus(client, row, ev.data).catch((e) => log.warn('statut pipeline échoué', e));
    if (ev.important && row.role_id) {
      await channel.send({
        content: `<@&${row.role_id}> ❌ La pipeline **${ev.data.name}** a échoué sur \`${ev.data.branch}\`.`,
        allowedMentions: { roles: [row.role_id] }
      }).catch(() => {});
    }
  }
}

/** Push : dédup au grain du commit, annonce groupée des commits neufs. */
async function announcePush(client: Client<true>, row: RepoRow, data: PushData): Promise<void> {
  const branches = watchedBranches(row);
  if (branches && !branches.has(data.branch)) return;

  const s = slug(row.owner, row.repo);
  const fresh: CommitInfo[] = [];
  for (const c of data.commits) {
    if (await markSeenIfNew(rowKey(row, dedupKey(s, 'commit', c.sha)))) fresh.push(c);
  }
  if (!fresh.length) return;

  const resolve = await mentionResolver(row.guild_id);
  const embed = renderEvent(row.owner, row.repo, { ...data, commits: fresh }, resolve);

  const channel = await fetchSendable(client, row.discord_channel);
  if (!channel) {
    log.warn(`dépôt #${row.id} : salon ${row.discord_channel} introuvable`);
    return;
  }
  await channel.send({ embeds: [embed], allowedMentions: noMentions }).catch((e) => log.warn('send échoué', e));
}

/** Met à jour (ou crée) le message « statut pipeline » live, façon mcwatch. */
async function updatePipelineStatus(client: Client<true>, row: RepoRow, data: WorkflowRunData): Promise<void> {
  if (!row.status_channel) return;
  const channel = await fetchSendable(client, row.status_channel);
  if (!channel) return;

  const embed = pipelineStatusEmbed(row.owner, row.repo, data);
  const existing = row.status_message
    ? await channel.messages.fetch(row.status_message).catch(() => null)
    : null;

  if (existing) {
    await existing.edit({ embeds: [embed] }).catch(() => {});
  } else {
    const sent = await channel.send({ embeds: [embed], allowedMentions: noMentions }).catch(() => null);
    if (sent) {
      await prisma.github_repos.update({ where: { id: row.id }, data: { status_message: sent.id } }).catch(() => {});
    }
  }
}
