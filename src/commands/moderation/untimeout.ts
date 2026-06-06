import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription(base('untimeout.cmd.desc'))
      .setDescriptionLocalizations(frLoc('untimeout.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription(base('untimeout.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('untimeout.opt.member.desc')).setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription(base('untimeout.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('untimeout.opt.reason.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');

    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
    }
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: 'ℹ️ Ce membre n\'est pas exclu.', flags: MessageFlags.Ephemeral });
    }

    await member.timeout(null, reason || undefined);
    await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user, type: 'untimeout', reason
    });
    return interaction.reply(`✅ L'exclusion de **${user.tag}** a été levée.`);
  }
};
