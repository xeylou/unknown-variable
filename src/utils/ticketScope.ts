import type { GuildMember } from 'discord.js';
import config from '../config';
import { isStaff } from './permissions';

/**
 * Catégories de tickets visibles par un membre :
 *  - Staff général / admin : toutes les catégories configurées.
 *  - Ticket-staff (porteur d'un `staffRoleId` de catégorie) : uniquement
 *    les catégories qu'il modère.
 *  - Membre lambda : liste vide.
 *
 * Utilisé par `/tickets-ouverts` pour scoper les résultats au rôle du viewer.
 */
export function categoriesVisibleTo(member: GuildMember | null | undefined): string[] {
  if (!member) return [];
  if (isStaff(member)) {
    return config.tickets.categories.map((c) => c.value);
  }
  const out: string[] = [];
  for (const cat of config.tickets.categories) {
    const rid = cat.staffRoleId;
    if (rid && rid.trim() !== '' && member.roles.cache.has(rid)) {
      out.push(cat.value);
    }
  }
  return out;
}

/**
 * Libellé d'une catégorie de ticket à partir de sa `value`.
 * Si la catégorie a été retirée de `src/config.ts` après création du ticket,
 * on retombe sur la `value` brute pour ne pas afficher "undefined".
 */
export function categoryLabel(value: string | null | undefined): string {
  if (!value) return 'Inconnue';
  const found = config.tickets.categories.find((c) => c.value === value);
  return found?.label ?? value;
}
