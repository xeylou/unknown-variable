import {
  Events, EmbedBuilder, AuditLogEvent, PermissionFlagsBits,
  type Guild, type Client, type GuildAuditLogsEntry, type Message,
  type GuildMember, type Role, type GuildBasedChannel, type VoiceState,
  type MessageReaction, type User, type PartialMessage, type PartialUser,
  type PartialMessageReaction, type ReadonlyCollection,
  type GuildEmoji, type Sticker, type Invite, type GuildBan
} from 'discord.js';
import { sendLog } from './logger';
import { handleReactionRoleAdd, handleReactionRoleRemove } from './reactionroles';
import config from '../config';
import { createLogger } from '../utils/logger';

/**
 * Journalisation complète du serveur. Ce module enregistre lui-même les
 * écouteurs des événements qui ne sont pas déjà traités dans `src/events/*`
 * (arrivée/départ membre, voiceStateUpdate, etc. sont gérés ailleurs et
 * journalisés depuis ces fichiers via les helpers exportés ci-dessous).
 * L'auteur de chaque action est récupéré, quand c'est possible, via le journal
 * d'audit de Discord, avec déduplication par auditLogId pour éviter les
 * attributions croisées en cas d'actions simultanées.
 */

const log = createLogger('serverlog');

let botId = '';

/** auditLogId déjà attribués → évite d'attribuer deux fois la même entrée. */
const consumedAuditIds = new Map<string, number>();
const AUDIT_DEDUP_TTL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of consumedAuditIds) {
    if (now - ts > AUDIT_DEDUP_TTL_MS) consumedAuditIds.delete(k);
  }
}, AUDIT_DEDUP_TTL_MS).unref();

type AnyAuditEntry = GuildAuditLogsEntry<AuditLogEvent>;

/**
 * Récupère l'entrée d'audit la plus récente correspondant à une action.
 * Filtre strictement par `targetId` et déduplique par identifiant d'entrée
 * pour ne pas attribuer la même action deux fois quand plusieurs handlers
 * la consultent.
 */
async function fetchAudit(
  guild: Guild,
  type: AuditLogEvent,
  targetId: string | null = null
): Promise<AnyAuditEntry | null> {
  try {
    if (!guild?.members?.me?.permissions?.has(PermissionFlagsBits.ViewAuditLog)) return null;
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const candidate = logs.entries.find((e) =>
      (!targetId || String(e.targetId) === String(targetId)) &&
      Date.now() - e.createdTimestamp < 10_000 &&
      !consumedAuditIds.has(e.id)
    );
    if (candidate) consumedAuditIds.set(candidate.id, Date.now());
    return (candidate ?? null) as AnyAuditEntry | null;
  } catch (e) {
    log.debug('fetchAudit failed', e);
    return null;
  }
}

/** Ligne « Par : … (Raison : …) » construite depuis une entrée d'audit. */
function actor(entry: AnyAuditEntry | null): string {
  if (!entry?.executor) return '';
  return `\n**Par :** ${entry.executor}` + (entry.reason ? `\n**Raison :** ${entry.reason}` : '');
}

/** Petite fabrique d'embed de log. */
function logEmbed(color: number, title: string, iconURL?: string): EmbedBuilder {
  const e = new EmbedBuilder().setColor(color).setTimestamp();
  e.setAuthor(iconURL ? { name: title, iconURL } : { name: title });
  return e;
}

// ─── Messages ──────────────────────────────────────────────────────────────

async function onMessageDelete(message: Message | PartialMessage) {
  if (!message.guild || message.author?.bot) return;
  const entry = await fetchAudit(message.guild, AuditLogEvent.MessageDelete, message.author?.id ?? null);
  const embed = logEmbed(config.colors.danger, 'Message supprimé')
    .setDescription(
      `**Auteur :** ${message.author ?? '*Inconnu*'}\n` +
      `**Salon :** ${message.channel}` + actor(entry)
    )
    .addFields({ name: 'Contenu', value: (message.content || '*(non disponible)*').slice(0, 1024) });
  await sendLog(message.guild, 'messages', embed);
}

