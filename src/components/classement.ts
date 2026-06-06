import type { ButtonInteraction, Client } from 'discord.js';
import { performLeaderboardReset } from '../commands/community/classement';
import type { LeaderboardType } from '../features/leaderboards';

/**
 * Composant « classement:* » — confirmation de suppression d'un classement
 * (et réinitialisation des compteurs associés).
 */
export default {
  prefix: 'classement',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    const action = args[0];

    if (action === 'cancel-delete') {
      return interaction.update({ content: '✅ Suppression annulée.', components: [] });
    }

    if (action === 'confirm-delete') {
      const type = (args[1] as LeaderboardType | 'tout') ?? 'tout';
      await interaction.update({ content: '🗑️ Suppression en cours…', components: [] });
      const n = await performLeaderboardReset(interaction.guild, type);
      return interaction.editReply(`🗑️ ${n} classement(s) supprimé(s) et compteurs réinitialisés.`);
    }
  }
};
