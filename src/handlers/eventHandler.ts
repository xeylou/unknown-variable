import { type Client } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger';
import type { EventModule } from '../types';

const log = createLogger('handlers:events');

/**
 * Charge tous les événements depuis src/events/*.{ts,js} et les abonne au client.
 * Chaque fichier exporte { name, once?, execute }.
 * `client` est toujours passé en dernier argument de `execute`.
 */
function loadEvents(client: Client): void {
  const dir = path.join(__dirname, '..', 'events');
  if (!fs.existsSync(dir)) return;

  let count = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.d.ts') || !(entry.endsWith('.ts') || entry.endsWith('.js'))) continue;
    const mod = require(path.join(dir, entry));
    const event: EventModule | undefined = mod?.default ?? mod;
    if (!event?.name || typeof event.execute !== 'function') {
      log.warn(`Événement ignoré (name/execute manquant) : ${entry}`);
      continue;
    }
    const listener = (...args: unknown[]) => (event.execute as (...a: unknown[]) => unknown)(...args, client);
    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
    count++;
  }
  log.info(`${count} événement(s) chargé(s)`);
}

export { loadEvents }
