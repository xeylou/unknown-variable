import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { isConfigured } from '../../features/mcrcon';
import config from '../../config';
import { base, frLoc } from '../../i18n';

const LINK_TTL_MS = 30 * 60 * 1000;

/**
 * Lie un compte Discord à un pseudo Minecraft. La validation est implicite :
 * la liaison devient effective dès que le pseudo apparaît dans la liste des
 * joueurs en ligne du serveur (boucle `mcingame.ts`). Tant qu'elle n'est pas
 * validée, la table `mc_link_codes` contient la demande pendante.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('mclink')
    .setDescription(base('mclink.cmd.desc'))
      .setDescriptionLocalizations(frLoc('mclink.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('demande').setDescription(base('mclink.sub.demande.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.demande.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('mclink.opt.pseudo.desc'))
      .setDescriptionLocalizations(frLoc('mclink.opt.pseudo.desc')).setRequired(true)))
    .addSubcommand((s) => s.setName('statut').setDescription(base('mclink.sub.statut.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.statut.desc')))
    .addSubcommand((s) => s.setName('delier').setDescription(base('mclink.sub.delier.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.delier.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'demande') {
      if (!(await isConfigured(gid))) {
        return interaction.reply({
          content: '⚠️ Le bot n\'a pas accès au serveur Minecraft (RCON non configuré).',
          flags: MessageFlags.Ephemeral
        });
      }
      const pseudo = interaction.options.getString('pseudo', true).trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(pseudo)) {
        return interaction.reply({
          content: '❌ Pseudo Minecraft invalide (3-16 caractères alphanumériques ou `_`).',
          flags: MessageFlags.Ephemeral
        });
      }
      const existing = await prisma.mc_links.findUnique({
        where: { guild_id_user_id: { guild_id: gid, user_id: interaction.user.id } }
      });
      if (existing) {
        return interaction.reply({
          content: `ℹ️ Votre compte est déjà lié à **${existing.mc_username}**. Utiliser \`/mclink delier\` pour changer.`,
          flags: MessageFlags.Ephemeral
        });
      }
      // Stocke la demande en attente
      const code = `${interaction.user.id}-${Date.now().toString(36)}`;
      await prisma.mc_link_codes.upsert({
        where: { code },
        update: {},
        create: {
          code,
          guild_id: gid,
          user_id: interaction.user.id,
          mc_username: pseudo,
          expires_at: Date.now() + LINK_TTL_MS
        }
      });
      // Supprime les autres demandes du même user pour ce serveur
      await prisma.mc_link_codes.deleteMany({
        where: { guild_id: gid, user_id: interaction.user.id, code: { not: code } }
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('⛏️ Liaison en attente')
          .setDescription(
            `Se connecter au serveur Minecraft avec le pseudo **${pseudo}** dans les **30 minutes**.\n` +
            'Dès que vous serez en ligne, votre liaison sera validée automatiquement.\n\n' +
            '*Si vous n\'utilisez pas ce pseudo exact, la liaison ne sera pas faite.*'
          )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'statut') {
      const link = await prisma.mc_links.findUnique({
        where: { guild_id_user_id: { guild_id: gid, user_id: interaction.user.id } }
      });
      if (link) {
        return interaction.reply({
          content: `✅ Lié à **${link.mc_username}** depuis <t:${Math.floor(link.linked_at / 1000)}:R>.`,
          flags: MessageFlags.Ephemeral
        });
      }
      const pending = await prisma.mc_link_codes.findFirst({
        where: { guild_id: gid, user_id: interaction.user.id }
      });
      if (pending) {
        return interaction.reply({
          content: `⏳ Demande en attente pour **${pending.mc_username}**. Se connecter sur le serveur pour valider.`,
          flags: MessageFlags.Ephemeral
        });
      }
      return interaction.reply({ content: 'ℹ️ Aucune liaison ni demande en cours.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'delier') {
      const res = await prisma.mc_links.deleteMany({
        where: { guild_id: gid, user_id: interaction.user.id }
      });
      await prisma.mc_link_codes.deleteMany({
        where: { guild_id: gid, user_id: interaction.user.id }
      });
      return interaction.reply({
        content: res.count ? '🗑️ Liaison supprimée.' : 'ℹ️ Aucune liaison à supprimer.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
