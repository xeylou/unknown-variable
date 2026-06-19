import {
  ChannelType, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Client, type VoiceState, type GuildMember,
  type VoiceChannel
} from 'discord.js';
import { prisma } from '../database';
import { getConfig } from '../utils/configCache';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('tempvoice');

/**
 * Verrou en mémoire par membre, pour éviter qu'un double passage rapide dans
 * le JTC ne crée deux salons temporaires en parallèle.
 */
const creating = new Set<string>();

/**
 * Lignes de boutons du panneau de contrôle d'un salon temporaire.
 */
function controlRows(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('tempvoice:lock').setEmoji('🔒').setLabel('Verrouiller').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tempvoice:unlock').setEmoji('🔓').setLabel('Déverrouiller').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tempvoice:rename').setEmoji('✏️').setLabel('Renommer').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tempvoice:limit').setEmoji('👥').setLabel('Limite').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('tempvoice:invite').setEmoji('➕').setLabel('Inviter').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tempvoice:ban').setEmoji('🚫').setLabel('Bannir').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('tempvoice:kick').setEmoji('👢').setLabel('Expulser').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('tempvoice:transfer').setEmoji('👑').setLabel('Céder').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

function controlRow(): ActionRowBuilder<ButtonBuilder> {
  return controlRows()[0];
}

/** Logique « rejoindre pour créer » + suppression des salons vides. */
async function handleVoiceUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const guild = newState.guild;
  const jtc = await getConfig(guild.id, 'jtc_channel');

  if (jtc && newState.channelId === jtc) {
    const member = newState.member;
    if (!member) return;
    const lockKey = `${guild.id}:${member.id}`;
    if (creating.has(lockKey)) return;
    creating.add(lockKey);
    try {
      const owned = await prisma.temp_voice.findFirst({
        where: { owner_id: member.id, guild_id: guild.id }
      });
      if (owned && guild.channels.cache.get(owned.channel_id)) {
        await member.voice.setChannel(owned.channel_id).catch(() => {});
        return;
      }

      const categoryId = await getConfig(guild.id, 'jtc_category') || newState.channel?.parentId || null;

      const prefs = await prisma.tempvoice_prefs.findUnique({ where: { user_id: member.id } });
      const channelName = prefs?.name || `🔊 ${member.user.username}`;
      type OverwriteInput = Parameters<typeof guild.channels.create>[0]['permissionOverwrites'];
      const overwrites = [{
        id: member.id,
        allow: [
          PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers, PermissionFlagsBits.Connect
        ]
      }] as NonNullable<OverwriteInput>;
      if (prefs?.locked) {
        (overwrites as any[]).push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] });
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId || undefined,
        userLimit: prefs?.user_limit ?? 0,
        permissionOverwrites: overwrites
      }).catch((e) => { log.warn('create channel failed', e); return null; });
      if (!channel) return;

      await prisma.temp_voice.create({
        data: {
          channel_id: channel.id,
          guild_id: guild.id,
          owner_id: member.id,
          created_at: Date.now()
        }
      });
      await member.voice.setChannel(channel).catch(() => {});

      channel.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('🔊 Votre salon vocal personnel')
          .setDescription(
            `Salon créé pour ${member}.\n\n` +
            '**Configuration :** verrouiller, déverrouiller, renommer, limiter les places.\n' +
            '**Gestion :** inviter ➕, bannir 🚫, expulser 👢, céder 👑.\n\n' +
            '*Vos choix de nom / limite / verrou sont mémorisés pour vos futurs salons.*'
          )],
        components: controlRows(),
        allowedMentions: { users: [member.id] }
      }).catch(() => {});
    } finally {
      creating.delete(lockKey);
    }
    return;
  }

  if (oldState.channel && oldState.channelId !== newState.channelId) {
    const temp = await prisma.temp_voice.findUnique({
      where: { channel_id: oldState.channelId! }
    });
    if (!temp) return;

    if (oldState.channel.members.size === 0) {
      await oldState.channel.delete().catch(() => {});
      await prisma.temp_voice.delete({
        where: { channel_id: oldState.channelId! }
      }).catch(() => {});
      return;
    }

    if (temp.owner_id === oldState.member?.id) {
      const remaining = [...oldState.channel.members.values()].filter((m: GuildMember) => !m.user.bot);
      if (!remaining.length) return;
      remaining.sort((a, b) => (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0));
      const newOwner = remaining[0];
      await prisma.temp_voice.update({
        where: { channel_id: oldState.channelId! },
        data: { owner_id: newOwner.id }
      });
      await oldState.channel.permissionOverwrites.edit(newOwner.id, {
        ManageChannels: true, MoveMembers: true, MuteMembers: true, Connect: true
      }).catch(() => {});
      await oldState.channel.permissionOverwrites.edit(temp.owner_id, {
        ManageChannels: false, MoveMembers: false, MuteMembers: false
      }).catch(() => {});
      (oldState.channel as VoiceChannel).send({
        content: `👑 ${newOwner} est maintenant l'owner du salon (ancien owner parti).`,
        allowedMentions: { users: [newOwner.id] }
      }).catch(() => {});
    }
  }
}

/**
 * Au démarrage : supprime les salons temporaires vides ou disparus.
 */
async function cleanup(client: Client<true>): Promise<void> {
  const temps = await prisma.temp_voice.findMany();
  for (const t of temps) {
    const guild = client.guilds.cache.get(t.guild_id);
    const channel = guild?.channels?.cache?.get(t.channel_id);
    if (!channel || (channel.type === ChannelType.GuildVoice && channel.members.size === 0)) {
      if (channel) await channel.delete().catch(() => {});
      await prisma.temp_voice.delete({
        where: { channel_id: t.channel_id }
      }).catch(() => {});
    }
  }
}

export { handleVoiceUpdate, cleanup, controlRow, controlRows }
