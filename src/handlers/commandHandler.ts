import { Collection, type Client } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger';
import type { CommandModule } from '../types';
import config from '../config';

const log = createLogger('handlers:commands');

/** Vrai pour un fichier de module exécutable (.ts ou .js compilé), hors typings. */
function isModuleFile(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.js');
}

/** Parcours récursif d'un dossier, renvoie tous les fichiers de module. */
function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (isModuleFile(entry.name)) yield full;
  }
}

/**
 * Vrai si le fichier doit être ignoré au chargement parce que la feature qu'il
 * implémente n'est pas configurée. Évite de charger 13 commandes musique
 * inutiles quand `LAVALINK_PASSWORD` est absent.
 */
function shouldSkip(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.includes('/commands/music/') && !config.lavalink.password) return true;
  if (normalized.includes('/commands/git/') && !config.github.token && !config.github.webhookSecret) return true;
  return false;
}

/**
 * Charge toutes les commandes slash depuis src/commands/**.
 * Chaque fichier doit exporter { data, execute }.
 */
function loadCommands(client: Client): void {
  client.commands = new Collection();
  const dir = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(dir)) return;

  let skipped = 0;
  for (const file of walk(dir)) {
    if (shouldSkip(file)) { skipped++; continue; }
    const mod = require(file);
    const cmd: CommandModule | undefined = mod?.default ?? mod;
    if (cmd?.data?.name && typeof cmd.execute === 'function') {
      client.commands.set(cmd.data.name, cmd);
    } else {
      log.warn(`Commande ignorée (data/execute manquant) : ${file}`);
    }
  }
  log.info(`${client.commands.size} commande(s) chargée(s)${skipped ? ` (${skipped} ignorée(s) : module désactivé)` : ''}`);
}

export { loadCommands }
