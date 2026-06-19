import { SlashCommandBuilder, PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig } from '../../utils/configCache';
import { buildStatusEmbed } from '../../features/mcstatus';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('mcstatus')
    .setDescription(base('mcstatus.cmd.desc'))
      .setDescriptionLocalizations(frLoc('mcstatus.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((o) =>
      o.setName('ip').setDescription(base('mcstatus.opt.ip.desc'))
      .setDescriptionLocalizations(frLoc('mcstatus.opt.ip.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.deferReply();

    const ip = interaction.options.getString('ip', true) || (await getConfig(interaction.guild.id, 'mc_server_ip'));
    if (!ip) {
      return interaction.editReply(
        "⚠️ Aucun serveur configuré. Préciser une IP, ou faire `/config minecraft ip:<adresse>`."
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
