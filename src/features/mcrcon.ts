import { Rcon } from 'rcon-client';
import { getConfig } from '../utils/configCache';
import { createLogger } from '../utils/logger';

const log = createLogger('mcrcon');

/**
 * Petit wrapper autour de `rcon-client` : ouvre une connexion à la demande
 * par guilde, garde un cache de connexions et les ferme proprement après
 * un délai d'inactivité (60 s) pour ne pas consommer un slot serveur.
 *
 * Lit la config par guilde :
 *   mc_rcon_host, mc_rcon_port, mc_rcon_password
 */

type CachedConn = { conn: Rcon; closesAt: number };
const cache = new Map<string, CachedConn>();
const IDLE_MS = 60_000;

/** Renvoie une connexion RCON pour la guilde, ou null si non configurée. */
async function getConn(guildId: string): Promise<Rcon | null> {
  const cached = cache.get(guildId);
  if (cached && cached.closesAt > Date.now()) {
    cached.closesAt = Date.now() + IDLE_MS;
    return cached.conn;
  }

  const host = await getConfig(guildId, 'mc_rcon_host');
  const portStr = await getConfig(guildId, 'mc_rcon_port');
  const password = await getConfig(guildId, 'mc_rcon_password');
  if (!host || !portStr || !password) return null;
  const port = Number(portStr);

  try {
    const conn = await Rcon.connect({ host, port, password, timeout: 5000 });
    const entry: CachedConn = { conn, closesAt: Date.now() + IDLE_MS };
    cache.set(guildId, entry);
    // Auto-close après IDLE_MS
    const timer = setTimeout(() => {
      const c = cache.get(guildId);
      if (c && c.closesAt <= Date.now()) {
        c.conn.end().catch(() => {});
        cache.delete(guildId);
      }
    }, IDLE_MS + 500);
    timer.unref();
    return conn;
  } catch (e) {
    log.warn(`connexion RCON échouée pour ${guildId}`, e);
    return null;
  }
}

/** Envoie une commande RCON et renvoie la réponse (string vide en cas d'échec). */
export async function rconCommand(guildId: string, command: string): Promise<string | null> {
  const conn = await getConn(guildId);
  if (!conn) return null;
  try {
    return await conn.send(command);
  } catch (e) {
    log.warn(`commande RCON "${command}" a échoué`, e);
    cache.delete(guildId);
    return null;
  }
}

/**
 * Joueurs actuellement en ligne (pseudos en minuscules), ou `null` si RCON est
 * injoignable. Partagé par la boucle `mcingame` et l'indicateur en ligne de
 * `/mclink statut`. Format RCON usuel : « There are X of a max of Y players
 * online: a, b, c ».
 */
export async function listOnline(guildId: string): Promise<Set<string> | null> {
  const out = await rconCommand(guildId, 'list');
  if (out === null) return null;
  const m = out.match(/:\s*(.+)$/);
  const names = m ? m[1].split(',').map((p) => p.trim()).filter(Boolean) : [];
  return new Set(names.map((p) => p.toLowerCase()));
}

/** Vrai si RCON est configuré pour cette guilde. */
export async function isConfigured(guildId: string): Promise<boolean> {
  return !!(await getConfig(guildId, 'mc_rcon_host')) &&
         !!(await getConfig(guildId, 'mc_rcon_port')) &&
         !!(await getConfig(guildId, 'mc_rcon_password'));
}

/** Ferme proprement toutes les connexions cachées (graceful shutdown). */
export async function closeAll() {
  for (const c of cache.values()) {
    await c.conn.end().catch(() => {});
  }
  cache.clear();
}
