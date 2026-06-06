import { Locale, type LocalizationMap } from 'discord.js';
import { messages, type MessageKey } from './messages';

/**
 * Socle d'internationalisation FR/EN.
 *
 * Modèle « bilingue » : l'anglais est la langue **canonique** (base des
 * `setName`/`setDescription` Discord et valeur par défaut), le français est
 * fourni via les `*_localizations` des commandes et via `interaction.locale`
 * pour les réponses.
 *
 * Usage côté réponse :
 *   const lang = resolveLang(interaction.locale);
 *   interaction.reply(t(lang, 'avatar.title', { name }));
 *
 * Usage côté définition de commande :
 *   .setDescription(base('avatar.cmd.desc'))
 *   .setDescriptionLocalizations(frLoc('avatar.cmd.desc'))
 *
 * Politique retenue : les NOMS de commandes/options restent inchangés (pas de
 * localisation de nom) — seules descriptions et réponses sont bilingues.
 */

export type Lang = 'en' | 'fr';
export type { MessageKey };

/** Déduit la langue (fr/en) depuis l'`interaction.locale` Discord. */
export function resolveLang(locale?: string | null): Lang {
  return locale && locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

/** Remplace les `{var}` du gabarit par les valeurs fournies. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template
  );
}

/** Traduit une clé dans une langue donnée, avec interpolation `{var}`. */
export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  return interpolate(messages[key][lang], vars);
}

/** Raccourci : résout la langue depuis l'`interaction.locale` puis traduit. */
export function ti(
  locale: string | null | undefined,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  return t(resolveLang(locale), key, vars);
}

/** Texte anglais de base — pour `setName`/`setDescription` d'un builder. */
export function base(key: MessageKey): string {
  return messages[key].en;
}

/** Carte de localisation FR d'une clé — pour `setDescriptionLocalizations` (base = anglais). */
export function frLoc(key: MessageKey): LocalizationMap {
  return { [Locale.French]: messages[key].fr };
}
