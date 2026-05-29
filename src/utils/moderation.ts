import { EmbedBuilder, type Guild, type User, type GuildMember } from 'discord.js';
import { sendLog } from '../features/logger';
import { addSanction, getSanctions } from './sanctions';
import { prisma } from '../database';
import { getConfig } from './configCache';
import config from '../config';

export type SanctionType = 'warn' | 'kick' | 'softban' | 'ban' | 'unban' | 'timeout' | 'untimeout';

const LABELS: Record<SanctionType, string> = {
  warn: 'Avertissement',
  kick: 'Expulsion',
  softban: 'Softban (purge)',
  ban: 'Bannissement',
  unban: 'Débannissement',
  timeout: 'Exclusion temporaire',
  untimeout: "Fin d'exclusion"
};

const ICONS: Record<SanctionType, string> = {
  warn: '⚠️',
  kick: '👢',
  softban: '🧹',
  ban: '🔨',
  unban: '♻️',
  timeout: '⏳',
  untimeout: '✅'
};

const COLORS: Record<SanctionType, number> = {
  warn:      config.colors.warning,
  kick:      config.colors.danger,
  softban:   config.colors.warning,
  ban:       config.colors.danger,
  unban:     config.colors.success,
  timeout:   config.colors.warning,
  untimeout: config.colors.success
};

/**
 * Construit la section « Conséquences » de l'embed DM en fonction du type
 * de sanction. C'est ce que voit le membre — on essaie d'être clair pour
 * éviter les retours du type « pourquoi je peux plus écrire ? ».
 */
export function consequencesText(type: SanctionType, durationText: string | null): string {
  switch (type) {
    case 'warn':
      return '• Cet avertissement est conservé dans ton casier.\n' +
             '• Plusieurs avertissements peuvent entraîner une sanction plus lourde (timeout, kick, ban).';
    case 'kick':
      return '• Tu as été expulsé du serveur.\n' +
             '• Tu peux le rejoindre à nouveau avec une nouvelle invitation.\n' +
             '• Une récidive peut entraîner un bannissement.';
    case 'softban':
      return '• Tes messages récents ont été supprimés en masse.\n' +
             '• Tu **n\'as pas été banni** — tu peux te reconnecter immédiatement, sans nouvelle invitation.\n' +
             '• Considère ça comme un avertissement appuyé : une récidive peut mener à un vrai ban.';
    case 'ban':
      return '• Tu as été banni du serveur — tu ne peux plus le rejoindre.\n' +
             '• Si tu penses qu\'il s\'agit d\'une erreur, contacte un administrateur (réseaux sociaux du serveur).';
    case 'unban':
      return '• Ton bannissement a été levé.\n' +
             '• Tu peux à nouveau rejoindre le serveur avec une invitation.';
    case 'timeout':
      return '• Tu ne peux plus envoyer de messages, parler en vocal ni ajouter de réactions.\n' +
             (durationText ? `• Ton exclusion expire dans **${durationText}**.\n` : '') +
             '• Une récidive peut entraîner un kick ou un ban.';
    case 'untimeout':
      return '• Ton exclusion temporaire a été levée — tu peux à nouveau écrire et parler.';
  }
}

interface DmSanctionContext {
  guild: Guild;
  type: SanctionType;
  reason: string | null;
  durationText?: string | null;
  moderator?: User | GuildMember | null;
  sanctionId?: number | null;
  /** Pour les warn : nombre total d'avertissements actifs du membre. */
  warnCount?: number | null;
}

