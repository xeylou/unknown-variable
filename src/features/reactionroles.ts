import {
  type MessageReaction, type PartialMessageReaction,
  type User, type PartialUser
} from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

const log = createLogger('reactionroles');

type AnyReaction = MessageReaction | PartialMessageReaction;
type AnyUser = User | PartialUser;

/** Clé emoji utilisée en DB : `<name>:<id>` pour les custom, nom Unicode sinon. */
export function emojiKey(emoji: AnyReaction['emoji'] | { id: string | null; name: string | null }): string {
  return emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name ?? '');
}

/** Gère un clic de réaction → attribution / retrait du rôle correspondant. */
export async function handleReactionRoleAdd(reaction: AnyReaction, user: AnyUser): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message?.guild) return;

  const panel = await prisma.reaction_role_panels.findUnique({ where: { message_id: message.id } });
  if (!panel) return;

  const key = emojiKey(reaction.emoji);
  const entry = await prisma.reaction_role_entries.findUnique({
    where: { message_id_emoji: { message_id: message.id, emoji: key } }
  });
  if (!entry) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  if (panel.exclusive) {
    const allEntries = await prisma.reaction_role_entries.findMany({ where: { message_id: message.id } });
    for (const e of allEntries) {
      if (e.role_id !== entry.role_id && member.roles.cache.has(e.role_id)) {
        await member.roles.remove(e.role_id, 'Reaction role exclusif').catch(() => {});
      }
    }
    for (const r of message.reactions.cache.values()) {
      if (emojiKey(r.emoji) !== key) {
        await r.users.remove(user.id).catch(() => {});
      }
    }
  }

  await member.roles.add(entry.role_id, 'Reaction role').catch((e) => log.debug('add role', e));
}

export async function handleReactionRoleRemove(reaction: AnyReaction, user: AnyUser): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message?.guild) return;

  const panel = await prisma.reaction_role_panels.findUnique({ where: { message_id: message.id } });
  if (!panel) return;

  const key = emojiKey(reaction.emoji);
  const entry = await prisma.reaction_role_entries.findUnique({
    where: { message_id_emoji: { message_id: message.id, emoji: key } }
  });
  if (!entry) return;

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  await member.roles.remove(entry.role_id, 'Reaction role retiré').catch((e) => log.debug('remove role', e));
}
