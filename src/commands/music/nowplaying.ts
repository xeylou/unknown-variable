import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, nowPlayingEmbed, controlButtons } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Afficher le titre en cours de lecture'),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction, false);
    if (!player) return;
    return interaction.reply({ embeds: [nowPlayingEmbed(player)], components: controlButtons(player) });
  }
};