/** Prévient le membre concerné en message privé (best effort, embed verbeux). */
async function dmSanctionRich(
  target: User | GuildMember,
  ctx: DmSanctionContext
): Promise<void> {
  const { guild, type, reason, durationText = null, moderator = null, sanctionId = null, warnCount = null } = ctx;

  // Lien d'invitation et règlement, optionnels (s'ils sont configurés on les
  // ajoute pour permettre au membre de revenir / relire les règles).
  const inviteUrl = await getConfig(guild.id, 'public_invite_url', null).catch(() => null);
  const rulesChannelId = await getConfig(guild.id, 'rules_channel_id', null).catch(() => null);

  const fields = [
    { name: 'Raison', value: reason && reason.trim() ? reason : '*Non précisée*' }
  ];
  if (durationText) {
    fields.push({ name: 'Durée', value: durationText });
  }
  if (type === 'warn' && typeof warnCount === 'number' && warnCount > 0) {
    fields.push({
      name: 'Casier',
      value: `**${warnCount}** avertissement(s) actif(s) à ton actif.`
    });
  }
  fields.push({ name: 'Conséquences', value: consequencesText(type, durationText) });

  const links: string[] = [];
  if (rulesChannelId)   links.push(`📜 [Règlement](https://discord.com/channels/${guild.id}/${rulesChannelId})`);
  if (inviteUrl && (type === 'kick' || type === 'softban' || type === 'unban')) {
    links.push(`🔗 [Invitation](${inviteUrl})`);
  }
  if (links.length) {
    fields.push({ name: 'Liens utiles', value: links.join(' · ') });
  }

  if (sanctionId) {
    fields.push({
      name: 'Référence',
      value: `\`#${sanctionId}\`${moderator ? ` — par ${moderator}` : ''}`
    });
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS[type])
    .setAuthor({
      name: `${guild.name}`,
      iconURL: guild.iconURL({ size: 128 }) ?? undefined
    })
    .setTitle(`${ICONS[type]} ${LABELS[type]}`)
    .addFields(fields)
    .setFooter({ text: 'Pour contester, contacte un administrateur du serveur.' })
    .setTimestamp();

  await target.send({ embeds: [embed] }).catch(() => {});
}

interface RecordSanctionInput {
  guild: Guild;
  target: User | GuildMember;
  moderator: User | GuildMember;
  type: SanctionType;
  reason?: string | null;
  expiresAt?: number | null;
  extra?: string | null;
}

/**
 * Construit l'embed envoyé dans le salon de logs. Centralise la mise en page
 * pour que `recordSanction` et `notifyAndRecord` produisent un log identique.
 */
function buildSanctionLogEmbed(
  id: number,
  input: Omit<RecordSanctionInput, 'guild' | 'expiresAt'>
): EmbedBuilder {
  const positive = input.type === 'unban' || input.type === 'untimeout';
  return new EmbedBuilder()
    .setColor(positive ? config.colors.success : config.colors.danger)
    .setAuthor({ name: `${LABELS[input.type]} (#${id})` })
    .setDescription(
      `**Membre :** ${input.target} (\`${input.target.id}\`)\n` +
      `**Modérateur :** ${input.moderator}\n` +
      `**Raison :** ${input.reason || 'Non précisée'}` +
      (input.extra ? `\n${input.extra}` : '')
    )
    .setTimestamp();
}

/**
 * Enregistre une sanction au casier et la journalise dans le salon de logs.
 * @returns l'id de la sanction.
 */
async function recordSanction({
  guild, target, moderator, type, reason = null, expiresAt = null, extra = null
}: RecordSanctionInput): Promise<number> {
  const id = await addSanction({
    guildId: guild.id, userId: target.id, moderatorId: moderator.id, type, reason, expiresAt
  });
  sendLog(guild, 'moderation', buildSanctionLogEmbed(id, { target, moderator, type, reason, extra }));
  return id;
}

/**
 * Helper haut-niveau : envoie un DM verbeux puis enregistre la sanction.
 * @returns l'id de la sanction (utile pour l'afficher dans la réponse de la commande).
 */
async function notifyAndRecord(
  input: RecordSanctionInput & { durationText?: string | null }
): Promise<number> {
  // On enregistre d'abord pour pouvoir inclure l'ID dans le DM.
  const id = await addSanction({
    guildId: input.guild.id,
    userId: input.target.id,
    moderatorId: input.moderator.id,
    type: input.type,
    reason: input.reason ?? null,
    expiresAt: input.expiresAt ?? null
  });

  // Nombre d'avertissements actifs pour les warn — affiché en clair au membre.
  let warnCount: number | null = null;
  if (input.type === 'warn') {
    warnCount = await prisma.sanctions.count({
      where: { guild_id: input.guild.id, user_id: input.target.id, type: 'warn', active: 1 }
    }).catch(() => 0);
  }

  await dmSanctionRich(input.target, {
    guild: input.guild,
    type: input.type,
    reason: input.reason ?? null,
    durationText: input.durationText ?? null,
    moderator: input.moderator,
    sanctionId: id,
    warnCount
  });

  sendLog(input.guild, 'moderation', buildSanctionLogEmbed(id, input));
  return id;
}

export { LABELS, dmSanctionRich, recordSanction, notifyAndRecord, getSanctions }
