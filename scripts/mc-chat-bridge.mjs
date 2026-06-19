#!/usr/bin/env node
// ===========================================================================
//  Pont chat Minecraft → bot Discord  (mc-chat-bridge)
// ---------------------------------------------------------------------------
//  À lancer SUR LA MACHINE DU SERVEUR MINECRAFT (là où vit `logs/latest.log`).
//  Le script suit le log en continu, en extrait le chat / les arrivées /
//  départs, et les POST vers le récepteur HTTP du bot (`POST /mc-chat`), qui
//  les relaie dans le salon défini par `/config minecraft-chat`.
//
//  Sens unique (MC → Discord). Aucune dépendance : Node 18+ suffit (fetch natif).
//
//  Configuration par variables d'environnement :
//    BOT_URL          URL du récepteur, ex. http://mon-bot:3002/mc-chat   (requis)
//    GUILD_ID         ID du serveur Discord                                (requis)
//    MC_CHAT_SECRET   Secret affiché par /config minecraft-chat            (requis)
//    LOG_PATH         Chemin du log     (défaut: ./logs/latest.log)
//    POLL_MS          Intervalle de lecture en ms        (défaut: 1000)
//    INCLUDE_JOINS    '1' = relayer arrivées/départs     (défaut: 1)
//
//  Exemple :
//    BOT_URL=http://1.2.3.4:3002/mc-chat GUILD_ID=123 MC_CHAT_SECRET=abc \
//    LOG_PATH=/srv/mc/logs/latest.log node mc-chat-bridge.mjs
//
//  (Tourne en service : systemd, pm2, ou `screen`/`tmux`.)
// ===========================================================================

import fs from 'node:fs';
import path from 'node:path';

const BOT_URL = process.env.BOT_URL;
const GUILD_ID = process.env.GUILD_ID;
const MC_CHAT_SECRET = process.env.MC_CHAT_SECRET;
const LOG_PATH = path.resolve(process.env.LOG_PATH || './logs/latest.log');
const POLL_MS = Number(process.env.POLL_MS || 1000);
const INCLUDE_JOINS = (process.env.INCLUDE_JOINS ?? '1') === '1';

if (!BOT_URL || !GUILD_ID || !MC_CHAT_SECRET) {
  console.error('[mc-chat-bridge] BOT_URL, GUILD_ID et MC_CHAT_SECRET sont requis.');
  process.exit(1);
}
if (typeof fetch !== 'function') {
  console.error('[mc-chat-bridge] Node 18+ requis (fetch natif indisponible).');
  process.exit(1);
}

const MAX_EVENTS_PER_POST = 100;

// Retire le préfixe « [HH:MM:SS] [Thread/INFO]: » et les codes couleur §x.
function stripPrefix(line) {
  const m = line.match(/^\[[0-9:]+\]\s*\[[^\]]*\]:\s?(.*)$/);
  return (m ? m[1] : line).replace(/§./g, '').trim();
}

// Transforme une ligne de log en event, ou null si non pertinente.
function parseLine(line) {
  const rest = stripPrefix(line);
  if (!rest) return null;

  const chat = rest.match(/^<([^>]{1,32})>\s(.+)$/);
  if (chat) return { type: 'chat', player: chat[1], message: chat[2] };

  if (INCLUDE_JOINS) {
    const join = rest.match(/^([A-Za-z0-9_]{1,16}) joined the game$/);
    if (join) return { type: 'join', player: join[1] };
    const leave = rest.match(/^([A-Za-z0-9_]{1,16}) left the game$/);
    if (leave) return { type: 'leave', player: leave[1] };
  }
  return null;
}

async function postEvents(events) {
  for (let i = 0; i < events.length; i += MAX_EVENTS_PER_POST) {
    const batch = events.slice(i, i + MAX_EVENTS_PER_POST);
    try {
      const res = await fetch(BOT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ guildId: GUILD_ID, secret: MC_CHAT_SECRET, events: batch })
      });
      if (!res.ok) console.error(`[mc-chat-bridge] POST -> HTTP ${res.status}`);
    } catch (e) {
      console.error('[mc-chat-bridge] POST échoué :', e?.message || e);
    }
  }
}

// --- Suivi incrémental du fichier (gère la rotation de latest.log) ---
let pos = 0;           // offset de lecture courant
let carry = '';        // dernière ligne incomplète (sans \n final)
const decoder = new TextDecoder('utf-8'); // gère les coupures multi-octets

try { pos = fs.statSync(LOG_PATH).size; } // démarrer en fin de fichier (pas de rejeu)
catch { pos = 0; }

async function poll() {
  let size;
  try { size = fs.statSync(LOG_PATH).size; }
  catch { return; } // fichier absent (serveur arrêté/rotation) : on réessaiera
  if (size < pos) { pos = 0; carry = ''; } // rotation/troncature : on repart à 0
  if (size === pos) return;

  const fd = await fs.promises.open(LOG_PATH, 'r').catch(() => null);
  if (!fd) return;
  try {
    const buf = Buffer.alloc(size - pos);
    await fd.read(buf, 0, buf.length, pos);
    pos = size;
    carry += decoder.decode(buf, { stream: true });

    const lines = carry.split('\n');
    carry = lines.pop() ?? ''; // garde la ligne partielle pour le prochain tour

    const events = [];
    for (const raw of lines) {
      const ev = parseLine(raw.replace(/\r$/, ''));
      if (ev) events.push(ev);
    }
    if (events.length) await postEvents(events);
  } finally {
    await fd.close().catch(() => {});
  }
}

console.log(`[mc-chat-bridge] suivi de ${LOG_PATH} → ${BOT_URL} (guild ${GUILD_ID})`);
setInterval(() => { poll().catch((e) => console.error('[mc-chat-bridge] poll', e)); }, POLL_MS);
