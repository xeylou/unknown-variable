import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { parseDuration, formatDuration } from '../../utils/duration';
import { addReminder, addRecurringReminder, nextOccurrence } from '../../features/reminders';

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
    .setDescription('Programmer un rappel pour un rôle entier (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Message du rappel').setRequired(true))
    .addStringOption((o) => o.setName('frequence').setDescription('Fréquence (one-shot par défaut)').addChoices(...FREQUENCIES))
    .addStringOption((o) => o.setName('delai').setDescription('Délai si « une fois » : 10m, 2h, 1d')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const role = interaction.options.getRole('role', true);
    const text = interaction.options.getString('message', true);
    const freq = (interaction.options.getString('frequence', true) ?? 'once') as 'once' | 'daily' | 'weekly' | 'monthly';
    const delayStr = interaction.options.getString('delai', true);

    if (freq === 'once') {
      const ms = delayStr ? parseDuration(delayStr) : null;
      if (!ms || ms < 10_000) {
        return interaction.reply({
          content: '❌ Pour un rappel ponctuel, fournis un délai valide (`10m`, `2h`, `1d`).',
          flags: MessageFlags.Ephemeral
        });
      }
      // Pour le one-shot d'un rôle, on insère dans recurring_reminders avec role_id
      // mais avec next_at = unique et on supprime au lieu d'avancer.
      // Plus simple : on utilise la table reminders mais en stockant le role dans le texte.
      // Solution propre : insertion directe avec un wrapper qui n'avance pas.
      // Ici on simplifie : on utilise reminders + on insère un préfixe spécial.
      await addReminder({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        text: `${role.toString()} ${text}`,
        remindAt: Date.now() + ms
      });
      return interaction.reply({
        content: `⏰ Rappel ponctuel programmé pour ${role} dans **${formatDuration(ms)}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Récurrent : pousse dans recurring_reminders avec role_id
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
      content: `🔁 Rappel récurrent #${id} pour ${role} (${freq}). Prochain <t:${Math.floor(firstAt / 1000)}:R>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
