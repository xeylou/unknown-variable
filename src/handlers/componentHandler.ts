import { Collection, type Client } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger';
import type { ComponentModule } from '../types';

const log = createLogger('handlers:components');

/**
 * Charge les gestionnaires de composants (boutons, menus, modales)
 * depuis src/components/*.{ts,js}.
 *
 * Chaque fichier exporte { prefix, execute }. Le routage se fait sur la
 * première partie du customId, séparée par « : »  ->  `prefix:action:arg1...`
 */
function loadComponents(client: Client): void {
  client.components = new Collection();
  const dir = path.join(__dirname, '..', 'components');
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.d.ts') || !(entry.endsWith('.ts') || entry.endsWith('.js'))) continue;
    const mod = require(path.join(dir, entry));
    const comp: ComponentModule | undefined = mod?.default ?? mod;
    if (comp?.prefix && typeof comp.execute === 'function') {
      client.components.set(comp.prefix, comp);
    } else {
      log.warn(`Composant ignoré (prefix/execute manquant) : ${entry}`);
    }
  }
  log.info(`${client.components.size} gestionnaire(s) de composants chargé(s)`);
}

export { loadComponents }
