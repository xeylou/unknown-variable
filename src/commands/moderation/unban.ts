import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription(base('unban.cmd.desc'))
      .setDescriptionLocalizations(frLoc('unban.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) =>
      o.setName('identifiant').setDescription(base('unban.opt.id.desc'))
      .setDescriptionLocalizations(frLoc('unban.opt.id.desc')).setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription(base('unban.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('unban.opt.reason.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const id = interaction.options.getString('identifiant', true).trim();
    const reason = interaction.options.getString('raison');

    if (!/^\d{17,20}$/.test(id)) {
      return interaction.reply({ content: '❌ Identifiant invalide (17 à 20 chiffres attendus).', flags: MessageFlags.Ephemeral });
    }

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) {
      return interaction.reply({ content: '❌ Cet utilisateur n\'est pas banni.', flags: MessageFlags.Ephemeral });
    }

    await interaction.guild.members.unban(id, reason || undefined);
    await notifyAndRecord({
      guild: interaction.guild, target: ban.user, moderator: interaction.user, type: 'unban', reason
    });
    return interaction.reply(`♻️ **${ban.user.tag}** a été débanni.${reason ? ` Raison : ${reason}` : ''}`);
  }
};
