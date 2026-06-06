/**
 * Analyse de couleur saisie par un utilisateur — accepte le format
 * hexadécimal (« #5865F2 » ou « 5865F2 ») ou un nom de couleur français.
 * Partagé par /embed et /setup-roles pour ne pas dupliquer la table.
 */

/** Couleurs nommées acceptées en plus du format hexadécimal. */
export const NAMED_COLORS: Record<string, number> = {
  rouge: 0xed4245, vert: 0x57f287, bleu: 0x5865f2, jaune: 0xfee75c,
  orange: 0xe67e22, violet: 0x9b59b6, rose: 0xeb459e,
  blanc: 0xffffff, noir: 0x2b2d31, gris: 0x95a5a6
};

/** Convertit « #5865F2 » ou « bleu » en nombre, ou null si invalide. */
export function parseColor(input: string | null | undefined): number | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  if (v in NAMED_COLORS) return NAMED_COLORS[v];
  const hex = v.replace(/^#/, '');
  if (/^[0-9a-f]{6}$/.test(hex)) return parseInt(hex, 16);
  return null;
}
