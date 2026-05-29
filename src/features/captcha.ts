import { randomInt } from 'node:crypto';
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type GuildMember
} from 'discord.js';
import { prisma } from '../database';
import { getConfig } from '../utils/configCache';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('captcha');

/**
 * CAPTCHA d'entrée par calcul mathématique simple. Le membre rejoint le
 * serveur → reçoit le rôle « non vérifié » + un DM avec un bouton.
 * Le bouton ouvre une modale demandant le résultat. En cas de réussite,
 * le rôle vérifié est attribué (et le non-vérifié retiré).
 *
 * Configs lues :
 *   `captcha_enabled`         — '1' pour activer
 *   `captcha_unverified_role` — rôle attribué à l'arrivée (bloque tout sauf #vérification)
 *   `captcha_verified_role`   — rôle final (peut être identique à `verified_role`)
 *   `captcha_channel`         — salon où inviter le membre s'il ne reçoit pas de DM
 */

const MAX_ATTEMPTS = 3;
const TTL_MS = 30 * 60 * 1000; // 30 min pour résoudre

/** Génère un calcul simple. Renvoie l'énoncé et la réponse en chaîne. */
function makeChallenge(): { question: string; answer: string } {
  const a = randomInt(1, 20);
  const b = randomInt(1, 20);
  const op = ['+', '−', '×'][randomInt(0, 3)];
  let res: number;
  switch (op) {
    case '+': res = a + b; break;
    case '−': res = a - b; break;
    case '×': res = a * b; break;
    default: res = a + b;
  }
  return { question: `Combien font **${a} ${op} ${b}** ?`, answer: String(res) };
}

/**
 * Déclenché à l'arrivée d'un nouveau membre. Si le CAPTCHA est activé,
 * applique le rôle non-vérifié et propose un bouton de vérification (DM
 * + message dans le salon configuré).
 */
export async function onMemberJoin(member: GuildMember): Promise<void> {
  if ((await getConfig(member.guild.id, 'captcha_enabled', '0')) !== '1') return;
  const unverifiedRoleId = await getConfig(member.guild.id, 'captcha_unverified_role');
  if (!unverifiedRoleId) return;

  await member.roles.add(unverifiedRoleId, 'CAPTCHA en attente').catch(() => {});

  const challenge = makeChallenge();
  await prisma.captcha_pending.upsert({
    where: { guild_id_user_id: { guild_id: member.guild.id, user_id: member.id } },
    update: { answer: challenge.answer, attempts: 0, created_at: Date.now() },
    create: { guild_id: member.guild.id, user_id: member.id, answer: challenge.answer, created_at: Date.now() }
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🛡️ Vérification anti-robot')
    .setDescription(
      `Bienvenue sur **${member.guild.name}** !\n\n` +
      'Pour accéder au serveur, clique sur le bouton ci-dessous et réponds à la question :\n\n' +
      `**${challenge.question}**`
    );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`captcha:verify:${member.guild.id}`)
      .setLabel('Je suis humain')
      .setEmoji('🤖')
      .setStyle(ButtonStyle.Primary)
  );

  const dmSent = await member.send({ embeds: [embed], components: [row] }).catch(() => null);

  const channelId = await getConfig(member.guild.id, 'captcha_channel');
  if (channelId) {
    const channel = member.guild.channels.cache.get(channelId);
    if (channel?.isTextBased() && 'send' in channel) {
      channel.send({
        content: `${member}`,
        embeds: [embed],
        components: [row],
        allowedMentions: { users: [member.id] }
      }).catch(() => {});
    }
  }

  if (!dmSent && !channelId) {
    log.warn(`captcha sans canal de fallback dans ${member.guild.id}`);
  }
}

/**
 * Valide une réponse au CAPTCHA. Si correct, retire le rôle non-vérifié et
 * applique le rôle vérifié. Sinon : décrémente le quota de tentatives.
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

  if (answer.trim() !== pending.answer) {
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

/** Génère un nouveau challenge pour un membre déjà en attente (épuisement). */
export async function refreshChallenge(guildId: string, userId: string) {
  const c = makeChallenge();
  await prisma.captcha_pending.upsert({
    where: { guild_id_user_id: { guild_id: guildId, user_id: userId } },
    update: { answer: c.answer, attempts: 0, created_at: Date.now() },
    create: { guild_id: guildId, user_id: userId, answer: c.answer, created_at: Date.now() }
  });
  return c;
}
