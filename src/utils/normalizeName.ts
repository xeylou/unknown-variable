/**
 * Normalise un pseudo / nom affiché Discord en une forme lisible et triable.
 *
 * Objectif modération : neutraliser les pseudos illisibles (Zalgo, polices
 * « fantaisie », accents superposés) et le « hoisting » (caractères de tête qui
 * forcent le tri en haut de la liste des membres).
 *
 * Étapes :
 *  1. `NFKD` — décompose accents et caractères de compatibilité (polices stylées
 *     𝓑𝓸𝓫, ligatures, plein-chasse) vers leur base ASCII + marques combinantes.
 *  2. Ne conserve que l'ASCII imprimable : retire d'un coup les diacritiques
 *     combinants du Zalgo et tout caractère non latin, puis restreint à une
 *     liste sûre (lettres, chiffres, espace et `_ - .`).
 *  3. Dé-hoist : retire en tête tout ce qui n'est pas une lettre/un chiffre.
 *  4. Compresse les espaces, coupe à 32 caractères (limite Discord d'un pseudo).
 *
 * Renvoie `''` si rien d'exploitable ne subsiste (ex. pseudo entièrement non
 * latin / emoji) — l'appelant choisit alors un repli (nom d'utilisateur, etc.).
 */
export function normalizeName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')      // hors ASCII imprimable (combinants Zalgo inclus)
    .replace(/[^A-Za-z0-9 _.-]/g, '')  // liste sûre : alphanum + espace + _ . -
    .replace(/^[^A-Za-z0-9]+/, '')     // dé-hoist (tête non alphanumérique)
    .replace(/\s+/g, ' ')              // espaces multiples → simple
    .trim()
    .slice(0, 32);
}
