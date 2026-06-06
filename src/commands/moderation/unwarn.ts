import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { deactivateWarn } from '../../utils/sanctions';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription(base('unwarn.cmd.desc'))
      .setDescriptionLocalizations(frLoc('unwarn.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption((o) =>
      o.setName('id').setDescription(base('unwarn.opt.id.desc'))
      .setDescriptionLocalizations(frLoc('unwarn.opt.id.desc')).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getInteger('id', true);
    const res = await deactivateWarn(interaction.guild.id, id);

    if (res.count === 0) {
      return interaction.reply({
        content: `❌ Aucun avertissement actif avec l'identifiant #${id}.`,
        flags: MessageFlags.Ephemeral
      });
    }
    return interaction.reply(`✅ Avertissement #${id} retiré du casier.`);
  }
};
