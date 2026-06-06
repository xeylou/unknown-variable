import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription(base('stop.cmd.desc'))
    .setDescriptionLocalizations(frLoc('stop.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    await player.destroy('Arrêté par un utilisateur');
    return interaction.reply('⏹️ Lecture arrêtée, file vidée — je quitte le salon vocal.');
  }
};
