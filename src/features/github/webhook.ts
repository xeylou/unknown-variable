import http from 'node:http';
import { type Client } from 'discord.js';
import config from '../../config';
import { createLogger } from '../../utils/logger';
import { verifySignature } from './signature';
import { fromWebhook } from './normalize';
import { announce, findReposBySlug } from './announce';

const log = createLogger('github:webhook');

const MAX_BODY = 5 * 1024 * 1024; // 5 Mo — garde-fou anti-abus

let server: http.Server | null = null;

/** Lit le corps brut de la requête (nécessaire avant tout parse pour le HMAC). */
function readBody(req: http.IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) { resolve(null); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(null));
  });
}

/** Traite une livraison déjà authentifiée (asynchrone, hors cycle de réponse). */
async function dispatch(client: Client<true>, event: string, raw: Buffer, delivery: string): Promise<void> {
  let payload: unknown;
  try { payload = JSON.parse(raw.toString('utf8')); }
  catch { log.warn(`livraison ${delivery} : JSON invalide`); return; }

  const events = fromWebhook(event, payload as never);
  if (!events.length) return;

  const full = (payload as { repository?: { full_name?: string } }).repository?.full_name;
  if (!full || !full.includes('/')) return;
  const [owner, repo] = full.split('/');

  const rows = await findReposBySlug(owner, repo);
  if (!rows.length) {
    log.debug(`webhook reçu pour ${full} mais aucun abonnement — ignoré`);
    return;
  }
  for (const row of rows) {
    for (const ev of events) {
      await announce(client, row, ev).catch((e) => log.warn('announce échoué', e));
    }
  }
}

/** Démarre le serveur webhook si `GITHUB_WEBHOOK_SECRET` est défini. */
export function start(client: Client<true>): void {
  const secret = config.github.webhookSecret;
  if (!secret) return;
  if (server) return;

  server = http.createServer((req, res) => {
    void (async () => {
      // Sonde de santé GET (utile pour vérifier que le serveur tourne).
      if (req.method === 'GET' && req.url === config.github.webhookPath) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('github webhook ok');
        return;
      }
      if (req.method !== 'POST' || req.url !== config.github.webhookPath) {
        res.writeHead(404).end();
        return;
      }

      const raw = await readBody(req);
      if (!raw) { res.writeHead(413).end(); return; }

      const sig = req.headers['x-hub-signature-256'];
      if (!verifySignature(secret, raw, Array.isArray(sig) ? sig[0] : sig)) {
        log.warn('signature webhook invalide — requête rejetée');
        res.writeHead(401).end();
        return;
      }

      const event = String(req.headers['x-github-event'] ?? '');
      const delivery = String(req.headers['x-github-delivery'] ?? '?');

      // On accuse réception tout de suite, puis on traite en tâche de fond
      // (GitHub impose une réponse rapide, sinon il marque la livraison en échec).
      res.writeHead(204).end();

      if (event === 'ping') { log.info('ping webhook reçu — handshake OK'); return; }
      await dispatch(client, event, raw, delivery).catch((e) => log.error('dispatch échoué', e));
    })();
  });

  server.on('error', (e) => log.error('serveur webhook en erreur', e));
  server.listen(config.github.webhookPort, config.github.webhookHost, () => {
    log.info(`récepteur webhook à l'écoute sur ${config.github.webhookHost}:${config.github.webhookPort}${config.github.webhookPath}`);
  });
}

/** Ferme proprement le serveur webhook (arrêt du bot). */
export function close(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) { resolve(); return; }
    server.close(() => resolve());
    server = null;
  });
}
