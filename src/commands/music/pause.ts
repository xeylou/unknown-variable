import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Mettre la lecture en pause'),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    if (player.paused) {
      return interaction.reply({ content: 'ℹ️ La lecture est déjà en pause.', flags: MessageFlags.Ephemeral });
    }
    await player.pause();
    return interaction.reply('⏸️ Lecture mise en pause.');
  }
};