async function onMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const embed = logEmbed(config.colors.warning, 'Message modifié')
    .setDescription(
      `**Auteur :** ${newMessage.author}\n` +
      `**Salon :** ${newMessage.channel} — [aller au message](${newMessage.url})`
    )
    .addFields(
      { name: 'Avant', value: (oldMessage.content || '*(non disponible)*').slice(0, 1024) },
      { name: 'Après', value: (newMessage.content || '*(vide)*').slice(0, 1024) }
    );
  await sendLog(newMessage.guild, 'messages', embed);
}

async function onMessageBulkDelete(
  messages: ReadonlyCollection<string, Message | PartialMessage>,
  channel: GuildBasedChannel
) {
  if (!channel?.guild) return;
  const embed = logEmbed(config.colors.danger, 'Suppression groupée de messages')
    .setDescription(`**${messages.size}** message(s) supprimé(s) dans ${channel}.`);
  await sendLog(channel.guild, 'messages', embed);
}

// ─── Membres (helpers appelés depuis events/guildMember*.ts) ───────────────

/** Log l'arrivée d'un membre — appelé depuis events/guildMemberAdd.ts. */
export async function logMemberAdd(member: GuildMember) {
  const embed = logEmbed(config.colors.success, "Arrivée d'un membre", member.user.displayAvatarURL())
    .setDescription(
      `${member} (\`${member.id}\`)\n` +
      `Compte créé <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
      `**Membre n°** ${member.guild.memberCount}`
    )
    .setThumbnail(member.user.displayAvatarURL());
  await sendLog(member.guild, 'members', embed);
}

/**
 * Log le départ d'un membre — appelé depuis events/guildMemberRemove.ts.
 * Détecte automatiquement les bannissements/expulsions via l'audit log.
 */
export async function logMemberRemove(member: GuildMember | { guild: Guild; user: User; id: string; roles?: any }) {
  const guild = member.guild;
  const banned = await fetchAudit(guild, AuditLogEvent.MemberBanAdd, member.id);
  if (banned) return;

  const kick = await fetchAudit(guild, AuditLogEvent.MemberKick, member.id);
  if (kick) {
    if (kick.executor?.id === botId) return;
    const embed = logEmbed(config.colors.danger, 'Membre expulsé', member.user.displayAvatarURL())
      .setDescription(`${member.user.tag} (\`${member.id}\`)` + actor(kick));
    await sendLog(guild, 'moderation', embed);
    return;
  }

  const embed = logEmbed(config.colors.danger, "Départ d'un membre", member.user.displayAvatarURL())
    .setDescription(`${member.user.tag} (\`${member.id}\`)`);
  const roles = member.roles?.cache?.filter((r: Role) => r.id !== guild.id);
  if (roles && roles.size) {
    embed.addFields({ name: 'Rôles', value: [...roles.values()].join(', ').slice(0, 1024) });
  }
  await sendLog(guild, 'members', embed);
}

