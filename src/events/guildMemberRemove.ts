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

/**
 * « Avait rejoint le serveur il y a X jour(s)/mois/an(s) » à partir de la date
 * d'arrivée. Retourne null si elle est inconnue (membre partiel non mis en cache).
 */
function membershipAgo(joinedTimestamp: number | null): string | null {
  if (!joinedTimestamp) return null;
  const days = Math.floor((Date.now() - joinedTimestamp) / 86_400_000);
  if (days < 1) return "Avait rejoint le serveur aujourd'hui";
  if (days < 31) return `Avait rejoint le serveur il y a ${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Avait rejoint le serveur il y a ${months} mois`;
  const years = Math.floor(days / 365);
  return `Avait rejoint le serveur il y a ${years} an${years > 1 ? 's' : ''}`;
}

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
        // Ancienneté du membre, affichée à la place de l'horodatage.
        const joinedAgo = membershipAgo((member as GuildMember).joinedTimestamp ?? null);
        const embed = new EmbedBuilder()
          .setColor(config.colors.neutral)
          .setDescription(applyPlaceholders(raw, member as GuildMember));

        // Carte image de départ (si activée), même rendu Canvas que la bienvenue.
        // Échec de rendu → on dégrade en simple vignette d'avatar.
        let files: AttachmentBuilder[] | undefined;
        let cardShown = false;
        if ((await getConfig(member.guild.id, 'goodbye_card_enabled', '0')) === '1') {
          const backgroundURL = await getConfig(member.guild.id, 'goodbye_card_background');
          const cardBuf = await renderWelcomeCard({
            variant: 'goodbye',
            username: member.user.username,
            avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            memberCount: member.guild.memberCount,
            guildName: member.guild.name,
            backgroundURL,
            subtitle: joinedAgo ?? undefined
          });
          if (cardBuf) {
            files = [new AttachmentBuilder(cardBuf, { name: 'goodbye.png' })];
            embed.setImage('attachment://goodbye.png');
            cardShown = true;
          } else {
            embed.setThumbnail(member.user.displayAvatarURL());
          }
        }

        // Sans carte (désactivée ou échec de rendu), on garde l'ancienneté en pied d'embed.
        if (!cardShown && joinedAgo) embed.setFooter({ text: joinedAgo });

        channel.send({ embeds: [embed], files, allowedMentions: noMentions }).catch(() => {});
      }
    }
  }
};
