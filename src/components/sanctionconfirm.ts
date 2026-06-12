import { type ButtonInteraction, type Client } from 'discord.js';
import { takePending, clearPending } from '../utils/sanctionConfirm';
import { createLogger } from '../utils/logger';

const log = createLogger('sanctionconfirm');

/**
 * Confirmation des sanctions du staff (warn / ban / kick / timeout / softban).
 * Les boutons sont posés par `confirmSanction` sur un message éphémère ; la
 * sanction reste en attente jusqu'au clic sur « Confirmer », exécutée ici.
 *
 * Le récap éphémère étant propre à chaque modérateur, la sanction en attente
 * est indexée sur son id : un autre membre ne peut pas confirmer à sa place.
 */
export default {
  prefix: 'sanctionconfirm',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    const action = args[0];

    if (action === 'cancel') {
      clearPending(interaction.user.id);
      return interaction.update({ content: '❌ Sanction annulée.', embeds: [], components: [] });
    }

    if (action === 'confirm') {
      const p = takePending(interaction.user.id);
      if (!p) {
        return interaction.update({
          content: '⌛ Cette confirmation a expiré (2 min). Relance la commande.',
          embeds: [], components: []
        });
      }

      // Accusé de réception immédiat (la sanction peut prendre > 3 s : DM, ban…).
      await interaction.update({ content: '⏳ Application en cours…', embeds: [], components: [] });
      try {
        const result = await p.run();
        await interaction.editReply({ content: '✅ Sanction appliquée.', embeds: [], components: [] });
        // Annonce publique du résultat, comme le faisaient les commandes.
        await interaction.followUp({ content: result });
      } catch (e) {
        log.warn('sanction run failed', e);
        await interaction.editReply({
          content: `❌ Échec de l'application : ${e instanceof Error ? e.message : String(e)}`,
          embeds: [], components: []
        });
      }
    }
  }
};
