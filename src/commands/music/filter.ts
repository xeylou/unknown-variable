import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

const LABELS: Record<string, string> = {
  off: '➡️ Aucun (réinitialisé)',
  bassboost: '🔊 Bass boost',
  nightcore: '⏫ Nightcore',
  vaporwave: '🌌 Vaporwave',
  '8d': '🎧 8D',
  karaoke: '🎤 Karaoké'
};

export default {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Appliquer un filtre audio')
    .addStringOption((o) => o.setName('preset')
      .setDescription('Filtre à appliquer').setRequired(true)
      .addChoices(
        { name: '➡️ Aucun (réinitialiser)', value: 'off' },
        { name: '🔊 Bass boost', value: 'bassboost' },
        { name: '⏫ Nightcore', value: 'nightcore' },
        { name: '🌌 Vaporwave', value: 'vaporwave' },
        { name: '🎧 8D', value: '8d' },
        { name: '🎤 Karaoké', value: 'karaoke' }
      )),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const preset = interaction.options.getString('preset', true);
    const fm = player.filterManager;

    // On repart toujours d'un état propre avant d'appliquer le filtre demandé
    await fm.resetFilters();
    if (preset === 'bassboost') await fm.setEQPreset('BassboostHigh');
    else if (preset === 'nightcore') await fm.toggleNightcore();
    else if (preset === 'vaporwave') await fm.toggleVaporwave();
    else if (preset === '8d') await fm.toggleRotation();
    else if (preset === 'karaoke') await fm.toggleKaraoke();

    return interaction.reply(`🎛️ Filtre appliqué : **${LABELS[preset] ?? preset}**`);
  }
};
