import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { type Client } from 'discord.js';
import config from '../config';
import { getConfig } from '../utils/configCache';
import { noMentions } from '../utils/mentions';
import { createLogger } from '../utils/logger';

const log = createLogger('mcchat');

/**
 * Miroir (lecture seule) du chat Minecraft vers un salon Discord staff.
 *
 * RCON ne diffuse PAS le chat, on l'ingère donc par HTTP : un pont côté serveur
 * MC (voir `scripts/mc-chat-bridge.mjs`) lit `logs/latest.log` et POST les lignes
 * sur `POST /mc-chat`. Le bot authentifie chaque envoi par un secret PAR SERVEUR
 * (`mc_chat_secret`, défini via `/config minecraft-chat`) puis relaie les lignes
 * dans `mc_chat_channel`, en les regroupant (batch toutes les ~2 s) pour
 * respecter le rate-limit Discord. One-way (MC → Discord) uniquement.
 *
 * Désactivé tant que `MC_CHAT_PORT` vaut 0. On calque la structure du récepteur
 * webhook GitHub (`features/github/webhook.ts`).
 */

const MAX_BODY = 256 * 1024;   // 256 Ko/req — un batch de chat reste petit
const MAX_EVENTS = 200;        // garde-fou : events traités par requête
const MAX_LINE = 500;          // longueur max d'une ligne relayée
const MAX_BUFFER = 500;        // lignes max gardées en attente par serveur
const FLUSH_MS = 2000;         // intervalle de vidage vers Discord
const MSG_LIMIT = 1900;        // marge sous la limite Discord (2000 caractères)

type ChatEvent = { type?: string; player?: string; message?: string };

let server: http.Server | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let botClient: Client<true> | null = null;

/** Lignes formatées en attente d'envoi, par guilde. */
const buffers = new Map<string, string[]>();

/** Lecture du corps brut de la requête (avec garde-fou de taille). */
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

/** Comparaison à temps constant de deux secrets (longueurs différentes = faux). */
function secretsMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Met en forme un event en une ligne Discord (ou null si à ignorer). */
function formatEvent(ev: ChatEvent): string | null {
  const clip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_LINE);
  const player = ev.player ? clip(ev.player) : '';
  const message = ev.message ? clip(ev.message) : '';
  switch (ev.type) {
    case 'chat':  return player && message ? `💬 **${player}** : ${message}` : null;
    case 'join':  return player ? `➕ **${player}** a rejoint le serveur` : null;
    case 'leave': return player ? `➖ **${player}** a quitté le serveur` : null;
    case 'death': return message ? `💀 ${message}` : null;
    case 'say':   return message ? `📢 ${message}` : null;
    default:      return message ? `• ${message}` : null;
  }
}

/** Empile des lignes pour une guilde, en bornant la mémoire (drop des + vieilles). */
function enqueue(guildId: string, lines: string[]): void {
  if (!lines.length) return;
  const buf = buffers.get(guildId) ?? [];
  buf.push(...lines);
  if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER);
  buffers.set(guildId, buf);
}

/** Traite une livraison authentifiée : formate puis met en file. */
function ingest(guildId: string, events: ChatEvent[]): void {
  const lines: string[] = [];
  for (const ev of events.slice(0, MAX_EVENTS)) {
    const line = formatEvent(ev);
    if (line) lines.push(line);
  }
  enqueue(guildId, lines);
}

/** Vide les buffers vers les salons Discord configurés (batch ≤ MSG_LIMIT). */
async function flush(): Promise<void> {
  if (!botClient || buffers.size === 0) return;
  for (const [guildId, lines] of [...buffers.entries()]) {
    buffers.delete(guildId);
    if (!lines.length) continue;

    if ((await getConfig(guildId, 'mc_chat_enabled', '0')) !== '1') continue;
    const channelId = await getConfig(guildId, 'mc_chat_channel');
    if (!channelId) continue;

    const guild = botClient.guilds.cache.get(guildId);
    if (!guild) continue;
    const channel = guild.channels.cache.get(channelId)
      ?? await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !('send' in channel)) continue;

    // Regroupe plusieurs lignes par message pour limiter les appels Discord.
    let chunk = '';
    for (const line of lines) {
      const piece = line.length > MSG_LIMIT ? line.slice(0, MSG_LIMIT) : line;
      if (chunk && chunk.length + 1 + piece.length > MSG_LIMIT) {
        await channel.send({ content: chunk, allowedMentions: noMentions }).catch(() => {});
        chunk = '';
      }
      chunk = chunk ? `${chunk}\n${piece}` : piece;
    }
    if (chunk) await channel.send({ content: chunk, allowedMentions: noMentions }).catch(() => {});
  }
}

/** Démarre le récepteur HTTP du miroir de chat si `MC_CHAT_PORT > 0`. */
export function start(client: Client<true>): void {
  const port = config.mcChat.port;
  if (!port) return; // 0 = désactivé
  if (server) return;
  botClient = client;

  server = http.createServer((req, res) => {
    void (async () => {
      // Sonde GET (vérifier que le récepteur tourne).
      if (req.method === 'GET' && req.url === '/mc-chat') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('mc-chat ok');
        return;
      }
      if (req.method !== 'POST' || req.url !== '/mc-chat') {
        res.writeHead(404).end();
        return;
      }

      const raw = await readBody(req);
      if (!raw) { res.writeHead(413).end(); return; }

      let payload: { guildId?: string; secret?: string; events?: ChatEvent[] };
      try { payload = JSON.parse(raw.toString('utf8')); }
      catch { res.writeHead(400).end(); return; }

      const guildId = String(payload.guildId ?? '');
      const secret = String(payload.secret ?? '');
      if (!guildId || !secret) { res.writeHead(400).end(); return; }

      const expected = await getConfig(guildId, 'mc_chat_secret').catch(() => null);
      if (!expected || !secretsMatch(secret, expected)) {
        res.writeHead(401).end();
        return;
      }

      // Authentifié : on accuse réception immédiatement, puis on met en file.
      res.writeHead(204).end();
      if (Array.isArray(payload.events)) ingest(guildId, payload.events);
    })();
  });

  server.on('error', (e) => log.error('serveur mc-chat en erreur', e));
  server.listen(port, config.mcChat.host, () => {
    log.info(`récepteur chat Minecraft à l'écoute sur ${config.mcChat.host}:${port}/mc-chat`);
  });

  flushTimer = setInterval(() => { flush().catch((e) => log.warn('flush échoué', e)); }, FLUSH_MS);
  flushTimer.unref();
}

/** Ferme proprement le récepteur (arrêt du bot), en vidant le reliquat. */
export async function close(): Promise<void> {
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  await flush().catch(() => {});
  await new Promise<void>((resolve) => {
    if (!server) { resolve(); return; }
    server.close(() => resolve());
    server = null;
  });
  botClient = null;
}
