import { type Client, type Guild } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

const log = createLogger('stats');

const lastRename = new Map<string, number>();
const MIN_RENAME_MS = 6 * 60_000;

const hydrated = new Set<string>();
const nextFetchAllowed = new Map<string, number>();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Nom affiché d'un salon compteur (limité à 100 caractères). */
export function statName(label: string, count: number): string {
  return `${label} : ${count}`.slice(0, 100);
}

export async function ensureMembersOnce(guild: Guild): Promise<void> {
  if (hydrated.has(guild.id)) return;
  const wait = (nextFetchAllowed.get(guild.id) ?? 0) - Date.now();
  if (wait > 0) return;
  try {
    await guild.members.fetch();
    hydrated.add(guild.id);
    nextFetchAllowed.delete(guild.id);
  } catch (e) {
    const retryAfter = (e as { data?: { retry_after?: number } })?.data?.retry_after;
    if (typeof retryAfter === 'number') {
      nextFetchAllowed.set(guild.id, Date.now() + Math.ceil(retryAfter * 1000) + 500);
      log.debug(`members fetch rate limited for ${guild.id}, retry in ${retryAfter}s`);
    } else {
      log.warn(`hydrate members failed for ${guild.id}`, e);
    }
  }
}

async function tick(client: Client<true>): Promise<void> {
  const rows = await prisma.stat_channels.findMany().catch(() => [] as Awaited<ReturnType<typeof prisma.stat_channels.findMany>>);
  if (!rows.length) return;

  const byGuild = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byGuild.get(r.guild_id) ?? [];
    list.push(r);
    byGuild.set(r.guild_id, list);
  }

  for (const [gid, list] of byGuild) {
    const guild = client.guilds.cache.get(gid);
    if (!guild) continue;
    await ensureMembersOnce(guild);
    await sleep(1500);

    for (const row of list) {
      const channel = guild.channels.cache.get(row.channel_id);
      if (!channel) {
        await prisma.stat_channels.delete({ where: { channel_id: row.channel_id } }).catch(() => {});
        continue;
      }
      const role = guild.roles.cache.get(row.role_id);
      if (!role) continue;

      const name = statName(row.label || role.name, role.members.size);
      if (channel.name === name) continue;

      const last = lastRename.get(channel.id) ?? 0;
      if (Date.now() - last < MIN_RENAME_MS) continue;
      lastRename.set(channel.id, Date.now());
      await channel.setName(name).catch((e) => log.debug('setName failed', e));
    }
  }
}

export function init(client: Client<true>): void {
  const run = () => tick(client).catch((e) => log.error(e));
  run();
  setInterval(run, 60_000).unref();
}
