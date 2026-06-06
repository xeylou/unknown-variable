import {
  EmbedBuilder, type Client, type Guild, type GuildTextBasedChannel
} from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import { topMessages } from './messagestats';
import { topInvites } from './invitetracker';
import config from '../config';

/**
 * Messages « classement » auto-actualisés : le bot poste un embed dans un salon
 * puis l'édite périodiquement avec le top courant (messages ou invitations).
 * Calque l'approche des compteurs /stats et des watchers Minecraft.
 */

const log = createLogger('leaderboards');

const REFRESH_MS = 5 * 60_000;
const MEDALS = ['🥇', '🥈', '🥉'];

export type LeaderboardType = 'messages' | 'invites';

type Row = { user_id: string; count: number };

function fetchRows(type: LeaderboardType, guildId: string, top: number): Promise<Row[]> {
  return type === 'messages' ? topMessages(guildId, top) : topInvites(guildId, top);
}

function buildEmbed(type: LeaderboardType, rows: Row[]): EmbedBuilder {
  const isMsg = type === 'messages';
  const unit = isMsg ? 'messages' : 'invitations';
  const lines = rows.length
    ? rows.map((r, i) => {
        const rank = MEDALS[i] ?? `**${i + 1}.**`;
        return `${rank} <@${r.user_id}> — **${r.count}** ${unit}`;
      }).join('\n')
    : '*Personne pour l’instant.*';
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(isMsg ? '🏆 Classement des messages' : '🏆 Classement des invitations')
    .setDescription(lines)
    .setFooter({ text: 'Mis à jour automatiquement' })
    .setTimestamp();
}

/** Poste le message de classement initial dans un salon et l'enregistre. */
export async function createPanel(channel: GuildTextBasedChannel, type: LeaderboardType, top: number) {
  const rows = await fetchRows(type, channel.guild.id, top);
  const sent = await channel.send({ embeds: [buildEmbed(type, rows)], allowedMentions: { parse: [] } });
  await prisma.leaderboard_panels.create({
    data: {
      message_id: sent.id,
      guild_id: channel.guild.id,
      channel_id: channel.id,
      type,
      top,
      created_at: Date.now()
    }
  });
  return sent;
}

/** Rafraîchit tous les panneaux enregistrés (édite chaque message en place). */
async function refreshAll(client: Client<true>): Promise<void> {
  const panels = await prisma.leaderboard_panels.findMany()
    .catch(() => [] as Awaited<ReturnType<typeof prisma.leaderboard_panels.findMany>>);
  for (const p of panels) {
    const guild = client.guilds.cache.get(p.guild_id);
    if (!guild) continue;
    const channel = guild.channels.cache.get(p.channel_id);
    if (!channel || !channel.isTextBased()) {
      await prisma.leaderboard_panels.delete({ where: { message_id: p.message_id } }).catch(() => {});
      continue;
    }
    const message = await channel.messages.fetch(p.message_id).catch(() => null);
    if (!message) {
      await prisma.leaderboard_panels.delete({ where: { message_id: p.message_id } }).catch(() => {});
      continue;
    }
    const rows = await fetchRows(p.type as LeaderboardType, p.guild_id, p.top);
    await message.edit({ embeds: [buildEmbed(p.type as LeaderboardType, rows)], allowedMentions: { parse: [] } })
      .catch((e) => log.debug('edit failed', e));
  }
}

/** Supprime les panneaux d'un serveur (un type donné ou tous) + leurs messages. */
export async function deletePanels(guild: Guild, type: LeaderboardType | 'tout'): Promise<number> {
  const where = type === 'tout' ? { guild_id: guild.id } : { guild_id: guild.id, type };
  const rows = await prisma.leaderboard_panels.findMany({ where });
  for (const r of rows) {
    const channel = guild.channels.cache.get(r.channel_id);
    if (channel?.isTextBased() && 'messages' in channel) {
      await channel.messages.delete(r.message_id).catch(() => {});
    }
  }
  await prisma.leaderboard_panels.deleteMany({ where });
  return rows.length;
}

/** Démarre la boucle de rafraîchissement périodique. */
export function init(client: Client<true>): void {
  const run = () => refreshAll(client).catch((e) => log.error(e));
  run();
  setInterval(run, REFRESH_MS).unref();
}
