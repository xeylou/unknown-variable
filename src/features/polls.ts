import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type Client, type User, type GuildTextBasedChannel
} from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import config from '../config';

const log = createLogger('polls');

/**
 * Sondages persistants (durée > 24 h, multi-choix, anonymes optionnels).
 */

const MAX_TIMEOUT = 2_147_483_647;
const scheduled = new Map<string, NodeJS.Timeout>();
let clientRef: Client<true> | null = null;

/** Subset minimal pour schedule() — n'a besoin que de message_id et ends_at. */
type SchedulablePoll = { message_id: string; ends_at: number };

/** Subset pour buildEmbed (accepte aussi les rows DB ou des objets construits). */
type EmbedPoll = {
  question: string;
  options: string;          // JSON
  ends_at: number;
  host_id?: string;
  multi_choice: number;
  anonymous: number;
  ended?: number;
};

export type TallyEntry = { option_idx: number; count: number };

/** Au démarrage : reprogramme les sondages en cours. */
export async function init(client: Client<true>): Promise<void> {
  clientRef = client;
  const rows = await prisma.polls.findMany({ where: { ended: 0 } });
  for (const r of rows) schedule(r);
  if (rows.length) log.info(`${rows.length} sondage(s) en cours rechargé(s)`);
}

function schedule(p: SchedulablePoll): void {
  const delay = p.ends_at - Date.now();
  if (delay <= 0) { endPoll(p.message_id); return; }
  const t = setTimeout(() => endPoll(p.message_id), Math.min(delay, MAX_TIMEOUT));
  t.unref();
  scheduled.set(p.message_id, t);
}

/** Crée le sondage : insert DB + envoi du message avec boutons. */
export async function createPoll({
  channel, host, question, options, durationMs, multiChoice, anonymous
}: {
  channel: GuildTextBasedChannel; host: User; question: string; options: string[];
  durationMs: number; multiChoice: boolean; anonymous: boolean;
}) {
  const endsAt = Date.now() + durationMs;
  const message = await channel.send({
    embeds: [buildEmbed({
      question, options: JSON.stringify(options), ends_at: endsAt, host_id: host.id,
      anonymous: anonymous ? 1 : 0, multi_choice: multiChoice ? 1 : 0
    }, [])],
    components: buildRows(options.length, false),
    allowedMentions: { parse: [] }
  });
  await prisma.polls.create({
    data: {
      message_id: message.id,
      guild_id: channel.guild.id,
      channel_id: channel.id,
      host_id: host.id,
      question,
      options: JSON.stringify(options),
      multi_choice: multiChoice ? 1 : 0,
      anonymous: anonymous ? 1 : 0,
      ends_at: endsAt,
      created_at: Date.now()
    }
  });
  schedule({ message_id: message.id, ends_at: endsAt });
  return message;
}

