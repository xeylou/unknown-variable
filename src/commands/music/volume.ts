import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, MAX_VOLUME } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Régler le volume de lecture')
    .addIntegerOption((o) => o.setName('niveau')
      .setDescription(`Volume en pourcentage (0 à ${MAX_VOLUME})`)
      .setMinValue(0).setMaxValue(MAX_VOLUME).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const niveau = interaction.options.getInteger('niveau', true);
    await player.setVolume(niveau);
    return interaction.reply(`🔊 Volume réglé à **${niveau}%**.`);
  }
};
