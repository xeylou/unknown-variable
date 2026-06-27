import { createLogger } from '../utils/logger';

const log = createLogger('mojang');

export type MojangProfile = { name: string; uuid: string };

/** Insère les tirets d'un UUID compact (8-4-4-4-12). */
function dashUuid(id: string): string {
  if (id.length !== 32) return id;
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

/**
 * Résout un pseudo Minecraft (compte Java) via l'API Mojang.
 *
 *  - profil trouvé          → `{ name: <casse canonique>, uuid: <avec tirets> }`
 *  - pseudo inexistant      → `'not_found'` (l'appelant refuse la liaison)
 *  - API injoignable/timeout → `'error'` (l'appelant peut dégrader sans UUID)
 *
 * Timeout court (5 s) via AbortController pour ne pas bloquer l'interaction.
 */
export async function lookupProfile(username: string): Promise<MojangProfile | 'not_found' | 'error'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { signal: ctrl.signal }
    );
    // 204/404 : Mojang renvoie « pas de contenu » pour un pseudo inexistant.
    if (res.status === 204 || res.status === 404) return 'not_found';
    if (!res.ok) { log.warn(`Mojang HTTP ${res.status} pour ${username}`); return 'error'; }
    const data = (await res.json()) as { id?: string; name?: string };
    if (!data?.id || !data?.name) return 'error';
    return { name: data.name, uuid: dashUuid(data.id) };
  } catch (e) {
    log.warn(`Mojang lookup échoué pour ${username}`, e);
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}
