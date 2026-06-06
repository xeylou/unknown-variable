import type { StringSelectMenuInteraction } from 'discord.js';
import { helpEmbed, categoryMenu } from '../commands/utility/help';
import { viewerTier } from '../utils/permissions';
import { resolveLang } from '../i18n';

export default {
  prefix: 'help',

  /** Menu déroulant « help:select » : met à jour l'aide avec la catégorie choisie. */
  async execute(interaction: StringSelectMenuInteraction<'cached'>) {
    const value = interaction.values?.[0] ?? '';
    const viewer = viewerTier(interaction.member);
    const lang = resolveLang(interaction.locale);
    return interaction.update({
      embeds: [helpEmbed(value, viewer, lang)],
      components: [categoryMenu(viewer, lang)]
    });
  }
};
