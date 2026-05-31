import { randomInt } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
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
 * que le membre doit recopier via une modale. Le membre rejoint → reçoit le rôle
 * « non vérifié ». Dans le salon de vérification, un bouton permanent « Vérifier »
 * (déployé par /setup-captcha) affiche le défi EN ÉPHÉMÈRE — visible du seul
 * membre, donc personne d'autre ne le voit. Le bouton « Je suis humain » ouvre
 * une modale ; en cas de réussite le rôle vérifié est attribué (et le non-vérifié
 * retiré).
 *
 * Le rendu Canvas est fait directement dans le thread principal : le dessin
 * d'une petite image est négligeable (~1-2 ms) et `canvas.encode('png')` est
 * asynchrone (offload natif napi-rs), donc l'event loop n'est pas bloqué. On
 * n'utilise PAS de worker thread : tsx n'enregistre pas son loader TypeScript
 * dans les workers (`module.register()` est local au thread), ce qui faisait
 * planter le worker avec ERR_UNKNOWN_FILE_EXTENSION sur le .ts.
 *
 * Configs lues :
 *   `captcha_enabled`         — '1' pour activer
 *   `captcha_unverified_role` — rôle attribué à l'arrivée (bloque tout sauf #vérification)
 *   `captcha_verified_role`   — rôle final (peut être identique à `verified_role`)
 */

const MAX_ATTEMPTS = 3;
const TTL_MS = 30 * 60 * 1000;

// Charset sans caractères ambigus (0/O, 1/I/l, Q/U/V)
const CHARS = 'ABCDEFGHJKMNPRSTWXY23456789';

// ─── Rendu de l'image ────────────────────────────────────────────────────────

const IMG_W = 380;
const IMG_H = 150;

/** Génère le PNG du CAPTCHA. Retourne `null` en cas d'échec (rendu dégradé). */
async function renderCaptchaImage(text: string): Promise<Buffer | null> {
  try {
    const canvas = createCanvas(IMG_W, IMG_H);
    const ctx = canvas.getContext('2d');

    // Fond : dégradé sombre
    const grad = ctx.createLinearGradient(0, 0, IMG_W, IMG_H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, IMG_W, IMG_H);

    // Bruit de fond : ~400 points colorés semi-transparents
    for (let i = 0; i < 400; i++) {
      const x = randomInt(0, IMG_W);
      const y = randomInt(0, IMG_H);
      const size = randomInt(1, 3);
      ctx.fillStyle = `rgba(${randomInt(100, 255)},${randomInt(100, 255)},${randomInt(100, 255)},${randomInt(10, 40) / 100})`;
      ctx.fillRect(x, y, size, size);
    }

    // Lignes d'interférence : courbes de Bézier traversant l'image
    const lineColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, randomInt(15, IMG_H - 15));
      ctx.bezierCurveTo(
        IMG_W / 3, randomInt(5, IMG_H - 5),
        (2 * IMG_W) / 3, randomInt(5, IMG_H - 5),
        IMG_W, randomInt(15, IMG_H - 15)
      );
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = randomInt(1, 4);
      ctx.stroke();
      ctx.restore();
    }

    // Caractères : monospace bold, rotation et décalage individuels, couleur par teinte
    ctx.font = 'bold 52px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const startX = 38;
    const charSpacing = 52;

    for (let i = 0; i < text.length; i++) {
      const x = startX + i * charSpacing + (randomInt(0, 9) - 4);
      const y = IMG_H / 2 + (randomInt(0, 17) - 8);
      const angle = (randomInt(0, 31) - 15) * (Math.PI / 180);
      const hue = (i * 52) % 360;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = `hsl(${hue}, 90%, 70%)`;
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    return Buffer.from(await canvas.encode('png'));
  } catch (e) {
    log.warn('captcha render failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
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

// ─── API publique ───────────────────────────────────────────────────────────────

/**
 * Déclenché à l'arrivée d'un nouveau membre. Si le CAPTCHA est activé, applique
 * le rôle non-vérifié (qui restreint l'accès au salon de vérification). Le défi
 * lui-même est généré à la demande, en éphémère, lorsque le membre clique sur le
 * bouton « Vérifier » déployé par /setup-captcha (voir components/captcha.ts).
 */
export async function onMemberJoin(member: GuildMember): Promise<void> {
  if ((await getConfig(member.guild.id, 'captcha_enabled', '0')) !== '1') return;
  const unverifiedRoleId = await getConfig(member.guild.id, 'captcha_unverified_role');
  if (!unverifiedRoleId) return;
  await member.roles.add(unverifiedRoleId, 'CAPTCHA en attente').catch(() => {});
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
 * Génère un nouveau code, le stocke (remise à zéro des tentatives) et rend l'image.
 */
async function generateChallenge(guildId: string, userId: string): Promise<{ imageBuffer: Buffer | null }> {
  const code = makeCode();
  await prisma.captcha_pending.upsert({
    where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
    update: { answer: code, attempts: 0, created_at: Date.now() },
    create: { guild_id: guildId, user_id: userId, answer: code, created_at: Date.now() }
  });
  const imageBuffer = await renderCaptchaImage(code);
  return { imageBuffer };
}

/**
 * Génère un défi et construit le payload éphémère (image + bouton « Je suis
 * humain ») affiché quand le membre clique sur « Vérifier ». L'image n'est ainsi
 * visible que du membre concerné. Sert aussi à régénérer un défi après échec.
 */
export async function buildChallengeReply(guild: { id: string; name: string }, userId: string) {
  const { imageBuffer } = await generateChallenge(guild.id, userId);
  return buildCaptchaPayload(guild.name, guild.id, imageBuffer);
}
