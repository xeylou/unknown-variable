import config from '../../config';
import { createLogger } from '../../utils/logger';

const log = createLogger('github:api');

const BASE = 'https://api.github.com';

/** Résultat d'un appel API avec gestion du cache conditionnel (ETag). */
export interface ApiResult<T> {
  status: number;
  /** `null` si 304 (non modifié) ou erreur. */
  data: T | null;
  /** ETag renvoyé (à restocker pour le prochain appel). */
  etag: string | null;
  /** Vrai si 304 Not Modified : rien n'a changé depuis le dernier ETag. */
  notModified: boolean;
}

function buildHeaders(etag?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${config.botSlug}-bot/1.0`
  };
  if (config.github.token) h.Authorization = `Bearer ${config.github.token}`;
  if (etag) h['If-None-Match'] = etag;
  return h;
}

/**
 * GET sur l'API GitHub. Renvoie toujours un `ApiResult` (jamais d'exception
 * propagée — les erreurs réseau / HTTP sont journalisées et donnent `data: null`).
 *
 * Fournis l'`etag` du précédent appel pour bénéficier du cache conditionnel :
 * un 304 ne consomme pas de quota de rate limit et renvoie `notModified: true`.
 */
export async function ghGet<T>(path: string, etag?: string | null): Promise<ApiResult<T>> {
  if (!config.github.token) {
    return { status: 0, data: null, etag: null, notModified: false };
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers: buildHeaders(etag) });
  } catch (e) {
    log.warn(`fetch ${path} échoué`, e);
    return { status: 0, data: null, etag: null, notModified: false };
  }

  const newEtag = res.headers.get('etag');

  if (res.status === 304) {
    return { status: 304, data: null, etag: etag ?? null, notModified: true };
  }

  // Quota épuisé : on log et on s'abstient (le prochain cycle réessaiera).
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 403 && remaining === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    log.warn(`rate limit GitHub atteint, réinitialisation ${new Date(reset).toISOString()}`);
    return { status: 403, data: null, etag: newEtag, notModified: false };
  }

  if (!res.ok) {
    log.warn(`GitHub ${res.status} sur ${path}`);
    return { status: res.status, data: null, etag: newEtag, notModified: false };
  }

  let data: T | null;
  try { data = await res.json() as T; }
  catch { data = null; }
  return { status: res.status, data, etag: newEtag, notModified: false };
}