async function onMemberUpdate(oldMember: GuildMember | { partial: true; nickname?: string | null; roles?: GuildMember['roles']; communicationDisabledUntilTimestamp?: number | null }, newMember: GuildMember) {
  const guild = newMember.guild;
  if ('partial' in oldMember && oldMember.partial) return;
  const oldM = oldMember as GuildMember;

  // Pseudo
  if (oldM.nickname !== newMember.nickname) {
    const embed = logEmbed(config.colors.warning, 'Pseudo modifié')
      .setDescription(
        `**Membre :** ${newMember}\n` +
        `**Avant :** ${oldM.nickname || '*(aucun)*'}\n` +
        `**Après :** ${newMember.nickname || '*(aucun)*'}`
      );
    await sendLog(guild, 'members', embed);
  }

  // Rôles
  const added = newMember.roles.cache.filter((r) => !oldM.roles.cache.has(r.id));
  const removed = oldM.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));
  if (added.size || removed.size) {
    const entry = await fetchAudit(guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
    const embed = logEmbed(config.colors.primary, 'Rôles modifiés')
      .setDescription(`**Membre :** ${newMember}` + actor(entry));
    if (added.size) embed.addFields({ name: '➕ Ajoutés', value: [...added.values()].join(', ').slice(0, 1024) });
    if (removed.size) embed.addFields({ name: '➖ Retirés', value: [...removed.values()].join(', ').slice(0, 1024) });
    await sendLog(guild, 'members', embed);
  }

  // Exclusion temporaire (timeout)
  const oldTo = oldM.communicationDisabledUntilTimestamp || 0;
  const newTo = newMember.communicationDisabledUntilTimestamp || 0;
  const wasActive = oldTo > Date.now();
  const isActive = newTo > Date.now();
  if (wasActive !== isActive) {
    const entry = await fetchAudit(guild, AuditLogEvent.MemberUpdate, newMember.id);
    if (entry?.executor?.id === botId) return;
    const embed = isActive
      ? logEmbed(config.colors.danger, 'Exclusion temporaire')
          .setDescription(`**Membre :** ${newMember}\n**Fin :** <t:${Math.floor(newTo / 1000)}:R>` + actor(entry))
      : logEmbed(config.colors.success, "Fin d'exclusion temporaire")
          .setDescription(`**Membre :** ${newMember}` + actor(entry));
    await sendLog(guild, 'moderation', embed);
  }
}

// ─── Rôles ─────────────────────────────────────────────────────────────────

async function onRoleCreate(role: Role) {
  const entry = await fetchAudit(role.guild, AuditLogEvent.RoleCreate, role.id);
  const embed = logEmbed(config.colors.success, 'Rôle créé')
    .setDescription(`${role} — \`${role.name}\`` + actor(entry));
  await sendLog(role.guild, 'roles', embed);
}

async function onRoleDelete(role: Role) {
  const entry = await fetchAudit(role.guild, AuditLogEvent.RoleDelete, role.id);
  const embed = logEmbed(config.colors.danger, 'Rôle supprimé')
    .setDescription(`\`${role.name}\` (\`${role.id}\`)` + actor(entry));
  await sendLog(role.guild, 'roles', embed);
}

async function onRoleUpdate(oldRole: Role, newRole: Role) {
  const changes: string[] = [];
  if (oldRole.name !== newRole.name) changes.push(`**Nom :** ${oldRole.name} → ${newRole.name}`);
  if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Couleur :** ${oldRole.hexColor} → ${newRole.hexColor}`);
  if (oldRole.hoist !== newRole.hoist) changes.push(`**Affiché séparément :** ${newRole.hoist ? 'oui' : 'non'}`);
  if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionnable :** ${newRole.mentionable ? 'oui' : 'non'}`);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permissions modifiées**');
  if (!changes.length) return;

  const entry = await fetchAudit(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
  const embed = logEmbed(config.colors.warning, 'Rôle modifié')
    .setDescription(`**Rôle :** ${newRole}\n${changes.join('\n')}` + actor(entry));
  await sendLog(newRole.guild, 'roles', embed);
}

// ─── Salons ────────────────────────────────────────────────────────────────

