import { Events, AttachmentBuilder, type GuildMember } from 'discord.js';
import { checkRaid } from '../features/antiraid';
import { onMemberJoin as captchaOnJoin } from '../features/captcha';
import { renderWelcomeCard } from '../features/welcomecard';
import { getConfig } from '../utils/configCache';
import { logMemberAdd } from '../features/serverlog';
import { applyPlaceholders } from '../utils/placeholders';
import { noMentions } from '../utils/mentions';
import { createLogger } from '../utils/logger';
import * as embeds from '../utils/embeds';

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

    // --- Message de bienvenue (salon public + carte image si activée) ---
    const channelId = await getConfig(member.guild.id, 'welcome_channel');
    if (channelId) {
      const channel = member.guild.channels.cache.get(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        const raw = (await getConfig(member.guild.id, 'welcome_message'))
          || 'Bienvenue {user} sur **{server}** ! Tu es notre {count}ᵉ membre. 🎉';

        // Carte image (si /config welcome-card on)
        const cardEnabled = (await getConfig(member.guild.id, 'welcome_card_enabled', '0')) === '1';
        let cardFile: AttachmentBuilder | undefined;
        if (cardEnabled) {
          const backgroundURL = await getConfig(member.guild.id, 'welcome_card_background');
          const buf = await renderWelcomeCard({
            username: member.user.username,
            avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            memberCount: member.guild.memberCount,
            guildName: member.guild.name,
            backgroundURL
          });
          if (buf) cardFile = new AttachmentBuilder(buf, { name: 'welcome.png' });
        }

        const embed = embeds.success()
          .setDescription(applyPlaceholders(raw, member))
          .setTimestamp();
        if (cardFile) embed.setImage('attachment://welcome.png');
        else embed.setThumbnail(member.user.displayAvatarURL());

        channel.send({
          content: member.toString(),
          embeds: [embed],
          files: cardFile ? [cardFile] : undefined,
          allowedMentions: { ...noMentions, users: [member.id] }
        }).catch(() => {});
      }
    }

    // --- DM de bienvenue (si activé) ---
    const dmRaw = await getConfig(member.guild.id, 'welcome_dm_message');
    if (dmRaw) {
      member.send({
        embeds: [embeds.primary()
          .setDescription(applyPlaceholders(dmRaw, member))
          .setTimestamp()]
      }).catch(() => {});
    }
  }
};
