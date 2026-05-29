import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { invalidateLinks } from '../../features/github/announce';

/**
 * Liaison auto-déclarée pseudo GitHub ↔ compte Discord. Sert uniquement à
 * @mentionner l'auteur d'un commit / d'une PR dans les annonces — ce n'est PAS
 * une frontière de sécurité (aucune vérification de propriété du compte GitHub).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('gitlink')
    .setDescription('Lier ton compte Discord à ton pseudo GitHub (mentions dans les annonces)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('lier').setDescription('Déclarer ton pseudo GitHub')
      .addStringOption((o) => o.setName('pseudo-github').setDescription('Ton pseudo GitHub').setRequired(true)))
    .addSubcommand((s) => s.setName('statut').setDescription('Voir ta liaison'))
    .addSubcommand((s) => s.setName('delier').setDescription('Supprimer ta liaison')),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === 'lier') {
      const login = interaction.options.getString('pseudo-github', true).trim().replace(/^@/, '');
      if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) {
        return interaction.reply({ content: '❌ Pseudo GitHub invalide (lettres, chiffres, tirets).', flags: MessageFlags.Ephemeral });
      }
      await prisma.github_links.upsert({
        where: { guild_id_user_id: { guild_id: gid, user_id: uid } },
        update: { github_login: login, linked_at: Date.now() },
        create: { guild_id: gid, user_id: uid, github_login: login, linked_at: Date.now() }
      });
      invalidateLinks(gid);
      return interaction.reply({
        content: `✅ Ton compte est lié à **@${login}**. Tu seras mentionné sur tes commits et PR.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'statut') {
      const link = await prisma.github_links.findUnique({
        where: { guild_id_user_id: { guild_id: gid, user_id: uid } }
      });
      return interaction.reply({
        content: link
          ? `✅ Lié à **@${link.github_login}** depuis <t:${Math.floor(link.linked_at / 1000)}:R>.`
          : 'ℹ️ Aucune liaison. Utilise `/gitlink lier`.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'delier') {
      const res = await prisma.github_links.deleteMany({ where: { guild_id: gid, user_id: uid } });
      invalidateLinks(gid);
      return interaction.reply({
        content: res.count ? '🗑️ Liaison supprimée.' : 'ℹ️ Aucune liaison à supprimer.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
