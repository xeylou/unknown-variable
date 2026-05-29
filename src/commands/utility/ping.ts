import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction, type Client
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Afficher la latence du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction<'cached'>, client: Client<true>) {
    await interaction.reply({ content: '🏓 Mesure en cours...', flags: MessageFlags.Ephemeral });
    const reply = await interaction.fetchReply();
    const rtt = reply.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply(
      `🏓 **Pong !**\n` +
      `• Latence message : \`${rtt} ms\`\n` +
      `• Latence WebSocket : \`${Math.round(client.ws.ping)} ms\``
    );
  }
};
