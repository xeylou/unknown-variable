import { type Client } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import { noMentions } from '../utils/mentions';
import config from '../config';
import type { notifications as NotificationRow } from '@prisma/client';

const log = createLogger('notifications');

const POLL_INTERVAL = 5 * 60 * 1000;
const PARALLEL = 5;

let clientRef: Client<true> | null = null;
let twitchToken: string | null = null;
let twitchTokenExpiry = 0;
let polling = false;

/** Au démarrage : lance la vérification périodique des notifications. */
function init(client: Client<true>): void {
  clientRef = client;
  setInterval(() => { poll().catch((e) => log.error(e)); }, POLL_INTERVAL).unref();
  setTimeout(() => { poll().catch((e) => log.error(e)); }, 15_000).unref();
}

/**
 * Lance un pool d'`await` parallèles bornés (`size`) sur `items`.
 */
async function runPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  const queue = items.slice();
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      try { await worker(item); }
      catch (e) { log.warn('worker error', e); }
    }
  });
  await Promise.all(workers);
}

async function poll(): Promise<void> {
  if (polling) {
    log.debug('poll skipped — previous run still in progress');
    return;
  }
  polling = true;
  try {
    const notifications = await prisma.notifications.findMany();
    await runPool(notifications, PARALLEL, async (n) => {
      if (n.platform === 'youtube') await checkYouTube(n);
      else if (n.platform === 'twitch') await checkTwitch(n);
      else if (n.platform === 'rss') await checkRSS(n);
    });
  } finally {
    polling = false;
  }
}

async function announce(n: NotificationRow, content: string): Promise<void> {
  if (!clientRef) return;
  const channel = await clientRef.channels.fetch(n.discord_channel).catch(() => null);
  if (!channel?.isTextBased() || !('send' in channel)) {
    log.info(`abonnement #${n.id} orphelin (salon introuvable) — suppression`);
    await prisma.notifications.delete({ where: { id: n.id } }).catch(() => {});
    return;
  }
  // Si un rôle est configuré pour cet abonnement, on l'ajoute en tête du
  // message et on l'autorise dans `allowedMentions` (le reste reste bloqué).
  const ping = n.role_id ? `<@&${n.role_id}> ` : '';
  const allowedMentions = n.role_id
    ? { ...noMentions, roles: [n.role_id] }
    : noMentions;
  await channel.send({ content: ping + content, allowedMentions })
    .catch((e) => log.warn('send failed', e));
}

async function checkYouTube(n: NotificationRow): Promise<void> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${n.target}`);
  if (!res.ok) return;
  const xml = await res.text();
  const match = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  if (!match) return;

  const videoId = match[1];
  if (videoId === n.last_item) return;

  const isFirstCheck = n.last_item == null;
  await prisma.notifications.update({ where: { id: n.id }, data: { last_item: videoId } });
  if (isFirstCheck) return;

  await announce(n,
    `📺 **${n.target_name || 'La chaîne'}** a publié une nouvelle vidéo !\n` +
    `https://www.youtube.com/watch?v=${videoId}`
  );
}

async function getTwitchToken(): Promise<string | null> {
  if (!config.twitch.clientId || !config.twitch.clientSecret) return null;
  if (twitchToken && Date.now() < twitchTokenExpiry) return twitchToken;

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.twitch.clientId,
      client_secret: config.twitch.clientSecret,
      grant_type: 'client_credentials'
    })
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  twitchToken = data.access_token;
  twitchTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return twitchToken;
}

async function checkTwitch(n: NotificationRow): Promise<void> {
  const token = await getTwitchToken();
  if (!token || !config.twitch.clientId) return;

  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(n.target)}`, {
    headers: { 'Client-ID': config.twitch.clientId, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const json = await res.json() as { data?: Array<{ id: string; title: string }> };
  const stream = json.data?.[0];

  if (!stream) {
    if (n.last_item) await prisma.notifications.update({ where: { id: n.id }, data: { last_item: null } });
    return;
  }
  if (stream.id === n.last_item) return;

  await prisma.notifications.update({ where: { id: n.id }, data: { last_item: stream.id } });
  await announce(n,
    `🔴 **${n.target_name || n.target}** est en live sur Twitch !\n` +
    `**${stream.title}**\nhttps://twitch.tv/${n.target}`
  );
}

/**
 * Extrait la première entrée d'un flux RSS 2.0 ou Atom à partir de regex —
 * volontairement minimaliste : on évite d'embarquer un parser XML pour rester
 * léger. La regex `multiline / dotAll` capture le premier `<item>` (RSS) ou
 * `<entry>` (Atom).
 *
 * Renvoie `{ id, title, link }` :
 *  - `id` : <guid> | <id> | <link> (clé de dédup, on prend ce qui est le plus stable)
 *  - `title` : <title> (peut être vide)
 *  - `link` : <link>...</link> (RSS) ou <link href="..."/> (Atom)
 */
export function parseFirstFeedItem(xml: string): { id: string; title: string; link: string } | null {
  const block = xml.match(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!block) return null;
  const inner = block[2];

  // Title — strip CDATA si présent
  const titleMatch = inner.match(/<title\b[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
  const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? '').trim();

  // Link — Atom `<link href="..."/>` ou RSS `<link>...</link>`
  const atomLink = inner.match(/<link[^>]*href="([^"]+)"/i);
  const rssLink = inner.match(/<link[^>]*>([^<]+)<\/link>/i);
  const link = (atomLink?.[1] ?? rssLink?.[1] ?? '').trim();

  // Id : guid (RSS) > id (Atom) > link
  const guidMatch = inner.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);
  const idMatch = inner.match(/<id\b[^>]*>([\s\S]*?)<\/id>/i);
  const id = (guidMatch?.[1] ?? idMatch?.[1] ?? link).trim();
  if (!id) return null;

  return { id, title, link };
}

/**
 * Suit un flux RSS / Atom générique — pratique pour Instagram, TikTok, X,
 * blogs, Reddit, etc. via un service intermédiaire type RSSHub.
 */
async function checkRSS(n: NotificationRow): Promise<void> {
  const res = await fetch(n.target, {
    headers: {
      'User-Agent': 'unknown_variable-bot/1.0 (Discord notification)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml; q=0.9, */*; q=0.5'
    }
  }).catch((e) => { log.warn(`RSS fetch failed (${n.target})`, e); return null; });
  if (!res || !res.ok) return;

  const xml = await res.text();
  const item = parseFirstFeedItem(xml);
  if (!item) {
    log.debug(`RSS sans entrée parsable : ${n.target}`);
    return;
  }
  if (item.id === n.last_item) return;

  // Première lecture : on mémorise, on n'annonce pas (sinon flood au branchement).
  const isFirstCheck = n.last_item == null;
  await prisma.notifications.update({ where: { id: n.id }, data: { last_item: item.id } });
  if (isFirstCheck) return;

  const source = n.target_name || 'Le compte';
  const titleLine = item.title ? `**${item.title}**\n` : '';
  const linkLine = item.link || item.id;
  await announce(n, `📰 **${source}** a publié quelque chose !\n${titleLine}${linkLine}`);
}

export { init }
