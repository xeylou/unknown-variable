import { EmbedBuilder, type Client } from 'discord.js';
import { getConfig, setConfig } from '../utils/configCache';
import config from '../config';

/** Forme partielle de la réponse mcstatus.io qu'on consomme réellement. */
export interface McStatusResponse {
  online: boolean;
  players?: { online?: number; max?: number };
  version?: { name_clean?: string };
  motd?: { clean?: string };
}

/** Interroge l'API publique mcstatus.io (aucune clé requise). */
async function fetchStatus(ip: string): Promise<McStatusResponse> {
  const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error('API de statut indisponible');
  return res.json() as Promise<McStatusResponse>;
}

/** Construit l'embed de statut à partir de données déjà récupérées. */
function embedFromStatus(ip: string, data: McStatusResponse): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`⛏️ Serveur Minecraft — ${ip}`)
    .setTimestamp();

  if (data.online) {
    embed.setColor(config.colors.success).addFields(
      { name: 'Statut', value: '🟢 En ligne', inline: true },
      { name: 'Joueurs', value: `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`, inline: true },
      { name: 'Version', value: data.version?.name_clean || 'Inconnue', inline: true }
    );
    if (data.motd?.clean) embed.setDescription('```\n' + data.motd.clean + '\n```');
  } else {
    embed.setColor(config.colors.danger).addFields(
      { name: 'Statut', value: '🔴 Hors ligne', inline: true }
    );
  }
  return embed;
}

async function buildStatusEmbed(ip: string): Promise<EmbedBuilder> {
  return embedFromStatus(ip, await fetchStatus(ip));
}

/**
 * Met à jour automatiquement un message de statut toutes les 5 minutes.
 */
function initAutoUpdate(client: Client<true>): void {
  const tick = async () => {
    for (const guild of client.guilds.cache.values()) {
      const ip = await getConfig(guild.id, 'mc_server_ip');
      const channelId = await getConfig(guild.id, 'mc_status_channel');
      if (!ip || !channelId) continue;

      const channel = guild.channels.cache.get(channelId);
      if (!channel?.isTextBased() || !('messages' in channel) || !('send' in channel)) continue;

      const embed = await buildStatusEmbed(ip).catch(() => null);
      if (!embed) continue;

      const msgId = await getConfig(guild.id, 'mc_status_message');
      const existing = msgId ? await channel.messages.fetch(msgId).catch(() => null) : null;
      if (existing) {
        existing.edit({ embeds: [embed] }).catch(() => {});
      } else {
        const sent = await channel.send({ embeds: [embed] }).catch(() => null);
        if (sent) await setConfig(guild.id, 'mc_status_message', sent.id);
      }
    }
  };
  tick();
  setInterval(tick, 5 * 60 * 1000).unref();
}

export { fetchStatus, embedFromStatus, buildStatusEmbed, initAutoUpdate }
