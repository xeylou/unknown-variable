import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('phishlist');

/**
 * Liste publique de domaines de phishing (anti-scam Discord/Steam/etc.),
 * récupérée depuis https://phish.sinking.yachts (gratuit, sans clé). On
 * rafraîchit toutes les heures et on garde un `Set` en mémoire pour des
 * lookups O(1) à chaque message.
 */

const URL = 'https://phish.sinking.yachts/v2/all';
const REFRESH_MS = 60 * 60 * 1000; // 1 h
const USER_AGENT = `${config.botSlug}-bot/1.0 (Discord)`;

let domains: Set<string> = new Set();
let lastFetched = 0;

async function refresh() {
  try {
    const res = await fetch(URL, { headers: { 'User-Agent': USER_AGENT, 'X-Identity': USER_AGENT } });
    if (!res.ok) {
      log.warn(`fetch phish.sinking.yachts → HTTP ${res.status}`);
      return;
    }
    const arr: string[] = await res.json();
    domains = new Set(arr.map((d) => d.toLowerCase()));
    lastFetched = Date.now();
    log.info(`${domains.size} domaines de phishing chargés`);
  } catch (e) {
    log.warn('refresh failed', e);
  }
}

/** Initialise la blocklist (fetch immédiat + refresh périodique). */
export function init() {
  refresh();
  setInterval(refresh, REFRESH_MS).unref();
}

/**
 * Renvoie le premier domaine de phishing présent dans `content`, ou null.
 * Recherche tous les hôtes de type `host.tld` dans le texte.
 */
export function findPhishDomain(content: string): string | null {
  if (!domains.size || !content) return null;
  const matches = content.toLowerCase().match(/[a-z0-9-]+(?:\.[a-z0-9-]+)+/g);
  if (!matches) return null;
  for (const host of matches) {
    if (domains.has(host)) return host;
    // Vérifie aussi les sous-domaines vers un parent listé
    const parts = host.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (domains.has(parent)) return host;
    }
  }
  return null;
}

/** Combien de domaines actuellement chargés (utile pour /config voir). */
export function size() {
  return domains.size;
}

/** Date du dernier refresh réussi. */
export function lastRefresh() {
  return lastFetched;
}
