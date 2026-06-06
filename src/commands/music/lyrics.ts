import { SlashCommandBuilder, EmbedBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';
import config from '../../config';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription(base('lyrics.cmd.desc'))
    .setDescriptionLocalizations(frLoc('lyrics.cmd.desc')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction, false);
    if (!player) return;

    await interaction.deferReply();

    let lyrics: any;
    try {
      lyrics = await player.getCurrentLyrics();
    } catch {
      lyrics = null;
    }

    const text = lyrics?.lines?.length
      ? lyrics.lines.map((l: any) => l.line).join('\n')
      : lyrics?.text;
    if (!text) {
      return interaction.editReply(
        "❌ Paroles indisponibles pour ce titre — le serveur Lavalink doit disposer d'un plugin de paroles."
      );
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎤 Paroles — ${player.queue.current?.info?.title ?? ''}`.slice(0, 256))
      .setDescription(text.slice(0, 4096));
    return interaction.editReply({ embeds: [embed] });
  }
};
