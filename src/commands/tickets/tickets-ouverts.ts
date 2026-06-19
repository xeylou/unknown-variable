import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { categoriesVisibleTo, categoryLabel } from '../../utils/ticketScope';
import * as embeds from '../../utils/embeds';
import config from '../../config';
import type { tickets as TicketRow } from '@prisma/client';
import { base, frLoc } from '../../i18n';

/** Cap dur de récupération — au-delà, le serveur a un problème de fond. */
const QUERY_CAP = 250;
/** Max de tickets affichés par catégorie (1 field d'embed = 1024 chars). */
const MAX_PER_CATEGORY = 10;
/** Max de catégories affichées (limite Discord : 25 fields). */
const MAX_CATEGORIES = 25;

const categoryChoices = config.tickets.categories.map((c) => ({ name: c.label, value: c.value }));

export default {
  data: new SlashCommandBuilder()
    .setName('tickets-ouverts')
    .setDescription(base('ticketsouverts.cmd.desc'))
      .setDescriptionLocalizations(frLoc('ticketsouverts.cmd.desc'))
    // ManageMessages rend la commande visible par staff + ticket-staff
    // (qui obtiennent cette perm via `/permissions grant-ticket-staff`).
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('categorie')
      .setDescription(base('ticketsouverts.opt.categorie.desc'))
      .setDescriptionLocalizations(frLoc('ticketsouverts.opt.categorie.desc'))
      .addChoices(...categoryChoices))
    .addUserOption((o) => o.setName('membre').setDescription(base('ticketsouverts.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('ticketsouverts.opt.member.desc')))
    .addBooleanOption((o) => o.setName('pris-en-charge')
      .setDescription(base('ticketsouverts.opt.claimed.desc'))
      .setDescriptionLocalizations(frLoc('ticketsouverts.opt.claimed.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    // Filtrage par rôle : un staff général voit tout, un ticket-staff voit
    // uniquement les catégories dont il porte le `staffRoleId`.
    const allowed = categoriesVisibleTo(interaction.member);
    if (allowed.length === 0) {
      return interaction.reply({
        content: '⛔ Vous n\'êtes ni staff ni ticket-staff d\'aucune catégorie configurée. ' +
          'Demander à un admin un rôle responsable de catégorie.',
        flags: MessageFlags.Ephemeral
      });
    }

    const categoryFilter = interaction.options.getString('categorie');
    if (categoryFilter && !allowed.includes(categoryFilter)) {
      return interaction.reply({
        content: `⛔ Vous n'avez pas accès à la catégorie **${categoryLabel(categoryFilter)}**.`,
        flags: MessageFlags.Ephemeral
      });
    }
    const finalCategories = categoryFilter ? [categoryFilter] : allowed;

    const memberFilter = interaction.options.getUser('membre');
    const claimFilter = interaction.options.getBoolean('pris-en-charge'); // null = pas de filtre

    const rows = await prisma.tickets.findMany({
      where: {
        guild_id: interaction.guild.id,
        status: 'open',
        category: { in: finalCategories },
        ...(memberFilter ? { user_id: memberFilter.id } : {}),
        ...(claimFilter === null
          ? {}
          : claimFilter
            ? { claimed_by: { not: null } }
            : { claimed_by: null })
      },
      orderBy: [{ category: 'asc' }, { created_at: 'asc' }],
      take: QUERY_CAP
    });

    if (rows.length === 0) {
      return interaction.reply({
        embeds: [embeds.neutral('ℹ️ Aucun ticket ouvert ne correspond à ces filtres dans vos catégories.')],
        flags: MessageFlags.Ephemeral
      });
    }

    // Groupe les tickets par catégorie en préservant l'ordre alpha de la query.
    const grouped = new Map<string, TicketRow[]>();
    for (const t of rows) {
      const key = t.category ?? '_unknown';
      const bucket = grouped.get(key) ?? [];
      bucket.push(t);
      grouped.set(key, bucket);
    }

    const embed = embeds.primary()
      .setTitle('🎫 Tickets ouverts')
      .setTimestamp();

    const filterBits: string[] = [];
    if (memberFilter) filterBits.push(`membre ${memberFilter}`);
    if (claimFilter === true) filterBits.push('pris en charge');
    if (claimFilter === false) filterBits.push('non pris en charge');
    if (categoryFilter) filterBits.push(`catégorie **${categoryLabel(categoryFilter)}**`);
    if (filterBits.length) embed.setDescription(`*Filtres : ${filterBits.join(' · ')}*`);

    let truncatedCategories = 0;
    let fieldCount = 0;
    for (const [catValue, bucket] of grouped) {
      if (fieldCount >= MAX_CATEGORIES) { truncatedCategories++; continue; }
      const shown = bucket.slice(0, MAX_PER_CATEGORY).map(formatTicketLine).join('\n');
      const extra = bucket.length > MAX_PER_CATEGORY
        ? `\n*… +${bucket.length - MAX_PER_CATEGORY} de plus*`
        : '';
      embed.addFields({
        name: `${categoryLabel(catValue)} — ${bucket.length}`,
        value: shown + extra
      });
      fieldCount++;
    }

    const footerParts: string[] = [`${rows.length} ticket(s) ouvert(s)`];
    if (rows.length >= QUERY_CAP) footerParts.push(`limite ${QUERY_CAP} atteinte`);
    if (truncatedCategories) footerParts.push(`+${truncatedCategories} catégorie(s) tronquée(s)`);
    embed.setFooter({ text: footerParts.join(' · ') });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};

/** Format d'une ligne de ticket dans un field. */
function formatTicketLine(t: TicketRow): string {
  const opened = `<t:${Math.floor(t.created_at / 1000)}:R>`;
  const claim = t.claimed_by ? `<@${t.claimed_by}>` : '*non pris*';
  return `• **#${t.number ?? '?'}** — <#${t.channel_id}> · <@${t.user_id}> · ouvert ${opened} · pris : ${claim}`;
}
