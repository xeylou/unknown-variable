import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { parseDuration, formatDuration } from '../../utils/duration';
import { addReminder, addRecurringReminder, nextOccurrence } from '../../features/reminders';
import { base, frLoc, resolveLang, t } from '../../i18n';

const FREQUENCIES = [
  { name: 'Une fois (one-shot)', value: 'once' },
  { name: 'Quotidien', value: 'daily' },
  { name: 'Hebdomadaire', value: 'weekly' },
  { name: 'Mensuel', value: 'monthly' }
];

/**
 * Rappel destiné à un rôle entier (admin only). En mode one-shot, c'est un
 * simple rappel mais avec ping de rôle ; en récurrent, on s'appuie sur la
 * table `recurring_reminders` avec `role_id` rempli.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('rappel-role')
    .setDescription(base('rappelrole.cmd.desc'))
    .setDescriptionLocalizations(frLoc('rappelrole.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('role')
      .setDescription(base('rappelrole.opt.role.desc'))
      .setDescriptionLocalizations(frLoc('rappelrole.opt.role.desc'))
      .setRequired(true))
    .addStringOption((o) => o.setName('message')
      .setDescription(base('rappelrole.opt.message.desc'))
      .setDescriptionLocalizations(frLoc('rappelrole.opt.message.desc'))
      .setRequired(true))
    .addStringOption((o) => o.setName('frequence')
      .setDescription(base('rappelrole.opt.frequence.desc'))
      .setDescriptionLocalizations(frLoc('rappelrole.opt.frequence.desc'))
      .addChoices(...FREQUENCIES))
    .addStringOption((o) => o.setName('delai')
      .setDescription(base('rappelrole.opt.delai.desc'))
      .setDescriptionLocalizations(frLoc('rappelrole.opt.delai.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const role = interaction.options.getRole('role', true);
    const text = interaction.options.getString('message', true);
    const freq = (interaction.options.getString('frequence') ?? 'once') as 'once' | 'daily' | 'weekly' | 'monthly';
    const delayStr = interaction.options.getString('delai');

    if (freq === 'once') {
      const ms = delayStr ? parseDuration(delayStr) : null;
      if (!ms || ms < 10_000) {
        return interaction.reply({ content: t(lang, 'rappelrole.once.invalid'), flags: MessageFlags.Ephemeral });
      }
      await addReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        text: `${role.toString()} ${text}`,
        remindAt: Date.now() + ms
      });
      return interaction.reply({
        content: t(lang, 'rappelrole.once.ok', { role: role.toString(), dur: formatDuration(ms) }),
        flags: MessageFlags.Ephemeral
      });
    }

    const firstAt = nextOccurrence(Date.now(), freq);
    const id = await addRecurringReminder({
      userId: interaction.user.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      text,
      frequency: freq,
      firstAt,
      roleId: role.id
    });
    return interaction.reply({
      content: t(lang, 'rappelrole.rec.ok', { id, role: role.toString(), freq, ts: Math.floor(firstAt / 1000) }),
      flags: MessageFlags.Ephemeral
    });
  }
};
