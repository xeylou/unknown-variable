import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction, type EmbedBuilder
} from 'discord.js';
import { prisma } from '../../database';
import { requireStaff } from '../../utils/permissions';
import { categoryLabel } from '../../utils/ticketScope';
import * as embeds from '../../utils/embeds';
import config from '../../config';
import type { tickets as TicketRow } from '@prisma/client';
import { base, frLoc } from '../../i18n';

/** Nombre de tickets affichés par page (équilibre densité / lisibilité). */
const PAGE_SIZE = 5;
/** Cap dur de récupération — limite la mémoire si serveur très ancien. */
const QUERY_CAP = 500;
/** TTL d'une session de pagination — recalculer si dépassé. */
const SESSION_TTL_MS = 5 * 60_000;

interface Session {
  results: TicketRow[];
  filters: FilterSummary;
  expiresAt: number;
}

/**
 * Cache des résultats d'une recherche, indexé par l'`interaction.id` de la
 * commande initiale. Évite de relancer la requête Prisma à chaque clic de
 * navigation. Purge passive via le TTL.
 */
export const reviewSessions = new Map<string, Session>();

/** Purge périodique des sessions expirées (croissance bornée). */
function cleanupSessions() {
  const now = Date.now();
  for (const [k, v] of reviewSessions) if (v.expiresAt <= now) reviewSessions.delete(k);
}

const categoryChoices = config.tickets.categories.map((c) => ({ name: c.label, value: c.value }));

export default {
  data: new SlashCommandBuilder()
    .setName('ticket-reviews')
    .setDescription(base('ticketreviews.cmd.desc'))
      .setDescriptionLocalizations(frLoc('ticketreviews.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription(base('ticketreviews.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('ticketreviews.opt.member.desc')))
    .addStringOption((o) => o.setName('categorie').setDescription(base('ticketreviews.opt.categorie.desc'))
      .setDescriptionLocalizations(frLoc('ticketreviews.opt.categorie.desc'))
      .addChoices(...categoryChoices))
    .addIntegerOption((o) => o.setName('rating-min')
      .setDescription(base('ticketreviews.opt.ratingmin.desc'))
      .setDescriptionLocalizations(frLoc('ticketreviews.opt.ratingmin.desc')).setMinValue(1).setMaxValue(5)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireStaff(interaction)) return;
    cleanupSessions();

    const userId = interaction.options.getUser('membre')?.id;
    const category = interaction.options.getString('categorie');
    const ratingMin = interaction.options.getInteger('rating-min');

    const results = await prisma.tickets.findMany({
      where: {
        guild_id: interaction.guild.id,
        status: 'closed',
        // On veut au moins une donnée d'avis exploitable.
        OR: [{ rating: { not: null } }, { comment: { not: null } }],
        ...(userId ? { user_id: userId } : {}),
        ...(category ? { category } : {}),
        ...(ratingMin !== null ? { rating: { gte: ratingMin } } : {})
      },
      orderBy: { closed_at: 'desc' },
      take: QUERY_CAP
    });

    if (!results.length) {
      return interaction.reply({
        embeds: [embeds.neutral('ℹ️ Aucun avis ni commentaire ne correspond à ces filtres.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const filters: FilterSummary = { userId, category, ratingMin };
    reviewSessions.set(interaction.id, {
      results,
      filters,
      expiresAt: Date.now() + SESSION_TTL_MS
    });

    return interaction.reply({
      embeds: [buildPageEmbed(results, 0, filters)],
      components: navRow(interaction.id, 0, results.length),
      flags: MessageFlags.Ephemeral
    });
  }
};

export interface FilterSummary {
  userId?: string;
  category?: string | null;
  ratingMin?: number | null;
}

/** Construit l'embed d'une page (page 0-indexée). */
export function buildPageEmbed(
  results: TicketRow[],
  page: number,
  filters: FilterSummary
): EmbedBuilder {
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const p = Math.min(Math.max(0, page), totalPages - 1);
  const slice = results.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);

  const lines = slice.map(formatTicketLine).join('\n\n') || '*(vide)*';
  const filterParts: string[] = [];
  if (filters.userId) filterParts.push(`membre <@${filters.userId}>`);
  if (filters.category) filterParts.push(`catégorie **${categoryLabel(filters.category)}**`);
  if (filters.ratingMin) filterParts.push(`note ≥ ${filters.ratingMin}`);
  const filterLine = filterParts.length ? `*Filtres : ${filterParts.join(' · ')}*\n\n` : '';

  return embeds.primary()
    .setTitle('💬 Avis & commentaires de tickets')
    .setDescription(filterLine + lines)
    .setFooter({ text: `Page ${p + 1}/${totalPages} · ${results.length} ticket(s) au total` });
}

/** Une ligne formatée pour un ticket : meta + commentaire en blockquote. */
function formatTicketLine(t: TicketRow): string {
  const closed = t.closed_at ? `<t:${Math.floor(t.closed_at / 1000)}:R>` : 'date inconnue';
  const stars = t.rating ? `${'⭐'.repeat(t.rating)} (${t.rating}/5)` : '*pas de note*';
  const meta = `**Ticket #${t.number ?? '?'}** · ${categoryLabel(t.category)} · <@${t.user_id}> · ${stars} · clos ${closed}`;
  if (t.comment) {
    const truncated = t.comment.length > 250 ? t.comment.slice(0, 247) + '…' : t.comment;
    return `${meta}\n> ${truncated.replace(/\n/g, '\n> ')}`;
  }
  return meta;
}

/** Construit la rangée de navigation, ou aucune ligne si une seule page. */
export function navRow(token: string, page: number, total: number): ActionRowBuilder<ButtonBuilder>[] {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return [];
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticketreviews:nav:${page - 1}:${token}`)
      .setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`ticketreviews:nav:${page + 1}:${token}`)
      .setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  )];
}
