import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, queueEmbed } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription(base('queue.cmd.desc'))
      .setDescriptionLocalizations(frLoc('queue.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction, false);
    if (!player) return;
    return interaction.reply({ embeds: [queueEmbed(player)] });
  }
};
