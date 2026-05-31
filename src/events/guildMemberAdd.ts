import { Events, type GuildMember } from 'discord.js';
import { checkRaid } from '../features/antiraid';
import { onMemberJoin as captchaOnJoin } from '../features/captcha';
import { getConfig } from '../utils/configCache';
import { logMemberAdd } from '../features/serverlog';
import { createLogger } from '../utils/logger';

const log = createLogger('events:memberAdd');

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    // --- Journalisation ---
    await logMemberAdd(member).catch((e) => log.warn('serverlog memberAdd', e));

    // --- Anti-raid ---
    await checkRaid(member).catch((e) => log.warn('antiraid', e));

    // --- CAPTCHA d'entrée (si activé) ---
    await captchaOnJoin(member).catch((e) => log.warn('captcha', e));

    // --- Autorôle ---
    const autorole = await getConfig(member.guild.id, 'autorole');
    if (autorole) {
      member.roles.add(autorole, 'Autorôle automatique').catch(() => {});
    }

    // Le message de bienvenue est désormais envoyé en DM à l'obtention du rôle
    // « règlement accepté » (verified_role) — voir events/guildMemberUpdate.ts.
  }
};
