import { MessageFlags, PermissionFlagsBits, type ButtonInteraction, type Client } from 'discord.js';
import { pendingImports, applyImport } from '../commands/moderation/backup';

export default {
  prefix: 'backup',

  async execute(interaction: ButtonInteraction<'cached'>, _client: Client<true>, args: string[]) {
    const action = args[0];

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Réservé aux administrateurs.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'cancel') {
      pendingImports.delete(interaction.user.id);
      return interaction.update({ content: '❌ Import annulé.', components: [] });
    }

    if (action === 'confirm') {
      const payload = pendingImports.get(interaction.user.id);
      if (!payload) {
        return interaction.update({ content: '⌛ Cette demande d\'import a expiré (5 min).', components: [] });
      }
      pendingImports.delete(interaction.user.id);
      try {
        await applyImport(interaction.guild.id, payload);
      } catch (e) {
        return interaction.update({
          content: `❌ Échec de l'import : ${e instanceof Error ? e.message : String(e)}`,
          components: []
        });
      }
      return interaction.update({
        content: '✅ Import appliqué. Penser à relancer `/setup-tickets`, `/setup-reglement` et ' +
                 '`/setup-roles` si vous avez restauré sur un nouveau serveur (les message_id changent).',
        components: []
      });
    }
  }
};
