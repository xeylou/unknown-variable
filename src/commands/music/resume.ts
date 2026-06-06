import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription(base('resume.cmd.desc'))
    .setDescriptionLocalizations(frLoc('resume.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    if (!player.paused) {
      return interaction.reply({ content: 'ℹ️ La lecture est déjà en cours.', flags: MessageFlags.Ephemeral });
    }
    await player.resume();
    return interaction.reply('▶️ Lecture reprise.');
  }
};
