import { Events, type Message } from 'discord.js';
import { runAutomod } from '../features/automod';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';

const log = createLogger('events:message');

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Autorisé seulement pour les messages de membres dans un serveur
    if (!message.guild || message.author?.bot) {
      await runAutomod(message).catch((e) => log.warn('automod', e));
      return;
    }

    // --- AFK : retire le statut si l'auteur revient parler ---
    const ownAfk = await prisma.afk.findUnique({
      where: { guild_id_user_id: { guild_id: message.guild.id, user_id: message.author.id } }
    }).catch(() => null);
    if (ownAfk) {
      await prisma.afk.delete({
        where: { guild_id_user_id: { guild_id: message.guild.id, user_id: message.author.id } }
      }).catch(() => {});
      message.reply({
        content: `👋 Re ${message.author}, j'ai retiré ton statut AFK (absent depuis <t:${Math.floor(ownAfk.since / 1000)}:R>).`,
        allowedMentions: { repliedUser: false }
      }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000).unref()).catch(() => {});
    }

    // --- AFK : signale les membres pingés en AFK ---
    if (message.mentions.users.size > 0) {
      const replies: string[] = [];
      for (const user of message.mentions.users.values()) {
        if (user.id === message.author.id) continue;
        const afk = await prisma.afk.findUnique({
          where: { guild_id_user_id: { guild_id: message.guild.id, user_id: user.id } }
        }).catch(() => null);
        if (afk) {
          replies.push(`💤 ${user.tag} est AFK depuis <t:${Math.floor(afk.since / 1000)}:R>` +
                       (afk.reason ? ` : *${afk.reason}*` : '.'));
        }
      }
      if (replies.length) {
        message.reply({ content: replies.join('\n'), allowedMentions: { repliedUser: false } })
          .catch(() => {});
      }
    }

    await runAutomod(message).catch((e) => log.warn('automod', e));
  }
};
