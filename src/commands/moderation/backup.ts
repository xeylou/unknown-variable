import {
  SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { invalidateGuild } from '../../utils/configCache';
import { createLogger } from '../../utils/logger';
import { requireAdmin } from '../../utils/permissions';
import { base, frLoc } from '../../i18n';

const log = createLogger('backup');

const BACKUP_VERSION = 1;

/**
 * Export / import de la configuration d'un serveur. L'export couvre tout ce
 * qui est sérialisable :
 *   - `guild_config` (toutes les clés/valeurs)
 *   - `stat_channels`, `mc_watchers`, `notifications`, `tags`
 *   - `reaction_role_panels` + `reaction_role_entries`
 *
 * Ne sont PAS exportés (volatiles ou non-portables) : tickets / sanctions /
 * giveaways en cours / reminders / polls / suggestions / temp_voice. Une
 * restauration sur une nouvelle guilde ne portera pas leur historique.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription(base('backup.cmd.desc'))
      .setDescriptionLocalizations(frLoc('backup.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('export').setDescription(base('backup.sub.export.desc'))
      .setDescriptionLocalizations(frLoc('backup.sub.export.desc')))
    .addSubcommand((s) => s.setName('import').setDescription(base('backup.sub.import.desc'))
      .setDescriptionLocalizations(frLoc('backup.sub.import.desc'))
      .addAttachmentOption((o) => o.setName('fichier').setDescription(base('backup.opt.fichier.desc'))
      .setDescriptionLocalizations(frLoc('backup.opt.fichier.desc')).setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'export') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const data = {
        version: BACKUP_VERSION,
        exported_at: Date.now(),
        guild_id: gid,
        guild_name: interaction.guild.name,
        guild_config: await prisma.guild_config.findMany({ where: { guild_id: gid } }),
        stat_channels: await prisma.stat_channels.findMany({ where: { guild_id: gid } }),
        mc_watchers: await prisma.mc_watchers.findMany({ where: { guild_id: gid } }),
        notifications: await prisma.notifications.findMany({ where: { guild_id: gid } }),
        tags: await prisma.tags.findMany({ where: { guild_id: gid } }),
        reaction_role_panels: await prisma.reaction_role_panels.findMany({ where: { guild_id: gid } }),
        reaction_role_entries: [] as any[]
      };
      const panelIds = data.reaction_role_panels.map((p) => p.message_id);
      if (panelIds.length) {
        data.reaction_role_entries = await prisma.reaction_role_entries.findMany({
          where: { message_id: { in: panelIds } }
        });
      }

      const attachment = new AttachmentBuilder(
        Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
        { name: `backup-${gid}-${new Date(data.exported_at).toISOString().slice(0, 10)}.json` }
      );

      return interaction.editReply({
        content: '📦 **Sauvegarde produite.** Conserve ce fichier en lieu sûr — il contient toutes ' +
                 'les clés de configuration (y compris des secrets comme `mc_rcon_password` et le code Twitch).',
        files: [attachment]
      });
    }

    if (sub === 'import') {
      const file = interaction.options.getAttachment('fichier');
      if (!file?.url || !file.name?.endsWith('.json')) {
        return interaction.reply({ content: '❌ Joins un fichier `.json`.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const text = await fetch(file.url).then((r) => r.text()).catch(() => null);
      if (!text) return interaction.editReply('❌ Téléchargement du fichier impossible.');

      let payload: any;
      try { payload = JSON.parse(text); }
      catch { return interaction.editReply('❌ Fichier JSON invalide.'); }

      if (payload?.version !== BACKUP_VERSION) {
        return interaction.editReply(`❌ Version de backup incompatible (attendue : ${BACKUP_VERSION}).`);
      }
      if (!Array.isArray(payload.guild_config)) {
        return interaction.editReply('❌ Backup malformé.');
      }

      // Demande de confirmation explicite : l'import écrase la config existante
      const summary =
        `**Version :** ${payload.version}\n` +
        `**Exporté le :** <t:${Math.floor(payload.exported_at / 1000)}:f>\n` +
        `**Guild origine :** \`${payload.guild_id}\` — *${payload.guild_name ?? '?'}*\n\n` +
        `Entrées : ${payload.guild_config.length} config · ${payload.stat_channels?.length ?? 0} stats · ` +
        `${payload.mc_watchers?.length ?? 0} mc-watchers · ${payload.notifications?.length ?? 0} notif · ` +
        `${payload.tags?.length ?? 0} tags · ${payload.reaction_role_panels?.length ?? 0} reaction-roles\n\n` +
        '⚠️ **Tous les enregistrements actuels de ces tables pour ce serveur seront remplacés.**\n' +
        '⚠️ Les IDs de salons / rôles dans le backup doivent exister dans CE serveur sinon le bot ne pourra ' +
        'pas les utiliser (mais l\'import ne validera pas).';

      // On stocke le payload dans une Map en mémoire avec une clé courte
      pendingImports.set(interaction.user.id, payload);
      setTimeout(() => pendingImports.delete(interaction.user.id), 5 * 60_000).unref();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('backup:confirm').setLabel('Confirmer').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('backup:cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.editReply({
        content: '📥 **Confirmation d\'import**\n\n' + summary,
        components: [row]
      });
    }
  }
};

/** Imports en attente, gardés en mémoire pour la confirmation par bouton. */
export const pendingImports = new Map<string, any>();

/** Applique l'import : remplace les tables exportables pour la guilde courante. */
export async function applyImport(guildId: string, payload: any) {
  await prisma.$transaction(async (tx) => {
    // guild_config
    await tx.guild_config.deleteMany({ where: { guild_id: guildId } });
    for (const c of payload.guild_config ?? []) {
      await tx.guild_config.create({ data: { guild_id: guildId, key: c.key, value: c.value } });
    }
    // stat_channels
    await tx.stat_channels.deleteMany({ where: { guild_id: guildId } });
    for (const r of payload.stat_channels ?? []) {
      await tx.stat_channels.create({
        data: { channel_id: r.channel_id, guild_id: guildId, role_id: r.role_id, label: r.label }
      });
    }
    // mc_watchers
    await tx.mc_watchers.deleteMany({ where: { guild_id: guildId } });
    for (const r of payload.mc_watchers ?? []) {
      await tx.mc_watchers.create({
        data: {
          guild_id: guildId, channel_id: r.channel_id, message_id: null,
          ip: r.ip, role_id: r.role_id, interval_min: r.interval_min,
          last_online: null, created_at: r.created_at
        }
      });
    }
    // notifications
    await tx.notifications.deleteMany({ where: { guild_id: guildId } });
    for (const r of payload.notifications ?? []) {
      await tx.notifications.create({
        data: {
          guild_id: guildId, platform: r.platform, target: r.target,
          target_name: r.target_name, discord_channel: r.discord_channel, last_item: null
        }
      });
    }
    // tags
    await tx.tags.deleteMany({ where: { guild_id: guildId } });
    for (const r of payload.tags ?? []) {
      await tx.tags.create({
        data: { guild_id: guildId, name: r.name, content: r.content, created_by: r.created_by, created_at: r.created_at }
      });
    }
    // reaction roles (panneaux + entrées)
    const panelIds = (payload.reaction_role_panels ?? []).map((p: any) => p.message_id);
    await tx.reaction_role_entries.deleteMany({ where: { message_id: { in: panelIds } } });
    await tx.reaction_role_panels.deleteMany({ where: { guild_id: guildId } });
    for (const p of payload.reaction_role_panels ?? []) {
      await tx.reaction_role_panels.create({
        data: {
          message_id: p.message_id, guild_id: guildId, channel_id: p.channel_id,
          exclusive: p.exclusive, created_at: p.created_at
        }
      });
    }
    for (const e of payload.reaction_role_entries ?? []) {
      await tx.reaction_role_entries.create({
        data: { message_id: e.message_id, emoji: e.emoji, role_id: e.role_id }
      });
    }
  });

  // Invalide le cache de config en mémoire
  invalidateGuild(guildId);
  log.info(`Import appliqué pour la guilde ${guildId}`);
}
