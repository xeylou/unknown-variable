import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription(base('shuffle.cmd.desc'))
      .setDescriptionLocalizations(frLoc('shuffle.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    if (player.queue.tracks.length < 2) {
      return interaction.reply({ content: 'ℹ️ Il faut au moins 2 titres en attente pour mélanger.', flags: MessageFlags.Ephemeral });
    }
    await player.queue.shuffle();
    return interaction.reply(`🔀 File mélangée — **${player.queue.tracks.length}** titres réorganisés.`);
  }
};
