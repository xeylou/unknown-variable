import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { requireStaff } from '../../utils/permissions';
import { normalizeName } from '../../utils/normalizeName';
import { base, frLoc } from '../../i18n';

/**
 * Normalise le pseudo affiché d'un membre : retire Zalgo / polices fantaisie /
 * hoisting pour un nom lisible et correctement trié. Le changement est capté par
 * l'historique des pseudos (`events/nameHistoryMember.ts`).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('normalize')
    .setDescription(base('normalize.cmd.desc'))
      .setDescriptionLocalizations(frLoc('normalize.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption((o) => o.setName('membre')
      .setDescription(base('normalize.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('normalize.opt.member.desc'))
      .setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireStaff(interaction)) return;

    const member = interaction.options.getMember('membre');
    if (!member) {
      return interaction.reply({ content: '❌ Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    }

    const before = member.displayName;
    // Repli en cascade : pseudo nettoyé → nom d'utilisateur nettoyé → « Membre ».
    const clean = normalizeName(before) || normalizeName(member.user.username) || 'Membre';

    if (clean === before) {
      return interaction.reply({
        content: `ℹ️ Le pseudo de ${member} est déjà lisible (\`${before}\`).`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
    }
    if (!member.manageable) {
      return interaction.reply({
        content: `⛔ Impossible de renommer ${member} (rôle trop haut ou propriétaire du serveur).`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
    }

    const ok = await member.setNickname(clean, `Pseudo normalisé par ${interaction.user.tag}`)
      .then(() => true).catch(() => false);
    if (!ok) {
      return interaction.reply({
        content: `❌ Échec du renommage de ${member} (permissions du bot ?).`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
    }

    return interaction.reply({
      content: `✅ Pseudo de ${member} normalisé : \`${before}\` → \`${clean}\`.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  }
};
