import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction, type Role, type PermissionResolvable, type Guild
} from 'discord.js';
import { requireAdmin, ticketStaffRoleIds } from '../../utils/permissions';
import config from '../../config';

interface PermSpec { flag: bigint; label: string; rationale: string }

/**
 * Permissions Discord recommandées par tier. Une fois accordées au rôle,
 * Discord affiche automatiquement les slash-commands correspondantes dans
 * l'autocomplétion pour les membres du rôle.
 */
const STAFF_PERMS: PermSpec[] = [
  { flag: PermissionFlagsBits.KickMembers,     label: 'Expulser des membres',         rationale: '/kick' },
  { flag: PermissionFlagsBits.BanMembers,      label: 'Bannir des membres',           rationale: '/ban /softban /unban' },
  { flag: PermissionFlagsBits.ModerateMembers, label: 'Exclure temporairement',       rationale: '/timeout /untimeout /warn /casier*' },
  { flag: PermissionFlagsBits.ManageMessages,  label: 'Gérer les messages',           rationale: '/clear /embed /ticket move /help' },
  { flag: PermissionFlagsBits.ManageNicknames, label: 'Gérer les pseudonymes',        rationale: 'Pratique pour la modération' },
  { flag: PermissionFlagsBits.ManageChannels,  label: 'Gérer les salons',             rationale: '/lockdown salon' },
  { flag: PermissionFlagsBits.ManageRoles,     label: 'Gérer les rôles',              rationale: '/role temp' },
  { flag: PermissionFlagsBits.ViewAuditLog,    label: "Voir le journal d'audit",       rationale: 'Logs de modération' }
];

const ADMIN_PERMS: PermSpec[] = [
  ...STAFF_PERMS,
  { flag: PermissionFlagsBits.ManageGuild,     label: 'Gérer le serveur',     rationale: '/config /logs /backup /setup-*' },
  { flag: PermissionFlagsBits.MentionEveryone, label: 'Mentionner @everyone', rationale: '/embed avec ping global' }
];

/**
 * Permissions minimales accordées aux rôles responsables de catégories de
 * tickets (« ticket-staff »). Ils voient `/help`, peuvent gérer leurs tickets
 * via `/add-user`, `/remove-user`, `/ticket move`, mais `/clear` et `/embed`
 * sont protégés runtime par `requireStaff`.
 */
const TICKET_STAFF_PERMS: PermSpec[] = [
  { flag: PermissionFlagsBits.ManageMessages, label: 'Gérer les messages', rationale: '/help /add-user /remove-user /ticket move' }
];

export default {
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Vérifie/accorde les permissions Discord aux rôles bot (STAFF / ADMIN / catégories tickets)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('check').setDescription('Affiche l\'état des permissions des rôles configurés'))
    .addSubcommand((s) => s.setName('grant-staff')
      .setDescription("Accorde au rôle STAFF_ROLE_ID les permissions Discord recommandées pour la modération"))
    .addSubcommand((s) => s.setName('grant-admin')
      .setDescription("Accorde au rôle ADMIN_ROLE_ID les permissions Discord recommandées pour l'administration"))
    .addSubcommand((s) => s.setName('grant-ticket-staff')
      .setDescription("Accorde les perms ticket-staff à TOUS les rôles de catégories — ou à un rôle ponctuel si fourni")
      .addRoleOption((o) => o.setName('role')
        .setDescription("Rôle à cibler. Sans argument, traite tous les category.staffRoleId."))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'check') return doCheck(interaction);
    if (sub === 'grant-staff') return doGrant(interaction, 'staff');
    if (sub === 'grant-admin') return doGrant(interaction, 'admin');
    if (sub === 'grant-ticket-staff') return doGrantTicketStaff(interaction);
  }
};

/**
 * Récupère un rôle en priorisant le cache (sans I/O) puis en faisant un
 * fetch en fallback si la guilde n'a pas le rôle en mémoire (gros serveurs).
 */
async function resolveRole(guild: Guild, id: string | undefined): Promise<Role | null> {
  if (!id) return null;
  return guild.roles.cache.get(id) ?? await guild.roles.fetch(id).catch(() => null);
}

