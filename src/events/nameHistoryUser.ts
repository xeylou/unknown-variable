import { Events, type User, type PartialUser } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

const log = createLogger('events:namehistory');

/**
 * Journalise les changements de **nom d'utilisateur** et de **nom global**
 * (niveau compte, donc global à Discord) dans `name_history`. L'event `userUpdate`
 * n'étant pas rattaché à une guilde, on enregistre une entrée pour chaque serveur
 * partagé (en cache) où le membre est présent, afin que `/pseudos` (par serveur)
 * les retrouve.
 */
export default {
  name: Events.UserUpdate,
  async execute(oldUser: User | PartialUser, newUser: User) {
    if (oldUser.partial) return; // état précédent inconnu

    const changes: { kind: string; old: string | null; new: string | null }[] = [];
    if (oldUser.username !== newUser.username) {
      changes.push({ kind: 'username', old: oldUser.username, new: newUser.username });
    }
    if (oldUser.globalName !== newUser.globalName) {
      changes.push({ kind: 'global', old: oldUser.globalName ?? null, new: newUser.globalName ?? null });
    }
    if (!changes.length) return;

    const now = Date.now();
    for (const guild of newUser.client.guilds.cache.values()) {
      if (!guild.members.cache.has(newUser.id)) continue;
      for (const c of changes) {
        await prisma.name_history.create({
          data: { guild_id: guild.id, user_id: newUser.id, kind: c.kind, old_value: c.old, new_value: c.new, changed_at: now }
        }).catch((e) => log.warn('insert nom de compte', e));
      }
    }
  }
};
