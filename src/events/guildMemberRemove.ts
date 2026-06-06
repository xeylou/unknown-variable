import { Events, EmbedBuilder, type GuildMember, type PartialGuildMember } from 'discord.js';
import { getConfig } from '../utils/configCache';
import { logMemberRemove } from '../features/serverlog';
import { onMemberLeave as trackInviteLeave } from '../features/invitetracker';
import { applyPlaceholders } from '../utils/placeholders';
import { noMentions } from '../utils/mentions';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('events:memberRemove');

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    // --- Journalisation ---
    await logMemberRemove(member as GuildMember).catch((e) => log.warn('serverlog memberRemove', e));

    // --- Suivi des invitations (décrément net) ---
    await trackInviteLeave(member).catch((e) => log.warn('invitetracker leave', e));

    // --- Message d'au revoir ---
    const channelId = await getConfig(member.guild.id, 'goodbye_channel');
    if (channelId) {
      const channel = member.guild.channels.cache.get(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        const raw = (await getConfig(member.guild.id, 'goodbye_message'))
          || '**{username}** a quitté le serveur. À bientôt !';
        channel.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.neutral)
            .setDescription(applyPlaceholders(raw, member as GuildMember))
            .setTimestamp()],
          allowedMentions: noMentions
        }).catch(() => {});
      }
    }
  }
};
