import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription("Vider la file d'attente (le titre en cours continue)"),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const count = player.queue.tracks.length;
    if (!count) {
      return interaction.reply({ content: "ℹ️ La file d'attente est déjà vide.", flags: MessageFlags.Ephemeral });
    }
    await player.queue.splice(0, count);
    return interaction.reply(`🗑️ File d'attente vidée — **${count}** titre(s) retiré(s).`);
  }
};
