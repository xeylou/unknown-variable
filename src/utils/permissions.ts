import { MessageFlags, PermissionFlagsBits,
  type GuildMember, type ChatInputCommandInteraction, type ButtonInteraction,
  type InteractionReplyOptions
} from 'discord.js';
import config from '../config';

/**
 * Vrai si le membre est « super-staff » : propriétaire du serveur,
 * permission Discord Administrateur, ou détenteur du rôle `ADMIN_ROLE_ID`.
 *
 * Le STAFF_ROLE_ID seul ne suffit PAS — c'est précisément ce qui distingue
 * un modérateur (qui peut warn/kick/ban) d'un administrateur (qui peut
 * lockdown serveur, importer un backup, etc.).
 */
export function isAdmin(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (member.guild.ownerId === member.id) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config.adminRoleId && member.roles.cache.has(config.adminRoleId)) return true;
  return false;
}

/**
 * Vrai si le membre est modérateur : rôle `STAFF_ROLE_ID` global OU
 * permission Discord typique d'un modérateur. Les rôles spécifiques aux
 * catégories de tickets ne comptent PAS comme staff — pour ceux-là, voir
 * `isTicketStaff`.
 */
export function isStaff(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (isAdmin(member)) return true;
  if (config.staffRoleId && member.roles.cache.has(config.staffRoleId)) return true;
  return member.permissions.any([
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages
  ]);
}

/**
 * Liste dédupliquée des rôles responsables de catégories de tickets
 * (`category.staffRoleId` non vide). Ces rôles ne sont PAS staff au sens
 * modération — ce sont des équipes spécialisées (builders, devs…) qui
 * voient leurs tickets et reçoivent un ping ciblé.
 */
export function ticketStaffRoleIds(): string[] {
  const ids = new Set<string>();
  for (const cat of config.tickets.categories) {
    if (cat.staffRoleId && cat.staffRoleId.trim() !== '') ids.add(cat.staffRoleId);
  }
  return [...ids];
}

/**
 * Vrai si le membre est porteur d'au moins un rôle responsable d'une
 * catégorie de ticket. Un staff (mod) ou admin ne l'est pas implicitement —
 * `viewerTier` traite les priorités (admin > staff > ticket-staff > public).
 */
export function isTicketStaff(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  for (const id of ticketStaffRoleIds()) {
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

  const msg = tier === 'admin'
    ? '⛔ Commande réservée à l\'administration ' +
      (config.adminRoleId
        ? `(rôle <@&${config.adminRoleId}> ou permission *Administrateur*).`
        : '(permission *Administrateur* requise — aucun `ADMIN_ROLE_ID` configuré).')
    : '⛔ Commande réservée au staff ' +
      (config.staffRoleId
        ? `(rôle <@&${config.staffRoleId}>, administration ou permission de modération).`
        : '(aucun `STAFF_ROLE_ID` configuré — il faut une permission Discord de modération).');
  await denyReply(interaction, msg);
  return false;
}

/** Raccourcis pour la lisibilité — équivalents à `requireTier(i, 'admin'|'staff')`. */
export const requireAdmin = (i: GuardableInteraction) => requireTier(i, 'admin');
export const requireStaff = (i: GuardableInteraction) => requireTier(i, 'staff');
