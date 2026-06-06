import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, nowPlayingEmbed, controlButtons } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription(base('nowplaying.cmd.desc'))
    .setDescriptionLocalizations(frLoc('nowplaying.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction, false);
    if (!player) return;
    return interaction.reply({ embeds: [nowPlayingEmbed(player)], components: controlButtons(player) });
  }
};
