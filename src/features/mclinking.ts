import { prisma } from '../database';

/**
 * Règles partagées de la liaison Discord ↔ Minecraft (whitelist + identité).
 *
 * Centralisées ici pour rester cohérentes entre `/mclink`, `/whitelist` et la
 * boucle de validation `mcingame.ts` — une divergence sur l'unicité ou le TTL
 * ouvrirait une faille (squat de pseudo, liaison fantôme). Domaine sensible.
 */

/** Délai de validation d'une demande de liaison (connexion au serveur). */
export const LINK_TTL_MS = 5 * 60 * 1000;

/**
 * Format d'un pseudo Minecraft (Java). Strict À DESSEIN : la chaîne est
 * interpolée dans des commandes RCON (`whitelist add <pseudo>`) — interdire
 * espaces et caractères spéciaux empêche toute injection de commande.
 */
export const PSEUDO_RE = /^[A-Za-z0-9_]{3,16}$/;

export function validatePseudo(pseudo: string): boolean {
  return PSEUDO_RE.test(pseudo);
}

/** Égalité de pseudos Minecraft : insensible à la casse (Mojang l'est). */
export function sameUsername(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export type Conflict = { kind: 'linked' | 'pending'; userId: string } | null;

/**
 * Indique si un pseudo (ou un UUID) est déjà revendiqué par un AUTRE membre,
 * lié (`mc_links`) ou en attente non expirée (`mc_link_codes`). Comparaison
 * insensible à la casse, et par UUID quand il est connu (robuste aux
 * changements de casse / de pseudo). `excludeUserId` ignore l'appelant.
 */
export async function pseudoConflict(
  guildId: string,
  opts: { name: string; uuid?: string | null; excludeUserId?: string }
): Promise<Conflict> {
  const { name, uuid, excludeUserId } = opts;
  const matches = (rowName: string, rowUuid?: string | null) =>
    sameUsername(rowName, name) || (!!uuid && !!rowUuid && rowUuid === uuid);

  const links = await prisma.mc_links.findMany({ where: { guild_id: guildId } });
  for (const l of links) {
    if (excludeUserId && l.user_id === excludeUserId) continue;
    if (matches(l.mc_username, l.mc_uuid)) return { kind: 'linked', userId: l.user_id };
  }

  const now = Date.now();
  const pendings = await prisma.mc_link_codes.findMany({ where: { guild_id: guildId } });
  for (const p of pendings) {
    if (p.expires_at < now) continue; // demande expirée : plus un conflit
    if (excludeUserId && p.user_id === excludeUserId) continue;
    if (matches(p.mc_username, p.mc_uuid)) return { kind: 'pending', userId: p.user_id };
  }
  return null;
}
