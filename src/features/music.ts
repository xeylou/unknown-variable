import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  type Client, type Guild,
  type ChatInputCommandInteraction, type ButtonInteraction, type GuildMember
} from 'discord.js';
import {
  LavalinkManager,
  type Player, type Track, type SearchResult, type UnresolvedTrack, type UnresolvedSearchResult
} from 'lavalink-client';
import type { StringSelectMenuInteraction } from 'discord.js';
import { createLogger } from '../utils/logger';
import * as embeds from '../utils/embeds';
import config from '../config';

const log = createLogger('music');

/**
 * Interaction acceptée par les helpers musique : commande slash ou bouton, en
 * cache de guilde. Restreint à ce qui est nécessaire pour replier / accéder
 * au membre — évite un `any` qui obscurcissait les call-sites.
 */
type MusicInteraction = (ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>);

/** Lavalink renvoie soit des `Track` résolues, soit des `UnresolvedTrack`. */
type AnyTrack = Track | UnresolvedTrack;

/**
 * Module musique — s'appuie sur un serveur Lavalink (voir docs/LAVALINK.md).
 * Si `LAVALINK_PASSWORD` n'est pas défini, le module reste désactivé :
 * `manager` vaut null et les commandes répondent poliment.
 */

export let manager: LavalinkManager | null = null;

/** Volume appliqué automatiquement à chaque fois que le bot rejoint un salon vocal. */
export const DEFAULT_VOLUME = 100;
/** Volume maximum autorisé. */
export const MAX_VOLUME = 150;
/** Pas d'incrément/décrément des boutons de volume. */
export const VOLUME_STEP = 10;

/** Vrai si le module musique est configuré et prêt à être utilisé. */
export function isEnabled() {
  return manager !== null;
}

