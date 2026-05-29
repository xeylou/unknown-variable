import { PermissionFlagsBits, EmbedBuilder, type Message } from 'discord.js';
import { getConfig } from '../utils/configCache';
import { sendLog } from './logger';
import { findPhishDomain } from './phishlist';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('automod');

const INVITE_REGEX = /(?:discord\.(?:gg|io|me|li)\/|discord(?:app)?\.com\/invite\/)([a-z0-9-]+)/gi;
const TOKEN_REGEX = /[A-Za-z0-9_-]{20,30}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{25,40}/;

const spamTracker = new Map<string, number[]>();
const SPAM_DEFAULTS = { messages: 5, windowSec: 7, timeoutMin: 5 };
const SPAM_MAX_WINDOW_MS = 30_000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, stamps] of spamTracker) {
    if (!stamps.some((t) => now - t < SPAM_MAX_WINDOW_MS)) spamTracker.delete(userId);
  }
}, 10 * 60 * 1000).unref();

/** Découpe en tokens (mots) pour matcher des mots exacts, pas des substrings. */
function tokenize(content: string): string[] {
  return content
    .toLowerCase()
    .split(/[\s.,;:!?()[\]{}"'`<>/\\|@#~*_=+-]+/u)
    .filter(Boolean);
}

/** Compte les caractères combinants Unicode (signe de texte « Zalgo »). */
function combiningRatio(content: string): number {
  if (!content) return 0;
  const combining = content.match(/\p{M}/gu)?.length ?? 0;
  return combining / Math.max(content.length, 1);
}

/** Analyse un message et applique l'auto-modération si elle est activée. */
async function runAutomod(message: Message): Promise<void> {
  if (!message.guild || message.author?.bot || !message.member) return;
  if ((await getConfig(message.guild.id, 'automod_enabled', '0')) !== '1') return;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const content = message.content || '';

  if ((await getConfig(message.guild.id, 'automod_token_leak', '1')) === '1' && TOKEN_REGEX.test(content)) {
    return punish(message, 'Fuite probable de token Discord');
  }

  if ((await getConfig(message.guild.id, 'automod_phishing', '1')) === '1') {
    const domain = findPhishDomain(content);
    if (domain) return punish(message, `Lien de phishing détecté (\`${domain}\`)`);
  }

  let inviteMatch: RegExpExecArray | null;
  INVITE_REGEX.lastIndex = 0;
  while ((inviteMatch = INVITE_REGEX.exec(content)) !== null) {
    const code = inviteMatch[1];
    const allowed = await isInviteAllowed(message.client, message.guild.id, code);
    if (!allowed) return punish(message, "Lien d'invitation Discord interdit");
  }

  if ((await getConfig(message.guild.id, 'automod_zalgo', '1')) === '1') {
    if (content.length >= 20 && combiningRatio(content) > 0.3) {
      return punish(message, 'Texte Zalgo (caractères combinants Unicode)');
    }
  }

  let bannedWords: string[] = [];
  try { bannedWords = JSON.parse((await getConfig(message.guild.id, 'automod_banned_words', '[]')) ?? '[]'); }
  catch { /* JSON invalide : on garde la liste vide */ }
  if (bannedWords.length) {
    const tokens = new Set(tokenize(content));
    if (bannedWords.some((w) => tokens.has(w.toLowerCase()))) {
      return punish(message, 'Mot interdit utilisé');
    }
  }

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= 5) {
    return punish(message, 'Trop de mentions dans un seul message');
  }

  const letters = content.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || [];
  if (letters.length >= 10) {
    const upper = letters.filter((c) => c === c.toUpperCase()).length;
    if (upper / letters.length > 0.7) {
      return punish(message, 'Excès de majuscules');
    }
  }

  const spamMessages = Number(await getConfig(message.guild.id, 'automod_spam_messages', String(SPAM_DEFAULTS.messages))) || SPAM_DEFAULTS.messages;
  const spamWindow = (Number(await getConfig(message.guild.id, 'automod_spam_window', String(SPAM_DEFAULTS.windowSec))) || SPAM_DEFAULTS.windowSec) * 1000;
  const spamTimeout = (Number(await getConfig(message.guild.id, 'automod_spam_timeout', String(SPAM_DEFAULTS.timeoutMin))) || SPAM_DEFAULTS.timeoutMin) * 60000;

  const now = Date.now();
  const stamps = (spamTracker.get(message.author.id) || []).filter((t) => now - t < spamWindow);
  stamps.push(now);
  spamTracker.set(message.author.id, stamps);
  if (stamps.length >= spamMessages) {
    spamTracker.delete(message.author.id);
    await message.member.timeout(spamTimeout, 'Auto-modération : spam').catch(() => {});
    return punish(message, `Spam détecté — exclusion temporaire de ${Math.round(spamTimeout / 60000)} min`);
  }
}

/**
 * Vrai si le code d'invitation pointe vers un serveur whitelisté.
 */
async function isInviteAllowed(client: Message['client'], guildId: string, code: string): Promise<boolean> {
  let whitelist: string[] = [];
  try { whitelist = JSON.parse((await getConfig(guildId, 'automod_invite_whitelist', '[]')) ?? '[]'); }
  catch { /* */ }
  if (!whitelist.length) return false;

  try {
    const invite = await client.fetchInvite(code);
    const target = invite.guild?.id;
    return !!target && (target === guildId || whitelist.includes(target));
  } catch {
    return false;
  }
}

async function punish(message: Message, reason: string): Promise<void> {
  await message.delete().catch(() => {});

  if (message.channel.isTextBased() && 'send' in message.channel) {
    const notice = await message.channel.send({
      content: `🚫 ${message.author}, votre message a été supprimé — **${reason}**.`,
      allowedMentions: { users: [message.author.id] }
    }).catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => {}), 6000).unref();
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setAuthor({ name: 'Auto-modération' })
    .setDescription(
      `**Membre :** ${message.author} (\`${message.author.id}\`)\n` +
      `**Salon :** ${message.channel}\n` +
      `**Motif :** ${reason}`
    )
    .addFields({ name: 'Message', value: (message.content || '*(vide)*').slice(0, 1024) })
    .setTimestamp();
  sendLog(message.guild, 'moderation', embed).catch((e) => log.warn('sendLog failed', e));
}

export { runAutomod, tokenize, combiningRatio }
