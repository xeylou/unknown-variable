import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, version as djsVersion,
  type ChatInputCommandInteraction, type Client, type Guild
} from 'discord.js';
import config from '../../config';

/** Formate une durée de fonctionnement (ms) en « 1 j 2 h 3 min ». */
function formatUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} j`);
  if (h) parts.push(`${h} h`);
  parts.push(`${m} min`);
  return parts.join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Afficher les informations et statistiques du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>) {
    const members = client.guilds.cache.reduce((n: number, g: Guild) => n + (g.memberCount || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setTitle('🤖 Informations du bot')
      .addFields(
        { name: '🏓 Latence', value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: '⏱️ En ligne depuis', value: formatUptime(client.uptime ?? 0), inline: true },
        { name: '📡 Serveurs', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Membres', value: `${members}`, inline: true },
        { name: '⚙️ Commandes', value: `${client.commands?.size ?? 0}`, inline: true },
        { name: '🧩 discord.js', value: `v${djsVersion}`, inline: true }
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
