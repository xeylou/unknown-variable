import { GuildVerificationLevel, type GuildMember } from 'discord.js';
import { getConfig, setConfig } from '../utils/configCache';
import { sendLog } from './logger';
import { createLogger } from '../utils/logger';
import * as embeds from '../utils/embeds';

const log = createLogger('antiraid');

// Suivi des arrivées récentes : guildId -> timestamps
const joinTracker = new Map<string, number[]>();
const RAID_WINDOW = 10_000; // fenêtre de 10 s
const RAID_LIMIT = 6;       // 6 arrivées dans la fenêtre = vague suspecte

// Évite de spammer les alertes : guildId -> timestamp de la dernière alerte
const lastAlert = new Map<string, number>();

/** Contrôle anti-raid à exécuter à chaque arrivée de membre. */
async function checkRaid(member: GuildMember): Promise<void> {
  if ((await getConfig(member.guild.id, 'antiraid_enabled', '0')) !== '1') return;
  const now = Date.now();

  // 1. Âge minimum du compte (peut quarantaine ou expulser selon config).
  //    Court-circuité si le CAPTCHA d'entrée est actif : il filtre déjà les bots
  //    à l'arrivée, donc bloquer les comptes récents devient redondant et
  //    pénalise inutilement de vrais nouveaux joueurs.
  const minDays = Number(await getConfig(member.guild.id, 'antiraid_min_age_days', '0'));
  const captchaOn = (await getConfig(member.guild.id, 'captcha_enabled', '0')) === '1';
  if (minDays > 0 && !captchaOn) {
    const ageDays = (now - member.user.createdTimestamp) / 86_400_000;
    if (ageDays < minDays) {
      const autoKick = (await getConfig(member.guild.id, 'antiraid_kick_young', '0')) === '1';
      const quarantineRoleId = await getConfig(member.guild.id, 'antiraid_quarantine_role');
      let action = '';
      if (quarantineRoleId) {
        await member.roles.add(quarantineRoleId, 'Anti-raid : compte récent').catch(() => {});
        action = '\n**Action :** placement en quarantaine.';
      } else if (autoKick && member.kickable) {
        action = '\n**Action :** expulsion automatique.';
      }
      sendLog(member.guild, 'moderation', embeds.danger()
        .setAuthor({ name: 'Anti-raid — compte récent' })
        .setDescription(
          `${member.user.tag} (\`${member.id}\`) — compte créé il y a **${ageDays.toFixed(1)} jour(s)** ` +
          `(minimum requis : ${minDays}).${action}`
        )
        .setTimestamp()).catch(() => {});
      if (!quarantineRoleId && autoKick && member.kickable) {
        await member.kick(`Anti-raid : compte créé il y a moins de ${minDays} jour(s)`).catch(() => {});
        return;
      }
    }
  }

  // 2. Détection d'une vague d'arrivées
  const stamps = (joinTracker.get(member.guild.id) || []).filter((t) => now - t < RAID_WINDOW);
  stamps.push(now);
  joinTracker.set(member.guild.id, stamps);

  if (stamps.length >= RAID_LIMIT && now - (lastAlert.get(member.guild.id) || 0) > 60_000) {
    lastAlert.set(member.guild.id, now);

    // Action automatique : relève le niveau de vérification si activée.
    const autoLockdown = (await getConfig(member.guild.id, 'antiraid_lockdown', '0')) === '1';
    let lockdownNote = '';
    if (autoLockdown) {
      const prev = member.guild.verificationLevel;
      if (prev < GuildVerificationLevel.High) {
        await setConfig(member.guild.id, 'antiraid_prev_verif', String(prev));
        await member.guild.setVerificationLevel(GuildVerificationLevel.High, 'Anti-raid : vague détectée')
          .catch((e) => log.warn('lockdown failed', e));
        lockdownNote = `\n**Action :** niveau de vérification relevé à **Élevé** ` +
                       '(restaurez-le manuellement via `/config antiraid relever`).';
      }
    }

    sendLog(member.guild, 'moderation', embeds.danger()
      .setAuthor({ name: "🚨 Anti-raid — vague d'arrivées détectée" })
      .setDescription(
        `**${stamps.length} arrivées en moins de ${RAID_WINDOW / 1000} s.**\n` +
        'Vérifier le serveur et penser à verrouiller les salons si nécessaire.' +
        lockdownNote
      )
      .setTimestamp()).catch(() => {});
  }
}

export { checkRaid }
