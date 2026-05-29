import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction, type TextChannel
} from 'discord.js';
import { prisma } from '../../database';

export default {
  data: new SlashCommandBuilder()
    .setName('remove-user')
    .setDescription('Retirer un utilisateur du ticket courant')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((o) =>
      o.setName('utilisateur').setDescription('Membre à retirer').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const channel = interaction.channel as TextChannel | null;
    if (!channel) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
    const ticket = await prisma.tickets.findUnique({ where: { channel_id: channel.id } });
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: '❌ À utiliser dans un ticket ouvert.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('utilisateur', true);
    await channel.permissionOverwrites.delete(user.id);
    return interaction.reply(`✅ ${user} retiré du ticket.`);
  }
};
