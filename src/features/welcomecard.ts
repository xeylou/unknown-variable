import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { createLogger } from '../utils/logger';

const log = createLogger('welcomecard');

/**
 * Orchestrateur de génération des cartes de bienvenue. Le rendu Canvas est
 * délégué à un worker dédié (`src/workers/welcomecard.worker.ts`) afin de ne
 * pas bloquer l'event loop principal lors des arrivées massives.
 *
 * Pattern : un worker persistant, file de requêtes id → resolver. Si le
 * worker meurt (exception non gérée), on le redémarre paresseusement à la
 * prochaine demande.
 */

type RenderParams = {
  username: string;
  avatarURL: string;
  memberCount: number;
  guildName: string;
  /** URL d'image de fond optionnelle (config `welcome_card_background`). */
  backgroundURL?: string | null;
};

type Reply = { id: number; ok: true; buffer: Buffer } | { id: number; ok: false; error: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (res: Reply) => void>();

const WORKER_TIMEOUT_MS = 8000;

function spawnWorker(): Worker {
  // Le worker hérite de `process.execArgv` — il se charge donc avec le même
  // runtime que le thread principal (tsx/ts-node). Forcer `--import tsx` ici
  // cassait le chargement du .ts sur certaines versions de tsx
  // (ERR_UNKNOWN_FILE_EXTENSION dans le worker).
  const w = new Worker(path.resolve(__dirname, '..', 'workers', 'welcomecard.worker.ts'));
  w.on('message', (msg: Reply) => {
    const resolver = pending.get(msg.id);
    if (resolver) {
      pending.delete(msg.id);
      resolver(msg);
    }
  });
  w.on('error', (e) => {
    log.warn('worker error', e);
    // Toutes les requêtes en attente échouent
    for (const [id, resolver] of pending) {
      resolver({ id, ok: false, error: 'worker error' });
    }
    pending.clear();
    worker = null;
  });
  w.on('exit', (code) => {
    if (code !== 0) log.warn(`worker exited with code ${code}`);
    worker = null;
  });
  return w;
}

/**
 * Génère la carte PNG. Retourne `null` en cas d'échec (mauvaise réponse du
 * worker, timeout, ou worker mort en cours) ; l'appelant doit dégrader
 * gracieusement (envoyer le message de bienvenue sans image).
 */
export async function renderWelcomeCard(params: RenderParams): Promise<Buffer | null> {
  if (!worker) worker = spawnWorker();
  const id = nextId++;

  return new Promise<Buffer | null>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      log.warn(`render timeout pour ${params.username}`);
      resolve(null);
    }, WORKER_TIMEOUT_MS);
    timer.unref();

    pending.set(id, (reply) => {
      clearTimeout(timer);
      if (reply.ok) resolve(reply.buffer);
      else {
        log.warn('render failed:', reply.error);
        resolve(null);
      }
    });

    try {
      worker!.postMessage({ id, params });
    } catch (e) {
      clearTimeout(timer);
      pending.delete(id);
      log.warn('postMessage failed', e);
      resolve(null);
    }
  });
}

/** Ferme proprement le worker (graceful shutdown). */
export async function closeWorker() {
  if (worker) {
    await worker.terminate().catch(() => {});
    worker = null;
  }
}
