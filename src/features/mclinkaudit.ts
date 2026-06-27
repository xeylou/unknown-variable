import { EmbedBuilder, type Guild } from 'discord.js';
import { sendLog } from './logger';
import config from '../config';

/**
 * Journal d'audit des liaisons Discord ↔ Minecraft (domaine sensible).
 * Envoie un embed dans la catégorie de logs « modération » (no-op si non
 * configurée). Best-effort : à appeler avec `.catch(() => {})`.
 */

/** Liaison validée automatiquement (à la connexion). */
export function auditLinkCreated(guild: Guild, userId: string, pseudo: string): Promise<void> {
  return sendLog(guild, 'moderation', new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🔗 Liaison Minecraft créée')
    .setDescription(`<@${userId}> ↔ **${pseudo}**`)
    .setTimestamp());
}

/** Liaison forcée par un membre du staff. */
export function auditLinkForced(guild: Guild, userId: string, pseudo: string, byTag: string, overrides?: string): Promise<void> {
  return sendLog(guild, 'moderation', new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('⚙️ Liaison Minecraft forcée')
    .setDescription(`<@${userId}> ↔ **${pseudo}**\nPar : ${byTag}${overrides ? `\n${overrides}` : ''}`)
    .setTimestamp());
}

/** Liaison retirée (`/mclink delier` ou `/whitelist remove`). */
export function auditLinkRemoved(guild: Guild, pseudo: string, userId: string | null, byTag: string, alsoWhitelist: boolean): Promise<void> {
  return sendLog(guild, 'moderation', new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(alsoWhitelist ? '📤 Whitelist + liaison retirées' : '❌ Liaison Minecraft retirée')
    .setDescription(`**${pseudo}**${userId ? ` (<@${userId}>)` : ''}\nPar : ${byTag}`)
    .setTimestamp());
}
