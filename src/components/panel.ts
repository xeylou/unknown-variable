import type { ButtonInteraction, Client } from 'discord.js';
import { performPanelTeardown, PANEL_KINDS, type PanelKind } from '../utils/panels';

/**
 * Composant « panel:* » — confirmation de suppression d'un panneau setup-*
 * (règlement, tickets, captcha, reaction-roles) avec réinitialisation des
 * réglages associés. Partagé par toutes ces commandes.
 */
export default {
  prefix: 'panel',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    if (args[0] === 'cancel-delete') {
      return interaction.update({ content: '✅ Suppression annulée.', components: [] });
    }

    if (args[0] === 'confirm-delete') {
      const kind = args[1] as PanelKind;
      if (!(kind in PANEL_KINDS)) {
        return interaction.update({ content: '❌ Type de panneau inconnu.', components: [] });
      }
      await interaction.update({ content: '🗑️ Suppression en cours…', components: [] });
      const n = await performPanelTeardown(interaction.guild, kind);
      return interaction.editReply(
        `🗑️ ${PANEL_KINDS[kind].label} : ${n} message(s) supprimé(s) et réglages réinitialisés.`
      );
    }
  }
};
