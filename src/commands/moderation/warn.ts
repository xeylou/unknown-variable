import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription(base('warn.cmd.desc'))
      .setDescriptionLocalizations(frLoc('warn.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription(base('warn.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('warn.opt.member.desc')).setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription(base('warn.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('warn.opt.reason.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const target = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas vous avertir vous-même.', flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ content: '❌ Impossible d\'avertir un bot.', flags: MessageFlags.Ephemeral });
    }

    const id = await notifyAndRecord({
      guild: interaction.guild, target, moderator: interaction.user, type: 'warn', reason
    });
    return interaction.reply(
      `⚠️ ${target} a reçu un avertissement (#${id}).${reason ? ` Raison : ${reason}` : ''}`
    );
  }
};
