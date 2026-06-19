import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Client, type Guild, type GuildMember
} from 'discord.js';
import { randomInt } from 'node:crypto';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import config from '../config';
import type { giveaways as GiveawayRow } from '@prisma/client';

const log = createLogger('giveaways');

let clientRef: Client<true> | null = null;

/** Limite stricte du setTimeout JS — au-delà, on reprogramme à l'échéance. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Lock en mémoire pour éviter qu'un giveaway soit terminé en parallèle par
 * deux déclencheurs (le `setTimeout` planifié + une commande `/giveaway end`
 * forcée, par exemple).
 */
const ending = new Set<string>();

/** Subset minimal des champs nécessaires à schedule() — accepte aussi les rows DB complètes. */
type SchedulableGiveaway = Pick<GiveawayRow, 'message_id' | 'ends_at' | 'paused'>;

/** Au démarrage : recharge et reprogramme les giveaways en cours. */
async function init(client: Client<true>) {
  clientRef = client;
  const rows = await prisma.giveaways.findMany({ where: { ended: 0 } });
  for (const g of rows) schedule(g);
  if (rows.length) log.info(`${rows.length} giveaway(s) en cours rechargé(s)`);
}

/** Programme la fin d'un giveaway (clamp à la limite setTimeout JS). */
function schedule(g: SchedulableGiveaway) {
  if (g.paused) return; // les giveaways en pause sont reprogrammés au resume
  const delay = g.ends_at - Date.now();
  if (delay <= 0) { endGiveaway(g.message_id); return; }
  setTimeout(() => endGiveaway(g.message_id), Math.min(delay, MAX_TIMEOUT_MS)).unref();
}

/** Conditions d'entrée parsées depuis le champ JSON `requirements`. */
export type Requirements = {
  min_age_days?: number;
  required_role_ids?: string[];
};

/** Bonus parsé depuis le champ JSON `bonus_roles` : { roleId: multiplicateur }. */
export type BonusRoles = Record<string, number>;

export function parseRequirements(json: string | null | undefined): Requirements {
  if (!json) return {};
  try { return JSON.parse(json) as Requirements; } catch { return {}; }
}

export function parseBonusRoles(json: string | null | undefined): BonusRoles {
  if (!json) return {};
  try { return JSON.parse(json) as BonusRoles; } catch { return {}; }
}

/** Subset des champs lus dans les embeds — accepte aussi les rows DB complètes. */
type EmbedGiveaway =
  Pick<GiveawayRow, 'prize' | 'winners' | 'host_id' | 'ends_at'>
  & Partial<Pick<GiveawayRow, 'requirements' | 'bonus_roles'>>;

interface BuildEmbedOptions {
  ended?: boolean;
  winnerText?: string | null;
  count?: number;
  paused?: boolean;
}

/**
 * Renvoie une description textuelle des conditions, ou null si aucune.
 * Utilisée dans l'embed du giveaway.
 */
function describeRequirements(req: Requirements): string | null {
  const parts: string[] = [];
  if (req.min_age_days && req.min_age_days > 0) {
    parts.push(`▸ Membre depuis au moins **${req.min_age_days}** jour(s)`);
  }
  if (req.required_role_ids?.length) {
    parts.push(`▸ Posséder ${req.required_role_ids.map((id) => `<@&${id}>`).join(' et ')}`);
  }
  return parts.length ? parts.join('\n') : null;
}

function describeBonus(bonus: BonusRoles): string | null {
  const entries = Object.entries(bonus);
  if (!entries.length) return null;
  return entries.map(([id, mult]) => `<@&${id}> = ×${mult}`).join(', ');
}

/** Construit l'embed d'un giveaway. */
function buildEmbed(g: EmbedGiveaway, opts: BuildEmbedOptions = {}): EmbedBuilder {
  const { ended = false, winnerText = null, count = 0, paused = false } = opts;
  const embed = new EmbedBuilder()
    .setColor(ended ? config.colors.neutral : (paused ? config.colors.warning : config.colors.primary))
    .setTitle('🎉  GIVEAWAY  🎉')
    .setTimestamp(g.ends_at);

  const req = parseRequirements(g.requirements ?? null);
  const bonus = parseBonusRoles(g.bonus_roles ?? null);
  const reqText = describeRequirements(req);
  const bonusText = describeBonus(bonus);

  if (ended) {
    embed.setDescription(
      `**Lot :** ${g.prize}\n**Organisé par :** <@${g.host_id}>\n\n` +
      `**Statut :** 🔒 Terminé\n${winnerText || ''}`
    );
  } else {
    embed.setDescription(
      `**Lot :** ${g.prize}\n` +
      `**Nombre de gagnant(s) :** ${g.winners}\n` +
      `**Organisé par :** <@${g.host_id}>\n` +
      `**Fin :** <t:${Math.floor(g.ends_at / 1000)}:R>${paused ? ' ⏸️ *(en pause)*' : ''}\n` +
      `**Participants :** ${count}\n` +
      (reqText ? `\n**Conditions :**\n${reqText}\n` : '') +
      (bonusText ? `\n**Bonus :** ${bonusText}\n` : '') +
      '\nCliquer sur le bouton 🎉 ci-dessous pour participer !'
    );
  }
  return embed;
}

/** Ligne de bouton « Participer ». */
function buildRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway:enter')
      .setLabel('Participer')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
}

