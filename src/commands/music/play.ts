import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import * as music from '../../features/music';
import { base, frLoc } from '../../i18n';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription(base('play.cmd.desc'))
      .setDescriptionLocalizations(frLoc('play.cmd.desc'))
    .addStringOption((o) => o.setName('recherche')
      .setDescription(base('play.opt.query.desc'))
      .setDescriptionLocalizations(frLoc('play.opt.query.desc')).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!music.isEnabled()) {
      return interaction.reply({ content: "⚠️ Le module musique n'est pas configuré.", flags: MessageFlags.Ephemeral });
    }
    const voiceChannelId = interaction.member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({ content: "❌ Rejoins d'abord un salon vocal.", flags: MessageFlags.Ephemeral });
    }
    const query = interaction.options.getString('recherche', true);
    await interaction.deferReply();
    return music.playQuery(interaction, query, voiceChannelId);
  }
};
