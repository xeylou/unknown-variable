import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, queueEmbed } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription("Afficher la file d'attente"),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction, false);
    if (!player) return;
    return interaction.reply({ embeds: [queueEmbed(player)] });
  }
};
