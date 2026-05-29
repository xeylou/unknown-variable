import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { notifyAndRecord } from '../../utils/moderation';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Raison')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const user = interaction.options.getUser('membre', true);
    const member = interaction.options.getMember('membre');
    const reason = interaction.options.getString('raison');

    if (!member) {
      return interaction.reply({ content: '❌ Ce membre n\'est pas sur le serveur.', flags: MessageFlags.Ephemeral });
    }
    if (member.id === interaction.user.id) {
      return interaction.reply({ content: '❌ Action impossible sur vous-même.', flags: MessageFlags.Ephemeral });
    }
    if (!member.kickable) {
      return interaction.reply({ content: '❌ Je ne peux pas expulser ce membre (rôle trop élevé ou permission manquante).', flags: MessageFlags.Ephemeral });
    }
    if (interaction.guild.ownerId !== interaction.user.id
        && interaction.member.roles.highest.position <= member.roles.highest.position) {
      return interaction.reply({ content: '❌ Ce membre a un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
    }

    // DM riche AVANT le kick (sinon on perd le canal DM partagé via la guilde).
    const id = await notifyAndRecord({
      guild: interaction.guild, target: user, moderator: interaction.user, type: 'kick', reason
    });
    await member.kick(reason || undefined);
    return interaction.reply(`👢 **${user.tag}** a été expulsé (#${id}).${reason ? ` Raison : ${reason}` : ''}`);
  }
};
