import {
  ActionRowBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { findCategory, helpCategories, effectiveTier, type HelpCategory } from '../../data/help';
import { canSee, viewerTier, type Tier } from '../../utils/permissions';
import * as embeds from '../../utils/embeds';
import { base, frLoc, resolveLang, t, type Lang } from '../../i18n';

/** Valeur du menu correspondant à la vue d'ensemble. */
const HOME = '__home__';

/** Retourne `en` si la langue est EN et que la traduction existe, sinon `fr`. */
function pick<T>(lang: Lang, fr: T, en: T | undefined): T {
  return lang === 'en' && en !== undefined ? en : fr;
}

/** Catégories visibles pour un viewer donné (au moins une commande visible). */
function visibleCategories(viewer: Tier): HelpCategory[] {
  return helpCategories.filter((cat) =>
    cat.commands.some((cmd) => canSee(effectiveTier(cmd, cat), viewer))
  );
}

/** Menu déroulant de sélection d'une catégorie. */
export function categoryMenu(viewer: Tier, lang: Lang) {
  const cats = visibleCategories(viewer);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help:select')
      .setPlaceholder(t(lang, 'help.menu.placeholder'))
      .addOptions(
        {
          label: t(lang, 'help.menu.home.label'),
          description: t(lang, 'help.menu.home.desc'),
          value: HOME,
          emoji: '🏠'
        },
        ...cats.map((c) => ({
          label: pick(lang, c.label, c.labelEn),
          description: pick(lang, c.summary, c.summaryEn).slice(0, 100),
          value: c.id,
          emoji: c.emoji
        }))
      )
  );
}

/** Embed listant tous les modules avec leur résumé. */
export function overviewEmbed(viewer: Tier, lang: Lang) {
  const cats = visibleCategories(viewer);
  const total = cats.reduce((n, c) =>
    n + c.commands.filter((cmd) => canSee(effectiveTier(cmd, c), viewer)).length, 0);
  const tier =
    viewer === 'admin' ? t(lang, 'help.tier.admin')
    : viewer === 'staff' ? t(lang, 'help.tier.staff')
    : t(lang, 'help.tier.member');
  return embeds.primary()
    .setTitle(t(lang, 'help.overview.title'))
    .setDescription(t(lang, 'help.overview.desc', { total, cats: cats.length, tier }))
    .addFields(cats.map((c) => ({
      name: `${c.emoji} ${pick(lang, c.label, c.labelEn)}`,
      value: pick(lang, c.summary, c.summaryEn)
    })))
    .setFooter({ text: viewer === 'public'
      ? t(lang, 'help.overview.footer.public')
      : t(lang, 'help.overview.footer.staff') });
}

/** Embed détaillant les commandes d'une catégorie. */
export function helpEmbed(value: string, viewer: Tier, lang: Lang) {
  const cat = findCategory(value);
  if (!cat) return overviewEmbed(viewer, lang);

  const visible = cat.commands.filter((cmd) => canSee(effectiveTier(cmd, cat), viewer));
  if (!visible.length) return overviewEmbed(viewer, lang);

  const embed = embeds.primary()
    .setTitle(`${cat.emoji} ${pick(lang, cat.label, cat.labelEn)}`)
    .setDescription(pick(lang, cat.summary, cat.summaryEn))
    .addFields(visible.map((cmd) => ({
      name:  pick(lang, cmd.usage, cmd.usageEn),
      value: pick(lang, cmd.description, cmd.descriptionEn)
    })));
  embed.setFooter({ text: pick(lang, cat.tip, cat.tipEn) ?? t(lang, 'help.detail.footer') });
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription(base('help.cmd.desc'))
    .setDescriptionLocalizations(frLoc('help.cmd.desc')),
    // Volontairement sans setDefaultMemberPermissions : /help est public.

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const viewer = viewerTier(interaction.member);
    return interaction.reply({
      embeds: [overviewEmbed(viewer, lang)],
      components: [categoryMenu(viewer, lang)],
      flags: MessageFlags.Ephemeral
    });
  }
};
