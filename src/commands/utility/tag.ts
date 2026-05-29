import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import config from '../../config';

/**
 * Système de tags / FAQ : réponses pré-écrites rappelées par `/tag <nom>`.
 * Pratique pour les règles, l'IP serveur MC, les liens utiles, etc.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Réponses pré-écrites (FAQ) — réservé au staff')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('show').setDescription('Afficher un tag enregistré')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true)))
    .addSubcommand((s) => s.setName('ajouter').setDescription('Créer un nouveau tag (staff)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom court').setRequired(true).setMaxLength(50))
      .addStringOption((o) => o.setName('contenu').setDescription('Texte du tag').setRequired(true).setMaxLength(2000)))
    .addSubcommand((s) => s.setName('editer').setDescription('Modifier un tag existant (staff)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true))
      .addStringOption((o) => o.setName('contenu').setDescription('Nouveau texte').setRequired(true).setMaxLength(2000)))
    .addSubcommand((s) => s.setName('retirer').setDescription('Supprimer un tag (staff)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du tag').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Lister tous les tags du serveur')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (sub === 'show') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const tag = await prisma.tags.findUnique({ where: { guild_id_name: { guild_id: gid, name } } });
      if (!tag) {
        return interaction.reply({ content: `❌ Tag \`${name}\` introuvable.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: tag.content, allowedMentions: { parse: [] } });
    }

    if (sub === 'liste') {
      const rows = await prisma.tags.findMany({ where: { guild_id: gid }, orderBy: { name: 'asc' } });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Aucun tag enregistré.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🏷️ Tags du serveur (${rows.length})`)
        .setDescription(rows.map((t) => `• \`${t.name}\``).join(', '));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // --- Actions staff ---
    if (!isStaff) {
      return interaction.reply({
        content: '❌ Cette action est réservée au staff (permission Gérer les messages).',
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'ajouter') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const content = interaction.options.getString('contenu', true);
      if (!/^[a-z0-9_-]{1,50}$/.test(name)) {
        return interaction.reply({
          content: '❌ Nom invalide : lettres minuscules, chiffres, `_` ou `-` uniquement, max 50.',
          flags: MessageFlags.Ephemeral
        });
      }
      const existing = await prisma.tags.findUnique({ where: { guild_id_name: { guild_id: gid, name } } });
      if (existing) {
        return interaction.reply({ content: `❌ Le tag \`${name}\` existe déjà — utilise \`/tag editer\`.`, flags: MessageFlags.Ephemeral });
      }
      await prisma.tags.create({
        data: { guild_id: gid, name, content, created_by: interaction.user.id, created_at: Date.now() }
      });
      return interaction.reply({ content: `✅ Tag \`${name}\` créé.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'editer') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const content = interaction.options.getString('contenu', true);
      const res = await prisma.tags.updateMany({
        where: { guild_id: gid, name },
        data: { content }
      });
      return interaction.reply({
        content: res.count ? `✅ Tag \`${name}\` mis à jour.` : `❌ Tag \`${name}\` introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'retirer') {
      const name = interaction.options.getString('nom', true).toLowerCase().trim();
      const res = await prisma.tags.deleteMany({ where: { guild_id: gid, name } });
      return interaction.reply({
        content: res.count ? `🗑️ Tag \`${name}\` supprimé.` : `❌ Tag \`${name}\` introuvable.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