async function onChannelCreate(channel: GuildBasedChannel) {
  if (!channel.guild) return;
  const entry = await fetchAudit(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
  const embed = logEmbed(config.colors.success, 'Salon créé')
    .setDescription(`${channel} — \`${channel.name}\`` + actor(entry));
  await sendLog(channel.guild, 'channels', embed);
}

async function onChannelDelete(channel: GuildBasedChannel) {
  if (!('guild' in channel) || !channel.guild) return;
  const entry = await fetchAudit(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
  const embed = logEmbed(config.colors.danger, 'Salon supprimé')
    .setDescription(`\`${channel.name}\` (\`${channel.id}\`)` + actor(entry));
  await sendLog(channel.guild, 'channels', embed);
}

async function onChannelUpdate(oldChannel: GuildBasedChannel, newChannel: GuildBasedChannel) {
  if (!('guild' in newChannel) || !newChannel.guild) return;
  const changes: string[] = [];
  if (oldChannel.name !== newChannel.name) changes.push(`**Nom :** ${oldChannel.name} → ${newChannel.name}`);
  const oldTopic = 'topic' in oldChannel ? (oldChannel.topic || '') : '';
  const newTopic = 'topic' in newChannel ? (newChannel.topic || '') : '';
  if (oldTopic !== newTopic) changes.push('**Sujet modifié**');
  const oldNsfw = 'nsfw' in oldChannel ? oldChannel.nsfw : false;
  const newNsfw = 'nsfw' in newChannel ? newChannel.nsfw : false;
  if (oldNsfw !== newNsfw) changes.push(`**NSFW :** ${newNsfw ? 'oui' : 'non'}`);
  if (oldChannel.parentId !== newChannel.parentId) changes.push('**Catégorie modifiée**');
  if (!changes.length) return;

  const entry = await fetchAudit(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
  const embed = logEmbed(config.colors.warning, 'Salon modifié')
    .setDescription(`**Salon :** ${newChannel}\n${changes.join('\n')}` + actor(entry));
  await sendLog(newChannel.guild, 'channels', embed);
}

// ─── Réactions ─────────────────────────────────────────────────────────────

/**
 * Hydrate une réaction partielle (message non en cache → fetch indispensable
 * pour récupérer l'auteur, l'emoji, le message cible).
 */
async function hydrateReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<boolean> {
  if (reaction.partial) {
    try { await reaction.fetch(); }
    catch (e) { log.debug('reaction.fetch failed', e); return false; }
  }
  if (user.partial) {
    try { await user.fetch(); }
    catch (e) { log.debug('user.fetch failed', e); return false; }
  }
  return true;
}

/** Représentation lisible d'un emoji (Unicode ou custom). */
function emojiDisplay(emoji: MessageReaction['emoji'] | PartialMessageReaction['emoji']): string {
  if (emoji.id) {
    return emoji.animated
      ? `<a:${emoji.name}:${emoji.id}>`
      : `<:${emoji.name}:${emoji.id}>`;
  }
  return emoji.name ?? '?';
}

async function onReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (!await hydrateReaction(reaction, user)) return;
  if (user.bot) return;
  const message = reaction.message;
  if (!message.guild) return;

  handleReactionRoleAdd(reaction, user).catch((e) => log.debug('reactionrole add', e));

  const embed = logEmbed(config.colors.neutral, 'Réaction ajoutée', user.displayAvatarURL?.())
    .setDescription(
      `**Par :** ${user}\n` +
      `**Emoji :** ${emojiDisplay(reaction.emoji)}\n` +
      `**Salon :** ${message.channel}` +
      (message.url ? ` — [aller au message](${message.url})` : '')
    );
  await sendLog(message.guild, 'messages', embed);
}

async function onReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (!await hydrateReaction(reaction, user)) return;
  if (user.bot) return;
  const message = reaction.message;
  if (!message.guild) return;

  handleReactionRoleRemove(reaction, user).catch((e) => log.debug('reactionrole remove', e));

  const embed = logEmbed(config.colors.warning, 'Réaction retirée', user.displayAvatarURL?.())
    .setDescription(
      `**Par :** ${user}\n` +
      `**Emoji :** ${emojiDisplay(reaction.emoji)}\n` +
      `**Salon :** ${message.channel}` +
      (message.url ? ` — [aller au message](${message.url})` : '')
    );
  await sendLog(message.guild, 'messages', embed);
}

async function onReactionRemoveAll(message: Message | PartialMessage) {
  if (message.partial) {
    try { await message.fetch(); }
    catch { return; }
  }
  if (!message.guild) return;
  const embed = logEmbed(config.colors.danger, 'Toutes les réactions retirées')
    .setDescription(`**Salon :** ${message.channel}` +
      (message.url ? ` — [aller au message](${message.url})` : ''));
  await sendLog(message.guild, 'messages', embed);
}

async function onReactionRemoveEmoji(reaction: MessageReaction | PartialMessageReaction) {
  if (reaction.partial) {
    try { await reaction.fetch(); }
    catch { return; }
  }
  const message = reaction.message;
  if (!message.guild) return;
  const embed = logEmbed(config.colors.warning, 'Toutes les réactions d\'un emoji retirées')
    .setDescription(
      `**Emoji :** ${emojiDisplay(reaction.emoji)}\n` +
      `**Salon :** ${message.channel}` +
      (message.url ? ` — [aller au message](${message.url})` : '')
    );
  await sendLog(message.guild, 'messages', embed);
}

// ─── Vocal (helper appelé depuis events/voiceStateUpdate.ts) ───────────────

/**
 * Journalise l'activité vocale — uniquement les changements de salon
 * (join/leave/move). Les mute/deafen ne sont PAS loggués pour éviter de
 * remplir le salon de logs sur les serveurs actifs.
 */
export async function logVoiceActivity(oldState: VoiceState, newState: VoiceState) {
  const member = newState.member;
  if (!member) return;
  if (oldState.channelId === newState.channelId) return;

  let desc: string;
  if (!oldState.channel && newState.channel) desc = `${member} a rejoint ${newState.channel}`;
  else if (oldState.channel && !newState.channel) desc = `${member} a quitté ${oldState.channel}`;
  else desc = `${member} est passé de ${oldState.channel} à ${newState.channel}`;

  await sendLog(newState.guild, 'voice', logEmbed(config.colors.neutral, 'Activité vocale').setDescription(desc));
}

// ─── Serveur ───────────────────────────────────────────────────────────────

async function onGuildUpdate(oldGuild: Guild, newGuild: Guild) {
  const changes: string[] = [];
  if (oldGuild.name !== newGuild.name) changes.push(`**Nom :** ${oldGuild.name} → ${newGuild.name}`);
  if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push('**Icône modifiée**');
  if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push('**Niveau de vérification modifié**');
  if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push('**Filtre de contenu modifié**');
  if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push('**Salon AFK modifié**');
  if (oldGuild.systemChannelId !== newGuild.systemChannelId) changes.push('**Salon système modifié**');
  if (!changes.length) return;

  const entry = await fetchAudit(newGuild, AuditLogEvent.GuildUpdate);
  const embed = logEmbed(config.colors.warning, 'Paramètres du serveur modifiés')
    .setDescription(changes.join('\n') + actor(entry));
  await sendLog(newGuild, 'server', embed);
}

async function onEmojiCreate(emoji: GuildEmoji) {
  const entry = await fetchAudit(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
  await sendLog(emoji.guild, 'server',
    logEmbed(config.colors.success, 'Émoji ajouté').setDescription(`${emoji} \`:${emoji.name}:\`` + actor(entry)));
}

async function onEmojiDelete(emoji: GuildEmoji) {
  const entry = await fetchAudit(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
  await sendLog(emoji.guild, 'server',
    logEmbed(config.colors.danger, 'Émoji supprimé').setDescription(`\`:${emoji.name}:\`` + actor(entry)));
}

async function onStickerCreate(sticker: Sticker) {
  if (!sticker.guild) return;
  const entry = await fetchAudit(sticker.guild, AuditLogEvent.StickerCreate, sticker.id);
  await sendLog(sticker.guild, 'server',
    logEmbed(config.colors.success, 'Sticker ajouté').setDescription(`\`${sticker.name}\`` + actor(entry)));
}

async function onStickerDelete(sticker: Sticker) {
  if (!sticker.guild) return;
  const entry = await fetchAudit(sticker.guild, AuditLogEvent.StickerDelete, sticker.id);
  await sendLog(sticker.guild, 'server',
    logEmbed(config.colors.danger, 'Sticker supprimé').setDescription(`\`${sticker.name}\`` + actor(entry)));
}

async function onInviteCreate(invite: Invite) {
  if (!invite.guild) return;
  const embed = logEmbed(config.colors.neutral, 'Invitation créée').setDescription(
    `**Code :** \`${invite.code}\`\n` +
    `**Salon :** ${invite.channel}\n` +
    `**Créée par :** ${invite.inviter ?? '*Inconnu*'}\n` +
    `**Utilisations max :** ${invite.maxUses || '∞'}` +
    (invite.expiresTimestamp ? `\n**Expire :** <t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : '')
  );
  await sendLog(invite.guild as Guild, 'server', embed);
}

async function onInviteDelete(invite: Invite) {
  if (!invite.guild) return;
  await sendLog(invite.guild as Guild, 'server',
    logEmbed(config.colors.neutral, 'Invitation supprimée')
      .setDescription(`**Code :** \`${invite.code}\`\n**Salon :** ${invite.channel}`));
}

// ─── Modération ────────────────────────────────────────────────────────────

async function onBanAdd(ban: GuildBan) {
  const entry = await fetchAudit(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  if (entry?.executor?.id === botId) return;
  const embed = logEmbed(config.colors.danger, 'Membre banni', ban.user.displayAvatarURL())
    .setDescription(`${ban.user.tag} (\`${ban.user.id}\`)` + actor(entry));
  await sendLog(ban.guild, 'moderation', embed);
}

async function onBanRemove(ban: GuildBan) {
  const entry = await fetchAudit(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
  if (entry?.executor?.id === botId) return;
  const embed = logEmbed(config.colors.success, 'Membre débanni', ban.user.displayAvatarURL())
    .setDescription(`${ban.user.tag} (\`${ban.user.id}\`)` + actor(entry));
  await sendLog(ban.guild, 'moderation', embed);
}

/** Enregistre les écouteurs de journalisation. */
export function init(client: Client<true>) {
  botId = client.user.id;
  const safe = <T extends unknown[]>(name: string, fn: (...args: T) => Promise<unknown>) =>
    (...args: T) =>
      fn(...args).catch((e) => log.warn(`handler ${name} threw`, e));

  client.on(Events.MessageDelete,        safe('messageDelete',   onMessageDelete));
  client.on(Events.MessageUpdate,        safe('messageUpdate',   onMessageUpdate));
  client.on(Events.MessageBulkDelete,    safe('bulkDelete',      onMessageBulkDelete as any));
  client.on(Events.GuildMemberUpdate,    safe('memberUpdate',    onMemberUpdate as any));
  client.on(Events.GuildRoleCreate,      safe('roleCreate',      onRoleCreate));
  client.on(Events.GuildRoleDelete,      safe('roleDelete',      onRoleDelete));
  client.on(Events.GuildRoleUpdate,      safe('roleUpdate',      onRoleUpdate));
  client.on(Events.ChannelCreate,        safe('channelCreate',   onChannelCreate));
  client.on(Events.ChannelDelete,        safe('channelDelete',   onChannelDelete as any));
  client.on(Events.ChannelUpdate,        safe('channelUpdate',   onChannelUpdate as any));
  client.on(Events.GuildUpdate,          safe('guildUpdate',     onGuildUpdate));
  client.on(Events.GuildEmojiCreate,     safe('emojiCreate',     onEmojiCreate));
  client.on(Events.GuildEmojiDelete,     safe('emojiDelete',     onEmojiDelete));
  client.on(Events.GuildStickerCreate,   safe('stickerCreate',   onStickerCreate));
  client.on(Events.GuildStickerDelete,   safe('stickerDelete',   onStickerDelete));
  client.on(Events.InviteCreate,         safe('inviteCreate',    onInviteCreate));
  client.on(Events.InviteDelete,         safe('inviteDelete',    onInviteDelete));
  client.on(Events.GuildBanAdd,          safe('banAdd',          onBanAdd));
  client.on(Events.GuildBanRemove,       safe('banRemove',       onBanRemove));
  client.on(Events.MessageReactionAdd,         safe('reactionAdd',         onReactionAdd));
  client.on(Events.MessageReactionRemove,      safe('reactionRemove',      onReactionRemove));
  client.on(Events.MessageReactionRemoveAll,   safe('reactionRemoveAll',   onReactionRemoveAll));
  client.on(Events.MessageReactionRemoveEmoji, safe('reactionRemoveEmoji', onReactionRemoveEmoji));
  // GuildMemberAdd / Remove / VoiceStateUpdate sont gérés via les fichiers
  // src/events/*, qui appellent logMemberAdd / logMemberRemove / logVoiceActivity.
}
