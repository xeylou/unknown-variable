import { randomInt } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
  type GuildMember
} from 'discord.js';
import { prisma } from '../database';
import { getConfig } from '../utils/configCache';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('captcha');

/**
 * CAPTCHA d'entrée visuel : génère une image bruitée avec 6 caractères distordus
 * que le membre doit recopier via une modale. Le worker canvas est isolé dans un
 * thread dédié pour ne pas bloquer l'event loop lors des arrivées massives.
 *
 * Configs lues :
 *   `captcha_enabled`         — '1' pour activer
 *   `captcha_unverified_role` — rôle attribué à l'arrivée (bloque tout sauf #vérification)
 *   `captcha_verified_role`   — rôle final (peut être identique à `verified_role`)
 *   `captcha_channel`         — salon où inviter le membre s'il ne reçoit pas de DM
 */

const MAX_ATTEMPTS = 3;
const TTL_MS = 30 * 60 * 1000;
const WORKER_TIMEOUT_MS = 5000;

// Charset sans caractères ambigus (0/O, 1/I/l, Q/U/V)
const CHARS = 'ABCDEFGHJKMNPRSTWXY23456789';

// ─── Worker manager ────────────────────────────────────────────────────────────

type WorkerReply =
  | { id: number; ok: true; buffer: Buffer }
  | { id: number; ok: false; error: string };

let captchaWorker: Worker | null = null;
let nextId = 1;
const renderQueue = new Map<number, (res: WorkerReply) => void>();

function spawnCaptchaWorker(): Worker {
  const w = new Worker(path.resolve(__dirname, '..', 'workers', 'captcha.worker.ts'), {
    execArgv: ['--import', 'tsx']
  });
  w.on('message', (msg: WorkerReply) => {
    const resolver = renderQueue.get(msg.id);
    if (resolver) {
      renderQueue.delete(msg.id);
      resolver(msg);
    }
  });
  w.on('error', (e) => {
    log.warn('captcha worker error', e);
    for (const [id, resolver] of renderQueue) {
      resolver({ id, ok: false, error: 'worker error' });
    }
    renderQueue.clear();
    captchaWorker = null;
  });
  w.on('exit', (code) => {
    if (code !== 0) log.warn(`captcha worker exited with code ${code}`);
    captchaWorker = null;
  });
  return w;
}

async function renderCaptchaImage(text: string): Promise<Buffer | null> {
  if (!captchaWorker) captchaWorker = spawnCaptchaWorker();
  const id = nextId++;

  return new Promise<Buffer | null>((resolve) => {
    const timer = setTimeout(() => {
      renderQueue.delete(id);
      log.warn('captcha render timeout');
      resolve(null);
    }, WORKER_TIMEOUT_MS);
    timer.unref();

    renderQueue.set(id, (reply) => {
      clearTimeout(timer);
      if (reply.ok) resolve(reply.buffer);
      else {
        log.warn('captcha render failed:', reply.error);
        resolve(null);
      }
    });

    try {
      captchaWorker!.postMessage({ id, text });
    } catch (e) {
      clearTimeout(timer);
      renderQueue.delete(id);
      log.warn('postMessage failed', e);
      resolve(null);
    }
  });
}

// ─── Challenge ────────────────────────────────────────────────────────────────

function makeCode(): string {
  return Array.from({ length: 6 }, () => CHARS[randomInt(0, CHARS.length)]).join('');
}

function buildCaptchaPayload(guildName: string, guildId: string, imageBuffer: Buffer | null) {
  let desc =
    `Bienvenue sur **${guildName}** !\n\n` +
    'Pour accéder au serveur, clique sur le bouton ci-dessous et **recopie exactement les caractères affichés dans l\'image** (insensible à la casse).';

  if (!imageBuffer) {
    desc += '\n\n⚠️ L\'image CAPTCHA est temporairement indisponible — contacte un staff pour le renvoyer.';
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🛡️ Vérification anti-robot')
    .setDescription(desc);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`captcha:verify:${guildId}`)
      .setLabel('Je suis humain')
      .setEmoji('🤖')
      .setStyle(ButtonStyle.Primary)
  );

  const files: AttachmentBuilder[] = [];
  if (imageBuffer) {
    files.push(new AttachmentBuilder(imageBuffer, { name: 'captcha.png' }));
    embed.setImage('attachment://captcha.png');
  }

  return { embeds: [embed], components: [row], files };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Déclenché à l'arrivée d'un nouveau membre. Si le CAPTCHA est activé,
 * applique le rôle non-vérifié et envoie le défi visuel (DM + salon de fallback).
 */
