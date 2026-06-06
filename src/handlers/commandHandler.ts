import { Collection, type Client } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger';
import { walk, shouldSkip } from '../utils/commandFiles';
import type { CommandModule } from '../types';

const log = createLogger('handlers:commands');

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