/** Formate une durée (ms) en `m:ss` ou `h:mm:ss`. */
export function formatDuration(ms: number) {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Ligne descriptive d'un titre (lien Markdown + durée). */
export function trackLine(track: AnyTrack) {
  const info = track?.info;
  const live = info?.isStream;
  const dur = live ? 'LIVE' : formatDuration(info?.duration ?? 0);
  const title = info?.title ?? 'Titre inconnu';
  return info?.uri ? `[${title}](${info.uri}) \`${dur}\`` : `${title} \`${dur}\``;
}

/** ID du membre ayant demandé une piste, si on peut le récupérer. */
function requesterId(track: AnyTrack): string | null {
  const r = track.requester as { id?: string } | undefined;
  return r?.id ?? null;
}

/** Embed « lecture en cours » avec barre de progression. */
export function nowPlayingEmbed(player: Player) {
  const embed = embeds.primary().setTitle('🎶 Lecture en cours');
  const track = player?.queue?.current as Track | undefined;
  if (!track) return embed.setDescription("File d'attente vide.");

  const dur = track.info.duration;
  let progress: string;
  if (track.info.isStream || !dur) {
    progress = '🔴 Diffusion en direct';
  } else {
    const size = 18;
    const filled = Math.min(size, Math.max(0, Math.round((player.position / dur) * size)));
    progress = '▬'.repeat(filled) + '🔘' + '▬'.repeat(size - filled) +
      `\n\`${formatDuration(player.position)} / ${formatDuration(dur)}\``;
  }

  const loop = player.repeatMode === 'track' ? '🔂 Titre'
    : player.repeatMode === 'queue' ? '🔁 File' : '➡️ Désactivée';

  const rid = requesterId(track);
  embed
    .setDescription(`**[${track.info.title}](${track.info.uri})**\npar \`${track.info.author}\`\n\n${progress}`)
    .addFields(
      { name: 'Demandé par', value: rid ? `<@${rid}>` : '—', inline: true },
      { name: 'Volume', value: `${player.volume}%`, inline: true },
      { name: 'Boucle', value: loop, inline: true }
    );
  if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
  if (player.queue.tracks.length) {
    embed.setFooter({ text: `${player.queue.tracks.length} titre(s) en attente` });
  }
  return embed;
}

/** Embed de la file d'attente. */
export function queueEmbed(player: Player) {
  const embed = embeds.primary().setTitle("📜 File d'attente");
  const current = player?.queue?.current as Track | undefined;
  const tracks = (player?.queue?.tracks ?? []) as AnyTrack[];

  let desc = current ? `**▶️ En cours**\n${trackLine(current)}\n\n` : '';
  if (!tracks.length) {
    desc += '*Aucun titre en attente.*';
  } else {
    desc += '**À suivre**\n' + tracks.slice(0, 10)
      .map((t, i) => `\`${i + 1}.\` ${trackLine(t)}`).join('\n');
    if (tracks.length > 10) desc += `\n*… et ${tracks.length - 10} autre(s).*`;
  }
  embed.setDescription(desc);
  embed.setFooter({
    text: `${tracks.length} en attente · durée totale ${formatDuration(player.queue.utils.totalDuration())}`
  });
  return embed;
}

/** Rangées de boutons de contrôle affichées sous le panneau de lecture. */
export function controlButtons(player?: Player) {
  const transport = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('music:pause')
      .setEmoji(player?.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music:loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:queue').setEmoji('📜').setStyle(ButtonStyle.Secondary)
  );
  const volume = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('music:voldown')
      .setEmoji('🔉').setLabel(`−${VOLUME_STEP} %`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music:volup')
      .setEmoji('🔊').setLabel(`+${VOLUME_STEP} %`).setStyle(ButtonStyle.Secondary)
  );
  return [transport, volume];
}

/**
 * Récupère le lecteur actif pour une interaction, en répondant par une erreur
 * éphémère si la musique est indisponible / rien ne joue / mauvais salon vocal.
 */
export async function getActivePlayer(
  interaction: MusicInteraction,
  requireSameVoice = true
): Promise<Player | null> {
  const player = manager?.getPlayer(interaction.guildId) ?? null;
  if (!player || !player.queue.current) {
    await interaction.reply({ content: "❌ Rien n'est en cours de lecture.", flags: MessageFlags.Ephemeral });
    return null;
  }
  if (requireSameVoice) {
    const member = interaction.member as GuildMember | null;
    const userVc = member?.voice?.channelId;
    if (!userVc || userVc !== player.voiceChannelId) {
      await interaction.reply({
        content: '❌ Vous devez être dans le même salon vocal que le bot.',
        flags: MessageFlags.Ephemeral
      });
      return null;
    }
  }
  return player;
}

/** Recherche des titres sans lancer la lecture (utilisé par /recherche). */
export async function searchTracks(
  interaction: MusicInteraction,
  query: string,
  voiceChannelId: string
): Promise<AnyTrack[]> {
  if (!manager) return [];
  const player = manager.getPlayer(interaction.guildId) ?? manager.createPlayer({
    guildId: interaction.guildId,
    voiceChannelId,
    textChannelId: interaction.channelId,
    selfDeaf: true,
    volume: DEFAULT_VOLUME
  });
  const res = await player.search({ query }, interaction.user);
  return (res?.tracks ?? []) as AnyTrack[];
}

/**
 * Interactions acceptées par playQuery : la slash-command `/play` et le
 * menu déroulant `/recherche` qui repasse l'URL choisie ici.
 */
type PlayInteraction = ChatInputCommandInteraction<'cached'> | StringSelectMenuInteraction<'cached'>;

/**
 * Cherche `query`, ajoute le résultat à la file et lance la lecture si besoin.
 * L'interaction doit déjà avoir été différée (`deferReply`).
 */
export async function playQuery(
  interaction: PlayInteraction,
  query: string,
  voiceChannelId: string
) {
  if (!manager) return interaction.editReply("⚠️ Le module musique n'est pas configuré.");

  // Services non pris en charge (seuls YouTube et SoundCloud sont configurés)
  if (/open\.spotify\.com|music\.apple\.com|deezer\.com|tidal\.com|music\.amazon\./i.test(query)) {
    return interaction.editReply(
      "❌ Ce service n'est pas pris en charge. Utiliser une recherche par mots-clés, " +
      'ou un lien **YouTube** / **SoundCloud**.'
    );
  }

  // Vérifie les permissions du bot dans le salon vocal
  const vc = interaction.guild.channels.cache.get(voiceChannelId);
  const me = interaction.guild.members.me;
  if (vc && me && 'permissionsFor' in vc && !vc.permissionsFor(me)?.has(['Connect', 'Speak'])) {
    return interaction.editReply('❌ Il me manque la permission **Se connecter** ou **Parler** dans ce salon vocal.');
  }

  // Le bot est déjà occupé dans un autre salon vocal
  const existing = manager.getPlayer(interaction.guildId);
  if (existing && existing.voiceChannelId && existing.voiceChannelId !== voiceChannelId) {
    return interaction.editReply(`❌ Je suis déjà utilisé dans <#${existing.voiceChannelId}>. Rejoins ce salon.`);
  }

  // « Rejoindre un appel » = créer un lecteur, ou en réutiliser un resté
  // inactif (file vide). Dans ces deux cas, le volume revient au défaut.
  const freshJoin = !existing || (!existing.playing && !existing.queue.current);
  const player: Player = existing ?? manager.createPlayer({
    guildId: interaction.guildId,
    voiceChannelId,
    textChannelId: interaction.channelId,
    selfDeaf: true,
    volume: DEFAULT_VOLUME
  });
  if (!player.connected) await player.connect();
  if (freshJoin && player.volume !== DEFAULT_VOLUME) await player.setVolume(DEFAULT_VOLUME);

  // `search` peut renvoyer un `UnresolvedSearchResult` (titres en lazy-resolve)
  // selon la plateforme — on accepte les deux, les usages internes ne touchent
  // que `loadType`, `tracks` et `playlist`, présents dans les deux variantes.
  let res: SearchResult | UnresolvedSearchResult | undefined;
  try {
    res = await player.search({ query }, interaction.user);
  } catch {
    return interaction.editReply('❌ Recherche impossible — le serveur Lavalink est-il joignable ?');
  }
  if (!res || res.loadType === 'error' || res.loadType === 'empty' || !res.tracks?.length) {
    return interaction.editReply('❌ Aucun résultat pour cette recherche.');
  }

  const startNow = !player.playing && !player.paused;

  if (res.loadType === 'playlist') {
    player.queue.add(res.tracks);
    if (startNow) await player.play();
    return interaction.editReply({
      embeds: [embeds.success(
        `✅ Playlist **${res.playlist?.name ?? 'inconnue'}** ajoutée — **${res.tracks.length}** titres.`
      )]
    });
  }

  const track = res.tracks[0];
  player.queue.add(track);
  if (startNow) await player.play();
  return interaction.editReply({
    embeds: [embeds.success(
      (startNow ? '▶️ Lecture de ' : '✅ Ajouté à la file : ') + trackLine(track)
    )]
  });
}

/**
 * Met la lecture en pause si le bot se retrouve seul dans son salon vocal,
 * et la relance automatiquement dès qu'un membre revient.
 */
export async function handleAloneState(guild: Guild) {
  if (!manager) return;
  const player = manager.getPlayer(guild.id);
  if (!player || !player.voiceChannelId) return;

  const channel = guild.channels.cache.get(player.voiceChannelId);
  if (!channel || !('members' in channel)) return;
  // `channel.members` est `Collection<string, GuildMember>` pour un VoiceChannel.
  const members = channel.members as { filter: (fn: (m: GuildMember) => boolean) => { size: number } };
  const humans = members.filter((m) => !m.user?.bot).size;

  if (humans === 0 && player.playing && !player.paused) {
    await player.pause().catch(() => {});
    player.setData('autopaused', true);
  } else if (humans > 0 && player.paused && player.getData('autopaused')) {
    player.setData('autopaused', false);
    await player.resume().catch(() => {});
  }
}

/** Crée le manager Lavalink, branche les événements et se connecte. */
export function init(client: Client<true>) {
  if (!config.lavalink.password) {
    log.info('Module musique désactivé (LAVALINK_PASSWORD absent).');
    return;
  }

  manager = new LavalinkManager({
    nodes: [{
      host: config.lavalink.host,
      port: config.lavalink.port,
      authorization: config.lavalink.password,
      secure: config.lavalink.secure,
      id: 'main',
      retryAmount: 5,
      retryDelay: 10_000
    }],
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (!guild?.shard) {
        log.warn(`sendToShard: guilde ${guildId} introuvable — paquet vocal abandonné`);
        return;
      }
      guild.shard.send(payload);
    },
    client: { id: client.user.id, username: client.user.username },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: 'ytsearch',
      onEmptyQueue: { destroyAfterMs: 300_000 },
      onDisconnect: { autoReconnect: true, destroyPlayer: false }
    }
  });

  manager.nodeManager
    .on('connect', (node) => log.info(`Lavalink connecté (${node.id}).`))
    .on('error', (node, error) => log.error(`[${node.id}]`, error?.message ?? error))
    .on('disconnect', (node) => log.warn(`Lavalink déconnecté (${node.id}).`));

  manager
    .on('trackStart', (player) => {
      if (!player.textChannelId) return;
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel?.isTextBased() && 'send' in channel) {
        channel.send({
          embeds: [nowPlayingEmbed(player)],
          components: controlButtons(player),
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }
    })
    .on('queueEnd', (player) => {
      if (!player.textChannelId) return;
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel?.isTextBased() && 'send' in channel) {
        channel.send({
          content: "📭 File d'attente terminée — je quitte le salon si rien n'est ajouté.",
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }
    });

  manager.init({ id: client.user.id, username: client.user.username })
    .catch((e) => log.error('échec de l\'initialisation :', e?.message ?? e));
}
