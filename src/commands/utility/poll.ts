import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { createPoll, latestActivePoll } from '../../features/polls';
import { parseDuration, formatDuration } from '../../utils/duration';
import { base, frLoc, resolveLang, t } from '../../i18n';

/**
 * Sondage persistant (notre table `polls`), à différencier du `/sondage`
 * qui utilise les polls natifs Discord (plafonnés à 32 j et non archivés).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription(base('poll.cmd.desc'))
    .setDescriptionLocalizations(frLoc('poll.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('creer')
      .setDescription(base('poll.sub.creer.desc'))
      .setDescriptionLocalizations(frLoc('poll.sub.creer.desc'))
      .addStringOption((o) => o.setName('question')
        .setDescription(base('poll.opt.question.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.question.desc'))
        .setRequired(true).setMaxLength(256))
      .addStringOption((o) => o.setName('options')
        .setDescription(base('poll.opt.options.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.options.desc'))
        .setRequired(true))
      .addStringOption((o) => o.setName('duree')
        .setDescription(base('poll.opt.duree.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.duree.desc'))
        .setRequired(true))
      .addBooleanOption((o) => o.setName('multi-choix')
        .setDescription(base('poll.opt.multichoix.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.multichoix.desc')))
      .addBooleanOption((o) => o.setName('anonyme')
        .setDescription(base('poll.opt.anonyme.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.anonyme.desc'))))
    .addSubcommand((s) => s.setName('annuler')
      .setDescription(base('poll.sub.annuler.desc'))
      .setDescriptionLocalizations(frLoc('poll.sub.annuler.desc'))
      .addStringOption((o) => o.setName('message-id')
        .setDescription(base('poll.opt.messageid.desc'))
        .setDescriptionLocalizations(frLoc('poll.opt.messageid.desc')))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const sub = interaction.options.getSubcommand();

    if (sub === 'annuler') {
      const raw = interaction.options.getString('message-id');
      const id = raw
        ? (raw.match(/\d{15,25}/)?.[0] ?? null)
        : await latestActivePoll(interaction.guild.id);
      if (!id) {
        return interaction.reply({
          content: raw ? t(lang, 'poll.cancel.invalid_id') : t(lang, 'poll.cancel.none'),
          flags: MessageFlags.Ephemeral
        });
      }
      const poll = await prisma.polls.findUnique({ where: { message_id: id } });
      if (!poll || poll.guild_id !== interaction.guild.id) {
        return interaction.reply({ content: t(lang, 'poll.cancel.notfound'), flags: MessageFlags.Ephemeral });
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`poll:cancel-confirm:${id}`)
          .setLabel(t(lang, 'poll.cancel.btn.confirm')).setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('poll:cancel-abort')
          .setLabel(t(lang, 'poll.cancel.btn.keep')).setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({
        content: t(lang, 'poll.cancel.confirm', { question: poll.question }),
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }

    // --- Créer ---
    const question = interaction.options.getString('question', true).trim();
    const optionsRaw = interaction.options.getString('options', true);
    const ms = parseDuration(interaction.options.getString('duree', true));
    const multi = interaction.options.getBoolean('multi-choix') ?? false;
    const anon = interaction.options.getBoolean('anonyme') ?? false;

    if (!ms || ms < 60_000) {
      return interaction.reply({ content: t(lang, 'poll.create.invalid_duration'), flags: MessageFlags.Ephemeral });
    }
    const options = optionsRaw.split('|').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 10) {
      return interaction.reply({ content: t(lang, 'poll.create.invalid_options'), flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('send' in channel) || !('permissionsFor' in channel)) {
      return interaction.reply({ content: t(lang, 'poll.channel_only'), flags: MessageFlags.Ephemeral });
    }
    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(['SendMessages', 'EmbedLinks'])) {
      return interaction.reply({ content: t(lang, 'poll.create.no_perms', { channel: channel.toString() }), flags: MessageFlags.Ephemeral });
    }

    await createPoll({ channel, host: interaction.user, question, options, durationMs: ms, multiChoice: multi, anonymous: anon });
    return interaction.reply({ content: t(lang, 'poll.create.ok', { dur: formatDuration(ms) }), flags: MessageFlags.Ephemeral });
  }
};
