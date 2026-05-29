import { ChannelType, type GuildBasedChannel } from 'discord.js';
import { createLogger } from '../utils/logger';

const log = createLogger('lockdown');

/**
 * Salons supportés par le lockdown : tout ce qui a un `permissionOverwrites`.
 * Exporté pour que les commandes puissent l'utiliser dans leurs casts.
 */
export type LockableChannel = Extract<GuildBasedChannel, { permissionOverwrites: any }>;

/**
 * Gestion des restaurations automatiques des lockdowns temporaires.
 * On stocke en mémoire les overwrites précédents par salon, et on les
 * restaure à l'expiration. Si le bot redémarre, le lock est perdu (mais
 * `@everyone` retrouvera ses droits via la commande inverse `/lockdown lift`).
 */

const scheduled = new Map<string, NodeJS.Timeout>();

/**
 * Permissions toggled selon le type de salon. Pour un vocal on coupe `Connect`
 * et `Speak` (qui produit l'effet attendu : plus personne n'entre, et même les
 * occupants ne parlent plus). Pour un forum on bloque la création de threads.
 * Pour texte/annonce on coupe SendMessages + SendMessagesInThreads + AddReactions.
 */
function lockedPerms(channel: LockableChannel): Record<string, boolean> {
  if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
    return { Connect: false, Speak: false };
  }
  if (channel.type === ChannelType.GuildForum) {
    return {
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      AddReactions: false
    };
  }
  return {
    SendMessages: false,
    SendMessagesInThreads: false,
    AddReactions: false
  };
}

/** Mêmes clés que `lockedPerms`, remises à `null` pour effacer l'override. */
function unlockedPerms(channel: LockableChannel): Record<string, null> {
  const result: Record<string, null> = {};
  for (const key of Object.keys(lockedPerms(channel))) result[key] = null;
  return result;
}

/** Verrouille un salon selon son type (texte, vocal, forum…). */
export async function lockChannel(channel: LockableChannel, durationMs: number | null): Promise<void> {
  const guild = channel.guild;
  const everyone = guild.roles.everyone;
  const existing = channel.permissionOverwrites.cache.get(everyone.id);
  const prevAllow = existing?.allow.bitfield ?? 0n;
  const prevDeny  = existing?.deny.bitfield  ?? 0n;

  await channel.permissionOverwrites.edit(everyone, lockedPerms(channel), { reason: 'Lockdown' });

  // Restauration auto si une durée a été fournie
  if (durationMs && durationMs > 0) {
    cancelRestore(channel.id);
    const timer = setTimeout(() => {
      restoreChannel(channel, prevAllow, prevDeny).catch((e) => log.warn('restore failed', e));
      scheduled.delete(channel.id);
    }, Math.min(durationMs, 2_147_483_647));
    timer.unref();
    scheduled.set(channel.id, timer);
  }
}

async function restoreChannel(channel: LockableChannel, prevAllow: bigint, prevDeny: bigint): Promise<void> {
  const everyone = channel.guild.roles.everyone;
  if (prevAllow === 0n && prevDeny === 0n) {
    await channel.permissionOverwrites.delete(everyone, 'Fin de lockdown').catch(() => {});
  } else {
    await channel.permissionOverwrites.edit(everyone, unlockedPerms(channel), { reason: 'Fin de lockdown' });
  }
}

/** Déverrouille immédiatement (annule la restauration différée). */
export async function unlockChannel(channel: LockableChannel): Promise<void> {
  cancelRestore(channel.id);
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, unlockedPerms(channel), {
    reason: 'Fin de lockdown manuelle'
  });
}

function cancelRestore(channelId: string) {
  const t = scheduled.get(channelId);
  if (t) { clearTimeout(t); scheduled.delete(channelId); }
}
