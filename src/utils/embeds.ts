import { EmbedBuilder } from 'discord.js';
import config from '../config';

/**
 * Factories d'embeds typés par intention. Centralise l'usage des couleurs de
 * `config.colors` — un changement de palette se répercute partout, et les
 * call-sites deviennent : `embeds.success('...')` au lieu de
 * `new EmbedBuilder().setColor(config.colors.success).setDescription('...')`.
 *
 * Toutes les factories retournent un `EmbedBuilder` qu'on peut continuer à
 * chaîner (`.setTitle`, `.addFields`, etc.).
 */

/** Couleur primaire (bleu Discord) — affichages neutres / informatifs. */
export function primary(description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(config.colors.primary);
  if (description) e.setDescription(description);
  return e;
}

/** Couleur succès (vert) — confirmations d'action. */
export function success(description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(config.colors.success);
  if (description) e.setDescription(description);
  return e;
}

/** Couleur danger (rouge) — erreurs, sanctions, blocages. */
export function danger(description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(config.colors.danger);
  if (description) e.setDescription(description);
  return e;
}

/** Couleur warning (jaune) — avertissements, états dégradés. */
export function warning(description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(config.colors.warning);
  if (description) e.setDescription(description);
  return e;
}

/** Couleur neutre (gris foncé) — panneaux passifs. */
export function neutral(description?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(config.colors.neutral);
  if (description) e.setDescription(description);
  return e;
}
