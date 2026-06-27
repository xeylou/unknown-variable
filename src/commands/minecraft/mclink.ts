import { SlashCommandBuilder, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { isConfigured, rconCommand } from '../../features/mcrcon';
import { lookupProfile } from '../../features/mojang';
import { LINK_TTL_MS, validatePseudo, sameUsername, pseudoConflict } from '../../features/mclinking';
import { getConfig } from '../../utils/configCache';
import { requireStaff, isAdmin } from '../../utils/permissions';
import config from '../../config';
import { base, frLoc } from '../../i18n';

/**
 * Liaison compte Discord ↔ pseudo Minecraft (domaine sensible).
 *
 * `lier` est LIBRE-SERVICE mais **réservé à un rôle configuré** (`mc_link_role`,
 * via `/config minecraft-rcon role-liaison:`) : un membre autorisé whiteliste son pseudo
 * et crée une demande, validée à la connexion par `features/mcingame.ts`. La
 * liaison est **unique et définitive** côté membre ; seul le staff peut délier.
 */
export default {
  // Anti-spam : `lier` déclenche un appel RCON + un appel Mojang.
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('mclink')
    .setDescription(base('mclink.cmd.desc'))
      .setDescriptionLocalizations(frLoc('mclink.cmd.desc'))
    // Pas de setDefaultMemberPermissions : `lier`/`statut` doivent rester
    // visibles des membres ; l'accès réel est gardé en code (rôle / staff).
    .addSubcommand((s) => s.setName('lier').setDescription(base('mclink.sub.lier.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.lier.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('mclink.opt.pseudo.desc'))
        .setDescriptionLocalizations(frLoc('mclink.opt.pseudo.desc')).setRequired(true)))
    .addSubcommand((s) => s.setName('statut').setDescription(base('mclink.sub.statut.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.statut.desc')))
    .addSubcommand((s) => s.setName('delier').setDescription(base('mclink.sub.delier.desc'))
      .setDescriptionLocalizations(frLoc('mclink.sub.delier.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('mclink.opt.delier_pseudo.desc'))
        .setDescriptionLocalizations(frLoc('mclink.opt.delier_pseudo.desc')).setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    if (sub === 'lier')   return lier(interaction, gid);
    if (sub === 'statut') return statut(interaction, gid);
    if (sub === 'delier') return delier(interaction, gid);
  }
};

/** Libre-service réservé au rôle configuré : whiteliste + crée la demande. */
async function lier(interaction: ChatInputCommandInteraction<'cached'>, gid: string) {
  if (!(await isConfigured(gid))) {
    return interaction.reply({
      content: '⚠️ Le bot n\'a pas accès au serveur Minecraft (RCON non configuré).',
      flags: MessageFlags.Ephemeral
    });
  }

  const member = interaction.member;
  const admin = isAdmin(member);

  // 1. Rôle requis (les admins contournent le gate, pour test/gestion).
  if (!admin) {
    const linkRole = await getConfig(gid, 'mc_link_role');
    if (!linkRole) {
      return interaction.reply({
        content: '⚠️ La liaison libre n\'est pas activée sur ce serveur. Demandez au staff de vous y autoriser.',
        flags: MessageFlags.Ephemeral
      });
    }
    if (!member.roles.cache.has(linkRole)) {
      return interaction.reply({
        content: `⛔ Vous n'êtes pas autorisé à lier votre compte. Demandez le rôle <@&${linkRole}> au staff.`,
        flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] }
      });
    }

    // 2. Gate anti-raid : rôle vérifié + âge de compte (optionnels).
    if ((await getConfig(gid, 'mc_link_require_verified', '0')) === '1') {
      const verifiedRole = await getConfig(gid, 'verified_role');
      if (verifiedRole && !member.roles.cache.has(verifiedRole)) {
        return interaction.reply({
          content: '⛔ Vous devez d\'abord valider le règlement avant de lier votre compte.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
    const minAgeDays = Number(await getConfig(gid, 'mc_link_min_age_days', '0')) || 0;
    if (minAgeDays > 0) {
      const ageDays = (Date.now() - interaction.user.createdTimestamp) / 86_400_000;
      if (ageDays < minAgeDays) {
        return interaction.reply({
          content: `⛔ Votre compte Discord est trop récent pour lier (minimum ${minAgeDays} jour(s)).`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }

  // 3. Format pseudo (anti-injection RCON) — avant tout appel externe.
  const raw = interaction.options.getString('pseudo', true).trim();
  if (!validatePseudo(raw)) {
    return interaction.reply({
      content: '❌ Pseudo Minecraft invalide (3-16 caractères alphanumériques ou `_`).',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // 4. Une seule liaison par membre (définitive côté membre).
  const existing = await prisma.mc_links.findUnique({
    where: { guild_id_user_id: { guild_id: gid, user_id: interaction.user.id } }
  });
  if (existing) {
    return interaction.editReply(
      `ℹ️ Votre compte est déjà lié à **${existing.mc_username}**. La liaison est définitive — ` +
      'contactez le staff pour la modifier.'
    );
  }

  // 5. Mojang : existence + nom canonique + UUID (dégrade si l'API est HS).
  const profile = await lookupProfile(raw);
  if (profile === 'not_found') {
    return interaction.editReply(`❌ Le pseudo Minecraft **${raw}** n'existe pas (compte Java introuvable).`);
  }
  const name = profile === 'error' ? raw : profile.name;
  const uuid = profile === 'error' ? null : profile.uuid;

  // 6. Conflit avec un autre membre (lié OU en attente), insensible à la casse.
  const conflict = await pseudoConflict(gid, { name, uuid, excludeUserId: interaction.user.id });
  if (conflict) {
    return interaction.editReply(
      `❌ Le pseudo **${name}** est déjà ${conflict.kind === 'linked' ? 'lié' : 'réservé'} ` +
      `par <@${conflict.userId}>. Si c'est une erreur, contactez le staff.`
    );
  }

  // 7. Whitelist via RCON (nom canonique Mojang).
  const out = await rconCommand(gid, `whitelist add ${name}`);
  if (out === null) {
    return interaction.editReply('❌ Serveur Minecraft injoignable (RCON) — réessayez plus tard ou prévenez le staff.');
  }

  // 8. Demande pendante (5 min), validée à la connexion par mcingame.ts.
  const code = `${interaction.user.id}-${Date.now().toString(36)}`;
  await prisma.mc_link_codes.create({
    data: { code, guild_id: gid, user_id: interaction.user.id, mc_username: name, mc_uuid: uuid, expires_at: Date.now() + LINK_TTL_MS }
  });
  await prisma.mc_link_codes.deleteMany({ where: { guild_id: gid, user_id: interaction.user.id, code: { not: code } } });

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('⛏️ Liaison en attente')
      .setDescription(
        `**${name}** a été ajouté à la whitelist.\n\n` +
        'Connectez-vous au serveur avec ce pseudo **dans les 5 minutes** : votre compte Discord ' +
        'sera alors lié automatiquement (et recevra le rôle en jeu si configuré).\n\n' +
        '*Si vous n\'utilisez pas ce pseudo exact, la liaison ne se fera pas.*'
      )]
  });
}

/** Libre-service : état de la liaison du membre appelant. */
async function statut(interaction: ChatInputCommandInteraction<'cached'>, gid: string) {
  const link = await prisma.mc_links.findUnique({
    where: { guild_id_user_id: { guild_id: gid, user_id: interaction.user.id } }
  });
  if (link) {
    return interaction.reply({
      content: `✅ Lié à **${link.mc_username}** depuis <t:${Math.floor(link.linked_at / 1000)}:R>.`,
      flags: MessageFlags.Ephemeral
    });
  }
  const pending = await prisma.mc_link_codes.findFirst({ where: { guild_id: gid, user_id: interaction.user.id } });
  if (pending && pending.expires_at > Date.now()) {
    return interaction.reply({
      content: `⏳ Demande en attente pour **${pending.mc_username}** — connectez-vous au serveur pour valider (avant <t:${Math.floor(pending.expires_at / 1000)}:R>).`,
      flags: MessageFlags.Ephemeral
    });
  }
  return interaction.reply({ content: 'ℹ️ Aucune liaison ni demande en cours. Utilisez `/mclink lier`.', flags: MessageFlags.Ephemeral });
}

/** Staff : retire la LIAISON d'un pseudo (le pseudo reste whitelisté). */
async function delier(interaction: ChatInputCommandInteraction<'cached'>, gid: string) {
  if (!await requireStaff(interaction)) return;
  const raw = interaction.options.getString('pseudo', true).trim();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const links = await prisma.mc_links.findMany({ where: { guild_id: gid } });
  const matchLinks = links.filter((l) => sameUsername(l.mc_username, raw));
  for (const l of matchLinks) {
    await prisma.mc_links.delete({
      where: { guild_id_user_id: { guild_id: gid, user_id: l.user_id } }
    }).catch(() => {});
  }

  const pendings = await prisma.mc_link_codes.findMany({ where: { guild_id: gid } });
  let pendCount = 0;
  for (const p of pendings) {
    if (sameUsername(p.mc_username, raw)) {
      await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});
      pendCount++;
    }
  }

  if (!matchLinks.length && !pendCount) {
    return interaction.editReply(`ℹ️ Aucune liaison ni demande pour **${raw}**.`);
  }
  return interaction.editReply(
    `🗑️ Liaison de **${raw}** supprimée (lien seul — le pseudo reste whitelisté ; utilisez ` +
    `\`/whitelist remove\` pour retirer aussi la whitelist). ${matchLinks.length} lien(s), ${pendCount} demande(s).`
  );
}
