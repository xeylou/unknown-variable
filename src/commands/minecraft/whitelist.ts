import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { rconCommand, isConfigured } from '../../features/mcrcon';
import { requireStaff } from '../../utils/permissions';
import { validatePseudo, sameUsername } from '../../features/mclinking';
import { noMentions } from '../../utils/mentions';
import config from '../../config';
import { base, frLoc } from '../../i18n';

/**
 * Gestion STAFF de la whitelist du serveur Minecraft (via RCON).
 *
 * Les membres ne se whitelistent pas ici : ils passent par `/mclink lier`
 * (réservé à un rôle, whitelist + liaison). `/whitelist` reste l'outil staff
 * pour whitelister un pseudo sans liaison, retirer un accès, ou inspecter.
 */

/** Extrait les pseudos d'une sortie RCON « whitelist list » (« …: a, b, c »). */
function parseWhitelist(raw: string): string[] {
  const m = raw.match(/:\s*(.+)$/);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

export default {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription(base('whitelist.cmd.desc'))
      .setDescriptionLocalizations(frLoc('whitelist.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('add').setDescription(base('whitelist.sub.add.desc'))
      .setDescriptionLocalizations(frLoc('whitelist.sub.add.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('whitelist.opt.pseudo.desc'))
        .setDescriptionLocalizations(frLoc('whitelist.opt.pseudo.desc')).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(base('whitelist.sub.remove.desc'))
      .setDescriptionLocalizations(frLoc('whitelist.sub.remove.desc'))
      .addStringOption((o) => o.setName('pseudo').setDescription(base('whitelist.opt.pseudo.desc'))
        .setDescriptionLocalizations(frLoc('whitelist.opt.pseudo.desc')).setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription(base('whitelist.sub.list.desc'))
      .setDescriptionLocalizations(frLoc('whitelist.sub.list.desc'))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireStaff(interaction)) return;
    const gid = interaction.guild.id;

    if (!(await isConfigured(gid))) {
      return interaction.reply({
        content: '⚠️ RCON non configuré pour ce serveur. Utiliser `/config minecraft-rcon`.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add' || sub === 'remove') {
      const pseudo = interaction.options.getString('pseudo', true).trim();
      // Validation du format AVANT l'interpolation RCON (anti-injection).
      if (!validatePseudo(pseudo)) {
        return interaction.reply({ content: '❌ Pseudo invalide (3-16 caractères alphanumériques ou `_`).', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (sub === 'add') {
        const out = await rconCommand(gid, `whitelist add ${pseudo}`);
        if (out === null) return interaction.editReply('❌ Serveur Minecraft injoignable (RCON).');
        return interaction.editReply(`📥 ${out || `\`${pseudo}\` ajouté à la whitelist.`}`);
      }

      // remove : whitelist + liaison(s) Discord associée(s).
      const out = await rconCommand(gid, `whitelist remove ${pseudo}`);
      if (out === null) return interaction.editReply('❌ Serveur Minecraft injoignable (RCON).');
      const links = await prisma.mc_links.findMany({ where: { guild_id: gid } });
      const matches = links.filter((l) => sameUsername(l.mc_username, pseudo));
      for (const l of matches) {
        await prisma.mc_links.delete({ where: { guild_id_user_id: { guild_id: gid, user_id: l.user_id } } }).catch(() => {});
      }
      const pendings = await prisma.mc_link_codes.findMany({ where: { guild_id: gid } });
      for (const p of pendings) {
        if (sameUsername(p.mc_username, pseudo)) await prisma.mc_link_codes.delete({ where: { code: p.code } }).catch(() => {});
      }
      return interaction.editReply(
        `📤 ${out || `\`${pseudo}\` retiré de la whitelist.`}` +
        (matches.length ? ` Liaison Discord supprimée (${matches.length}).` : '')
      );
    }

    if (sub === 'list') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const out = await rconCommand(gid, 'whitelist list');
      if (out === null) return interaction.editReply('❌ Serveur Minecraft injoignable (RCON).');

      const names = parseWhitelist(out);
      const links = await prisma.mc_links.findMany({ where: { guild_id: gid } });
      const byName = new Map(links.map((l) => [l.mc_username.toLowerCase(), l.user_id]));
      const body = names.length
        ? names.map((n) => {
            const uid = byName.get(n.toLowerCase());
            return uid ? `• \`${n}\` → <@${uid}>` : `• \`${n}\``;
          }).join('\n')
        : '*(whitelist vide)*';

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`📋 Whitelist — ${names.length} joueur(s)`)
          .setDescription(body.slice(0, 4000))],
        allowedMentions: noMentions
      });
    }
  }
};
