import { type Client } from 'discord.js';
import { prisma } from '../database';
import { fetchStatus, embedFromStatus } from './mcstatus';
import { createLogger } from '../utils/logger';
import type { mc_watchers as McWatcherRow } from '@prisma/client';

const log = createLogger('mcwatch');

/** Horodatage du dernier passage, par identifiant de suivi. */
const lastCheck = new Map<number, number>();

async function processWatcher(client: Client<true>, w: McWatcherRow): Promise<void> {
  const guild = client.guilds.cache.get(w.guild_id);
  if (!guild) return;

  const channel = guild.channels.cache.get(w.channel_id)
    ?? await guild.channels.fetch(w.channel_id).catch(() => null);
  if (!channel?.isTextBased() || !('messages' in channel) || !('send' in channel)) return;

  let data;
  try { data = await fetchStatus(w.ip); }
  catch { return; }
  const current = data.online ? 1 : 0;

  const embed = embedFromStatus(w.ip, data)
    .setFooter({ text: `Suivi automatique · rafraîchi toutes les ${w.interval_min} min` });

  const existing = w.message_id
    ? await channel.messages.fetch(w.message_id).catch(() => null)
    : null;
  if (existing) {
    await existing.edit({ embeds: [embed] }).catch(() => {});
  } else {
    const sent = await channel.send({ embeds: [embed] }).catch(() => null);
    if (sent) {
      await prisma.mc_watchers.update({ where: { id: w.id }, data: { message_id: sent.id } });
    }
  }

  if (w.last_online !== null && w.last_online !== current) {
    const message = data.online
      ? `🟢 <@&${w.role_id}> Le serveur **${w.ip}** est **en ligne** !`
      : `🔴 <@&${w.role_id}> Le serveur **${w.ip}** est **hors ligne**.`;
    await channel.send({
      content: message,
      allowedMentions: { roles: [w.role_id] }
    }).catch(() => {});
  }
  if (w.last_online !== current) {
    await prisma.mc_watchers.update({ where: { id: w.id }, data: { last_online: current } });
  }
}

export async function runWatcherNow(client: Client<true>, id: number): Promise<void> {
  const w = await prisma.mc_watchers.findUnique({ where: { id } });
  if (!w) return;
  lastCheck.set(w.id, Date.now());
  await processWatcher(client, w).catch((e) => log.error(e));
}

/** Démarre la boucle de suivi : un tick par minute. */
export function init(client: Client<true>): void {
  const tick = async () => {
    const watchers = await prisma.mc_watchers.findMany().catch(() => [] as McWatcherRow[]);
    const now = Date.now();
    for (const w of watchers) {
      const due = (lastCheck.get(w.id) ?? 0) + w.interval_min * 60_000;
      if (now < due) continue;
      lastCheck.set(w.id, now);
      await processWatcher(client, w).catch((e) => log.error(e));
    }
  };
  tick();
  setInterval(tick, 60_000).unref();
}
