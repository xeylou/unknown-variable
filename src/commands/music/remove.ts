import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription("Retirer un titre de la file d'attente")
    .addIntegerOption((o) => o.setName('position')
      .setDescription('Position du titre dans la file (voir /queue)')
      .setMinValue(1).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const position = interaction.options.getInteger('position', true);
    if (position > player.queue.tracks.length) {
      return interaction.reply({
        content: `❌ La file ne contient que ${player.queue.tracks.length} titre(s) en attente.`,
        flags: MessageFlags.Ephemeral
      });
    }
    const removed = player.queue.tracks[position - 1];
    await player.queue.splice(position - 1, 1);
    return interaction.reply(`🗑️ Titre retiré de la file : **${removed?.info?.title ?? '—'}**`);
  }
};
