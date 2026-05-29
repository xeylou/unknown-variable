import type { ButtonInteraction, Client } from 'discord.js';
import { PAGE_SIZE, buildCasierEmbed, casierRow } from '../commands/moderation/casier';
import { getSanctions } from '../utils/sanctions';

/**
 * Composant « casier:nav:<userId>:<page> » — navigation paginée du casier.
 */
export default {
  prefix: 'casier',

  async execute(interaction: ButtonInteraction<'cached'>, client: Client<true>, args: string[]) {
    if (args[0] !== 'nav') return;
    const userId = args[1];
    const page = Number(args[2]) || 0;

    const user = await client.users.fetch(userId).catch(() => null);
    const sanctions = user ? await getSanctions(interaction.guild.id, userId) : [];
    if (!user || !sanctions.length) {
      return interaction.update({ content: 'ℹ️ Casier vide ou introuvable.', embeds: [], components: [] });
    }

    const totalPages = Math.ceil(sanctions.length / PAGE_SIZE);
    const row = casierRow(userId, page, totalPages);
    return interaction.update({
      embeds: [buildCasierEmbed(sanctions, user, page)],
      components: row ? [row] : []
    });
  }
};
