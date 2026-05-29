import { SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getActivePlayer } from '../../features/music';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Régler le mode de répétition')
    .addStringOption((o) => o.setName('mode')
      .setDescription('Mode de boucle').setRequired(true)
      .addChoices(
        { name: '➡️ Désactivée', value: 'off' },
        { name: '🔂 Titre actuel', value: 'track' },
        { name: "🔁 File d'attente", value: 'queue' }
      )),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const player = await getActivePlayer(interaction);
    if (!player) return;

    const mode = interaction.options.getString('mode', true) as 'off' | 'track' | 'queue';
    await player.setRepeatMode(mode);
    const label = mode === 'track' ? '🔂 Titre actuel'
      : mode === 'queue' ? "🔁 File d'attente" : '➡️ Désactivée';
    return interaction.reply(`Boucle : **${label}**`);
  }
};
