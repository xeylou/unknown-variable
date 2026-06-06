import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Guild, type Role, type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { getConfig, setConfig } from '../../utils/configCache';
import config from '../../config';
import { statName, ensureMembersOnce } from '../../features/statschannels';
import { base, frLoc, resolveLang, t } from '../../i18n';

async function createCounter(guild: Guild, categoryId: string, role: Role, label: string | null) {
  return guild.channels.create({
    name: statName(label || role.name, role.members.size),
    type: ChannelType.GuildVoice,
    parent: categoryId,
    permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }]
  });
}

export async function performStatsDelete(guild: Guild) {
  const gid = guild.id;
  const rows = await prisma.stat_channels.findMany({ where: { guild_id: gid } });
  for (const r of rows) await guild.channels.cache.get(r.channel_id)?.delete().catch(() => {});
  await prisma.stat_channels.deleteMany({ where: { guild_id: gid } });
  const categoryId = await getConfig(gid, 'stats_category');
  if (categoryId) {
    await guild.channels.cache.get(categoryId)?.delete().catch(() => {});
    await setConfig(gid, 'stats_category', null);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription(base('stats.cmd.desc'))
    .setDescriptionLocalizations(frLoc('stats.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('creer')
      .setDescription(base('stats.sub.creer.desc'))
      .setDescriptionLocalizations(frLoc('stats.sub.creer.desc'))
      .addStringOption((o) => o.setName('nom').setDescription(base('stats.opt.nom.desc')).setDescriptionLocalizations(frLoc('stats.opt.nom.desc')).setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription(base('stats.opt.role.desc')).setDescriptionLocalizations(frLoc('stats.opt.role.desc')).setRequired(true))
      .addStringOption((o) => o.setName('etiquette').setDescription(base('stats.opt.etiquette.desc')).setDescriptionLocalizations(frLoc('stats.opt.etiquette.desc'))))
    .addSubcommand((s) => s.setName('ajouter')
      .setDescription(base('stats.sub.ajouter.desc'))
      .setDescriptionLocalizations(frLoc('stats.sub.ajouter.desc'))
      .addRoleOption((o) => o.setName('role').setDescription(base('stats.opt.role.desc')).setDescriptionLocalizations(frLoc('stats.opt.role.desc')).setRequired(true))
      .addStringOption((o) => o.setName('etiquette').setDescription(base('stats.opt.etiquette.desc')).setDescriptionLocalizations(frLoc('stats.opt.etiquette.desc'))))
    .addSubcommand((s) => s.setName('retirer')
      .setDescription(base('stats.sub.retirer.desc'))
      .setDescriptionLocalizations(frLoc('stats.sub.retirer.desc'))
      .addRoleOption((o) => o.setName('role').setDescription(base('stats.opt.role_remove.desc')).setDescriptionLocalizations(frLoc('stats.opt.role_remove.desc')).setRequired(true)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription(base('stats.sub.liste.desc'))
      .setDescriptionLocalizations(frLoc('stats.sub.liste.desc')))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription(base('stats.sub.supprimer.desc'))
      .setDescriptionLocalizations(frLoc('stats.sub.supprimer.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const lang = resolveLang(interaction.locale);
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const gid = guild.id;

    if (sub === 'creer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const existing = await getConfig(gid, 'stats_category');
      if (existing && guild.channels.cache.get(existing)) {
        return interaction.editReply(t(lang, 'stats.creer.exists'));
      }
      const name = interaction.options.getString('nom', true);
      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('etiquette');
      await ensureMembersOnce(guild);
      const category = await guild.channels.create({ name, type: ChannelType.GuildCategory, position: 0 });
      const voice = await createCounter(guild, category.id, role as Role, label);
      await setConfig(gid, 'stats_category', category.id);
      await prisma.stat_channels.create({ data: { channel_id: voice.id, guild_id: gid, role_id: role.id, label: label || null } });
      return interaction.editReply(t(lang, 'stats.creer.ok', { name, role: role.toString() }));
    }

    if (sub === 'ajouter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const categoryId = await getConfig(gid, 'stats_category');
      const category = categoryId ? guild.channels.cache.get(categoryId) : null;
      if (!category) return interaction.editReply(t(lang, 'stats.ajouter.no_category'));
      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('etiquette');
      const dup = await prisma.stat_channels.findFirst({ where: { guild_id: gid, role_id: role.id } });
      if (dup) return interaction.editReply(t(lang, 'stats.ajouter.dup', { role: role.toString() }));
      await ensureMembersOnce(guild);
      const voice = await createCounter(guild, category.id, role as Role, label);
      await prisma.stat_channels.create({ data: { channel_id: voice.id, guild_id: gid, role_id: role.id, label: label || null } });
      return interaction.editReply(t(lang, 'stats.ajouter.ok', { role: role.toString() }));
    }

    if (sub === 'retirer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const role = interaction.options.getRole('role', true);
      const row = await prisma.stat_channels.findFirst({ where: { guild_id: gid, role_id: role.id } });
      if (!row) return interaction.editReply(t(lang, 'stats.retirer.none', { role: role.toString() }));
      await prisma.stat_channels.delete({ where: { channel_id: row.channel_id } });
      await guild.channels.cache.get(row.channel_id)?.delete().catch(() => {});
      return interaction.editReply(t(lang, 'stats.retirer.ok', { role: role.toString() }));
    }

    if (sub === 'liste') {
      const rows = await prisma.stat_channels.findMany({ where: { guild_id: gid } });
      if (!rows.length) return interaction.reply({ content: t(lang, 'stats.liste.empty'), flags: MessageFlags.Ephemeral });
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(t(lang, 'stats.liste.title'))
        .setDescription(rows.map((r) => {
          const role = guild.roles.cache.get(r.role_id);
          return `• <#${r.channel_id}> — ${role ?? '*rôle supprimé*'}` + (r.label ? ` *(étiquette : ${r.label})*` : '');
        }).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'supprimer') {
      const count = await prisma.stat_channels.count({ where: { guild_id: gid } });
      const categoryId = await getConfig(gid, 'stats_category');
      if (!count && !categoryId) return interaction.reply({ content: t(lang, 'stats.supprimer.empty'), flags: MessageFlags.Ephemeral });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('stats:confirm-delete').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('stats:cancel-delete').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({ content: t(lang, 'stats.supprimer.confirm', { count }), components: [row], flags: MessageFlags.Ephemeral });
    }
  }
};
