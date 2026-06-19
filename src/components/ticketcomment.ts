import {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  MessageFlags,
  type ButtonInteraction, type ModalSubmitInteraction, type Client
} from 'discord.js';
import { prisma } from '../database';
import * as embeds from '../utils/embeds';
import { getTicketLogsChannel } from '../utils/guildSettings';
import { categoryLabel } from '../utils/ticketScope';
import type { ComponentInteraction } from '../types';

/** Longueur max du commentaire utilisateur (limite du TextInput Discord). */
const MAX_LEN = 1000;

/**
 * Composant « ticketcomment:* » :
 *  - `open:<channelId>`   → bouton DM → ouvre la modale de commentaire
 *  - `submit:<channelId>` → soumission de la modale → persiste + log staff
 *
 * Marqué `dmFriendly` car le DM de fermeture envoie le bouton hors-guilde.
 * Le handler n'accède jamais à `interaction.guild` directement — on retrouve
 * la guilde via `client.guilds.cache.get(ticket.guild_id)`.
 */
export default {
  prefix: 'ticketcomment',
  dmFriendly: true,

  async execute(interaction: ComponentInteraction, client: Client<true>, args: string[]) {
    const action = args[0];
    const channelId = args[1];
    if (!channelId) return;

    if (action === 'open') {
      if (!interaction.isButton()) return;
      return openModal(interaction as unknown as ButtonInteraction, channelId);
    }
    if (action === 'submit') {
      if (!interaction.isModalSubmit()) return;
      return saveComment(interaction as unknown as ModalSubmitInteraction, client, channelId);
    }
  }
};

async function openModal(interaction: ButtonInteraction, channelId: string) {
  const modal = new ModalBuilder()
    .setCustomId(`ticketcomment:submit:${channelId}`)
    .setTitle('Votre retour sur ce ticket');

  const input = new TextInputBuilder()
    .setCustomId('commentaire')
    .setLabel('Commentaire libre')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(MAX_LEN)
    .setRequired(true)
    .setPlaceholder("Qu'avez-vous pensé de la prise en charge ? Suggestions, remarques…");

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  return interaction.showModal(modal);
}

async function saveComment(
  interaction: ModalSubmitInteraction,
  client: Client<true>,
  channelId: string
) {
  const ticket = await prisma.tickets.findUnique({ where: { channel_id: channelId } });
  if (!ticket) {
    return interaction.reply({
      content: "❌ Ce ticket n'existe plus en base — impossible d'enregistrer le commentaire.",
      flags: MessageFlags.Ephemeral
    });
  }

  const comment = interaction.fields.getTextInputValue('commentaire').trim();
  if (!comment) {
    return interaction.reply({
      content: '❌ Commentaire vide — annulé.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Écrasement silencieux si déjà commenté : l'utilisateur a le droit
  // de réviser son retour sans cérémonie.
  await prisma.tickets.update({
    where: { channel_id: channelId },
    data: { comment }
  });

  // Log dans le salon des logs tickets — résolu DANS le serveur du ticket
  // (jamais via `client.channels.fetch`, qui résoudrait globalement).
  const logsChannelId = getTicketLogsChannel(ticket.guild_id);
  const guild = client.guilds.cache.get(ticket.guild_id);
  if (logsChannelId && guild) {
    const logs = await guild.channels.fetch(logsChannelId).catch(() => null);
    if (logs && logs.isTextBased() && 'send' in logs) {
      const quoted = comment.slice(0, 900).replace(/\n/g, '\n> ');
      const truncatedNote = comment.length > 900 ? '\n*(tronqué — texte complet via `/ticket-reviews`)*' : '';
      await logs.send({
        embeds: [embeds.primary()
          .setAuthor({ name: '💬 Commentaire de ticket' })
          .setDescription(
            `Ticket **#${ticket.number ?? '?'}** — ${categoryLabel(ticket.category)} · ` +
            `par <@${ticket.user_id}>\n\n> ${quoted}${truncatedNote}`
          )
          .setTimestamp()],
        allowedMentions: { parse: [] }
      }).catch(() => {});
    }
  }

  return interaction.reply({
    content: "✅ Merci pour votre retour ! Le commentaire a bien été transmis à l'équipe.",
    flags: MessageFlags.Ephemeral
  });
}
