import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription("Arrêter la lecture, vider la file et quitter le salon vocal"),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    await player.destroy('Arrêté par un utilisateur');
    return interaction.reply('⏹️ Lecture arrêtée, file vidée — je quitte le salon vocal.');
  }
};