async function doCheck(interaction: ChatInputCommandInteraction<'cached'>) {
  const staffRole = await resolveRole(interaction.guild, config.staffRoleId);
  const adminRole = await resolveRole(interaction.guild, config.adminRoleId);

  const fields: { name: string; value: string }[] = [
    { name: 'STAFF_ROLE_ID', value: rolePermsLine(staffRole, config.staffRoleId, STAFF_PERMS) },
    { name: 'ADMIN_ROLE_ID', value: rolePermsLine(adminRole, config.adminRoleId, ADMIN_PERMS) }
  ];

  // Statut de chaque rôle de catégorie de ticket
  const ticketIds = ticketStaffRoleIds();
  if (ticketIds.length === 0) {
    fields.push({ name: 'Rôles de catégories de tickets', value: '*(aucune catégorie ne définit `staffRoleId` dans `src/config.ts`)*' });
  } else {
    const lines: string[] = [];
    for (const id of ticketIds) {
      const role = await resolveRole(interaction.guild, id);
      const cats = config.tickets.categories.filter((c) => c.staffRoleId === id).map((c) => c.label).join(', ');
      lines.push(`**${cats}**\n${rolePermsLine(role, id, TICKET_STAFF_PERMS)}`);
    }
    fields.push({ name: 'Rôles ticket-staff (catégories)', value: lines.join('\n\n') });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🔑 Permissions Discord des rôles bot')
    .setDescription(
      'Discord n\'affiche les commandes dans l\'auto-complétion que si le membre possède ' +
      'la permission Discord requise par la commande. Les rôles personnalisés ' +
      '(STAFF, ADMIN, équipes de tickets) ne donnent aucune permission Discord par défaut.\n\n' +
      'Pour tout configurer en un clic : bouton ci-dessous. Sinon, ' +
      '`/permissions grant-staff`, `/permissions grant-admin` et `/permissions grant-ticket-staff` séparément.'
    )
    .addFields(fields)
    .setFooter({ text: `Alternative manuelle : Paramètres serveur → Intégrations → ${interaction.client.user.username} → permissions par commande.` });

  const needsAnything =
    (config.staffRoleId && STAFF_PERMS.some((p) => !staffRole?.permissions.has(p.flag as PermissionResolvable))) ||
    (config.adminRoleId && ADMIN_PERMS.some((p) => !adminRole?.permissions.has(p.flag as PermissionResolvable))) ||
    (await needsTicketStaffGrant(interaction.guild));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('permissions:grant-all')
      .setLabel('Tout corriger (staff + admin + ticket-staff)')
      .setEmoji('✨')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!needsAnything)
  );

  return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function needsTicketStaffGrant(guild: Guild): Promise<boolean> {
  for (const id of ticketStaffRoleIds()) {
    const role = await resolveRole(guild, id);
    if (!role) continue;
    if (TICKET_STAFF_PERMS.some((p) => !role.permissions.has(p.flag as PermissionResolvable))) return true;
  }
  return false;
}

function rolePermsLine(role: Role | null, id: string | undefined, expected: PermSpec[]): string {
  if (!id) return '*(non configuré dans `.env`)*';
  if (!role) return `⚠️ Rôle introuvable (ID \`${id}\`)`;
  const have = expected.filter((p) => role.permissions.has(p.flag as PermissionResolvable));
  const miss = expected.filter((p) => !role.permissions.has(p.flag as PermissionResolvable));
  let out = `${role} (\`${role.id}\`)\n`;
  out += `✅ ${have.length}/${expected.length} permissions recommandées présentes`;
  if (miss.length) {
    const list = miss.slice(0, 6).map((p) => `• ${p.label}`).join('\n');
    out += `\n❌ Manquantes :\n${list}`;
    if (miss.length > 6) out += `\n*… +${miss.length - 6}*`;
  }
  return out;
}

async function doGrant(interaction: ChatInputCommandInteraction<'cached'>, kind: 'staff' | 'admin') {
  const result = await grantTo(interaction.guild, kind, `/permissions grant-${kind} par ${interaction.user.tag}`);
  if (result.kind === 'error') return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
  if (result.kind === 'noop')  return interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
  return interaction.reply({ embeds: [grantSuccessEmbed(result.roleName, result.added)], flags: MessageFlags.Ephemeral });
}

