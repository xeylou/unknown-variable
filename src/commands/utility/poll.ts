import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { createPoll } from '../../features/polls';
import { parseDuration, formatDuration } from '../../utils/duration';

/**
 * Sondage persistant (notre table `polls`), à différencier du `/sondage`
 * qui utilise les polls natifs Discord (plafonnés à 32 j et non archivés).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Lancer un sondage persistant (durée libre, multi-choix possible)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((o) => o.setName('question').setDescription('Question posée').setRequired(true).setMaxLength(256))
    .addStringOption((o) => o.setName('options').setDescription('Options séparées par des « | » (2-10)').setRequired(true))
    .addStringOption((o) => o.setName('duree').setDescription('Durée (ex 1h, 7d, 30d)').setRequired(true))
    .addBooleanOption((o) => o.setName('multi-choix').setDescription('Autoriser plusieurs choix par membre'))
    .addBooleanOption((o) => o.setName('anonyme').setDescription('Cacher les votants individuels')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const question = interaction.options.getString('question', true).trim();
    const optionsRaw = interaction.options.getString('options', true);
    const ms = parseDuration(interaction.options.getString('duree', true));
    const multi = interaction.options.getBoolean('multi-choix') ?? false;
    const anon = interaction.options.getBoolean('anonyme') ?? false;

    if (!ms || ms < 60_000) {
      return interaction.reply({ content: '❌ Durée invalide (minimum 1 min).', flags: MessageFlags.Ephemeral });
    }
    const options = optionsRaw.split('|').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 10) {
      return interaction.reply({ content: '❌ Donne entre 2 et 10 options séparées par `|`.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: '❌ Cette commande doit être lancée dans un salon texte.', flags: MessageFlags.Ephemeral });
    }
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.reply({
        content: `❌ Il me manque les permissions dans ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    await createPoll({
      channel,
      host: interaction.user,
      question,
      options,
      durationMs: ms,
      multiChoice: multi,
      anonymous: anon
    });

    return interaction.reply({
      content: `✅ Sondage lancé pour **${formatDuration(ms)}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
