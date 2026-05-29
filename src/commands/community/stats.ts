import {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Guild, type Role, type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { getConfig, setConfig } from '../../utils/configCache';
import config from '../../config';
import { statName, ensureMembersOnce } from '../../features/statschannels';

/** Crée un salon vocal verrouillé (compteur) dans la catégorie statistique. */
async function createCounter(guild: Guild, categoryId: string, role: Role, label: string | null) {
  return guild.channels.create({
    name: statName(label || role.name, role.members.size),
    type: ChannelType.GuildVoice,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }
    ]
  });
}

/** Supprime la catégorie statistique et tous ses compteurs (appelé après confirmation). */
export async function performStatsDelete(guild: Guild) {
  const gid = guild.id;
  const rows = await prisma.stat_channels.findMany({ where: { guild_id: gid } });
  for (const r of rows) {
    await guild.channels.cache.get(r.channel_id)?.delete().catch(() => {});
  }
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
    .setDescription('Salons compteurs : afficher le nombre de membres par rôle')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) => s.setName('creer')
      .setDescription('Créer la catégorie statistique avec un premier compteur')
      .addStringOption((o) => o.setName('nom')
        .setDescription('Nom de la catégorie').setRequired(true))
      .addRoleOption((o) => o.setName('role')
        .setDescription('Rôle dont on affiche le nombre de membres').setRequired(true))
      .addStringOption((o) => o.setName('etiquette')
        .setDescription('Texte affiché à la place du nom du rôle (optionnel)')))
    .addSubcommand((s) => s.setName('ajouter')
      .setDescription('Ajouter un compteur de rôle à la catégorie existante')
      .addRoleOption((o) => o.setName('role')
        .setDescription('Rôle dont on affiche le nombre de membres').setRequired(true))
      .addStringOption((o) => o.setName('etiquette')
        .setDescription('Texte affiché à la place du nom du rôle (optionnel)')))
    .addSubcommand((s) => s.setName('retirer')
      .setDescription('Retirer un compteur de rôle')
      .addRoleOption((o) => o.setName('role')
        .setDescription('Rôle du compteur à retirer').setRequired(true)))
    .addSubcommand((s) => s.setName('liste')
      .setDescription('Lister les compteurs configurés'))
    .addSubcommand((s) => s.setName('supprimer')
      .setDescription('Supprimer la catégorie statistique et tous ses compteurs')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const gid = guild.id;

    // --- Créer ---
    if (sub === 'creer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const existing = await getConfig(gid, 'stats_category');
      if (existing && guild.channels.cache.get(existing)) {
        return interaction.editReply('❌ Une catégorie statistique existe déjà. Utilise `/stats ajouter`.');
      }

      const name = interaction.options.getString('nom', true);
      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('etiquette');
      await ensureMembersOnce(guild);

      const category = await guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
        position: 0
      });
      const voice = await createCounter(guild, category.id, role as Role, label);

      await setConfig(gid, 'stats_category', category.id);
      await prisma.stat_channels.create({
        data: { channel_id: voice.id, guild_id: gid, role_id: role.id, label: label || null }
      });

      return interaction.editReply(
        `✅ Catégorie statistique **${name}** créée, avec un compteur pour ${role}.`
      );
    }

    // --- Ajouter ---
    if (sub === 'ajouter') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const categoryId = await getConfig(gid, 'stats_category');
      const category = categoryId ? guild.channels.cache.get(categoryId) : null;
      if (!category) {
        return interaction.editReply("❌ Aucune catégorie statistique. Crée-la d'abord avec `/stats creer`.");
      }

      const role = interaction.options.getRole('role', true);
      const label = interaction.options.getString('etiquette');

      const dup = await prisma.stat_channels.findFirst({ where: { guild_id: gid, role_id: role.id } });
      if (dup) return interaction.editReply(`❌ Un compteur existe déjà pour ${role}.`);

      await ensureMembersOnce(guild);
      const voice = await createCounter(guild, category.id, role as Role, label);
      await prisma.stat_channels.create({
        data: { channel_id: voice.id, guild_id: gid, role_id: role.id, label: label || null }
      });

      return interaction.editReply(`✅ Compteur ajouté pour ${role}.`);
    }

    // --- Retirer ---
    if (sub === 'retirer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const role = interaction.options.getRole('role', true);
      const row = await prisma.stat_channels.findFirst({ where: { guild_id: gid, role_id: role.id } });
      if (!row) return interaction.editReply(`❌ Aucun compteur pour ${role}.`);

      await prisma.stat_channels.delete({ where: { channel_id: row.channel_id } });
      await guild.channels.cache.get(row.channel_id)?.delete().catch(() => {});

      return interaction.editReply(`🗑️ Compteur pour ${role} retiré.`);
    }

    // --- Liste ---
    if (sub === 'liste') {
      const rows = await prisma.stat_channels.findMany({ where: { guild_id: gid } });
      if (!rows.length) {
        return interaction.reply({
          content: 'ℹ️ Aucun compteur configuré. Utilise `/stats creer`.',
          flags: MessageFlags.Ephemeral
        });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📊 Compteurs statistiques')
        .setDescription(rows.map((r) => {
          const role = guild.roles.cache.get(r.role_id);
          return `• <#${r.channel_id}> — ${role ?? '*rôle supprimé*'}` +
                 (r.label ? ` *(étiquette : ${r.label})*` : '');
        }).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- Supprimer (avec confirmation) ---
    if (sub === 'supprimer') {
      const count = await prisma.stat_channels.count({ where: { guild_id: gid } });
      const categoryId = await getConfig(gid, 'stats_category');
      if (!count && !categoryId) {
        return interaction.reply({
          content: 'ℹ️ Aucune catégorie statistique à supprimer.',
          flags: MessageFlags.Ephemeral
        });
      }
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('stats:confirm-delete')
          .setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('stats:cancel-delete')
          .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
      );
      return interaction.reply({
        content: `⚠️ Confirmer la suppression de la catégorie statistique et de ses **${count}** compteur(s) ? ` +
          'Cette action est irréversible.',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
