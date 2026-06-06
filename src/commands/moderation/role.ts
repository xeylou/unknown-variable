import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction, type AutocompleteInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { addTempRole, cancelTempRole } from '../../features/temproles';
import { parseDuration, formatDuration } from '../../utils/duration';
import { respondChoices } from '../../utils/autocomplete';
import config from '../../config';
import { base, frLoc } from '../../i18n';

/**
 * Gestion des rôles temporaires (différents du timeout, qui est natif Discord
 * et ne sert qu'au mute).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription(base('role.cmd.desc'))
      .setDescriptionLocalizations(frLoc('role.cmd.desc'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('temp').setDescription(base('role.sub.temp.desc'))
      .setDescriptionLocalizations(frLoc('role.sub.temp.desc'))
      .addUserOption((o) => o.setName('membre').setDescription(base('role.opt.member.desc'))
      .setDescriptionLocalizations(frLoc('role.opt.member.desc')).setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription(base('role.opt.role.desc'))
      .setDescriptionLocalizations(frLoc('role.opt.role.desc')).setRequired(true))
      .addStringOption((o) => o.setName('duree').setDescription('Ex 10m, 2h, 1d, 7d').setRequired(true))
      .addStringOption((o) => o.setName('raison').setDescription(base('role.opt.reason.desc'))
      .setDescriptionLocalizations(frLoc('role.opt.reason.desc'))))
    .addSubcommand((s) => s.setName('temp-liste').setDescription(base('role.sub.templiste.desc'))
      .setDescriptionLocalizations(frLoc('role.sub.templiste.desc')))
    .addSubcommand((s) => s.setName('temp-annuler').setDescription(base('role.sub.tempannuler.desc'))
      .setDescriptionLocalizations(frLoc('role.sub.tempannuler.desc'))
      .addIntegerOption((o) => o.setName('id').setDescription(base('role.opt.id.desc'))
      .setDescriptionLocalizations(frLoc('role.opt.id.desc')).setRequired(true).setAutocomplete(true))),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.guildId) return;
    const rows = await prisma.temp_roles.findMany({
      where: { guild_id: interaction.guildId },
      orderBy: { expires_at: 'asc' },
      take: 25
    });
    await respondChoices(interaction, rows.map((r) => {
      const roleName = interaction.guild?.roles.cache.get(r.role_id)?.name ?? `rôle ${r.role_id}`;
      return { name: `#${r.id} — @${roleName}`, value: r.id };
    }));
  },

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === 'temp') {
      const member = interaction.options.getMember('membre');
      const role = interaction.options.getRole('role', true) as import('discord.js').Role;
      const ms = parseDuration(interaction.options.getString('duree', true));
      const reason = interaction.options.getString('raison');

      if (!member) {
        return interaction.reply({ content: '❌ Membre introuvable sur le serveur.', flags: MessageFlags.Ephemeral });
      }
      if (!ms) {
        return interaction.reply({ content: '❌ Durée invalide. Exemples : `10m`, `2h`, `7d`.', flags: MessageFlags.Ephemeral });
      }
      const me = interaction.guild.members.me;
      if (!me || role.managed || role.position >= me.roles.highest.position) {
        return interaction.reply({ content: `❌ Je ne peux pas attribuer ${role} (rôle géré ou plus haut que le mien).`, flags: MessageFlags.Ephemeral });
      }

      const id = await addTempRole({
        guild: interaction.guild,
        member,
        role,
        durationMs: ms,
        assignedBy: interaction.user.id,
        reason: reason ?? undefined
      });
      return interaction.reply({
        content: `⏳ Rôle ${role} attribué à ${member} pour **${formatDuration(ms)}** (#${id}).`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'temp-liste') {
      const rows = await prisma.temp_roles.findMany({
        where: { guild_id: gid },
        orderBy: { expires_at: 'asc' },
        take: 20
      });
      if (!rows.length) {
        return interaction.reply({ content: 'ℹ️ Aucun rôle temporaire en cours.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('⏳ Rôles temporaires en cours')
        .setDescription(rows.map((r) =>
          `**#${r.id}** · <@${r.user_id}> · <@&${r.role_id}> · expire <t:${Math.floor(r.expires_at / 1000)}:R> ` +
          `(assigné par <@${r.assigned_by}>)`
        ).join('\n'));
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'temp-annuler') {
      const id = interaction.options.getInteger('id', true);
      const row = await prisma.temp_roles.findUnique({ where: { id } });
      if (!row || row.guild_id !== gid) {
        return interaction.reply({ content: '❌ Attribution introuvable.', flags: MessageFlags.Ephemeral });
      }
      // Retire le rôle au passage si encore présent
      const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
      if (member) await member.roles.remove(row.role_id, 'Rôle temporaire annulé').catch(() => {});
      await cancelTempRole(id);
      return interaction.reply({ content: `🗑️ Attribution #${id} annulée.`, flags: MessageFlags.Ephemeral });
    }
  }
};
