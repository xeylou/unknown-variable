import { MessageFlags, type Client } from 'discord.js';
import { reviewSessions, buildPageEmbed, navRow } from '../commands/tickets/ticket-reviews';
import type { ComponentInteraction } from '../types';

/**
 * Composant « ticketreviews:nav:<page>:<token> » — pagination de l'embed
 * produit par `/ticket-reviews`. Le token est l'`interaction.id` de la
 * commande initiale, qui sert de clé dans `reviewSessions`. Si la session a
 * expiré (TTL 5 min), on demande à l'utilisateur de relancer.
 */
export default {
  prefix: 'ticketreviews',

  async execute(interaction: ComponentInteraction, _client: Client<true>, args: string[]) {
    if (!interaction.isButton()) return;
    if (args[0] !== 'nav') return;

    const page = Number(args[1]);
    const token = args[2];
    if (!Number.isFinite(page) || !token) return;

    const session = reviewSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      reviewSessions.delete(token);
      return interaction.reply({
        content: '⌛ Cette session de pagination a expiré. Relance `/ticket-reviews`.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.update({
      embeds: [buildPageEmbed(session.results, page, session.filters)],
      components: navRow(token, page, session.results.length)
    });
  }
};
