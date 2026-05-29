import { PermissionFlagsBits, type GuildMember, type APIInteractionGuildMember } from 'discord.js';

/**
 * Helpers `allowedMentions` — par défaut, on n'autorise AUCUNE mention parsée.
 * Tout message envoyé à partir de contenu fourni par un utilisateur (suggestion,
 * message de bienvenue avec variables, etc.) doit utiliser ces helpers pour
 * éviter qu'un `@everyone` ou un ping de rôle ne passe par surprise.
 */

/** Mentions strictement désactivées (sécurité par défaut). */
export const noMentions = { parse: [] as never[] };

type MemberLike = GuildMember | APIInteractionGuildMember | null;

/**
 * Filtre une liste de rôles à mentionner en supprimant `@everyone`/`@here`
 * si l'utilisateur n'a pas la permission `MentionEveryone`.
 */
export function safeMentionAllowed(member: MemberLike, roleIds: string[], guildEveryoneId: string) {
  const hasPerms = (m: MemberLike): boolean => {
    if (!m) return false;
    const perms = m.permissions;
    if (typeof perms === 'string') {
      // APIInteractionGuildMember : permissions sont un bigint sérialisé en string
      try { return (BigInt(perms) & PermissionFlagsBits.MentionEveryone) !== 0n; }
      catch { return false; }
    }
    return perms.has(PermissionFlagsBits.MentionEveryone);
  };
  const canMentionEveryone = hasPerms(member);
  const everyoneRequested = roleIds.includes(guildEveryoneId);
  const roles = roleIds.filter((id) => id !== guildEveryoneId);
  return {
    roles,
    parse: (everyoneRequested && canMentionEveryone ? ['everyone'] : []) as ('everyone' | 'users' | 'roles')[],
    everyoneRequested,
    everyoneBlocked: everyoneRequested && !canMentionEveryone
  };
}
