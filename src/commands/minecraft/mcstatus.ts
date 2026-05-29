import { SlashCommandBuilder, PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig } from '../../utils/configCache';
import { buildStatusEmbed } from '../../features/mcstatus';

export default {
  data: new SlashCommandBuilder()
    .setName('mcstatus')
    .setDescription("Afficher le statut d'un serveur Minecraft")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((o) =>
      o.setName('ip').setDescription('Adresse du serveur (par défaut : celui configuré)')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.deferReply();

    const ip = interaction.options.getString('ip', true) || (await getConfig(interaction.guild.id, 'mc_server_ip'));
    if (!ip) {
      return interaction.editReply(
        "⚠️ Aucun serveur configuré. Précise une IP, ou fais `/config minecraft ip:<adresse>`."
      );
    }

    try {
      const embed = await buildStatusEmbed(ip);
      return interaction.editReply({ embeds: [embed] });
    } catch {
      return interaction.editReply('❌ Impossible de récupérer le statut du serveur.');
    }
  }
};
