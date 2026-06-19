import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { lockChannel, unlockChannel, type LockableChannel } from '../../features/lockdown';
import { parseDuration, formatDuration } from '../../utils/duration';
import { sendLog } from '../../features/logger';
import { createLogger } from '../../utils/logger';
import { requireAdmin } from '../../utils/permissions';
import config from '../../config';
import { base, frLoc } from '../../i18n';

const log = createLogger('cmd:lockdown');

const LOCKABLE_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice
] as const;

export default {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription(base('lockdown.cmd.desc'))
      .setDescriptionLocalizations(frLoc('lockdown.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('salon')
      .setDescription('Verrouiller un salon (retire SendMessages à @everyone)')
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon à verrouiller (par défaut : le salon courant)')
        .addChannelTypes(...LOCKABLE_TYPES))
      .addStringOption((o) => o.setName('duree').setDescription('Durée (ex 30m, 2h) — sans = jusqu\'au lift manuel'))
      .addStringOption((o) => o.setName('raison').setDescription('Raison affichée dans le log')))
    .addSubcommand((s) => s.setName('serveur')
      .setDescription('Verrouiller tous les salons texte du serveur (réservé admin)')
      .addStringOption((o) => o.setName('duree').setDescription('Durée (ex 30m, 2h)'))
      .addStringOption((o) => o.setName('raison').setDescription('Raison')))
    .addSubcommand((s) => s.setName('lift')
      .setDescription('Déverrouiller un salon (ou tout le serveur)')
      .addChannelOption((o) => o.setName('salon')
        .setDescription('Salon à déverrouiller (par défaut : le salon courant)')
        .addChannelTypes(...LOCKABLE_TYPES))
      .addBooleanOption((o) => o.setName('serveur').setDescription('Déverrouiller tout le serveur (réservé admin)'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const durationStr = interaction.options.getString('duree');
    const ms = durationStr ? parseDuration(durationStr) : null;
    if (durationStr && !ms) {
      return interaction.reply({ content: '❌ Durée invalide. Exemples : `30m`, `2h`, `1d`.', flags: MessageFlags.Ephemeral });
    }
    const reason = interaction.options.getString('raison') ?? 'Non précisée';

    if (sub === 'salon') {
      const target = (interaction.options.getChannel('salon') ?? interaction.channel) as LockableChannel | null;
      if (!target) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await lockChannel(target, ms).catch((e) => log.warn('lock failed', e));
      logAction(interaction, `🔒 Salon ${target} verrouillé`, ms, reason);
      return interaction.editReply(
        `🔒 ${target} verrouillé${ms ? ` pour **${formatDuration(ms)}**` : ''}.`
      );
    }

    if (sub === 'serveur') {
      if (!await requireAdmin(interaction)) return;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const channels = interaction.guild.channels.cache.filter((c) =>
        c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
      );
      let locked = 0;
      for (const channel of channels.values()) {
        await lockChannel(channel, ms).catch(() => {});
        locked++;
      }
      logAction(interaction, `🔒 Lockdown serveur (${locked} salons)`, ms, reason);
      return interaction.editReply(
        `🔒 **${locked}** salons verrouillés${ms ? ` pour **${formatDuration(ms)}**` : ''}.`
      );
    }

    if (sub === 'lift') {
      const all = interaction.options.getBoolean('serveur') ?? false;
      if (all) {
        if (!await requireAdmin(interaction)) return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const channels = interaction.guild.channels.cache.filter((c) =>
          c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
        );
        for (const channel of channels.values()) {
          await unlockChannel(channel).catch(() => {});
        }
        logAction(interaction, `🔓 Lockdown serveur levé (${channels.size} salons)`, null, '—');
        return interaction.editReply(`🔓 **${channels.size}** salons déverrouillés.`);
      }
      const target = (interaction.options.getChannel('salon') ?? interaction.channel) as LockableChannel | null;
      if (!target) return interaction.reply({ content: '❌ Salon introuvable.', flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await unlockChannel(target).catch(() => {});
      logAction(interaction, `🔓 Salon ${target} déverrouillé`, null, '—');
      return interaction.editReply(`🔓 ${target} déverrouillé.`);
    }
  }
};

function logAction(interaction: ChatInputCommandInteraction<'cached'>, title: string, ms: number | null, reason: string) {
  sendLog(interaction.guild, 'moderation', new EmbedBuilder()
    .setColor(config.colors.warning)
    .setAuthor({ name: title })
    .setDescription(
      `**Modérateur :** ${interaction.user}\n` +
      (ms ? `**Durée :** ${formatDuration(ms)}\n` : '') +
      `**Raison :** ${reason}`
    )
    .setTimestamp()).catch(() => {});
}