export async function onMemberJoin(member: GuildMember): Promise<void> {
  if ((await getConfig(member.guild.id, 'captcha_enabled', '0')) !== '1') return;
  const unverifiedRoleId = await getConfig(member.guild.id, 'captcha_unverified_role');
  if (!unverifiedRoleId) return;

  await member.roles.add(unverifiedRoleId, 'CAPTCHA en attente').catch(() => {});

  const code = makeCode();
  await prisma.captcha_pending.upsert({
    where: { guild_id_user_id: { guild_id: member.guild.id, user_id: member.id } },
    update: { answer: code, attempts: 0, created_at: Date.now() },
    create: { guild_id: member.guild.id, user_id: member.id, answer: code, created_at: Date.now() }
  });

  const imageBuffer = await renderCaptchaImage(code);
  const payload = buildCaptchaPayload(member.guild.name, member.guild.id, imageBuffer);

  const dmSent = await member.send(payload).catch(() => null);

  const channelId = await getConfig(member.guild.id, 'captcha_channel');
  if (channelId) {
    const channel = member.guild.channels.cache.get(channelId);
    if (channel?.isTextBased() && 'send' in channel) {
      // Reconstruire le payload pour le channel (AttachmentBuilder ne peut pas être réutilisé)
      const channelPayload = buildCaptchaPayload(member.guild.name, member.guild.id, imageBuffer);
      channel.send({
        content: `${member}`,
        ...channelPayload,
        allowedMentions: { users: [member.id] }
      }).catch(() => {});
    }
  }

  if (!dmSent && !channelId) {
    log.warn(`captcha sans canal de fallback dans ${member.guild.id}`);
  }
}

/**
 * Valide une réponse au CAPTCHA. Comparaison insensible à la casse.
 */
export async function verifyAnswer(guildId: string, userId: string, answer: string) {
  const pending = await prisma.captcha_pending.findUnique({
    where: { guild_id_user_id: { guild_id: guildId, user_id: userId } }
  });
  if (!pending) return { ok: false, reason: 'no-pending' as const };
  if (Date.now() - pending.created_at > TTL_MS) {
    await prisma.captcha_pending.delete({ where: { guild_id_user_id: { guild_id: guildId, user_id: userId } } });
    return { ok: false, reason: 'expired' as const };
  }

  if (answer.trim().toUpperCase() !== pending.answer) {
    const attempts = pending.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.captcha_pending.delete({ where: { guild_id_user_id: { guild_id: guildId, user_id: userId } } });
      return { ok: false, reason: 'exhausted' as const, attempts };
    }
    await prisma.captcha_pending.update({
      where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
      data: { attempts }
    });
    return { ok: false, reason: 'wrong' as const, attempts, remaining: MAX_ATTEMPTS - attempts };
  }

  await prisma.captcha_pending.delete({ where: { guild_id_user_id: { guild_id: guildId, user_id: userId } } });
  return { ok: true as const };
}

/**
 * Génère un nouveau défi visuel pour un membre ayant épuisé ses tentatives.
 * Retourne le buffer image pour que l'appelant puisse l'inclure dans sa réponse.
 */
export async function refreshChallenge(guildId: string, userId: string) {
  const code = makeCode();
  await prisma.captcha_pending.upsert({
    where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
    update: { answer: code, attempts: 0, created_at: Date.now() },
    create: { guild_id: guildId, user_id: userId, answer: code, created_at: Date.now() }
  });
  const imageBuffer = await renderCaptchaImage(code);
  return { imageBuffer };
}