/**
 * Tire `count` gagnants au hasard parmi `entries` (sans doublon).
 * Utilise `crypto.randomInt` pour un tirage non prédictible et non biaisé.
 *
 * Les entrées peuvent être passées soit comme une liste d'userIds simples
 * (chaque user = 1 chance), soit comme une liste avec doublons (un user
 * apparaissant N fois aura N fois plus de chance, ex. via les bonus roles).
 */
function pickWinners(entries: string[], count: number): string[] {
  const pool = [...entries];
  const winners: string[] = [];
  while (winners.length < count && pool.length) {
    const idx = randomInt(0, pool.length);
    const pick = pool[idx];
    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i] === pick) pool.splice(i, 1);
    }
    winners.push(pick);
  }
  return winners;
}

/**
 * Vérifie qu'un membre satisfait les conditions d'entrée du giveaway.
 * Renvoie null si OK, sinon un message d'explication.
 */
export async function checkEligibility(member: GuildMember, requirements: Requirements): Promise<string | null> {
  if (requirements.min_age_days && requirements.min_age_days > 0) {
    const since = member.joinedTimestamp;
    if (!since) return 'Impossible de vérifier votre ancienneté.';
    const days = (Date.now() - since) / 86_400_000;
    if (days < requirements.min_age_days) {
      return `Vous devez être membre depuis au moins **${requirements.min_age_days}** jour(s) (vous en avez ${days.toFixed(1)}).`;
    }
  }
  if (requirements.required_role_ids?.length) {
    for (const roleId of requirements.required_role_ids) {
      if (!member.roles.cache.has(roleId)) {
        return `Il vous manque le rôle <@&${roleId}> pour participer.`;
      }
    }
  }
  return null;
}

/**
 * Construit la liste finale de tirage en appliquant les multiplicateurs
 * de rôles bonus. Un user avec un rôle ×3 apparaîtra 3 fois dans la liste.
 */
export async function buildWeightedPool(guild: Guild, userIds: string[], bonus: BonusRoles): Promise<string[]> {
  if (!Object.keys(bonus).length) return userIds;
  const pool: string[] = [];
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) { pool.push(userId); continue; }
    let mult = 1;
    for (const [roleId, m] of Object.entries(bonus)) {
      if (member.roles.cache.has(roleId)) mult = Math.max(mult, m);
    }
    for (let i = 0; i < Math.max(1, Math.floor(mult)); i++) pool.push(userId);
  }
  return pool;
}

/** Termine un giveaway, tire les gagnants et annonce le résultat. */
async function endGiveaway(messageId: string, force = false): Promise<void> {
  if (ending.has(messageId)) return;
  ending.add(messageId);
  try {
    if (!clientRef) return;
    const g = await prisma.giveaways.findUnique({ where: { message_id: messageId } });
    if (!g || g.ended) return;
    if (!force && g.ends_at - Date.now() > 1000) { schedule(g); return; }

    const channel = await clientRef.channels.fetch(g.channel_id).catch(() => null);
    const message = channel && channel.isTextBased() && 'messages' in channel
      ? await channel.messages.fetch(messageId).catch(() => null)
      : null;

    const entryRows = await prisma.giveaway_entries.findMany({ where: { message_id: messageId } });
    const userIds = entryRows.map((r) => r.user_id);
    const guild = (channel && 'guild' in channel ? channel.guild : null) ?? clientRef.guilds.cache.get(g.guild_id) ?? null;
    const bonus = parseBonusRoles(g.bonus_roles);
    const pool = guild ? await buildWeightedPool(guild, userIds, bonus) : userIds;
    const winners = pickWinners(pool, g.winners);

    const winnerText = winners.length
      ? `🏆 **Gagnant(s) :** ${winners.map((id) => `<@${id}>`).join(', ')}`
      : '😕 Aucun participant.';

    if (message) {
      await message.edit({
        embeds: [buildEmbed(g, { ended: true, winnerText })],
        components: [buildRow(true)]
      }).catch((e) => log.warn('edit giveaway message failed', e));
    }
    if (channel && channel.isTextBased() && 'send' in channel) {
      const announcement = winners.length
        ? `🎉 Félicitations ${winners.map((id) => `<@${id}>`).join(', ')} ! Vous remportez **${g.prize}**.`
        : `Le giveaway pour **${g.prize}** s'est terminé sans participant.`;
      await channel.send({
        content: announcement,
        allowedMentions: { users: winners }
      }).catch((e) => log.warn('announce winners failed', e));
    }

    await prisma.giveaways.update({ where: { message_id: messageId }, data: { ended: 1 } });
  } finally {
    ending.delete(messageId);
  }
}

/** Retire de nouveaux gagnants pour un giveaway terminé. */
async function reroll(messageId: string) {
  const g = await prisma.giveaways.findUnique({ where: { message_id: messageId } });
  if (!g) return null;
  const entryRows = await prisma.giveaway_entries.findMany({ where: { message_id: messageId } });
  const userIds = entryRows.map((r) => r.user_id);
  const guild = clientRef?.guilds?.cache?.get(g.guild_id);
  const bonus = parseBonusRoles(g.bonus_roles);
  const pool = guild ? await buildWeightedPool(guild, userIds, bonus) : userIds;
  return { g, winners: pickWinners(pool, g.winners) };
}

export { init, schedule, buildEmbed, buildRow, pickWinners, endGiveaway, reroll }
