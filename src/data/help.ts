/**
 * Contenu de la commande /help — source unique de vérité.
 * Édite ce fichier pour mettre l'aide à jour quand tu ajoutes une commande.
 */

import type { Tier } from '../utils/permissions';

export interface HelpCommand {
  /** Signature affichée, ex. « /ban <membre> [raison] ». */
  usage: string;
  /** Ce que fait la commande et quoi en faire concrètement. */
  description: string;
  /**
   * Niveau d'autorisation requis. Non défini = `public` (visible par tous).
   * Si absent, hérite de `HelpCategory.defaultTier`.
   */
  tier?: Tier;
}

export interface HelpCategory {
  /** Identifiant court, utilisé comme valeur dans le menu déroulant. */
  id: string;
  emoji: string;
  label: string;
  /** Résumé d'une ligne du module, affiché dans la vue d'ensemble. */
  summary: string;
  /** Conseil de mise en route, affiché en pied de page du détail. */
  tip?: string;
  /** Tier appliqué aux commandes qui ne fixent pas explicitement le leur. */
  defaultTier?: Tier;
  commands: HelpCommand[];
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'tickets',
    emoji: '🎫',
    label: 'Tickets',
    summary: "Salons d'assistance privés ouverts depuis un panneau.",
    tip: 'Dans un ticket : bouton « Prendre en charge » (staff) et « Fermer » (génère un transcript).',
    defaultTier: 'staff',
    commands: [
      { usage: '/setup-tickets', description: 'Déploie le panneau de tickets dans le salon courant. À faire **une seule fois** (réservé aux admins).', tier: 'admin' },
      { usage: '/add-user <utilisateur>', description: 'Ajoute un membre au ticket dans lequel tu te trouves.', tier: 'ticket-staff' },
      { usage: '/remove-user <utilisateur>', description: 'Retire un membre du ticket courant.', tier: 'ticket-staff' },
      { usage: '/ticket move <categorie>', description: 'Change la catégorie du ticket courant.', tier: 'ticket-staff' },
      { usage: '/ticket-stats', description: 'Affiche les statistiques globales : ouverts, fermés, note moyenne.' },
      { usage: '/tickets-ouverts [categorie] [membre] [pris-en-charge]', description: 'Liste les tickets ouverts groupés par catégorie. Un ticket-staff ne voit que les catégories qu\'il modère.', tier: 'ticket-staff' },
      { usage: '/ticket-reviews [membre] [categorie] [rating-min]', description: 'Affiche les avis et commentaires laissés par les auteurs à la fermeture (note 1-5 + texte libre). Paginé.' }
    ]
  },
  {
    id: 'moderation',
    emoji: '🛡️',
    label: 'Modération',
    summary: 'Sanctions, casier et nettoyage des messages.',
    tip: 'Les durées s\'écrivent : 10m, 2h, 1d. Chaque sanction est enregistrée dans le casier.',
    defaultTier: 'staff',
    commands: [
      { usage: '/warn <membre> [raison]', description: 'Avertit un membre. L\'avertissement est ajouté à son casier.' },
      { usage: '/unwarn <id>', description: 'Retire un avertissement du casier (le numéro est visible avec /casier).' },
      { usage: '/kick <membre> [raison]', description: 'Expulse un membre du serveur.' },
      { usage: '/ban <membre> [raison] [purge-jours]', description: 'Bannit un membre. « purge-jours » supprime ses messages des 0 à 7 derniers jours.' },
      { usage: '/softban <membre> [raison] [purge-jours]', description: 'Ban suivi d\'un unban immédiat — purge les messages sans bannir durablement.' },
      { usage: '/unban <identifiant> [raison]', description: 'Débannit un utilisateur à partir de son ID Discord.' },
      { usage: '/timeout <membre> <durée> [raison]', description: 'Exclut temporairement un membre (réduction au silence). Maximum 28 jours.' },
      { usage: '/untimeout <membre> [raison]', description: 'Lève l\'exclusion temporaire d\'un membre.' },
      { usage: '/casier <membre>', description: 'Affiche l\'historique complet des sanctions d\'un membre.' },
      { usage: '/casier-search [moderateur] [type] [mot-cle]', description: 'Recherche dans le casier global du serveur.' },
      { usage: '/note ajouter|liste|retirer', description: 'Notes privées staff sur un membre (invisible au membre).' },
      { usage: '/role temp <membre> <role> <duree>', description: 'Attribue un rôle pour une durée limitée. Retrait automatique.' },
      { usage: '/lockdown salon [salon] [duree] [raison]', description: 'Verrouille un salon (courant par défaut). Auto-restauration si durée fournie.' },
      { usage: '/lockdown serveur [duree] [raison] · /lockdown lift [salon] [serveur:true]', description: 'Lockdown global ou levée — sous-options réservées à l\'administration.', tier: 'admin' },
      { usage: '/clear <nombre> [membre]', description: 'Supprime en masse de 1 à 100 messages, éventuellement filtrés sur un membre.' }
    ]
  },
  {
    id: 'admin',
    emoji: '⚙️',
    label: 'Administration',
    summary: 'Configuration des modules (/config) et de la journalisation (/logs).',
    tip: 'Mise en route : /logs tout-dans salon:, /config reglement role:, puis /setup-reglement.',
    defaultTier: 'admin',
    commands: [
      { usage: '/permissions check|grant-staff|grant-admin', description: 'Vérifie et accorde les permissions Discord aux rôles STAFF_ROLE_ID / ADMIN_ROLE_ID pour qu\'ils voient les commandes dans Discord.' },
      { usage: '/config voir', description: 'Affiche la configuration actuelle du serveur.' },
      { usage: '/logs voir', description: 'Affiche la configuration de la journalisation par catégorie.' },
      { usage: '/logs salon <categorie> <salon>', description: "Définit le salon d'une catégorie de logs (messages, membres, rôles, vocal…)." },
      { usage: '/logs toggle <categorie> <actif>', description: 'Active ou désactive une catégorie de logs.' },
      { usage: '/logs tout-dans <salon>', description: 'Envoie toutes les catégories de logs dans un seul salon.' },
      { usage: '/config automod <actif> [phishing] [token-leak] [zalgo]', description: 'Active l\'auto-modération et ses sous-modules (phishing, tokens Discord leaked, Zalgo).' },
      { usage: '/config mot-ajouter <mot> · /config mot-retirer <mot> · /config automod-spam', description: 'Mots interdits et seuil anti-spam de l\'auto-modération.' },
      { usage: '/config invite-whitelist add|remove|list', description: 'Liste blanche des invitations Discord (serveurs alliés autorisés).' },
      { usage: '/config antiraid <actif> [age-min-compte] [expulser-jeunes] [verrouillage-auto] [quarantaine]', description: 'Anti-raid avec actions automatiques (kick / niveau vérification / quarantaine).' },
      { usage: '/config captcha <actif> [role-non-verifie] [role-verifie]', description: 'Vérification anti-robot visuelle à l\'entrée (image à recopier, affichée en éphémère). Déploie le bouton avec /setup-captcha.' },
      { usage: '/config accueil [message] [carte-image] [image-fond]', description: 'Message de bienvenue envoyé en DM à l\'obtention du rôle règlement, carte image optionnelle. Variables : {user} {username} {server} {count}.' },
      { usage: '/config depart <salon> [message]', description: 'Salon et message d\'au revoir. Variables : {username} {server} {count}.' },
      { usage: '/config autorole <role>', description: 'Rôle attribué automatiquement à chaque nouvelle arrivée.' },
      { usage: '/config reglement <role>', description: 'Rôle donné lorsqu\'un membre accepte le règlement.' },
      { usage: '/config suggestions <salon>', description: 'Salon où sont publiées les suggestions.' },
      { usage: '/config vocaux-temp <salon> [categorie]', description: 'Salon vocal « rejoindre pour créer » un vocal temporaire.' },
      { usage: '/config minecraft <ip> [salon-statut]', description: 'Serveur Minecraft suivi et salon de statut mis à jour automatiquement.' },
      { usage: '/config minecraft-rcon <host> [port] <mot-de-passe> [role-en-jeu]', description: 'Connexion RCON pour /mcwhitelist et le rôle attribué aux joueurs connectés.' },
      { usage: '/backup export · /backup import', description: 'Sauvegarde / restauration de la configuration du serveur (admins).' }
    ]
  },
  {
    id: 'stats',
    emoji: '📊',
    label: 'Salons statistiques',
    summary: 'Compteurs de membres affichés dans des salons vocaux verrouillés.',
    tip: 'Discord limite les renommages : un compteur se met à jour au mieux toutes les ~6 min.',
    defaultTier: 'admin',
    commands: [
      { usage: '/stats creer <nom> <role> [etiquette]', description: 'Crée la catégorie statistique (en haut du serveur) avec un premier compteur.' },
      { usage: '/stats ajouter <role> [etiquette]', description: 'Ajoute un compteur de rôle à la catégorie existante.' },
      { usage: '/stats retirer <role>', description: 'Retire un compteur de rôle et son salon.' },
      { usage: '/stats liste', description: 'Liste les compteurs configurés.' },
      { usage: '/stats supprimer', description: 'Supprime la catégorie statistique et tous ses compteurs.' }
    ]
  },
  {
    id: 'community',
    emoji: '👋',
    label: 'Communauté',
    summary: 'Règlement, rôles auto-attribuables et suggestions.',
    tip: 'Le rôle donné par le règlement se configure avec /config reglement.',
    commands: [
      { usage: '/setup-reglement', description: 'Déploie le règlement officiel avec un bouton d\'acceptation qui donne le rôle d\'accès (admins).', tier: 'admin' },
      { usage: '/setup-captcha', description: 'Déploie le bouton de vérification anti-robot ; le défi s\'affiche en éphémère (visible du seul membre). Configure d\'abord /config captcha (admins).', tier: 'admin' },
      { usage: '/setup-roles <role1> [titre] [description] [role2…role5]', description: 'Déploie un panneau de rôles que les membres s\'attribuent par boutons.', tier: 'admin' },
      { usage: '/setup-reaction-roles <titre> <description> <paires> [exclusif]', description: 'Panneau emoji → rôle (style classique avec réactions).', tier: 'admin' },
      { usage: '/suggestion <proposition> [categorie]', description: 'Propose une idée. Cooldown 10 min, thread auto, vote 👍 / 👎 puis validation staff.' }
    ]
  },
  {
    id: 'engagement',
    emoji: '🎉',
    label: 'Engagement',
    summary: 'Giveaways et sondages.',
    tip: 'L\'ID d\'un message s\'obtient par clic droit → Copier l\'identifiant (mode développeur activé).',
    commands: [
      { usage: '/giveaway lancer <lot> <duree> [gagnants] [age-min] [role-requis] [role-bonus] [multiplicateur]', description: 'Lance un giveaway avec conditions d\'entrée et multiplicateur de chances.', tier: 'admin' },
      { usage: '/giveaway pause|reprendre|edit|liste|info|terminer|relancer', description: 'Gestion fine des giveaways en cours.', tier: 'admin' },
      { usage: '/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]', description: 'Crée un sondage avec vote natif Discord (24 h par défaut).', tier: 'staff' },
      { usage: '/poll <question> <options|sep par |> <duree> [multi-choix] [anonyme]', description: 'Sondage persistant (durée libre jusqu\'à plusieurs semaines, anonyme optionnel).', tier: 'staff' }
    ]
  },
  {
    id: 'music',
    emoji: '🎵',
    label: 'Musique',
    summary: 'Lecture de musique YouTube en salon vocal (nécessite un serveur Lavalink).',
    tip: 'Le module musique exige un serveur Lavalink — voir le fichier LAVALINK.md.',
    commands: [
      { usage: '/play <recherche>', description: 'Joue un titre ou une playlist YouTube (lien ou mots-clés), ou l\'ajoute à la file.' },
      { usage: '/recherche <termes>', description: 'Recherche YouTube et propose une liste de titres à choisir.' },
      { usage: '/pause · /resume', description: 'Met en pause ou reprend la lecture.' },
      { usage: '/skip · /stop', description: 'Passe au titre suivant, ou arrête tout et quitte le salon.' },
      { usage: '/queue · /nowplaying', description: "Affiche la file d'attente, ou le titre en cours avec ses boutons." },
      { usage: '/volume <0-150>', description: 'Règle le volume de lecture.' },
      { usage: '/loop <mode>', description: 'Boucle : désactivée, titre actuel, ou file entière.' },
      { usage: '/shuffle', description: "Mélange l'ordre de la file d'attente." },
      { usage: '/jump <position>', description: 'Saute directement à un titre de la file.' },
      { usage: '/seek <secondes>', description: 'Se déplace à un instant précis du titre en cours.' },
      { usage: '/remove <position> · /clearqueue', description: "Retire un titre de la file, ou vide toute la file d'attente." },
      { usage: '/filter <preset>', description: 'Filtre audio : bass boost, nightcore, vaporwave, 8D, karaoké.' },
      { usage: '/lyrics', description: 'Affiche les paroles du titre en cours (si le serveur Lavalink le permet).' }
    ]
  },
  {
    id: 'utility',
    emoji: '🧰',
    label: 'Utilitaires',
    summary: 'Informations, latence et rappels — réservés au staff.',
    defaultTier: 'staff',
    commands: [
      { usage: '/userinfo [membre]', description: 'Affiche les informations d\'un membre (toi par défaut).' },
      { usage: '/serverinfo', description: 'Affiche les informations du serveur.' },
      { usage: '/avatar [membre]', description: 'Affiche l\'avatar d\'un membre en grand.' },
      { usage: '/ping', description: 'Affiche la latence du bot.' },
      { usage: '/botinfo', description: 'Affiche les statistiques du bot (disponibilité, serveurs, latence).' },
      { usage: '/embed <salon> [role1…3]', description: 'Compose un embed personnalisé (formulaire) et l\'envoie dans un salon, avec mention de rôles.' },
      { usage: '/rappel set|liste|supprimer', description: 'Rappels personnels ponctuels. « delai » s\'écrit 10m, 2h, 1d.' },
      { usage: '/rappel-rec set|liste|supprimer', description: 'Rappels récurrents (quotidiens, hebdomadaires, mensuels).' },
      { usage: '/rappel-role <role> <message> [frequence] [delai]', description: 'Rappel pour un rôle entier — ponctuel ou récurrent.', tier: 'admin' },
      { usage: '/tag show|liste|ajouter|editer|retirer', description: 'Réponses pré-écrites (FAQ) gérées par le staff.' },
      { usage: '/afk [raison]', description: 'Te marque comme AFK — le bot répond aux pings.' },
      { usage: '/help', description: 'Affiche cette aide et explique l\'usage de chaque commande.', tier: 'ticket-staff' }
    ]
  },
  {
    id: 'integrations',
    emoji: '⛏️',
    label: 'Minecraft & intégrations',
    summary: 'Statut serveur Minecraft et notifications YouTube / Twitch / RSS (Instagram, TikTok, X…) — réservé au staff/admin.',
    tip: 'L\'ID d\'une chaîne YouTube commence par UC… (Paramètres avancés YouTube). Pour Instagram/TikTok/X, utilise un flux RSSHub.',
    defaultTier: 'admin',
    commands: [
      { usage: '/mcstatus [ip]', description: 'Affiche le statut d\'un serveur Minecraft (par défaut celui configuré).', tier: 'staff' },
      { usage: '/mclink demande|statut|delier', description: 'Lie ton compte Discord à ton pseudo Minecraft. Validation par connexion au serveur.', tier: 'staff' },
      { usage: '/mcsuivi ajouter <ip> <salon> <role> [intervalle]', description: 'Crée un panneau de statut rafraîchi en continu et mentionne un rôle à chaque passage en ligne ↔ hors ligne.' },
      { usage: '/mcsuivi liste · /mcsuivi supprimer <id>', description: 'Liste ou supprime les suivis Minecraft automatiques.' },
      { usage: '/mcwhitelist add|remove|list', description: 'Whitelist Minecraft via RCON. Nécessite /config minecraft-rcon.' },
      { usage: '/notif ajouter-youtube <identifiant-chaine> <salon> [nom] [role]', description: 'Suit une chaîne YouTube et annonce ses nouvelles vidéos. Option [role] pour pinger à chaque annonce.' },
      { usage: '/notif ajouter-twitch <pseudo> <salon> [role]', description: 'Suit un streamer Twitch et annonce ses lives. Option [role] pour pinger.' },
      { usage: '/notif ajouter-rss <url> <salon> [nom] [role]', description: 'Suit un flux RSS / Atom : Instagram, TikTok, X (via RSSHub), Reddit, blogs, podcasts… Annonce chaque nouvelle publication.' },
      { usage: '/notif liste', description: 'Liste les notifications configurées et leur ID.' },
      { usage: '/notif supprimer <id>', description: 'Supprime une notification (ID visible avec /notif liste).' }
    ]
  },
  {
    id: 'github',
    emoji: '🐙',
    label: 'Git / GitHub',
    summary: 'Suivi d\'activité de dépôts GitHub : commits, PR/merges, CI/CD, releases…',
    tip: 'Mode hybride : webhooks (temps réel) si GITHUB_WEBHOOK_SECRET, sinon polling via GITHUB_TOKEN.',
    defaultTier: 'admin',
    commands: [
      { usage: '/git suivre <depot> <salon> [branches] [role] [salon-statut] [events]', description: 'Suit un dépôt et annonce son activité. `role` pingué sur échec CI, `salon-statut` pour un message « pipeline » live.' },
      { usage: '/git liste · /git retirer <id> · /git config <id> [..]', description: 'Liste, retire ou reconfigure un dépôt suivi (salon, rôle, branches, events).' },
      { usage: '/git statut <depot>', description: 'État instantané d\'un dépôt : dernier commit, PR ouvertes, dernière CI (nécessite un token).' },
      { usage: '/git lier-membre <membre> <pseudo-github>', description: 'Lie un membre Discord à un pseudo GitHub (mention auto dans les annonces).' },
      { usage: '/git digest <salon> [frequence] [heure] · /git digest-off', description: 'Active/désactive un récap périodique (commits, PR mergées, releases, CI).' },
      { usage: '/gitlink lier|statut|delier', description: 'Chaque membre déclare son pseudo GitHub pour être mentionné sur ses commits / PR.', tier: 'staff' }
    ]
  }
];

/** Retrouve une catégorie par son identifiant. */
export function findCategory(id: string): HelpCategory | undefined {
  return helpCategories.find((c) => c.id === id);
}

/** Tier effectif d'une commande (override > defaultTier de la catégorie > 'public'). */
export function effectiveTier(cmd: HelpCommand, category: HelpCategory): Tier {
  return cmd.tier ?? category.defaultTier ?? 'public';
}
