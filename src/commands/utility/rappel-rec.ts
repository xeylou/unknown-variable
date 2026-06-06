import { SlashCommandBuilder, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { addRecurringReminder, nextOccurrence } from '../../features/reminders';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc, resolveLang, t } from '../../i18n';

const FREQUENCIES = [
  { name: 'Quotidien (daily)', value: 'daily' },
  { name: 'Hebdomadaire (weekly)', value: 'weekly' },
  { name: 'Mensuel (monthly)', value: 'monthly' }
];

export default {
  data: new SlashCommandBuilder()
    .setName('rappel-rec')
    .setDescription(base('rappelrec.cmd.desc'))
    .setDescriptionLocalizations(frLoc('rappelrec.cmd.desc'))
    .addSubcommand((s) => s.setName('set')
      .setDescription(base('rappelrec.sub.set.desc'))
      .setDescriptionLocalizations(frLoc('rappelrec.sub.set.desc'))
      .addStringOption((o) => o.setName('frequence')
        .setDescription(base('rappelrec.opt.frequence.desc'))
        .setDescriptionLocalizations(frLoc('rappelrec.opt.frequence.desc'))
        .setRequired(true).addChoices(...FREQUENCIES))
      .addStringOption((o) => o.setName('message')
        .setDescription(base('rappelrec.opt.message.desc'))
        .setDescriptionLocalizations(frLoc('rappelrec.opt.message.desc'))
        .setRequired(true)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('rappelrec.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('rappelrec.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('rappelrec.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('rappelrec.sub.supprimer.desc'))
      .addIntegerOption((o) => o.setName('id')
        .setDescription(base('rappelrec.opt.id.desc'))
        .setDescriptionLocalizations(frLoc('rappelrec.opt.id.desc'))
        .setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
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
        content: t(lang, 'rappelrec.set.ok', { id, freq, ts: Math.floor(firstAt / 1000) }),
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
        return interaction.reply({ content: t(lang, 'rappelrec.liste.empty'), flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(t(lang, 'rappelrec.liste.title'))
        .setDescription(rows.map((r) =>
          `**#${r.id}** · \`${r.frequency}\` · prochain <t:${Math.floor(r.next_at / 1000)}:R> · ` +
          `${r.text.slice(0, 80)}${r.role_id ? ` · pour <@&${r.role_id}>` : ''}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.recurring_reminders.deleteMany({ where: { id, user_id: interaction.user.id } });
      return interaction.reply({
        content: res.count ? t(lang, 'rappelrec.delete.ok', { id }) : t(lang, 'rappelrec.delete.notfound'),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
