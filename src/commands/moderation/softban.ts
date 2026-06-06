import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';
import { base, frLoc } from '../../i18n';

/**
 * Softban : ban suivi d'un unban immédiat. Permet de purger les messages
 * récents d'un membre sans le bannir durablement (il peut revenir avec une
 * nouvelle invitation).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription(base('softban.cmd.desc'))
      .setDescriptionLocalizations(frLoc('softban.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('membre').setDescription(base('softban.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('softban.opt.member.desc')).setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription(base('softban.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('softban.opt.reason.desc')))
    .addIntegerOption((o) => o.setName('purge-jours')
      .setDescription(base('softban.opt.purge.desc'))
      .setDescriptionLocalizations(frLoc('softban.opt.purge.desc'))
      .setMinValue(1).setMaxValue(7)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');
    const days = interaction.options.getInteger('purge-jours') ?? 1;

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Action impossible sur vous-même.', flags: MessageFlags.Ephemeral });
    }
    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: '❌ Je ne peux pas bannir ce membre (rôle trop élevé ou permission manquante).', flags: MessageFlags.Ephemeral });
      }
      if (interaction.guild.ownerId !== interaction.user.id
          && interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: '❌ Ce membre a un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
      }
    }

    const id = await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user,
      type: 'softban',
      reason: reason ?? null,
      extra: `**Messages purgés :** ${days} jour(s)`
    });
    await interaction.guild.members.ban(user.id, {
      reason: `[Softban] ${reason || 'Non précisée'}`,
      deleteMessageSeconds: days * 86400
    });
    await interaction.guild.members.unban(user.id, `[Softban] purge auto, ${reason || ''}`).catch(() => {});

    return interaction.reply(`🧹 **${user.tag}** softban (#${id}) — messages des ${days} dernier(s) jour(s) supprimés.`);
  }
};
