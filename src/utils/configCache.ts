import { getConfig as dbGetConfig, setConfig as dbSetConfig } from '../database';
import { onConfigWrite } from './guildSettings';

/**
 * Cache mémoire pour `guild_config` : évite d'aller chercher Prisma à chaque
 * message (automod, logger, etc.). TTL court — la cohérence est garantie par
 * invalidation explicite à chaque écriture (`setConfig` ci-dessous).
 */

const TTL_MS = 60_000;

type Entry = { value: string | null; expiresAt: number };
const cache = new Map<string, Entry>();

function key(guildId: string, k: string) {
  return `${guildId}:${k}`;
}

/** Lit une valeur de config avec cache mémoire (TTL 60 s). */
export async function getConfig(
  guildId: string,
  k: string,
  fallback: string | null = null
): Promise<string | null> {
  const cacheKey = key(guildId, k);
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value ?? fallback;
  }
  const value = await dbGetConfig(guildId, k, null);
  cache.set(cacheKey, { value, expiresAt: Date.now() + TTL_MS });
  return value ?? fallback;
}

/** Écrit une valeur de config et invalide le cache. */
export async function setConfig(
  guildId: string,
  k: string,
  value: string | number | null
): Promise<void> {
  const normalized = value === null || value === undefined ? null : String(value);
  await dbSetConfig(guildId, k, normalized);
  cache.set(key(guildId, k), {
    value: normalized,
    expiresAt: Date.now() + TTL_MS
  });
  // Tient à jour le cache synchrone des rôles/salons (no-op pour les autres clés).
  onConfigWrite(guildId, k, normalized);
}

/** Invalide entièrement le cache d'une guilde (utile pour les tests). */
export function invalidateGuild(guildId: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(`${guildId}:`)) cache.delete(k);
  }
}

/** Purge périodique des entrées expirées (évite la croissance illimitée). */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}, 5 * 60_000).unref();
