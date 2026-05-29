import type { ButtonInteraction } from 'discord.js';
import { performStatsDelete } from '../commands/community/stats';

/**
 * Composant « stats:* » — confirmation de suppression de la catégorie statistique.
 */
export default {
  prefix: 'stats',

  async execute(interaction: ButtonInteraction<'cached'>) {
    const action = interaction.customId.split(':')[1];

    if (action === 'cancel-delete') {
      return interaction.update({ content: '✅ Suppression annulée.', components: [] });
    }

    if (action === 'confirm-delete') {
      await interaction.update({ content: '🗑️ Suppression en cours…', components: [] });
      await performStatsDelete(interaction.guild);
      return interaction.editReply('🗑️ Catégorie statistique et compteurs supprimés.');
    }
  }
};
