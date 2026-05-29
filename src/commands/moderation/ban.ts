import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison'))
    .addIntegerOption((o) =>
      o.setName('purge-jours').setDescription('Supprimer les messages des N derniers jours (0-7)')
        .setMinValue(0).setMaxValue(7)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');
    const days = interaction.options.getInteger('purge-jours') ?? 0;

    if (user.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Action impossible sur vous-même.', flags: MessageFlags.Ephemeral });
    }
    // Si le membre est sur le serveur, on vérifie la hiérarchie
    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: '❌ Je ne peux pas bannir ce membre (rôle trop élevé ou permission manquante).', flags: MessageFlags.Ephemeral });
      }
      if (interaction.guild.ownerId !== interaction.user.id
          && interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: '❌ Ce membre a un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
      }
    }

    // DM riche AVANT le ban (sinon plus de DM partagé via la guilde).
    const id = await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user, type: 'ban', reason
    });
    await interaction.guild.members.ban(user.id, {
      reason: reason || undefined,
      deleteMessageSeconds: days * 86400
    });
    return interaction.reply(`🔨 **${user.tag}** a été banni (#${id}).${reason ? ` Raison : ${reason}` : ''}`);
  }
};
