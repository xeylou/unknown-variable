import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../database';
import config from '../config';
import type { suggestions as SuggestionRow } from '@prisma/client';

const STATUS: Record<string, { label: string; color: number }> = {
  pending:  { label: '⏳ En attente', color: config.colors.warning },
  approved: { label: '✅ Approuvée',  color: config.colors.success },
  denied:   { label: '❌ Refusée',    color: config.colors.danger }
};

/** Compte les votes pour/contre d'une suggestion. */
async function counts(suggestionId: number): Promise<{ up: number; down: number }> {
  const up = await prisma.suggestion_votes.count({
    where: { suggestion_id: suggestionId, vote: 1 }
  });
  const down = await prisma.suggestion_votes.count({
    where: { suggestion_id: suggestionId, vote: -1 }
  });
  return { up, down };
}

/** Construit l'embed d'une suggestion. */
async function buildEmbed(s: SuggestionRow): Promise<EmbedBuilder> {
  const { up, down } = await counts(s.id);
  const st = STATUS[s.status] || STATUS.pending;
  const fields = [
    { name: 'Auteur', value: `<@${s.author_id}>`, inline: true },
    { name: 'Statut', value: st.label, inline: true },
    { name: 'Votes', value: `👍 ${up}  •  👎 ${down}`, inline: true }
  ];
  if (s.tag) fields.push({ name: 'Catégorie', value: `\`${s.tag}\``, inline: true });
  return new EmbedBuilder()
    .setColor(st.color)
    .setAuthor({ name: `Suggestion #${s.id}` })
    .setDescription(s.content)
    .addFields(fields)
    .setFooter({ text: '💡 Propose la tienne avec /suggestion' })
    .setTimestamp(s.created_at);
}

/** Construit la ligne de boutons d'une suggestion. */
function buildRow(s: SuggestionRow): ActionRowBuilder<ButtonBuilder> {
  const closed = s.status !== 'pending';
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`suggestion:up:${s.id}`).setEmoji('👍')
      .setStyle(ButtonStyle.Success).setDisabled(closed),
    new ButtonBuilder().setCustomId(`suggestion:down:${s.id}`).setEmoji('👎')
      .setStyle(ButtonStyle.Danger).setDisabled(closed),
    new ButtonBuilder().setCustomId(`suggestion:approve:${s.id}`).setLabel('Approuver')
      .setStyle(ButtonStyle.Secondary).setDisabled(closed),
    new ButtonBuilder().setCustomId(`suggestion:deny:${s.id}`).setLabel('Refuser')
      .setStyle(ButtonStyle.Secondary).setDisabled(closed)
  );
}

export { buildEmbed, buildRow, counts, STATUS }
