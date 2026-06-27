/**
 * Contenu de la commande /help — source unique de vérité.
 * Édite ce fichier pour mettre l'aide à jour quand tu ajoutes une commande.
 *
 * Chaque entrée possède un texte FR (champ de base, affiché par défaut) et un
 * champ `*En` optionnel pour la traduction anglaise. Sans champ EN, c'est la
 * valeur FR qui s'affiche quelle que soit la langue du client.
 */

import type { Tier } from '../utils/permissions';

export interface HelpCommand {
  /** Signature affichée, ex. « /ban <membre> [raison] ». */
  usage: string;
  usageEn?: string;
  /** Ce que fait la commande et quoi en faire concrètement. */
  description: string;
  descriptionEn?: string;
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
  labelEn?: string;
  /** Résumé d'une ligne du module, affiché dans la vue d'ensemble. */
  summary: string;
  summaryEn?: string;
  /** Conseil de mise en route, affiché en pied de page du détail. */
  tip?: string;
  tipEn?: string;
  /** Tier appliqué aux commandes qui ne fixent pas explicitement le leur. */
  defaultTier?: Tier;
  commands: HelpCommand[];
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'tickets',
    emoji: '🎫',
    label: 'Tickets',
    labelEn: 'Tickets',
    summary: "Salons d'assistance privés ouverts depuis un panneau.",
    summaryEn: 'Private support channels opened from a panel.',
    tip: 'Dans un ticket : bouton « Prendre en charge » (staff) et « Fermer » (génère un transcript).',
    tipEn: 'Inside a ticket: "Claim" (staff) and "Close" buttons (generates a transcript).',
    defaultTier: 'staff',
    commands: [
      {
        usage: '/setup-tickets',
        usageEn: '/setup-tickets',
        description: 'Déploie le panneau de tickets dans le salon courant. Configure d\'abord `/config ticket-role` (rôle par catégorie) et `/config tickets` (catégorie + transcripts). Réservé aux admins.',
        descriptionEn: 'Deploys the ticket panel in the current channel. First set up `/config ticket-role` (role per category) and `/config tickets` (category + transcripts). Admin only.',
        tier: 'admin'
      },
      {
        usage: '/add-user <utilisateur>',
        usageEn: '/add-user <user>',
        description: 'Ajoute un membre au ticket dans lequel vous vous trouvez.',
        descriptionEn: 'Adds a member to the ticket you are in.',
        tier: 'ticket-staff'
      },
      {
        usage: '/remove-user <utilisateur>',
        usageEn: '/remove-user <user>',
        description: 'Retire un membre du ticket courant.',
        descriptionEn: 'Removes a member from the current ticket.',
        tier: 'ticket-staff'
      },
      {
        usage: '/ticket move <categorie>',
        usageEn: '/ticket move <category>',
        description: 'Change la catégorie du ticket courant.',
        descriptionEn: 'Changes the category of the current ticket.',
        tier: 'ticket-staff'
      },
      {
        usage: '/ticket create <utilisateur> <categorie>',
        usageEn: '/ticket create <user> <category>',
        description: 'Ouvre un ticket au nom d\'un membre dans la catégorie choisie ; le membre est mentionné dans le salon. Réservé aux admins.',
        descriptionEn: 'Opens a ticket on behalf of a member in the chosen category; the member is pinged in the channel. Admin only.',
        tier: 'admin'
      },
      {
        usage: '/ticket-stats',
        description: 'Affiche les statistiques globales : ouverts, fermés, note moyenne.',
        descriptionEn: 'Shows global statistics: open, closed, average rating.'
      },
      {
        usage: '/tickets-ouverts [categorie] [membre] [pris-en-charge]',
        usageEn: '/tickets-ouverts [category] [member] [claimed]',
        description: 'Liste les tickets ouverts groupés par catégorie. Un ticket-staff ne voit que les catégories qu\'il modère.',
        descriptionEn: 'Lists open tickets grouped by category. A ticket-staff only sees the categories they manage.',
        tier: 'ticket-staff'
      },
      {
        usage: '/ticket-reviews [membre] [categorie] [rating-min]',
        usageEn: '/ticket-reviews [member] [category] [rating-min]',
        description: 'Affiche les avis et commentaires laissés par les auteurs à la fermeture (note 1-5 + texte libre). Paginé.',
        descriptionEn: 'Shows ratings and comments left by ticket authors on close (1-5 stars + free text). Paginated.'
      }
    ]
  },
  {
    id: 'moderation',
    emoji: '🛡️',
    label: 'Modération',
    labelEn: 'Moderation',
    summary: 'Sanctions, casier et nettoyage des messages.',
    summaryEn: 'Sanctions, records, and message cleanup.',
    tip: 'Les durées s\'écrivent : 10m, 2h, 1d. Chaque sanction est enregistrée dans le casier.',
    tipEn: 'Durations: 10m, 2h, 1d. Every sanction is saved in the member\'s record.',
    defaultTier: 'staff',
    commands: [
      {
        usage: '/warn <membre> [raison]',
        usageEn: '/warn <member> [reason]',
        description: 'Avertit un membre. L\'avertissement est ajouté à son casier.',
        descriptionEn: 'Warns a member. The warning is added to their record.'
      },
      {
        usage: '/unwarn <id>',
        description: 'Retire un avertissement du casier (le numéro est visible avec /casier).',
        descriptionEn: 'Removes a warning from the record (the ID is visible with /casier).'
      },
      {
        usage: '/kick <membre> [raison]',
        usageEn: '/kick <member> [reason]',
        description: 'Expulse un membre du serveur.',
        descriptionEn: 'Kicks a member from the server.'
      },
      {
        usage: '/ban <membre> [raison] [purge-jours]',
        usageEn: '/ban <member> [reason] [purge-days]',
        description: 'Bannit un membre. « purge-jours » supprime ses messages des 0 à 7 derniers jours.',
        descriptionEn: 'Bans a member. "purge-days" deletes their messages from the last 0-7 days.'
      },
      {
        usage: '/softban <membre> [raison] [purge-jours]',
        usageEn: '/softban <member> [reason] [purge-days]',
        description: 'Ban suivi d\'un unban immédiat — purge les messages sans bannir durablement.',
        descriptionEn: 'Ban immediately followed by unban — purges messages without a lasting ban.'
      },
      {
        usage: '/unban <identifiant> [raison]',
        usageEn: '/unban <id> [reason]',
        description: 'Débannit un utilisateur à partir de son ID Discord.',
        descriptionEn: 'Unbans a user by their Discord ID.'
      },
      {
        usage: '/timeout <membre> <durée> [raison]',
        usageEn: '/timeout <member> <duration> [reason]',
        description: 'Exclut temporairement un membre (réduction au silence). Maximum 28 jours.',
        descriptionEn: 'Temporarily mutes a member. Maximum 28 days.'
      },
      {
        usage: '/untimeout <membre> [raison]',
        usageEn: '/untimeout <member> [reason]',
        description: 'Lève l\'exclusion temporaire d\'un membre.',
        descriptionEn: 'Lifts the temporary mute of a member.'
      },
      {
        usage: '/casier <membre>',
        usageEn: '/casier <member>',
        description: 'Affiche l\'historique complet des sanctions d\'un membre.',
        descriptionEn: 'Shows the full sanction history of a member.'
      },
      {
        usage: '/casier-search [moderateur] [type] [mot-cle]',
        usageEn: '/casier-search [moderator] [type] [keyword]',
        description: 'Recherche dans le casier global du serveur.',
        descriptionEn: 'Searches the server-wide sanction records.'
      },
      {
        usage: '/note ajouter|liste|retirer',
        usageEn: '/note ajouter|liste|retirer',
        description: 'Notes privées staff sur un membre (invisible au membre).',
        descriptionEn: 'Private staff notes on a member (invisible to the member).'
      },
      {
        usage: '/role temp <membre> <role> <duree>',
        usageEn: '/role temp <member> <role> <duration>',
        description: 'Attribue un rôle pour une durée limitée. Retrait automatique.',
        descriptionEn: 'Assigns a role for a limited duration. Automatically removed.'
      },
      {
        usage: '/lockdown salon [salon] [duree] [raison]',
        usageEn: '/lockdown salon [channel] [duration] [reason]',
        description: 'Verrouille un salon (courant par défaut). Auto-restauration si durée fournie.',
        descriptionEn: 'Locks a channel (current by default). Auto-restores if a duration is given.'
      },
      {
        usage: '/lockdown serveur [duree] [raison] · /lockdown lift [salon] [serveur:true]',
        usageEn: '/lockdown serveur [duration] [reason] · /lockdown lift [channel] [serveur:true]',
        description: 'Lockdown global ou levée — sous-options réservées à l\'administration.',
        descriptionEn: 'Server-wide lockdown or lift — sub-options reserved for admins.',
        tier: 'admin'
      },
      {
        usage: '/clear <nombre> [membre]',
        usageEn: '/clear <count> [member]',
        description: 'Supprime en masse de 1 à 100 messages, éventuellement filtrés sur un membre.',
        descriptionEn: 'Bulk-deletes 1-100 messages, optionally filtered by member.'
      },
      {
        usage: '/normalize <membre>',
        usageEn: '/normalize <member>',
        description: 'Nettoie le pseudo affiché d\'un membre (retire Zalgo, polices fantaisie et caractères de « hoisting » qui forcent le tri en haut).',
        descriptionEn: 'Cleans up a member\'s display name (removes Zalgo, fancy fonts, and "hoisting" characters that force them to the top of the list).'
      },
      {
        usage: '/pseudos [membre]',
        usageEn: '/pseudos [member]',
        description: 'Affiche l\'historique des changements de pseudo (surnom, nom d\'utilisateur, nom global) d\'un membre.',
        descriptionEn: 'Shows a member\'s name-change history (server nickname, username, display name).'
      }
    ]
  },
  {
    id: 'admin',
    emoji: '⚙️',
    label: 'Administration',
    labelEn: 'Administration',
    summary: 'Configuration des modules (/config) et de la journalisation (/logs).',
    summaryEn: 'Module configuration (/config) and logging (/logs).',
    tip: 'Mise en route : /config staff, /config admin, /logs tout-dans salon:, /config reglement role:, puis /setup-reglement.',
    tipEn: 'Getting started: /config staff, /config admin, /logs tout-dans channel:, /config reglement role:, then /setup-reglement.',
    defaultTier: 'admin',
    commands: [
      {
        usage: '/config staff <role> · /config admin <role>',
        description: 'Définit les rôles modérateur (staff) et administration du serveur. Sans rôle, le bot se base sur les permissions Discord natives.',
        descriptionEn: 'Sets the server\'s moderator (staff) and admin roles. Without a role, the bot relies on native Discord permissions.'
      },
      {
        usage: '/permissions check|grant-staff|grant-admin',
        description: 'Vérifie et accorde aux rôles staff/admin les permissions Discord nécessaires pour qu\'ils voient les commandes dans Discord.',
        descriptionEn: 'Checks and grants staff/admin roles the Discord permissions needed to see commands in Discord.'
      },
      {
        usage: '/config voir',
        usageEn: '/config voir',
        description: 'Affiche la configuration actuelle du serveur.',
        descriptionEn: 'Shows the current server configuration.'
      },
      {
        usage: '/logs voir',
        description: 'Affiche la configuration de la journalisation par catégorie.',
        descriptionEn: 'Shows the logging configuration per category.'
      },
      {
        usage: '/logs salon <categorie> <salon>',
        usageEn: '/logs salon <category> <channel>',
        description: "Définit le salon d'une catégorie de logs (messages, membres, rôles, vocal…).",
        descriptionEn: 'Sets the channel for a log category (messages, members, roles, voice…).'
      },
      {
        usage: '/logs toggle <categorie> <actif>',
        usageEn: '/logs toggle <category> <active>',
        description: 'Active ou désactive une catégorie de logs.',
        descriptionEn: 'Enables or disables a log category.'
      },
      {
        usage: '/logs tout-dans <salon>',
        usageEn: '/logs tout-dans <channel>',
        description: 'Envoie toutes les catégories de logs dans un seul salon.',
        descriptionEn: 'Sends all log categories to a single channel.'
      },
      {
        usage: '/config automod <actif> [phishing] [token-leak] [zalgo]',
        usageEn: '/config automod <active> [phishing] [token-leak] [zalgo]',
        description: 'Active l\'auto-modération et ses sous-modules (phishing, tokens Discord leaked, Zalgo).',
        descriptionEn: 'Enables auto-moderation and its sub-modules (phishing, leaked Discord tokens, Zalgo).'
      },
      {
        usage: '/config mot-ajouter <mot> · /config mot-retirer <mot> · /config automod-spam',
        usageEn: '/config mot-ajouter <word> · /config mot-retirer <word> · /config automod-spam',
        description: 'Mots interdits et seuil anti-spam de l\'auto-modération.',
        descriptionEn: 'Banned words and anti-spam threshold for auto-moderation.'
      },
      {
        usage: '/config invite-whitelist add|remove|list',
        description: 'Liste blanche des invitations Discord (serveurs alliés autorisés).',
        descriptionEn: 'Discord invite whitelist (allied servers allowed through).'
      },
      {
        usage: '/config antiraid <actif> [age-min-compte] [expulser-jeunes] [verrouillage-auto] [quarantaine]',
        usageEn: '/config antiraid <active> [age-min-compte] [expulser-jeunes] [verrouillage-auto] [quarantaine]',
        description: 'Anti-raid avec actions automatiques (kick / niveau vérification / quarantaine).',
        descriptionEn: 'Anti-raid with automated actions (kick / verification level / quarantine).'
      },
      {
        usage: '/config captcha <actif> [role-non-verifie] [role-verifie]',
        usageEn: '/config captcha <active> [role-non-verifie] [role-verifie]',
        description: 'Vérification anti-robot visuelle à l\'entrée (image à recopier, affichée en éphémère). Déploie le bouton avec /setup-captcha.',
        descriptionEn: 'Visual anti-bot verification on entry (image to copy, shown as ephemeral). Deploy the button with /setup-captcha.'
      },
      {
        usage: '/config accueil [message] [salon] [carte-image] [image-fond]',
        usageEn: '/config accueil [message] [channel] [carte-image] [image-fond]',
        description: 'Bienvenue à l\'obtention du rôle règlement : MP au membre (carte + 2ᵉ embed éditable dans src/data/welcome.ts) et, si salon fourni, carte postée dans ce salon sans ping. Variables : {user} {username} {server} {count}.',
        descriptionEn: 'Welcome on rules role grant: DM to member (card + 2nd embed editable in src/data/welcome.ts) and, if a channel is provided, card posted there without ping. Variables: {user} {username} {server} {count}.'
      },
      {
        usage: '/config depart <salon> [message]',
        usageEn: '/config depart <channel> [message]',
        description: 'Salon et message d\'au revoir. Variables : {username} {server} {count}.',
        descriptionEn: 'Goodbye channel and message. Variables: {username} {server} {count}.'
      },
      {
        usage: '/config autorole <role>',
        description: 'Rôle attribué automatiquement à chaque nouvelle arrivée.',
        descriptionEn: 'Role automatically assigned to every new member.'
      },
      {
        usage: '/config reglement <role>',
        description: 'Rôle donné lorsqu\'un membre accepte le règlement.',
        descriptionEn: 'Role given when a member accepts the rules.'
      },
      {
        usage: '/config suggestions <salon>',
        usageEn: '/config suggestions <channel>',
        description: 'Salon où sont publiées les suggestions.',
        descriptionEn: 'Channel where suggestions are posted.'
      },
      {
        usage: '/config tickets [categorie] [salon-logs]',
        usageEn: '/config tickets [category] [salon-logs]',
        description: 'Catégorie Discord où créer les tickets et salon d\'archivage des transcripts à la fermeture.',
        descriptionEn: 'Discord category to create ticket channels in, and transcript archive channel on close.'
      },
      {
        usage: '/config ticket-role <categorie> <role>',
        usageEn: '/config ticket-role <category> <role>',
        description: 'Rôle responsable d\'une catégorie de ticket (le seul à voir le ticket et pingué à l\'ouverture). Sans rôle, la catégorie est désactivée.',
        descriptionEn: 'Role responsible for a ticket category (the only one who sees it and gets pinged on open). Without a role, the category is disabled.'
      },
      {
        usage: '/config vocaux-temp <salon> [categorie]',
        usageEn: '/config vocaux-temp <channel> [category]',
        description: 'Salon vocal « rejoindre pour créer » un vocal temporaire.',
        descriptionEn: '"Join to create" voice channel for temporary voice rooms.'
      },
      {
        usage: '/config minecraft <ip> [salon-statut]',
        usageEn: '/config minecraft <ip> [salon-statut]',
        description: 'Serveur Minecraft suivi et salon de statut mis à jour automatiquement.',
        descriptionEn: 'Tracked Minecraft server and auto-updated status channel.'
      },
      {
        usage: '/config minecraft-rcon [host] [port] [mot-de-passe] [role-en-jeu] [role-liaison] [liaison-age-min] [liaison-exiger-verifie]',
        usageEn: '/config minecraft-rcon [host] [port] [mot-de-passe] [role-en-jeu] [role-liaison] [liaison-age-min] [liaison-exiger-verifie]',
        description: 'Connexion RCON (host + mot-de-passe ensemble), rôle des joueurs connectés, et liaison libre : role-liaison autorise les membres à /mclink lier, avec options anti-abus (âge mini du compte, rôle vérifié requis).',
        descriptionEn: 'RCON connection (host + password together), online-players role, and self-link: role-liaison lets members use /mclink lier, with anti-abuse options (min account age, verified role required).'
      },
      {
        usage: '/backup export · /backup import',
        description: 'Sauvegarde / restauration de la configuration du serveur (admins).',
        descriptionEn: 'Export / import the server configuration (admins).'
      }
    ]
  },
  {
    id: 'stats',
    emoji: '📊',
    label: 'Salons statistiques',
    labelEn: 'Stat Channels',
    summary: 'Compteurs de membres affichés dans des salons vocaux verrouillés.',
    summaryEn: 'Member counters displayed in locked voice channels.',
    tip: 'Discord limite les renommages : un compteur se met à jour au mieux toutes les ~6 min.',
    tipEn: 'Discord rate-limits renames: a counter updates at most every ~6 min.',
    defaultTier: 'admin',
    commands: [
      {
        usage: '/stats creer <nom> <role> [etiquette]',
        usageEn: '/stats creer <name> <role> [label]',
        description: 'Crée la catégorie statistique (en haut du serveur) avec un premier compteur.',
        descriptionEn: 'Creates the stat category (top of server) with a first counter.'
      },
      {
        usage: '/stats ajouter <role> [etiquette]',
        usageEn: '/stats ajouter <role> [label]',
        description: 'Ajoute un compteur de rôle à la catégorie existante.',
        descriptionEn: 'Adds a role counter to the existing category.'
      },
      {
        usage: '/stats retirer <role>',
        description: 'Retire un compteur de rôle et son salon.',
        descriptionEn: 'Removes a role counter and its channel.'
      },
      {
        usage: '/stats liste',
        description: 'Liste les compteurs configurés.',
        descriptionEn: 'Lists the configured counters.'
      },
      {
        usage: '/stats supprimer',
        description: 'Supprime la catégorie statistique et tous ses compteurs.',
        descriptionEn: 'Deletes the stat category and all its counters.'
      }
    ]
  },
  {
    id: 'community',
    emoji: '👋',
    label: 'Communauté',
    labelEn: 'Community',
    summary: 'Règlement, rôles auto-attribuables et suggestions.',
    summaryEn: 'Rules, self-assignable roles, and suggestions.',
    tip: 'Le rôle donné par le règlement se configure avec /config reglement.',
    tipEn: 'The role granted by the rules panel is set with /config reglement.',
    commands: [
      {
        usage: '/setup-reglement',
        description: 'Déploie le règlement officiel avec un bouton d\'acceptation qui donne le rôle d\'accès (admins).',
        descriptionEn: 'Deploys the official rules with an acceptance button that grants the access role (admins).',
        tier: 'admin'
      },
      {
        usage: '/setup-captcha',
        description: 'Déploie le bouton de vérification anti-robot ; le défi s\'affiche en éphémère (visible du seul membre). Configure d\'abord /config captcha (admins).',
        descriptionEn: 'Deploys the anti-bot verification button; the challenge is shown as ephemeral (visible to the member only). Set up /config captcha first (admins).',
        tier: 'admin'
      },
      {
        usage: '/setup-roles <role1> [titre] [description] [role2…role5]',
        usageEn: '/setup-roles <role1> [title] [description] [role2…role5]',
        description: 'Déploie un panneau de rôles que les membres s\'attribuent par boutons.',
        descriptionEn: 'Deploys a role panel that members self-assign via buttons.',
        tier: 'admin'
      },
      {
        usage: '/setup-reaction-roles <titre> <description> <paires> [exclusif]',
        usageEn: '/setup-reaction-roles <title> <description> <pairs> [exclusive]',
        description: 'Panneau emoji → rôle (style classique avec réactions).',
        descriptionEn: 'Emoji → role panel (classic reaction-role style).',
        tier: 'admin'
      },
      {
        usage: '/suggestion <proposition> [categorie]',
        usageEn: '/suggestion <proposal> [category]',
        description: 'Propose une idée. Cooldown 10 min, thread auto, vote 👍 / 👎 puis validation staff.',
        descriptionEn: 'Submit an idea. 10 min cooldown, auto-thread, 👍 / 👎 vote then staff validation.'
      }
    ]
  },
  {
    id: 'engagement',
    emoji: '🎉',
    label: 'Engagement',
    labelEn: 'Engagement',
    summary: 'Giveaways et sondages.',
    summaryEn: 'Giveaways and polls.',
    tip: 'L\'ID d\'un message s\'obtient par clic droit → Copier l\'identifiant (mode développeur activé).',
    tipEn: 'A message ID is obtained by right-clicking → Copy ID (developer mode on).',
    commands: [
      {
        usage: '/giveaway lancer <lot> <duree> [gagnants] [age-min] [role-requis] [role-bonus] [multiplicateur]',
        usageEn: '/giveaway lancer <prize> <duration> [winners] [age-min] [role-requis] [role-bonus] [multiplier]',
        description: 'Lance un giveaway avec conditions d\'entrée et multiplicateur de chances.',
        descriptionEn: 'Starts a giveaway with entry conditions and chance multipliers.',
        tier: 'admin'
      },
      {
        usage: '/giveaway pause|reprendre|edit|liste|info|terminer|relancer',
        description: 'Gestion fine des giveaways en cours.',
        descriptionEn: 'Fine-grained management of ongoing giveaways.',
        tier: 'admin'
      },
      {
        usage: '/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]',
        usageEn: '/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]',
        description: 'Crée un sondage avec vote natif Discord (24 h par défaut).',
        descriptionEn: 'Creates a poll using native Discord voting (24 h by default).',
        tier: 'staff'
      },
      {
        usage: '/poll <question> <options|sep par |> <duree> [multi-choix] [anonyme]',
        usageEn: '/poll <question> <options|sep by |> <duration> [multi-choix] [anonyme]',
        description: 'Sondage persistant (durée libre jusqu\'à plusieurs semaines, anonyme optionnel).',
        descriptionEn: 'Persistent poll (any duration up to weeks, optionally anonymous).',
        tier: 'staff'
      }
    ]
  },
  {
    id: 'music',
    emoji: '🎵',
    label: 'Musique',
    labelEn: 'Music',
    summary: 'Lecture de musique YouTube en salon vocal (nécessite un serveur Lavalink).',
    summaryEn: 'YouTube music playback in voice channels (requires a Lavalink server).',
    tip: 'Le module musique exige un serveur Lavalink — voir le fichier docs/LAVALINK.md.',
    tipEn: 'The music module requires a Lavalink server — see docs/LAVALINK.md.',
    commands: [
      {
        usage: '/play <recherche>',
        usageEn: '/play <query>',
        description: 'Joue un titre ou une playlist YouTube (lien ou mots-clés), ou l\'ajoute à la file.',
        descriptionEn: 'Plays a YouTube track or playlist (link or keywords), or adds it to the queue.'
      },
      {
        usage: '/recherche <termes>',
        usageEn: '/recherche <terms>',
        description: 'Recherche YouTube et propose une liste de titres à choisir.',
        descriptionEn: 'YouTube search — shows a list of tracks to choose from.'
      },
      {
        usage: '/pause · /resume',
        description: 'Met en pause ou reprend la lecture.',
        descriptionEn: 'Pauses or resumes playback.'
      },
      {
        usage: '/skip · /stop',
        description: 'Passe au titre suivant, ou arrête tout et quitte le salon.',
        descriptionEn: 'Skips to the next track, or stops everything and leaves the channel.'
      },
      {
        usage: '/queue · /nowplaying',
        description: "Affiche la file d'attente, ou le titre en cours avec ses boutons.",
        descriptionEn: 'Shows the queue, or the current track with its controls.'
      },
      {
        usage: '/volume <0-150>',
        description: 'Règle le volume de lecture.',
        descriptionEn: 'Sets the playback volume.'
      },
      {
        usage: '/loop <mode>',
        description: 'Boucle : désactivée, titre actuel, ou file entière.',
        descriptionEn: 'Loop: off, current track, or entire queue.'
      },
      {
        usage: '/shuffle',
        description: "Mélange l'ordre de la file d'attente.",
        descriptionEn: 'Shuffles the queue order.'
      },
      {
        usage: '/jump <position>',
        description: 'Saute directement à un titre de la file.',
        descriptionEn: 'Jumps directly to a track in the queue.'
      },
      {
        usage: '/seek <secondes>',
        usageEn: '/seek <seconds>',
        description: 'Se déplace à un instant précis du titre en cours.',
        descriptionEn: 'Seeks to a specific point in the current track.'
      },
      {
        usage: '/remove <position> · /clearqueue',
        description: "Retire un titre de la file, ou vide toute la file d'attente.",
        descriptionEn: 'Removes a track from the queue, or clears the entire queue.'
      },
      {
        usage: '/filter <preset>',
        description: 'Filtre audio : bass boost, nightcore, vaporwave, 8D, karaoké.',
        descriptionEn: 'Audio filter: bass boost, nightcore, vaporwave, 8D, karaoke.'
      },
      {
        usage: '/lyrics',
        description: 'Affiche les paroles du titre en cours (si le serveur Lavalink le permet).',
        descriptionEn: 'Shows lyrics for the current track (if the Lavalink server supports it).'
      }
    ]
  },
  {
    id: 'utility',
    emoji: '🧰',
    label: 'Utilitaires',
    labelEn: 'Utilities',
    summary: 'Rappels personnels, AFK, infos et latence.',
    summaryEn: 'Personal reminders, AFK, info, and latency.',
    defaultTier: 'staff',
    commands: [
      {
        usage: '/userinfo [membre]',
        usageEn: '/userinfo [member]',
        description: 'Affiche les informations d\'un membre (vous par défaut).',
        descriptionEn: 'Shows a member\'s information (yourself by default).'
      },
      {
        usage: '/serverinfo',
        description: 'Affiche les informations du serveur.',
        descriptionEn: 'Shows server information.'
      },
      {
        usage: '/avatar [membre]',
        usageEn: '/avatar [member]',
        description: 'Affiche l\'avatar d\'un membre en grand.',
        descriptionEn: 'Shows a member\'s avatar in full size.'
      },
      {
        usage: '/ping',
        description: 'Affiche la latence du bot.',
        descriptionEn: 'Shows the bot\'s latency.'
      },
      {
        usage: '/botinfo',
        description: 'Affiche les statistiques du bot (disponibilité, serveurs, latence).',
        descriptionEn: 'Shows bot statistics (uptime, servers, latency).'
      },
      {
        usage: '/embed <salon> [role1…3]',
        usageEn: '/embed <channel> [role1…3]',
        description: 'Compose un embed personnalisé (formulaire) et l\'envoie dans un salon, avec mention de rôles.',
        descriptionEn: 'Composes a custom embed (form) and sends it to a channel, with optional role mentions.'
      },
      {
        usage: '/rappel set|liste|supprimer',
        description: 'Rappels personnels ponctuels. « delai » s\'écrit 10m, 2h, 1d.',
        descriptionEn: 'Personal one-time reminders. "delay" format: 10m, 2h, 1d.',
        tier: 'public'
      },
      {
        usage: '/rappel-rec set|liste|supprimer',
        description: 'Rappels récurrents (quotidiens, hebdomadaires, mensuels).',
        descriptionEn: 'Recurring reminders (daily, weekly, monthly).',
        tier: 'public'
      },
      {
        usage: '/rappel-role <role> <message> [frequence] [delai]',
        usageEn: '/rappel-role <role> <message> [frequency] [delay]',
        description: 'Rappel pour un rôle entier — ponctuel ou récurrent.',
        descriptionEn: 'Reminder for an entire role — one-time or recurring.',
        tier: 'admin'
      },
      {
        usage: '/tag show|liste|ajouter|editer|retirer',
        description: 'Réponses pré-écrites (FAQ) gérées par le staff.',
        descriptionEn: 'Pre-written answers (FAQ) managed by staff.'
      },
      {
        usage: '/afk [raison]',
        usageEn: '/afk [reason]',
        description: 'Vous marque comme AFK — le bot répond aux pings.',
        descriptionEn: 'Marks you as AFK — the bot replies to pings.',
        tier: 'public'
      },
      {
        usage: '/help',
        description: 'Affiche cette aide et explique l\'usage de chaque commande.',
        descriptionEn: 'Shows this help and explains each command\'s usage.',
        tier: 'public'
      }
    ]
  },
  {
    id: 'integrations',
    emoji: '⛏️',
    label: 'Minecraft & intégrations',
    labelEn: 'Minecraft & Integrations',
    summary: 'Statut serveur Minecraft et notifications YouTube / Twitch / RSS (Instagram, TikTok, X…) — réservé au staff/admin.',
    summaryEn: 'Minecraft server status and YouTube / Twitch / RSS notifications (Instagram, TikTok, X…) — staff/admin.',
    tip: 'L\'ID d\'une chaîne YouTube commence par UC… (Paramètres avancés YouTube). Pour Instagram/TikTok/X, utiliser un flux RSSHub.',
    tipEn: 'A YouTube channel ID starts with UC… (YouTube Advanced Settings). For Instagram/TikTok/X, use an RSSHub feed.',
    defaultTier: 'admin',
    commands: [
      {
        usage: '/mcstatus [ip]',
        description: 'Affiche le statut d\'un serveur Minecraft (par défaut celui configuré).',
        descriptionEn: 'Shows the status of a Minecraft server (default: the configured one).',
        tier: 'staff'
      },
      {
        usage: '/mclink lier <pseudo> · /mclink statut',
        usageEn: '/mclink lier <username> · /mclink statut',
        description: 'Lie votre compte Discord à votre pseudo Minecraft (réservé aux membres ayant le rôle autorisé via `/config minecraft-rcon role-liaison:`) : whiteliste + valide à la connexion. Une seule liaison par membre.',
        descriptionEn: 'Links your Discord account to your Minecraft username (members with the role allowed via `/config minecraft-rcon role-liaison:`): whitelists + validates on connect. One link per member.',
        tier: 'public'
      },
      {
        usage: '/mclink delier <pseudo>',
        usageEn: '/mclink delier <username>',
        description: 'Retire la liaison d\'un pseudo (le pseudo reste whitelisté). Réservé au staff.',
        descriptionEn: 'Removes a username\'s link (the username stays whitelisted). Staff only.',
        tier: 'staff'
      },
      {
        usage: '/mcsuivi ajouter <ip> <salon> <role> [intervalle]',
        usageEn: '/mcsuivi ajouter <ip> <channel> <role> [interval]',
        description: 'Crée un panneau de statut rafraîchi en continu et mentionne un rôle à chaque passage en ligne ↔ hors ligne.',
        descriptionEn: 'Creates a continuously refreshed status panel and mentions a role on each online ↔ offline change.'
      },
      {
        usage: '/mcsuivi liste · /mcsuivi supprimer <id>',
        description: 'Liste ou supprime les suivis Minecraft automatiques.',
        descriptionEn: 'Lists or removes Minecraft auto-watchers.'
      },
      {
        usage: '/whitelist add|remove <pseudo> · /whitelist list',
        description: 'Gestion staff de la whitelist Minecraft (RCON) : whitelister un pseudo sans liaison, retirer un pseudo (+ sa liaison), liste annotée des membres liés. Nécessite /config minecraft-rcon.',
        descriptionEn: 'Staff Minecraft whitelist management (RCON): whitelist a username without linking, remove a username (+ its link), list annotated with linked members. Requires /config minecraft-rcon.',
        tier: 'staff'
      },
      {
        usage: '/notif ajouter-youtube <identifiant-chaine> <salon> [nom] [role]',
        usageEn: '/notif ajouter-youtube <channel-id> <channel> [name] [role]',
        description: 'Suit une chaîne YouTube et annonce ses nouvelles vidéos. Option [role] pour pinger à chaque annonce.',
        descriptionEn: 'Follows a YouTube channel and announces new videos. [role] pings on each announcement.'
      },
      {
        usage: '/notif ajouter-twitch <pseudo> <salon> [role]',
        usageEn: '/notif ajouter-twitch <username> <channel> [role]',
        description: 'Suit un streamer Twitch et annonce ses lives. Option [role] pour pinger.',
        descriptionEn: 'Follows a Twitch streamer and announces streams. [role] pings on each announcement.'
      },
      {
        usage: '/notif ajouter-rss <url> <salon> [nom] [role]',
        usageEn: '/notif ajouter-rss <url> <channel> [name] [role]',
        description: 'Suit un flux RSS / Atom : Instagram, TikTok, X (via RSSHub), Reddit, blogs, podcasts… Annonce chaque nouvelle publication.',
        descriptionEn: 'Follows an RSS/Atom feed: Instagram, TikTok, X (via RSSHub), Reddit, blogs, podcasts… Announces each new post.'
      },
      {
        usage: '/notif liste',
        description: 'Liste les notifications configurées et leur ID.',
        descriptionEn: 'Lists the configured notifications and their IDs.'
      },
      {
        usage: '/notif supprimer <id>',
        description: 'Supprime une notification (ID visible avec /notif liste).',
        descriptionEn: 'Removes a notification (ID visible with /notif liste).'
      }
    ]
  },
  {
    id: 'github',
    emoji: '🐙',
    label: 'Git / GitHub',
    labelEn: 'Git / GitHub',
    summary: 'Suivi d\'activité de dépôts GitHub : commits, PR/merges, CI/CD, releases…',
    summaryEn: 'GitHub repository activity tracking: commits, PR/merges, CI/CD, releases…',
    tip: 'Mode hybride : webhooks (temps réel) si GITHUB_WEBHOOK_SECRET, sinon polling via GITHUB_TOKEN.',
    tipEn: 'Hybrid mode: webhooks (real-time) if GITHUB_WEBHOOK_SECRET set, otherwise polling via GITHUB_TOKEN.',
    defaultTier: 'admin',
    commands: [
      {
        usage: '/git suivre <depot> <salon> [branches] [role] [salon-statut] [events]',
        usageEn: '/git suivre <repo> <channel> [branches] [role] [salon-statut] [events]',
        description: 'Suit un dépôt et annonce son activité. `role` pingué sur échec CI, `salon-statut` pour un message « pipeline » live.',
        descriptionEn: 'Tracks a repo and announces its activity. `role` pinged on CI failure, `salon-statut` for a live pipeline message.'
      },
      {
        usage: '/git liste · /git retirer <id> · /git config <id> [..]',
        description: 'Liste, retire ou reconfigure un dépôt suivi (salon, rôle, branches, events).',
        descriptionEn: 'Lists, removes, or reconfigures a tracked repo (channel, role, branches, events).'
      },
      {
        usage: '/git statut <depot>',
        usageEn: '/git statut <repo>',
        description: 'État instantané d\'un dépôt : dernier commit, PR ouvertes, dernière CI (nécessite un token).',
        descriptionEn: 'Instant repo state: latest commit, open PRs, last CI run (requires a token).'
      },
      {
        usage: '/git lier-membre <membre> <pseudo-github>',
        usageEn: '/git lier-membre <member> <github-username>',
        description: 'Lie un membre Discord à un pseudo GitHub (mention auto dans les annonces).',
        descriptionEn: 'Links a Discord member to a GitHub username (auto-mention in announcements).'
      },
      {
        usage: '/git digest <salon> [frequence] [heure] · /git digest-off',
        usageEn: '/git digest <channel> [frequency] [hour] · /git digest-off',
        description: 'Active/désactive un récap périodique (commits, PR mergées, releases, CI).',
        descriptionEn: 'Enables/disables a periodic digest (commits, merged PRs, releases, CI).'
      },
      {
        usage: '/gitlink lier|statut|delier',
        description: 'Chaque membre déclare son pseudo GitHub pour être mentionné sur ses commits / PR.',
        descriptionEn: 'Each member registers their GitHub username to be mentioned on their commits / PRs.',
        tier: 'staff'
      }
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
