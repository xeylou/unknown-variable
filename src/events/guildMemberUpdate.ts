import {
  Events, AttachmentBuilder, type EmbedBuilder, type GuildMember, type PartialGuildMember
} from 'discord.js';
import { renderWelcomeCard } from '../features/welcomecard';
import { getConfig } from '../utils/configCache';
import { applyPlaceholders } from '../utils/placeholders';
import { noMentions } from '../utils/mentions';
import welcomeInfo from '../data/welcome';
import * as embeds from '../utils/embeds';

/**
 * Bienvenue déclenchée lorsqu'un membre obtient le rôle « règlement accepté »
 * (`verified_role`) — c.-à-d. une fois le captcha passé (étape d'entrée) ET le
 * règlement accepté. Se déclenche quel que soit le mode d'attribution du rôle.
 *
 * Envoie alors :
 *   1. un MP au membre : carte de bienvenue + un 2ᵉ embed d'orientation
 *      configurable dans data/welcome.ts ;
 *   2. (si un salon de bienvenue est configuré) la même carte dans ce salon,
 *      SANS ping (allowedMentions désactivées).
 */
export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    const gid = newMember.guild.id;
    const verifiedRole = await getConfig(gid, 'verified_role');
    if (!verifiedRole) return;

    // On ne réagit qu'à la transition « n'avait pas le rôle » → « a le rôle ».
    // oldMember partiel : état précédent inconnu (un fetch renverrait l'état
    // ACTUEL) → on s'abstient pour ne pas renvoyer la bienvenue en double.
    if (oldMember.partial) return;
    if (oldMember.roles.cache.has(verifiedRole) || !newMember.roles.cache.has(verifiedRole)) return;

    // --- Carte image : rendue UNE fois, réutilisée pour le MP et le salon ---
    // (un AttachmentBuilder ne peut pas être réutilisé sur deux messages, on en
    // recrée donc un à chaque envoi via le helper `cardFile`.)
    let cardBuf: Buffer | null = null;
    if ((await getConfig(gid, 'welcome_card_enabled', '0')) === '1') {
      const backgroundURL = await getConfig(gid, 'welcome_card_background');
      cardBuf = await renderWelcomeCard({
        username: newMember.user.username,
        avatarURL: newMember.user.displayAvatarURL({ extension: 'png', size: 256 }),
        memberCount: newMember.guild.memberCount,
        guildName: newMember.guild.name,
        backgroundURL
      });
    }
    const cardFile = () => (cardBuf ? [new AttachmentBuilder(cardBuf, { name: 'welcome.png' })] : undefined);

    const raw = (await getConfig(gid, 'welcome_message'))
      || 'Bienvenue {user} sur **{server}** ! Tu es notre {count}ᵉ membre. 🎉';

    // Embed de bienvenue (texte + carte). Recréé à chaque envoi (cf. ci-dessus).
    const welcomeEmbed = (): EmbedBuilder => {
      const e = embeds.success()
        .setDescription(applyPlaceholders(raw, newMember))
        .setTimestamp();
      if (cardBuf) e.setImage('attachment://welcome.png');
      else e.setThumbnail(newMember.user.displayAvatarURL());
      return e;
    };

    // --- 1) MP au membre : carte + 2ᵉ embed d'orientation (data/welcome.ts) ---
    const dmEmbeds: EmbedBuilder[] = [welcomeEmbed()];
    if (welcomeInfo.description?.trim()) {
      const info = embeds.primary().setDescription(applyPlaceholders(welcomeInfo.description, newMember));
      if (welcomeInfo.title) info.setTitle(applyPlaceholders(welcomeInfo.title, newMember));
      if (welcomeInfo.footer) info.setFooter({ text: applyPlaceholders(welcomeInfo.footer, newMember) });
      if (welcomeInfo.fields?.length) {
        info.addFields(welcomeInfo.fields.map((f) => ({
          name: applyPlaceholders(f.name, newMember),
          value: applyPlaceholders(f.value, newMember),
          inline: f.inline
        })));
      }
      dmEmbeds.push(info);
    }
    newMember.send({ embeds: dmEmbeds, files: cardFile() }).catch(() => {});

    // --- 2) Salon de bienvenue public : carte + pseudo, SANS ping ---
    const channelId = await getConfig(gid, 'welcome_channel');
    if (channelId) {
      const channel = newMember.guild.channels.cache.get(channelId);
      if (channel?.isTextBased() && 'send' in channel) {
        channel.send({
          embeds: [welcomeEmbed()],
          files: cardFile(),
          allowedMentions: noMentions
        }).catch(() => {});
      }
    }
  }
};
