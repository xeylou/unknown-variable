import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { parseDuration, formatDuration } from '../../utils/duration';
import { addReminder } from '../../features/reminders';
import { prisma } from '../../database';
import config from '../../config';

const MAX_REMINDERS = 25;

export default {
  data: new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Programmer / lister / supprimer des rappels personnels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('set').setDescription('Programmer un rappel')
      .addStringOption((o) => o.setName('delai').setDescription('Dans combien de temps (10m, 2h, 1d)').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Quoi te rappeler ?').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Lister tes rappels en attente'))
    .addSubcommand((s) => s.setName('supprimer').setDescription('Supprimer un rappel par son id')
      .addIntegerOption((o) => o.setName('id').setDescription('ID du rappel').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const ms = parseDuration(interaction.options.getString('delai', true));
      if (!ms || ms < 10_000) {
        return interaction.reply({ content: '❌ Délai invalide (minimum 10s). Ex : `10m`, `2h`, `1d`.', flags: MessageFlags.Ephemeral });
      }
      const existing = await prisma.reminders.count({ where: { user_id: interaction.user.id } });
      if (existing >= MAX_REMINDERS) {
        return interaction.reply({
          content: `❌ Tu as déjà ${MAX_REMINDERS} rappels en attente — c'est le maximum.`,
          flags: MessageFlags.Ephemeral
        });
      }
      const id = await addReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        text: interaction.options.getString('message', true),
        remindAt: Date.now() + ms
      });
      return interaction.reply({
        content: `⏰ Rappel #${id} programmé dans **${formatDuration(ms)}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'liste') {
      const rows = await prisma.reminders.findMany({
        where: { user_id: interaction.user.id },
        orderBy: { remind_at: 'asc' },
        take: 20
      });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Tu n\'as aucun rappel en attente.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('⏰ Tes rappels')
        .setDescription(rows.map((r) =>
          `**#${r.id}** · <t:${Math.floor(r.remind_at / 1000)}:R> · ${r.text.slice(0, 80)}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.reminders.deleteMany({
        where: { id, user_id: interaction.user.id }
      });
      return interaction.reply({
        content: res.count ? `🗑️ Rappel #${id} supprimé.` : `❌ Rappel #${id} introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
