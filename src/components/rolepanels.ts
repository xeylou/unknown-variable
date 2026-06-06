import type { ButtonInteraction } from 'discord.js';
import { performRolePanelsDelete } from '../commands/community/setup-roles';

/**
 * Composant « rolepanel:* » — confirmation de suppression des panneaux de
 * rôles à boutons déployés par /setup-roles.
 */
export default {
  prefix: 'rolepanel',

  async execute(interaction: ButtonInteraction<'cached'>) {
    const action = interaction.customId.split(':')[1];

    if (action === 'cancel-delete') {
      return interaction.update({ content: '✅ Suppression annulée.', components: [] });
    }

    if (action === 'confirm-delete') {
      await interaction.update({ content: '🗑️ Suppression en cours…', components: [] });
      const n = await performRolePanelsDelete(interaction.guild);
      return interaction.editReply(`🗑️ ${n} panneau(x) de rôles supprimé(s).`);
    }
  }
};
