import fs from 'node:fs';
import path from 'node:path';
import config from '../config';

/**
 * Découverte des fichiers de commandes — partagé par le chargeur runtime
 * ([handlers/commandHandler.ts]) et le déployeur ([deploy-commands.ts]).
 *
 * Les deux DOIVENT appliquer exactement les mêmes règles (walk + skip) : sinon
 * une commande chargée mais pas déployée (ou l'inverse) crée des incohérences
 * difficiles à diagnostiquer. Centraliser ici évite cette divergence.
 */

/** Vrai pour un fichier de module exécutable (.ts ou .js compilé), hors typings. */
export function isModuleFile(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.js');
}

/** Parcours récursif d'un dossier, renvoie tous les fichiers de module. */
export function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (isModuleFile(entry.name)) yield full;
  }
}

/**
 * Vrai si le fichier doit être ignoré parce que la feature qu'il implémente
 * n'est pas configurée. Évite de charger/déployer 13 commandes musique
 * inutiles quand `LAVALINK_PASSWORD` est absent, ou les commandes `/git` sans
 * token ni secret webhook.
 */
export function shouldSkip(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/commands/music/') && !config.lavalink.password) return true;
  if (normalized.includes('/commands/git/') && !config.github.token && !config.github.webhookSecret) return true;
  return false;
}
