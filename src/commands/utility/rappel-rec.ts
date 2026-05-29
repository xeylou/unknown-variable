import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { addRecurringReminder, nextOccurrence } from '../../features/reminders';
import { prisma } from '../../database';
import config from '../../config';

const FREQUENCIES = [
  { name: 'Quotidien (daily)', value: 'daily' },
  { name: 'Hebdomadaire (weekly)', value: 'weekly' },
  { name: 'Mensuel (monthly)', value: 'monthly' }
];

export default {
  data: new SlashCommandBuilder()
    .setName('rappel-rec')
    .setDescription('Rappels récurrents (quotidien, hebdomadaire, mensuel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('set').setDescription('Créer un rappel récurrent')
      .addStringOption((o) => o.setName('frequence').setDescription('Fréquence').setRequired(true).addChoices(...FREQUENCIES))
      .addStringOption((o) => o.setName('message').setDescription('Message à rappeler').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Lister tes rappels récurrents'))
    .addSubcommand((s) => s.setName('supprimer').setDescription('Supprimer un rappel récurrent')
      .addIntegerOption((o) => o.setName('id').setDescription('ID').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const freq = interaction.options.getString('frequence', true) as 'daily' | 'weekly' | 'monthly';
      const text = interaction.options.getString('message', true);
      const firstAt = nextOccurrence(Date.now(), freq);
      const id = await addRecurringReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        text,
        frequency: freq,
        firstAt
      });
      return interaction.reply({
        content: `🔁 Rappel récurrent #${id} créé (${freq}). Premier déclenchement <t:${Math.floor(firstAt / 1000)}:R>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'liste') {
      const rows = await prisma.recurring_reminders.findMany({
        where: { user_id: interaction.user.id },
        orderBy: { next_at: 'asc' },
        take: 20
      });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Aucun rappel récurrent.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🔁 Tes rappels récurrents')
        .setDescription(rows.map((r) =>
          `**#${r.id}** · \`${r.frequency}\` · prochain <t:${Math.floor(r.next_at / 1000)}:R> · ` +
          `${r.text.slice(0, 80)}${r.role_id ? ` · pour <@&${r.role_id}>` : ''}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.recurring_reminders.deleteMany({
        where: { id, user_id: interaction.user.id }
      });
      return interaction.reply({
        content: res.count ? `🗑️ Rappel récurrent #${id} supprimé.` : `❌ Introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
