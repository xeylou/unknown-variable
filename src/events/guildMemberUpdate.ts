import { Events, AttachmentBuilder, type GuildMember, type PartialGuildMember } from 'discord.js';
import { renderWelcomeCard } from '../features/welcomecard';
import { getConfig } from '../utils/configCache';
import { applyPlaceholders } from '../utils/placeholders';
import * as embeds from '../utils/embeds';

/**
 * Message de bienvenue personnalisé, envoyé en DM lorsqu'un membre obtient le
 * rôle « règlement accepté » (`verified_role`) — c.-à-d. une fois le captcha
 * passé (étape d'entrée) ET le règlement accepté. Se déclenche quel que soit le
 * mode d'attribution du rôle (bouton du règlement, attribution manuelle…).
 *
 * Remplace l'ancien message de bienvenue qui partait à l'arrivée (salon public +
 * DM) ; voir events/guildMemberAdd.ts.
 */
export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    const verifiedRole = await getConfig(newMember.guild.id, 'verified_role');
    if (!verifiedRole) return;

    // On ne réagit qu'à la transition « n'avait pas le rôle » → « a le rôle ».
    // oldMember partiel : son état de rôles précédent est inconnu (un fetch
    // renverrait l'état ACTUEL, donc inutile) → on s'abstient pour ne pas
    // renvoyer un DM en double. En pratique le membre est en cache (il vient de
    // rejoindre / de cliquer le bouton), donc oldMember est complet.
    if (oldMember.partial) return;
    if (oldMember.roles.cache.has(verifiedRole) || !newMember.roles.cache.has(verifiedRole)) return;

    // --- Message de bienvenue personnalisé (DM + carte image si activée) ---
    const raw = (await getConfig(newMember.guild.id, 'welcome_message'))
      || 'Bienvenue {user} sur **{server}** ! Tu es notre {count}ᵉ membre. 🎉';

    const cardEnabled = (await getConfig(newMember.guild.id, 'welcome_card_enabled', '0')) === '1';
    let cardFile: AttachmentBuilder | undefined;
    if (cardEnabled) {
      const backgroundURL = await getConfig(newMember.guild.id, 'welcome_card_background');
      const buf = await renderWelcomeCard({
        username: newMember.user.username,
        avatarURL: newMember.user.displayAvatarURL({ extension: 'png', size: 256 }),
        memberCount: newMember.guild.memberCount,
        guildName: newMember.guild.name,
        backgroundURL
      });
      if (buf) cardFile = new AttachmentBuilder(buf, { name: 'welcome.png' });
    }

    const embed = embeds.success()
      .setDescription(applyPlaceholders(raw, newMember))
      .setTimestamp();
    if (cardFile) embed.setImage('attachment://welcome.png');
    else embed.setThumbnail(newMember.user.displayAvatarURL());

    newMember.send({
      embeds: [embed],
      files: cardFile ? [cardFile] : undefined
    }).catch(() => {});
  }
};
