import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { prisma } from '../../database';
import { addTempRole, cancelTempRole } from '../../features/temproles';
import { parseDuration, formatDuration } from '../../utils/duration';
import config from '../../config';

/**
 * Gestion des rôles temporaires (différents du timeout, qui est natif Discord
 * et ne sert qu'au mute).
 */
export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Gestion des rôles temporaires')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('temp').setDescription('Attribue un rôle pour une durée limitée')
      .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à attribuer').setRequired(true))
      .addStringOption((o) => o.setName('duree').setDescription('Ex 10m, 2h, 1d, 7d').setRequired(true))
      .addStringOption((o) => o.setName('raison').setDescription('Raison')))
    .addSubcommand((s) => s.setName('temp-liste').setDescription('Liste les rôles temporaires actifs'))
    .addSubcommand((s) => s.setName('temp-annuler').setDescription('Annule un rôle temporaire')
      .addIntegerOption((o) => o.setName('id').setDescription("ID de l'attribution (voir temp-liste)").setRequired(true))),

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
