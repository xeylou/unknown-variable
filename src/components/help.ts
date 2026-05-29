import type { StringSelectMenuInteraction } from 'discord.js';
import { helpEmbed, categoryMenu } from '../commands/utility/help';
import { viewerTier } from '../utils/permissions';

export default {
  prefix: 'help',

  /** Menu déroulant « help:select » : met à jour l'aide avec la catégorie choisie. */
  async execute(interaction: StringSelectMenuInteraction<'cached'>) {
    const value = interaction.values?.[0] ?? '';
    const viewer = viewerTier(interaction.member);
    return interaction.update({
      embeds: [helpEmbed(value, viewer)],
      components: [categoryMenu(viewer)]
    });
  }
};
