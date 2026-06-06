import { prisma } from '../database';
import { createLogger } from '../utils/logger';

/**
 * Comptage des messages par membre (classement messages).
 *
 * Pour éviter un écrit DB à chaque message, on accumule les deltas dans un
 * tampon en mémoire (`pending`) vidé périodiquement par `flush()` — et au
 * shutdown (voir src/index.ts). On peut donc perdre au plus ~30 s de compteur
 * en cas de crash brutal, ce qui est acceptable pour un classement indicatif.
 */

const log = createLogger('messagestats');

const FLUSH_MS = 30_000;

/** Deltas en attente, clé = « guildId:userId ». */
const pending = new Map<string, number>();

/** Incrémente le compteur en mémoire pour un message humain. */
export function bump(guildId: string, userId: string): void {
  const key = `${guildId}:${userId}`;
  pending.set(key, (pending.get(key) ?? 0) + 1);
}

/** Écrit les deltas accumulés vers la base puis vide le tampon. */
export async function flush(): Promise<void> {
  if (pending.size === 0) return;
  const snapshot = [...pending.entries()];
  pending.clear();

  for (const [key, delta] of snapshot) {
    if (delta <= 0) continue;
    const sep = key.indexOf(':');
    const guildId = key.slice(0, sep);
    const userId = key.slice(sep + 1);
    try {
      await prisma.message_counts.upsert({
        where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
        update: { count: { increment: delta } },
        create: { guild_id: guildId, user_id: userId, count: delta }
      });
    } catch (e) {
      // Échec d'écriture : remet le delta en file pour ne pas le perdre.
      pending.set(key, (pending.get(key) ?? 0) + delta);
      log.warn('flush upsert failed', e);
    }
  }
}

/** Top N des membres les plus actifs (flush préalable pour des données fraîches). */
export async function topMessages(guildId: string, n: number) {
  await flush();
  return prisma.message_counts.findMany({
    where: { guild_id: guildId, count: { gt: 0 } },
    orderBy: { count: 'desc' },
    take: n
  });
}

/** Réinitialise tous les compteurs de messages du serveur. */
export async function resetMessages(guildId: string): Promise<void> {
  // Purge d'abord le tampon de ce serveur pour ne pas recréer des lignes.
  for (const key of [...pending.keys()]) {
    if (key.startsWith(`${guildId}:`)) pending.delete(key);
  }
  await prisma.message_counts.deleteMany({ where: { guild_id: guildId } });
}

/** Démarre la boucle de flush périodique. */
export function init(): void {
  setInterval(() => { flush().catch((e) => log.error(e)); }, FLUSH_MS).unref();
}
