import { SlashCommandBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import * as music from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Jouer un titre ou une playlist YouTube (lien ou mots-clés)')
    .addStringOption((o) => o.setName('recherche')
      .setDescription('Titre à rechercher, lien YouTube ou lien de playlist').setRequired(true)),

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
