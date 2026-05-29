import { EmbedBuilder, type Client } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import * as embeds from '../utils/embeds';
import type { reminders as ReminderRow, recurring_reminders as RecurringRow } from '@prisma/client';

const log = createLogger('reminders');

let clientRef: Client<true> | null = null;
const MAX_TIMEOUT = 2_147_483_647;

/** Au démarrage : recharge et reprogramme tous les rappels (one-shot + récurrents). */
async function init(client: Client<true>): Promise<void> {
  clientRef = client;
  const oneOff = await prisma.reminders.findMany();
  for (const r of oneOff) schedule(r);
  if (oneOff.length) log.info(`${oneOff.length} rappel(s) rechargé(s)`);

  const recurring = await prisma.recurring_reminders.findMany();
  for (const r of recurring) scheduleRecurring(r);
  if (recurring.length) log.info(`${recurring.length} rappel(s) récurrent(s) rechargé(s)`);
}

function schedule(r: ReminderRow): void {
  const delay = r.remind_at - Date.now();
  if (delay <= 0) { fire(r); return; }
  setTimeout(() => fire(r), Math.min(delay, MAX_TIMEOUT)).unref();
}

async function fire(r: ReminderRow): Promise<void> {
  if (!clientRef) return;
  const fresh = await prisma.reminders.findUnique({ where: { id: r.id } });
  if (!fresh) return;
  if (fresh.remind_at - Date.now() > 1000) { schedule(fresh); return; }
  await prisma.reminders.delete({ where: { id: r.id } });

  const embed = embeds.primary()
    .setAuthor({ name: '⏰ Rappel' })
    .setDescription(r.text)
    .setTimestamp();

  const channel = await clientRef.channels.fetch(r.channel_id).catch(() => null);
  if (channel?.isTextBased() && 'send' in channel) {
    channel.send({
      content: `<@${r.user_id}>`,
      embeds: [embed],
      allowedMentions: { users: [r.user_id] }
    }).catch(() => dmFallback(r, embed));
  } else {
    dmFallback(r, embed);
  }
}

async function dmFallback(r: ReminderRow, embed: EmbedBuilder): Promise<void> {
  if (!clientRef) return;
  const user = await clientRef.users.fetch(r.user_id).catch(() => null);
  user?.send({ embeds: [embed] }).catch(() => {});
}

/** Crée un rappel one-shot et le programme. @returns l'id. */
async function addReminder({
  userId, channelId, guildId, text, remindAt
}: {
  userId: string; channelId: string; guildId: string | null; text: string; remindAt: number;
}): Promise<number> {
  const inserted = await prisma.reminders.create({
    data: { user_id: userId, channel_id: channelId, guild_id: guildId || null, text, remind_at: remindAt }
  });
  schedule(inserted);
  return inserted.id;
}

// ─── Récurrents ────────────────────────────────────────────────────────────

export type Frequency = 'daily' | 'weekly' | 'monthly';

/** Calcule la prochaine échéance depuis une date donnée + une fréquence. */
export function nextOccurrence(from: number, frequency: Frequency): number {
  const d = new Date(from);
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
  }
  return d.getTime();
}

function scheduleRecurring(r: RecurringRow): void {
  const delay = r.next_at - Date.now();
  if (delay <= 0) { fireRecurring(r.id); return; }
  setTimeout(() => fireRecurring(r.id), Math.min(delay, MAX_TIMEOUT)).unref();
}

async function fireRecurring(id: number): Promise<void> {
  if (!clientRef) return;
  const r = await prisma.recurring_reminders.findUnique({ where: { id } });
  if (!r) return;
  if (r.next_at - Date.now() > 1000) { scheduleRecurring(r); return; }

  const embed = embeds.primary()
    .setAuthor({ name: `🔁 Rappel récurrent (${r.frequency})` })
    .setDescription(r.text)
    .setTimestamp();

  const channel = await clientRef.channels.fetch(r.channel_id).catch(() => null);
  if (channel?.isTextBased() && 'send' in channel) {
    const tag = r.role_id ? `<@&${r.role_id}>` : `<@${r.user_id}>`;
    channel.send({
      content: tag,
      embeds: [embed],
      allowedMentions: r.role_id ? { roles: [r.role_id] } : { users: [r.user_id] }
    }).catch(() => {});
  }

  const next = nextOccurrence(r.next_at, r.frequency as Frequency);
  await prisma.recurring_reminders.update({ where: { id }, data: { next_at: next } });
  scheduleRecurring({ ...r, next_at: next });
}

/** Crée un rappel récurrent et le planifie. */
export async function addRecurringReminder({
  userId, channelId, guildId, text, frequency, firstAt, roleId
}: {
  userId: string; channelId: string; guildId: string | null;
  text: string; frequency: Frequency;
  firstAt: number; roleId?: string | null;
}): Promise<number> {
  const row = await prisma.recurring_reminders.create({
    data: {
      user_id: userId,
      channel_id: channelId,
      guild_id: guildId,
      text,
      frequency,
      next_at: firstAt,
      role_id: roleId ?? null,
      created_at: Date.now()
    }
  });
  scheduleRecurring(row);
  return row.id;
}

export { init, addReminder }
