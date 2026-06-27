import { Events, type GuildMember, type PartialGuildMember } from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

const log = createLogger('events:namehistory');

/**
 * Journalise les changements de **surnom serveur** (nickname) dans
 * `name_history`, consultable via `/pseudos`. Cohabite avec le handler
 * `guildMemberUpdate.ts` (accueil) : le loader d'events autorise plusieurs
 * fichiers pour un même event.
 */
export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    // oldMember partiel : surnom précédent inconnu → on s'abstient pour ne pas
    // enregistrer un faux changement.
    if (oldMember.partial) return;
    if (oldMember.nickname === newMember.nickname) return;

    await prisma.name_history.create({
      data: {
        guild_id: newMember.guild.id,
        user_id: newMember.id,
        kind: 'nickname',
        old_value: oldMember.nickname ?? null,
        new_value: newMember.nickname ?? null,
        changed_at: Date.now()
      }
    }).catch((e) => log.warn('insert surnom', e));
  }
};
