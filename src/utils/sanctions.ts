import { prisma } from '../database';
import type { SanctionType } from './moderation';

interface AddSanctionInput {
  guildId: string;
  userId: string;
  moderatorId: string;
  type: SanctionType;
  reason?: string | null;
  expiresAt?: number | null;
}

/** Ajoute une sanction au casier. @returns l'id de la sanction créée. */
async function addSanction({
  guildId, userId, moderatorId, type, reason = null, expiresAt = null
}: AddSanctionInput): Promise<number> {
  const sanction = await prisma.sanctions.create({
    data: {
      guild_id: guildId,
      user_id: userId,
      moderator_id: moderatorId,
      type,
      reason,
      created_at: Date.now(),
      expires_at: expiresAt
    }
  });
  return sanction.id;
}

/** Renvoie toutes les sanctions d'un membre, de la plus récente à la plus ancienne. */
async function getSanctions(guildId: string, userId: string) {
  return prisma.sanctions.findMany({
    where: { guild_id: guildId, user_id: userId },
    orderBy: { created_at: 'desc' }
  });
}

/** Désactive un avertissement (le retire du casier sans le supprimer). */
async function deactivateWarn(guildId: string, id: number) {
  return prisma.sanctions.updateMany({
    where: { guild_id: guildId, id, type: 'warn', active: 1 },
    data: { active: 0 }
  });
}

export { addSanction, getSanctions, deactivateWarn }
