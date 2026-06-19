import { Events, EmbedBuilder, AttachmentBuilder, type GuildMember, type PartialGuildMember } from 'discord.js';
import { getConfig } from '../utils/configCache';
import { logMemberRemove } from '../features/serverlog';
import { onMemberLeave as trackInviteLeave } from '../features/invitetracker';
import { renderWelcomeCard } from '../features/welcomecard';
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

    // --- Message d'au revoir (+ carte image de départ optionnelle) ---
    const channelId = await getConfig(member.guild.id, 'goodbye_channel');
    if (channelId) {
      const channel = member.guild.channels.cache.get(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        const raw = (await getConfig(member.guild.id, 'goodbye_message'))
          || '**{username}** a quitté le serveur. À bientôt !';
        const embed = new EmbedBuilder()
          .setColor(config.colors.neutral)
          .setDescription(applyPlaceholders(raw, member as GuildMember))
          .setTimestamp();

        // Carte image de départ (si activée), même rendu Canvas que la bienvenue.
        // Échec de rendu → on dégrade en simple vignette d'avatar.
        let files: AttachmentBuilder[] | undefined;
        if ((await getConfig(member.guild.id, 'goodbye_card_enabled', '0')) === '1') {
          const backgroundURL = await getConfig(member.guild.id, 'goodbye_card_background');
          const cardBuf = await renderWelcomeCard({
            variant: 'goodbye',
            username: member.user.username,
            avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            memberCount: member.guild.memberCount,
            guildName: member.guild.name,
            backgroundURL
          });
          if (cardBuf) {
            files = [new AttachmentBuilder(cardBuf, { name: 'goodbye.png' })];
            embed.setImage('attachment://goodbye.png');
          } else {
            embed.setThumbnail(member.user.displayAvatarURL());
          }
        }

        channel.send({ embeds: [embed], files, allowedMentions: noMentions }).catch(() => {});
      }
    }
  }
};