/** Reconstruit l'embed avec barres de progression à partir des votes. */
export function buildEmbed(p: EmbedPoll, votes: TallyEntry[]): EmbedBuilder {
  const opts: string[] = JSON.parse(p.options);
  const total = votes.reduce((n, v) => n + v.count, 0);
  const counts = opts.map((_, i) => votes.find((v) => v.option_idx === i)?.count ?? 0);

  const lines = opts.map((opt, i) => {
    const c = counts[i];
    const pct = total > 0 ? (c / total) * 100 : 0;
    const barLen = 20;
    const filled = Math.round((pct / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    return `**${i + 1}.** ${opt}\n\`${bar}\` ${c} (${pct.toFixed(1)} %)`;
  });

  const embed = new EmbedBuilder()
    .setColor(p.ended ? config.colors.neutral : config.colors.primary)
    .setTitle('📊  ' + p.question)
    .setDescription(lines.join('\n\n'))
    .addFields(
      { name: 'Type', value: p.multi_choice ? 'Multi-choix' : 'Choix unique', inline: true },
      { name: 'Anonyme', value: p.anonymous ? 'Oui' : 'Non', inline: true },
      { name: p.ended ? 'Terminé' : 'Fin', value: `<t:${Math.floor(p.ends_at / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: `Hôte : ${p.host_id ? p.host_id : '—'} · ${total} vote(s)` });
  return embed;
}

/** Construit les lignes de boutons (5 par ligne, max 5 lignes = 25 options). */
export function buildRows(optionCount: number, disabled: boolean): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let current: ActionRowBuilder<ButtonBuilder> | null = null;
  for (let i = 0; i < optionCount; i++) {
    if (i % 5 === 0) {
      current = new ActionRowBuilder<ButtonBuilder>();
      rows.push(current);
    }
    current!.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:vote:${i}`)
        .setLabel(String(i + 1))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
  }
  return rows;
}

/** Récupère les comptes par option (Group By manuel). */
export async function tallyVotes(messageId: string): Promise<TallyEntry[]> {
  const rows = await prisma.poll_votes.groupBy({
    by: ['option_idx'],
    where: { message_id: messageId },
    _count: { option_idx: true }
  });
  return rows.map((r) => ({ option_idx: r.option_idx, count: r._count.option_idx }));
}

/**
 * Annule un sondage : déprogramme la fin, supprime le message et efface les
 * données (votes + sondage). Renvoie false si le sondage est introuvable.
 */
export async function cancelPoll(messageId: string): Promise<boolean> {
  const p = await prisma.polls.findUnique({ where: { message_id: messageId } });
  if (!p) return false;

  const t = scheduled.get(messageId);
  if (t) { clearTimeout(t); scheduled.delete(messageId); }

  const channel = clientRef ? await clientRef.channels.fetch(p.channel_id).catch(() => null) : null;
  if (channel?.isTextBased() && 'messages' in channel) {
    await channel.messages.delete(messageId).catch(() => {});
  }
  await prisma.poll_votes.deleteMany({ where: { message_id: messageId } });
  await prisma.polls.delete({ where: { message_id: messageId } }).catch(() => {});
  return true;
}

/** Sondage en cours le plus récent d'un serveur (pour `/poll annuler` sans id). */
export async function latestActivePoll(guildId: string): Promise<string | null> {
  const p = await prisma.polls.findFirst({
    where: { guild_id: guildId, ended: 0 },
    orderBy: { created_at: 'desc' }
  });
  return p?.message_id ?? null;
}

/** Termine un sondage : édite le message, annonce les résultats. */
export async function endPoll(messageId: string): Promise<void> {
  if (!clientRef) return;
  const p = await prisma.polls.findUnique({ where: { message_id: messageId } });
  if (!p || p.ended) return;
  if (p.ends_at - Date.now() > 1000) { schedule(p); return; }

  const channel = await clientRef.channels.fetch(p.channel_id).catch(() => null);
  if (!channel?.isTextBased() || !('messages' in channel) || !('send' in channel)) {
    await prisma.polls.update({ where: { message_id: messageId }, data: { ended: 1 } });
    return;
  }
  const msg = await channel.messages.fetch(messageId).catch(() => null);
  const tally = await tallyVotes(messageId);
  if (msg) {
    await msg.edit({
      embeds: [buildEmbed({ ...p, ended: 1 }, tally)],
      components: buildRows(JSON.parse(p.options).length, true)
    }).catch(() => {});
  }

  const opts: string[] = JSON.parse(p.options);
  const max = Math.max(0, ...tally.map((t) => t.count));
  const winners = max > 0 ? tally.filter((t) => t.count === max).map((t) => opts[t.option_idx]) : [];
  await channel.send({
    content: '📊 Sondage terminé : **' + p.question + '**\n' +
             (winners.length ? `Gagnant${winners.length > 1 ? 's' : ''} : ${winners.map((w) => `**${w}**`).join(', ')} (${max} voix)` : 'Aucun vote.'),
    allowedMentions: { parse: [] }
  }).catch(() => {});

  await prisma.polls.update({ where: { message_id: messageId }, data: { ended: 1 } });
}
