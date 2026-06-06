import { SlashCommandBuilder, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { parseDuration, formatDuration } from '../../utils/duration';
import { addReminder } from '../../features/reminders';
import { prisma } from '../../database';
import config from '../../config';
import { base, frLoc, resolveLang, t } from '../../i18n';

const MAX_REMINDERS = 25;

export default {
  data: new SlashCommandBuilder()
    .setName('rappel')
    .setDescription(base('rappel.cmd.desc'))
    .setDescriptionLocalizations(frLoc('rappel.cmd.desc'))
    .addSubcommand((s) => s.setName('set')
      .setDescription(base('rappel.sub.set.desc'))
      .setDescriptionLocalizations(frLoc('rappel.sub.set.desc'))
      .addStringOption((o) => o.setName('delai')
        .setDescription(base('rappel.opt.delai.desc'))
        .setDescriptionLocalizations(frLoc('rappel.opt.delai.desc'))
        .setRequired(true))
      .addStringOption((o) => o.setName('message')
        .setDescription(base('rappel.opt.message.desc'))
        .setDescriptionLocalizations(frLoc('rappel.opt.message.desc'))
        .setRequired(true)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('rappel.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('rappel.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('rappel.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('rappel.sub.supprimer.desc'))
      .addIntegerOption((o) => o.setName('id')
        .setDescription(base('rappel.opt.id.desc'))
        .setDescriptionLocalizations(frLoc('rappel.opt.id.desc'))
        .setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const ms = parseDuration(interaction.options.getString('delai', true));
      if (!ms || ms < 10_000) {
        return interaction.reply({ content: t(lang, 'rappel.set.invalid_delay'), flags: MessageFlags.Ephemeral });
      }
      const existing = await prisma.reminders.count({ where: { user_id: interaction.user.id } });
      if (existing >= MAX_REMINDERS) {
        return interaction.reply({ content: t(lang, 'rappel.set.max', { max: MAX_REMINDERS }), flags: MessageFlags.Ephemeral });
      }
      const id = await addReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        text: interaction.options.getString('message', true),
        remindAt: Date.now() + ms
      });
      return interaction.reply({ content: t(lang, 'rappel.set.ok', { id, dur: formatDuration(ms) }), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'liste') {
      const rows = await prisma.reminders.findMany({
        where: { user_id: interaction.user.id },
        orderBy: { remind_at: 'asc' },
        take: 20
      });
      if (!rows.length) {
        return interaction.reply({ content: t(lang, 'rappel.liste.empty'), flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(t(lang, 'rappel.liste.title'))
        .setDescription(rows.map((r) =>
          `**#${r.id}** · <t:${Math.floor(r.remind_at / 1000)}:R> · ${r.text.slice(0, 80)}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'supprimer') {
      const id = interaction.options.getInteger('id', true);
      const res = await prisma.reminders.deleteMany({ where: { id, user_id: interaction.user.id } });
      return interaction.reply({
        content: res.count ? t(lang, 'rappel.delete.ok', { id }) : t(lang, 'rappel.delete.notfound', { id }),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
