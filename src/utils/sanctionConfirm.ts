import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  type ChatInputCommandInteraction, type User
} from 'discord.js';
import { LABELS, ICONS, COLORS, type SanctionType } from './moderation';

/** Fenêtre pendant laquelle le staff peut confirmer une sanction (2 min). */
const CONFIRM_TTL_MS = 2 * 60_000;

/** Action de sanction en attente de confirmation, gardée en mémoire. */
interface PendingSanction {
  /** Exécute la sanction et renvoie le message de résultat public à afficher. */
  run: () => Promise<string>;
  expiresAt: number;
}

/**
 * Sanctions en attente de confirmation, clé = id du modérateur. Une nouvelle
 * demande écrase la précédente (un modérateur ne confirme qu'une action à la
 * fois). Volatil : une demande non confirmée est perdue au redémarrage — sans
 * conséquence, la sanction n'ayant pas encore été appliquée.
 */
const pending = new Map<string, PendingSanction>();

/** Récupère ET retire la sanction en attente d'un modérateur (one-shot). */
export function takePending(moderatorId: string): PendingSanction | null {
  const p = pending.get(moderatorId);
  if (!p) return null;
  pending.delete(moderatorId);
  if (Date.now() > p.expiresAt) return null;
  return p;
}

/** Annule la sanction en attente d'un modérateur. */
export function clearPending(moderatorId: string): void {
  pending.delete(moderatorId);
}

export interface SanctionRecap {
  type: SanctionType;
  /** Cible de la sanction — sa photo de profil est affichée en vignette. */
  target: User;
  reason: string | null;
  durationText?: string | null;
  /** Champs additionnels (ex. nombre de jours de messages purgés). */
  extraFields?: { name: string; value: string }[];
}

/** Construit l'embed récapitulatif, photo de profil de la cible en vignette. */
function buildRecapEmbed(recap: SanctionRecap): EmbedBuilder {
  const { type, target, reason, durationText, extraFields } = recap;
  const embed = new EmbedBuilder()
    .setColor(COLORS[type])
    .setTitle(`${ICONS[type]} Confirmer — ${LABELS[type]}`)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Membre', value: `${target} (\`${target.tag}\` · \`${target.id}\`)` },
      { name: 'Raison', value: reason && reason.trim() ? reason : '*Non précisée*' }
    )
    .setFooter({ text: 'Vérifie puis confirme — la demande expire après 2 min.' })
    .setTimestamp();
  if (durationText) embed.addFields({ name: 'Durée', value: durationText });
  if (extraFields?.length) embed.addFields(...extraFields);
  return embed;
}

/**
 * Affiche au staff un récapitulatif éphémère de la sanction (avec la photo de
 * profil de la personne visée) et deux boutons Confirmer / Annuler. La sanction
 * n'est PAS appliquée ici : `run` est mis en attente et exécuté par le composant
 * `sanctionconfirm` au clic sur « Confirmer ».
 *
 * `run` doit réaliser l'action (ban/kick/warn…) et renvoyer le message de
 * résultat public à afficher une fois la sanction appliquée.
 */
export async function confirmSanction(
  interaction: ChatInputCommandInteraction<'cached'>,
  recap: SanctionRecap,
  run: () => Promise<string>
): Promise<void> {
  pending.set(interaction.user.id, { run, expiresAt: Date.now() + CONFIRM_TTL_MS });
  // Purge de sécurité si le staff ne clique jamais (n'écrase pas une demande
  // plus récente : on ne supprime que si elle a réellement expiré).
  setTimeout(() => {
    const p = pending.get(interaction.user.id);
    if (p && Date.now() >= p.expiresAt) pending.delete(interaction.user.id);
  }, CONFIRM_TTL_MS + 1000).unref();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('sanctionconfirm:confirm')
      .setLabel('Confirmer').setEmoji('✅').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('sanctionconfirm:cancel')
      .setLabel('Annuler').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [buildRecapEmbed(recap)],
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}
