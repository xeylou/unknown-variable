import http from 'node:http';
import config from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('health');

let server: http.Server | null = null;

/**
 * Micro serveur de santé : répond `200 ok` sur `GET /health` (et `/healthz`).
 *
 * Toujours actif (sauf `HEALTH_PORT=0`) — contrairement au serveur webhook
 * GitHub qui n'existe que si un secret est configuré. C'est ce qui rend le
 * `HEALTHCHECK` Docker fiable et permet le monitoring d'uptime externe.
 */
export function init(): void {
  const port = config.healthPort;
  if (!port) return; // 0 = désactivé
  if (server) return;

  server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404).end();
  });
  server.on('error', (e) => log.error('serveur de santé en erreur', e));
  server.listen(port, () => log.info(`sonde de santé à l'écoute sur :${port}/health`));
}

/** Ferme proprement le serveur de santé (arrêt du bot). */
export function close(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) { resolve(); return; }
    server.close(() => resolve());
    server = null;
  });
}
