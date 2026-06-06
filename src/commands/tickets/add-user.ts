import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction, type TextChannel
} from 'discord.js';
import { prisma } from '../../database';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription(base('adduser.cmd.desc'))
      .setDescriptionLocalizations(frLoc('adduser.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((o) =>
      o.setName('utilisateur').setDescription(base('adduser.opt.user.desc'))
      .setDescriptionLocalizations(frLoc('adduser.opt.user.desc')).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const channel = interaction.channel as TextChannel | null;
    if (!channel) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
    const ticket = await prisma.tickets.findUnique({ where: { channel_id: channel.id } });
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: '❌ À utiliser dans un ticket ouvert.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('utilisateur', true);
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    });
    return interaction.reply(`✅ ${user} ajouté au ticket.`);
  }
};
