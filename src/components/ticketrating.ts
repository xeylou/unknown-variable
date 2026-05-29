import { EmbedBuilder, type ButtonInteraction, type Client } from 'discord.js';
import { prisma } from '../database';
import { sendLog } from '../features/logger';
import config from '../config';

export default {
  prefix: 'ticketrating',
  // Les boutons de notation 1-5 étoiles sont envoyés en DM au membre à la
  // fermeture du ticket.
  dmFriendly: true,

  async execute(interaction: ButtonInteraction, client: Client<true>, args: string[]) {
    const [channelId, starsStr] = args;
    const stars = Number(starsStr);

    const ticket = await prisma.tickets.findUnique({ where: { channel_id: channelId } });
    if (!ticket) {
      return interaction.update({ content: 'Ce ticket n\'existe plus.', embeds: [], components: [] });
    }

    await prisma.tickets.update({
      where: { channel_id: channelId },
      data: { rating: stars }
    });

    await interaction.update({
      content: `Merci pour votre retour ! Note enregistrée : ${'⭐'.repeat(stars)}`,
      embeds: [],
      components: []
    });

    const guild = client.guilds.cache.get(ticket.guild_id);
    if (guild) {
      sendLog(guild, 'moderation', new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: 'Ticket noté' })
        .setDescription(
          `Ticket #${ticket.number ?? '?'} noté ${'⭐'.repeat(stars)} (**${stars}/5**) ` +
          `par <@${ticket.user_id}>.`
        )
        .setTimestamp());
    }
  }
};
