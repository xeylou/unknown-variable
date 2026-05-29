import {
  SlashCommandBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import * as music from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('recherche')
    .setDescription('Rechercher un titre YouTube et le choisir dans une liste')
    .addStringOption((o) => o.setName('termes')
      .setDescription('Mots-clés de recherche').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!music.isEnabled()) {
      return interaction.reply({ content: "⚠️ Le module musique n'est pas configuré.", flags: MessageFlags.Ephemeral });
    }
    const voiceChannelId = interaction.member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({ content: "❌ Rejoins d'abord un salon vocal.", flags: MessageFlags.Ephemeral });
    }

    const termes = interaction.options.getString('termes', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const results = await music.searchTracks(interaction, termes, voiceChannelId).catch(() => []);
    if (!results.length) return interaction.editReply('❌ Aucun résultat pour cette recherche.');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('music:search')
      .setPlaceholder('Choisis un titre à jouer')
      .addOptions(results.slice(0, 10).map((t: any) => ({
        label: (t.info.title ?? 'Titre inconnu').slice(0, 100),
        description: `${t.info.author ?? '—'} · ${music.formatDuration(t.info.duration ?? 0)}`.slice(0, 100),
        value: (t.info.uri ?? '').slice(0, 100)
      })).filter((o) => o.value));

    return interaction.editReply({ content: '🔎 Résultats — sélectionne un titre :', components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] });
  }
};
