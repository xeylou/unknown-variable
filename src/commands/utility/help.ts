import {
  ActionRowBuilder,
  MessageFlags, PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { findCategory, helpCategories, effectiveTier, type HelpCategory } from '../../data/help';
import { canSee, isStaff, isTicketStaff, viewerTier, type Tier } from '../../utils/permissions';
import * as embeds from '../../utils/embeds';

/** Valeur du menu correspondant à la vue d'ensemble. */
const HOME = '__home__';

/** Catégories visibles pour un viewer donné (au moins une commande visible). */
function visibleCategories(viewer: Tier): HelpCategory[] {
  return helpCategories.filter((cat) =>
    cat.commands.some((cmd) => canSee(effectiveTier(cmd, cat), viewer))
  );
}

/** Menu déroulant de sélection d'une catégorie (réutilisé sur chaque vue). */
export function categoryMenu(viewer: Tier) {
  const cats = visibleCategories(viewer);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help:select')
      .setPlaceholder('📂 Choisir une catégorie…')
      .addOptions(
        { label: "Vue d'ensemble", description: 'Revenir à la liste des modules', value: HOME, emoji: '🏠' },
        ...cats.map((c) => ({
          label: c.label,
          description: c.summary.slice(0, 100),
          value: c.id,
          emoji: c.emoji
        }))
      )
  );
}

/** Embed listant tous les modules avec leur résumé. */
export function overviewEmbed(viewer: Tier) {
  const cats = visibleCategories(viewer);
  const total = cats.reduce((n, c) =>
    n + c.commands.filter((cmd) => canSee(effectiveTier(cmd, c), viewer)).length, 0);
  const tierLabel = viewer === 'admin' ? 'administrateur' : viewer === 'staff' ? 'staff' : 'membre';
  return embeds.primary()
    .setTitle('📖 Inventaire des commandes')
    .setDescription(
      `**${total} commandes** dans **${cats.length} modules** accessibles à ton niveau (${tierLabel}).\n` +
      'Choisis une catégorie dans le menu déroulant pour voir l\'usage de chaque commande.'
    )
    .addFields(
      cats.map((c) => ({ name: `${c.emoji} ${c.label}`, value: c.summary }))
    )
    .setFooter({ text: viewer === 'public'
      ? 'Certaines commandes ne sont visibles qu\'aux membres du staff ou de l\'administration.'
      : 'Tu vois uniquement les commandes que ton rôle peut utiliser.' });
}

/** Embed détaillant les commandes d'une catégorie (ou la vue d'ensemble si inconnue). */
export function helpEmbed(value: string, viewer: Tier) {
  const cat = findCategory(value);
  if (!cat) return overviewEmbed(viewer);

  const visible = cat.commands.filter((cmd) => canSee(effectiveTier(cmd, cat), viewer));
  if (!visible.length) {
    // Catégorie entièrement filtrée : on retombe sur la vue d'ensemble.
    return overviewEmbed(viewer);
  }

  const embed = embeds.primary()
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(cat.summary)
    .addFields(
      visible.map((cmd) => ({ name: cmd.usage, value: cmd.description }))
    );
  embed.setFooter({ text: cat.tip ?? 'Sélectionne « Vue d\'ensemble » pour revenir à la liste.' });
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher les commandes du bot (réservé staff/admin/ticket-staff)')
    // ManageMessages plutôt que ModerateMembers : `/permissions grant-ticket-staff`
    // accorde cette perm aux rôles de catégories, qui peuvent ainsi voir /help
    // dans l'auto-complétion. Le runtime check refuse quand même les joueurs.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!isStaff(interaction.member) && !isTicketStaff(interaction.member)) {
      return interaction.reply({
        content: '⛔ /help est réservé au staff, à l\'administration et aux équipes responsables de catégories de tickets.',
        flags: MessageFlags.Ephemeral
      });
    }
    const viewer = viewerTier(interaction.member);
    return interaction.reply({
      embeds: [overviewEmbed(viewer)],
      components: [categoryMenu(viewer)],
      flags: MessageFlags.Ephemeral
    });
  }
};
