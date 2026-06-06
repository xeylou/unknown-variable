import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription(base('skip.cmd.desc'))
      .setDescriptionLocalizations(frLoc('skip.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const current = player.queue.current;
    if (player.queue.tracks.length) await player.skip();
    else await player.stopPlaying(false, false);

    return interaction.reply(`⏭️ Titre passé : **${current?.info?.title ?? '—'}**`);
  }
};
