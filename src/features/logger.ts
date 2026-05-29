import { getConfig } from '../utils/configCache';
import type { Guild, EmbedBuilder } from 'discord.js';

/**
 * Journalisation par catégorie. Chaque catégorie possède son propre salon
 * (clé `log_<cat>_channel`) et peut être désactivée (clé `log_<cat>_enabled`).
 */

/** Liste ordonnée des catégories de journalisation. */
export const LOG_CATEGORIES = [
  'messages', 'members', 'roles', 'channels', 'voice', 'server', 'moderation', 'botactions'
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

/** Libellés lisibles des catégories. */
export const CATEGORY_LABELS: Record<string, string> = {
  messages: '💬 Messages',
  members: '👤 Membres',
  roles: '🎭 Rôles',
  channels: '📁 Salons',
  voice: '🔊 Vocal',
  server: '⚙️ Serveur',
  moderation: '🛡️ Modération',
  botactions: '🤖 Actions du bot'
};

/**
 * Envoie un embed dans le salon de logs de la catégorie indiquée.
 * Ne fait rien si la catégorie n'a pas de salon ou si elle est désactivée.
 */
export async function sendLog(guild: Guild | null | undefined, category: string, embed: EmbedBuilder): Promise<void> {
  if (!guild) return;
  if ((await getConfig(guild.id, `log_${category}_enabled`, '1')) === '0') return;

  const channelId = await getConfig(guild.id, `log_${category}_channel`);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId)
    ?? await guild.channels.fetch(channelId).catch(() => null);
  if (channel && channel.isTextBased() && 'send' in channel) {
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}