async function doGrantTicketStaff(interaction: ChatInputCommandInteraction<'cached'>) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const reason = `/permissions grant-ticket-staff par ${interaction.user.tag}`;
  const specified = interaction.options.getRole('role');

  const targetIds = specified ? [specified.id] : ticketStaffRoleIds();
  if (targetIds.length === 0) {
    return interaction.editReply('❌ Aucun rôle de catégorie de ticket configuré dans `src/config.ts`. Édite-le pour définir au moins un `staffRoleId`.');
  }

  const results = await Promise.all(targetIds.map((id) => grantRolePerms(interaction.guild, id, TICKET_STAFF_PERMS, reason)));
  const okResults = results.filter((r): r is Extract<GrantResult, { kind: 'ok' }> => r.kind === 'ok');
  const errResults = results.filter((r): r is Extract<GrantResult, { kind: 'error' }> => r.kind === 'error');
  const noopResults = results.filter((r): r is Extract<GrantResult, { kind: 'noop' }> => r.kind === 'noop');

  const lines: string[] = [];
  if (okResults.length) lines.push(`✅ ${okResults.length} rôle(s) mis à jour : ${okResults.map((r) => r.roleName).join(', ')}`);
  if (noopResults.length) lines.push(`ℹ️ ${noopResults.length} rôle(s) déjà à jour`);
  if (errResults.length) lines.push(`❌ Erreurs :\n${errResults.map((r) => `• ${r.message}`).join('\n')}`);

  return interaction.editReply(lines.join('\n\n') || 'Rien à faire.');
}

type GrantResult =
  | { kind: 'error'; message: string }
  | { kind: 'noop'; message: string }
  | { kind: 'ok'; roleName: string; added: PermSpec[] };

/**
 * Logique brute du grant pour STAFF / ADMIN. Réutilisable par la commande
 * et par le bouton « Tout corriger » du composant.
 */
export async function grantTo(guild: Guild, kind: 'staff' | 'admin', reason: string): Promise<GrantResult> {
  const id = kind === 'staff' ? config.staffRoleId : config.adminRoleId;
  const envKey = kind === 'staff' ? 'STAFF_ROLE_ID' : 'ADMIN_ROLE_ID';
  if (!id) return { kind: 'error', message: `❌ \`${envKey}\` n'est pas défini dans \`.env\`.` };

  const list = kind === 'staff' ? STAFF_PERMS : ADMIN_PERMS;
  return grantRolePerms(guild, id, list, reason);
}

/** Cœur : applique un set de permissions à un rôle donné (idempotent). */
async function grantRolePerms(guild: Guild, roleId: string, perms: PermSpec[], reason: string): Promise<GrantResult> {
  const role = await resolveRole(guild, roleId);
  if (!role) return { kind: 'error', message: `Rôle introuvable (\`${roleId}\`).` };

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { kind: 'error', message: 'Le bot a besoin de la permission **Gérer les rôles**.' };
  }
  if (me.roles.highest.position <= role.position) {
    return { kind: 'error', message: `Le rôle du bot doit être plus haut que ${role.name} dans Paramètres serveur → Rôles.` };
  }

  const current = role.permissions.bitfield;
  const target = perms.reduce<bigint>((acc, p) => acc | p.flag, 0n);
  const next = current | target;
  if (next === current) return { kind: 'noop', message: `${role.name} possède déjà toutes les perms recommandées.` };

  await role.setPermissions(next, reason).catch(() => null);
  const added = perms.filter((p) => (current & p.flag) === 0n);
  return { kind: 'ok', roleName: role.name, added };
}

export function grantSuccessEmbed(roleName: string, added: PermSpec[]): EmbedBuilder {
  const lines = added.map((p) => `• ${p.label} — ${p.rationale}`).join('\n');
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`✅ Permissions accordées à ${roleName}`)
    .setDescription(
      `${lines}\n\n` +
      'Les commandes correspondantes apparaîtront dans l\'auto-complétion ' +
      'Discord (`/`) pour les membres de ce rôle d\'ici quelques secondes ' +
      '(Discord met son cache à jour après une reconnexion du client).'
    );
}

/** Helper exporté pour le bouton « Tout corriger » : grant pour ticket-staff. */
export async function grantAllTicketStaff(guild: Guild, reason: string): Promise<GrantResult[]> {
  const ids = ticketStaffRoleIds();
  return Promise.all(ids.map((id) => grantRolePerms(guild, id, TICKET_STAFF_PERMS, reason)));
}
