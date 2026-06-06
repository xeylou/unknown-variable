import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type Client
} from 'discord.js';
import { pendingEmbeds } from '../commands/utility/embed';
import { safeMentionAllowed } from '../utils/mentions';
import { parseColor } from '../utils/colors';
import config from '../config';
import type { ComponentInteraction } from '../types';

/** Texte de mention construit depuis une liste d'identifiants de rôle. */
function mentionText(roleIds: string[], guildId: string) {
  if (!roleIds.length) return null;
  return roleIds.map((id) => (id === guildId ? '@everyone' : `<@&${id}>`)).join(' ');
}

export default {
  prefix: 'embed',

  async execute(interaction: ComponentInteraction, _client: Client<true>, args: string[]) {
    const action = args[0];

    // --- Annulation ---
    if (action === 'cancel') {
      if (!interaction.isButton()) return;
      pendingEmbeds.delete(interaction.user.id);
      return interaction.update({ content: '❌ Envoi annulé.', embeds: [], components: [] });
    }

    const pending = pendingEmbeds.get(interaction.user.id);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingEmbeds.delete(interaction.user.id);
      return interaction.reply({
        content: '⌛ Cette composition a expiré. Relance `/embed`.',
        flags: MessageFlags.Ephemeral
      });
    }

    // --- Soumission du formulaire → aperçu ---
    if (action === 'compose') {
      if (!interaction.isModalSubmit()) return;
      const title = interaction.fields.getTextInputValue('titre').trim();
      const description = interaction.fields.getTextInputValue('description');
      const colorRaw = interaction.fields.getTextInputValue('couleur').trim();
      const image = interaction.fields.getTextInputValue('image').trim();
      const footer = interaction.fields.getTextInputValue('footer').trim();

      // Limite globale de Discord : 6000 caractères pour tout l'embed
      const total = title.length + description.length + footer.length;
      if (total > 6000) {
        return interaction.reply({
          content: `❌ L'embed dépasse la limite de **6000 caractères** (${total}). Raccourcis le texte.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const embed = new EmbedBuilder().setDescription(description.slice(0, 4096));
      if (title) embed.setTitle(title.slice(0, 256));
      embed.setColor(parseColor(colorRaw) ?? config.colors.primary);
      if (image && /^https?:\/\//i.test(image)) embed.setImage(image);
      if (footer) embed.setFooter({ text: footer.slice(0, 2048) });

      pending.embed = embed;

      const mentions = mentionText(pending.roleIds, interaction.guild.id);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('embed:confirm')
          .setLabel('Envoyer').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed:cancel')
          .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({
        content: `**Aperçu** — sera envoyé dans <#${pending.channelId}>` +
          (mentions ? `\n**Mentions :** ${mentions}` : ''),
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }

    // --- Confirmation → envoi ---
    if (action === 'confirm') {
      if (!interaction.isButton()) return;
      if (!pending.embed) {
        return interaction.update({ content: '❌ Aucun embed à envoyer.', embeds: [], components: [] });
      }
      const channel = interaction.guild!.channels.cache.get(pending.channelId);
      if (!channel?.isTextBased() || !('send' in channel)) {
        pendingEmbeds.delete(interaction.user.id);
        return interaction.update({ content: '❌ Le salon cible est introuvable.', embeds: [], components: [] });
      }

      // Filtre les mentions selon les permissions effectives de l'utilisateur :
      // pour mentionner @everyone, il faut avoir explicitement la permission,
      // même si ManageMessages permet d'utiliser la commande.
      const allowed = safeMentionAllowed(interaction.member, pending.roleIds, interaction.guild!.id);
      const displayedRoleIds = allowed.everyoneBlocked
        ? pending.roleIds.filter((id: string) => id !== interaction.guild!.id)
        : pending.roleIds;
      const content = mentionText(displayedRoleIds, interaction.guild!.id) ?? undefined;

      const sent = await channel.send({
        content,
        embeds: [pending.embed],
        allowedMentions: { roles: allowed.roles, parse: allowed.parse }
      }).catch(() => null);

      pendingEmbeds.delete(interaction.user.id);
      if (!sent) {
        return interaction.update({ content: "❌ Échec de l'envoi (permissions manquantes ?).", embeds: [], components: [] });
      }
      const notice = allowed.everyoneBlocked
        ? "\n*Mention `@everyone` retirée — il vous faut la permission « Mentionner @everyone, @here et tous les rôles ».*"
        : '';
      return interaction.update({
        content: `✅ Embed envoyé dans ${channel} — [voir le message](${sent.url}).${notice}`,
        embeds: [],
        components: []
      });
    }
  }
};
