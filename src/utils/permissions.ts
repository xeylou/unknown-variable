import { MessageFlags, PermissionFlagsBits,
  type GuildMember, type ChatInputCommandInteraction, type ButtonInteraction,
  type InteractionReplyOptions
} from 'discord.js';
import { getStaffRole, getAdminRole, ticketStaffRoleIds } from './guildSettings';

// Réexporté pour les appelants historiques (commande `/permissions`).
export { ticketStaffRoleIds };

/**
 * Vrai si le membre est « super-staff » : propriétaire du serveur,
 * permission Discord Administrateur, ou détenteur du rôle admin configuré
 * (`/config admin`, défaut `.env` ADMIN_ROLE_ID pour le serveur principal).
 *
 * Le rôle staff seul ne suffit PAS — c'est précisément ce qui distingue
 * un modérateur (qui peut warn/kick/ban) d'un administrateur (qui peut
 * lockdown serveur, importer un backup, etc.).
 */
export function isAdmin(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (member.guild.ownerId === member.id) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const adminRole = getAdminRole(member.guild.id);
  if (adminRole && member.roles.cache.has(adminRole)) return true;
  return false;
}

/**
 * Vrai si le membre est modérateur : rôle staff configuré (`/config staff`)
 * OU permission Discord typique d'un modérateur. Les rôles spécifiques aux
 * catégories de tickets ne comptent PAS comme staff — pour ceux-là, voir
 * `isTicketStaff`.
 */
export function isStaff(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (isAdmin(member)) return true;
  const staffRole = getStaffRole(member.guild.id);
  if (staffRole && member.roles.cache.has(staffRole)) return true;
  return member.permissions.any([
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages
  ]);
}

/**
 * Vrai si le membre est porteur d'au moins un rôle responsable d'une
 * catégorie de ticket. Un staff (mod) ou admin ne l'est pas implicitement —
 * `viewerTier` traite les priorités (admin > staff > ticket-staff > public).
 */
export function isTicketStaff(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  for (const id of ticketStaffRoleIds(member.guild.id)) {
    if (member.roles.cache.has(id)) return true;
  }
  return false;
}

export type Tier = 'public' | 'ticket-staff' | 'staff' | 'admin';

const TIER_RANK: Record<Tier, number> = {
  public: 0,
  'ticket-staff': 1,
  staff: 2,
  admin: 3
};

/** Niveau d'autorisation du membre — utilisé pour filtrer /help, etc. */
export function viewerTier(member: GuildMember | null | undefined): Tier {
  if (isAdmin(member)) return 'admin';
  if (isStaff(member)) return 'staff';
  if (isTicketStaff(member)) return 'ticket-staff';
  return 'public';
}

/** Vrai si une commande de niveau `commandTier` doit apparaître au viewer. */
export function canSee(commandTier: Tier | undefined, viewer: Tier): boolean {
  const need = TIER_RANK[commandTier ?? 'public'];
  return TIER_RANK[viewer] >= need;
}

type GuardableInteraction =
  | ChatInputCommandInteraction<'cached'>
  | ButtonInteraction<'cached'>;

/** Envoie une réponse de refus éphémère, en suivant l'état de l'interaction. */
async function denyReply(interaction: GuardableInteraction, content: string): Promise<void> {
  const reply: InteractionReplyOptions = {
    content,
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] }
  };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(reply).catch(() => {});
  } else {
    await interaction.reply(reply).catch(() => {});
  }
}

/**
 * Garde de commande : répond avec une erreur éphémère si l'auteur n'a pas
 * le tier requis et renvoie `false` (l'appelant doit `return` immédiatement).
 *
 *   if (!await requireTier(interaction, 'admin')) return;
 */
export async function requireTier(
  interaction: GuardableInteraction,
  tier: 'staff' | 'admin'
): Promise<boolean> {
  if (tier === 'admin' && isAdmin(interaction.member)) return true;
  if (tier === 'staff' && isStaff(interaction.member)) return true;

  const adminRole = getAdminRole(interaction.guild.id);
  const staffRole = getStaffRole(interaction.guild.id);
  const msg = tier === 'admin'
    ? '⛔ Commande réservée à l\'administration ' +
      (adminRole
        ? `(rôle <@&${adminRole}> ou permission *Administrateur*).`
        : '(permission *Administrateur* requise — aucun rôle admin configuré ; voir `/config admin`).')
    : '⛔ Commande réservée au staff ' +
      (staffRole
        ? `(rôle <@&${staffRole}>, administration ou permission de modération).`
        : '(aucun rôle staff configuré — voir `/config staff` — ou une permission Discord de modération).');
  await denyReply(interaction, msg);
  return false;
}

/** Raccourcis pour la lisibilité — équivalents à `requireTier(i, 'admin'|'staff')`. */
export const requireAdmin = (i: GuardableInteraction) => requireTier(i, 'admin');
export const requireStaff = (i: GuardableInteraction) => requireTier(i, 'staff');
