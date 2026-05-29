import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer, formatDuration } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Se déplacer à un instant précis du titre en cours')
    .addIntegerOption((o) => o.setName('secondes')
      .setDescription('Position en secondes depuis le début')
      .setMinValue(0).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const track = player.queue.current;
    if (track?.info?.isStream) {
      return interaction.reply({
        content: '❌ Impossible de se déplacer dans une diffusion en direct.',
        flags: MessageFlags.Ephemeral
      });
    }
    const ms = interaction.options.getInteger('secondes', true) * 1000;
    if (ms > (track?.info?.duration ?? 0)) {
      return interaction.reply({
        content: `❌ Le titre ne dure que ${formatDuration(track?.info?.duration ?? 0)}.`,
        flags: MessageFlags.Ephemeral
      });
    }
    await player.seek(ms);
    return interaction.reply(`⏱️ Position définie à **${formatDuration(ms)}**.`);
  }
};
