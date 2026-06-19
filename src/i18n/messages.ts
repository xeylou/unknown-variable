/**
 * Catalogue de traductions FR/EN.
 *
 * Chaque clé est un message avec sa version anglaise (`en`, base canonique
 * utilisée par Discord et par défaut) et française (`fr`).
 *
 * Convention de clé : `<namespace>.<nom>` — `<namespace>` = nom de la commande
 * ou `common` pour les messages partagés.
 *
 * Placeholders : `{nom}` dans le texte, remplacés via `t(lang, key, { nom: … })`.
 *
 * ⚠️ Toute clé doit définir `en` ET `fr` (garanti par le type ci-dessous).
 */
export const messages = {
  // --- Communs ---
  'common.error': {
    en: '❌ An error occurred. Try again; if it persists, contact an administrator.',
    fr: '❌ Une erreur est survenue. Réessayer ; si le problème persiste, prévenir un administrateur.'
  },

  // --- /avatar (commande pilote i18n) ---
  'avatar.cmd.desc': {
    en: "Show a member's avatar in full size",
    fr: "Afficher l'avatar d'un membre en grand"
  },
  'avatar.opt.member.desc': {
    en: 'Member (yourself by default)',
    fr: 'Membre (vous par défaut)'
  },
  'avatar.title': {
    en: "{name}'s avatar",
    fr: 'Avatar de {name}'
  },

  // --- Labels partagés ---
  'common.field.id': { en: 'ID', fr: 'Identifiant' },
  'common.field.members': { en: 'Members', fr: 'Membres' },
  'common.field.roles': { en: 'Roles', fr: 'Rôles' },
  'common.yes': { en: 'Yes', fr: 'Oui' },
  'common.no': { en: 'No', fr: 'Non' },
  'common.none': { en: '*None*', fr: '*Aucun*' },

  // --- /ping ---
  'ping.cmd.desc': { en: "Show the bot's latency", fr: 'Afficher la latence du bot' },
  'ping.measuring': { en: '🏓 Measuring…', fr: '🏓 Mesure en cours…' },
  'ping.result': {
    en: '🏓 **Pong!**\n• Message latency: `{rtt} ms`\n• WebSocket latency: `{ws} ms`',
    fr: '🏓 **Pong !**\n• Latence message : `{rtt} ms`\n• Latence WebSocket : `{ws} ms`'
  },

  // --- /botinfo ---
  'botinfo.cmd.desc': {
    en: "Show the bot's information and statistics",
    fr: 'Afficher les informations et statistiques du bot'
  },
  'botinfo.title': { en: '🤖 Bot information', fr: '🤖 Informations du bot' },
  'botinfo.field.latency': { en: '🏓 Latency', fr: '🏓 Latence' },
  'botinfo.field.uptime': { en: '⏱️ Uptime', fr: '⏱️ En ligne depuis' },
  'botinfo.field.servers': { en: '📡 Servers', fr: '📡 Serveurs' },
  'botinfo.field.members': { en: '👥 Members', fr: '👥 Membres' },
  'botinfo.field.commands': { en: '⚙️ Commands', fr: '⚙️ Commandes' },

  // --- /afk ---
  'afk.cmd.desc': {
    en: 'Mark yourself as AFK (the bot replies to those who ping you)',
    fr: 'Vous marque comme AFK (le bot répondra à ceux qui vous pinguent)'
  },
  'afk.opt.reason.desc': { en: 'Reason shown', fr: 'Raison affichée' },
  'afk.set.reason': {
    en: '💤 You are now AFK: *{reason}*. Send a message here to clear your status.',
    fr: '💤 Vous êtes maintenant AFK : *{reason}*. Envoyer un message ici pour retirer votre statut.'
  },
  'afk.set.noreason': {
    en: '💤 You are now AFK. Send a message here to clear your status.',
    fr: '💤 Vous êtes maintenant AFK. Envoyer un message ici pour retirer votre statut.'
  },

  // --- /userinfo ---
  'userinfo.cmd.desc': { en: "Show a member's information", fr: "Afficher les informations d'un membre" },
  'userinfo.opt.member.desc': { en: 'Member (yourself by default)', fr: 'Membre (vous par défaut)' },
  'userinfo.field.bot': { en: 'Bot', fr: 'Bot' },
  'userinfo.field.created': { en: 'Account created', fr: 'Compte créé' },
  'userinfo.field.joined': { en: 'Joined the server', fr: 'A rejoint le serveur' },
  'userinfo.field.roles': { en: 'Roles ({count})', fr: 'Rôles ({count})' },

  // --- /serverinfo ---
  'serverinfo.cmd.desc': { en: "Show the server's information", fr: 'Afficher les informations du serveur' },
  'serverinfo.field.owner': { en: 'Owner', fr: 'Propriétaire' },
  'serverinfo.field.created': { en: 'Created on', fr: 'Créé le' },
  'serverinfo.field.channels': { en: 'Channels', fr: 'Salons' },
  'serverinfo.field.boosts': { en: 'Boosts', fr: 'Boosts' },
  'serverinfo.boosts.value': { en: '{count} (level {tier})', fr: '{count} (niveau {tier})' },
  'serverinfo.field.emojis': { en: 'Emojis', fr: 'Émojis' },

  // --- /rappel ---
  'rappel.cmd.desc': { en: 'Schedule / list / delete personal reminders', fr: 'Programmer / lister / supprimer des rappels personnels' },
  'rappel.sub.set.desc': { en: 'Schedule a reminder', fr: 'Programmer un rappel' },
  'rappel.sub.liste.desc': { en: 'List your pending reminders', fr: 'Lister vos rappels en attente' },
  'rappel.sub.supprimer.desc': { en: 'Delete a reminder by its id', fr: 'Supprimer un rappel par son id' },
  'rappel.opt.delai.desc': { en: 'How soon (10m, 2h, 1d)', fr: 'Dans combien de temps (10m, 2h, 1d)' },
  'rappel.opt.message.desc': { en: 'What to remind you of', fr: 'Quoi vous rappeler ?' },
  'rappel.opt.id.desc': { en: 'Reminder ID', fr: 'ID du rappel' },
  'rappel.set.invalid_delay': {
    en: '❌ Invalid delay (min 10s). Example: `10m`, `2h`, `1d`.',
    fr: '❌ Délai invalide (minimum 10s). Ex : `10m`, `2h`, `1d`.'
  },
  'rappel.set.max': {
    en: '❌ You already have {max} pending reminders — that is the maximum.',
    fr: '❌ Vous avez déjà {max} rappels en attente — c\'est le maximum.'
  },
  'rappel.set.ok': {
    en: '⏰ Reminder #{id} scheduled in **{dur}**.',
    fr: '⏰ Rappel #{id} programmé dans **{dur}**.'
  },
  'rappel.liste.empty': {
    en: 'ℹ️ You have no pending reminders.',
    fr: 'ℹ️ Vous n\'avez aucun rappel en attente.'
  },
  'rappel.liste.title': { en: '⏰ Your reminders', fr: '⏰ Vos rappels' },
  'rappel.delete.ok': { en: '🗑️ Reminder #{id} deleted.', fr: '🗑️ Rappel #{id} supprimé.' },
  'rappel.delete.notfound': { en: '❌ Reminder #{id} not found.', fr: '❌ Rappel #{id} introuvable.' },

  // --- /rappel-rec ---
  'rappelrec.cmd.desc': { en: 'Recurring reminders (daily, weekly, monthly)', fr: 'Rappels récurrents (quotidien, hebdomadaire, mensuel)' },
  'rappelrec.sub.set.desc': { en: 'Create a recurring reminder', fr: 'Créer un rappel récurrent' },
  'rappelrec.sub.liste.desc': { en: 'List your recurring reminders', fr: 'Lister vos rappels récurrents' },
  'rappelrec.sub.supprimer.desc': { en: 'Delete a recurring reminder', fr: 'Supprimer un rappel récurrent' },
  'rappelrec.opt.frequence.desc': { en: 'Frequency', fr: 'Fréquence' },
  'rappelrec.opt.message.desc': { en: 'Message to remind', fr: 'Message à rappeler' },
  'rappelrec.opt.id.desc': { en: 'ID', fr: 'ID' },
  'rappelrec.set.ok': {
    en: '🔁 Recurring reminder #{id} created ({freq}). First trigger <t:{ts}:R>.',
    fr: '🔁 Rappel récurrent #{id} créé ({freq}). Premier déclenchement <t:{ts}:R>.'
  },
  'rappelrec.liste.empty': { en: 'ℹ️ No recurring reminders.', fr: 'ℹ️ Aucun rappel récurrent.' },
  'rappelrec.liste.title': { en: '🔁 Your recurring reminders', fr: '🔁 Vos rappels récurrents' },
  'rappelrec.delete.ok': { en: '🗑️ Recurring reminder #{id} deleted.', fr: '🗑️ Rappel récurrent #{id} supprimé.' },
  'rappelrec.delete.notfound': { en: '❌ Not found.', fr: '❌ Introuvable.' },

  // --- /rappel-role ---
  'rappelrole.cmd.desc': { en: 'Schedule a reminder for an entire role (admin)', fr: 'Programmer un rappel pour un rôle entier (admin)' },
  'rappelrole.opt.role.desc': { en: 'Role to mention', fr: 'Rôle à mentionner' },
  'rappelrole.opt.message.desc': { en: 'Reminder message', fr: 'Message du rappel' },
  'rappelrole.opt.frequence.desc': { en: 'Frequency (one-shot by default)', fr: 'Fréquence (one-shot par défaut)' },
  'rappelrole.opt.delai.desc': { en: 'Delay if "once": 10m, 2h, 1d', fr: 'Délai si « une fois » : 10m, 2h, 1d' },
  'rappelrole.once.invalid': {
    en: '❌ For a one-shot reminder, provide a valid delay (`10m`, `2h`, `1d`).',
    fr: '❌ Pour un rappel ponctuel, fournir un délai valide (`10m`, `2h`, `1d`).'
  },
  'rappelrole.once.ok': {
    en: '⏰ One-shot reminder scheduled for {role} in **{dur}**.',
    fr: '⏰ Rappel ponctuel programmé pour {role} dans **{dur}**.'
  },
  'rappelrole.rec.ok': {
    en: '🔁 Recurring reminder #{id} for {role} ({freq}). Next <t:{ts}:R>.',
    fr: '🔁 Rappel récurrent #{id} pour {role} ({freq}). Prochain <t:{ts}:R>.'
  },

  // --- /tag ---
  'tag.cmd.desc': { en: 'Pre-written answers (FAQ)', fr: 'Réponses pré-écrites (FAQ) — réservé au staff' },
  'tag.sub.show.desc': { en: 'Show a saved tag', fr: 'Afficher un tag enregistré' },
  'tag.sub.ajouter.desc': { en: 'Create a new tag (staff)', fr: 'Créer un nouveau tag (staff)' },
  'tag.sub.editer.desc': { en: 'Edit an existing tag (staff)', fr: 'Modifier un tag existant (staff)' },
  'tag.sub.retirer.desc': { en: 'Delete a tag (staff)', fr: 'Supprimer un tag (staff)' },
  'tag.sub.liste.desc': { en: 'List all server tags', fr: 'Lister tous les tags du serveur' },
  'tag.opt.nom.desc': { en: 'Tag name', fr: 'Nom du tag' },
  'tag.opt.nom_short.desc': { en: 'Short name', fr: 'Nom court' },
  'tag.opt.contenu.desc': { en: 'Tag content', fr: 'Texte du tag' },
  'tag.opt.contenu_new.desc': { en: 'New content', fr: 'Nouveau texte' },
  'tag.show.notfound': { en: '❌ Tag `{name}` not found.', fr: '❌ Tag `{name}` introuvable.' },
  'tag.liste.empty': { en: 'ℹ️ No tags registered.', fr: 'ℹ️ Aucun tag enregistré.' },
  'tag.liste.title': { en: '🏷️ Server tags ({count})', fr: '🏷️ Tags du serveur ({count})' },
  'tag.staff_only': {
    en: '❌ This action is reserved for staff (Manage Messages permission).',
    fr: '❌ Cette action est réservée au staff (permission Gérer les messages).'
  },
  'tag.add.invalid_name': {
    en: '❌ Invalid name: lowercase letters, digits, `_` or `-` only, max 50.',
    fr: '❌ Nom invalide : lettres minuscules, chiffres, `_` ou `-` uniquement, max 50.'
  },
  'tag.add.exists': {
    en: '❌ Tag `{name}` already exists — use `/tag editer`.',
    fr: '❌ Le tag `{name}` existe déjà — utiliser `/tag editer`.'
  },
  'tag.add.ok': { en: '✅ Tag `{name}` created.', fr: '✅ Tag `{name}` créé.' },
  'tag.edit.ok': { en: '✅ Tag `{name}` updated.', fr: '✅ Tag `{name}` mis à jour.' },
  'tag.edit.notfound': { en: '❌ Tag `{name}` not found.', fr: '❌ Tag `{name}` introuvable.' },
  'tag.delete.ok': { en: '🗑️ Tag `{name}` deleted.', fr: '🗑️ Tag `{name}` supprimé.' },
  'tag.delete.notfound': { en: '❌ Tag `{name}` not found.', fr: '❌ Tag `{name}` introuvable.' },

  // --- /embed ---
  'embed.cmd.desc': { en: 'Compose and send a custom embed', fr: 'Composer et envoyer un embed personnalisé' },
  'embed.opt.salon.desc': { en: 'Channel to send the embed to', fr: "Salon où envoyer l'embed" },
  'embed.opt.role1.desc': { en: 'Role to mention (optional)', fr: 'Rôle à mentionner (optionnel)' },
  'embed.opt.role2.desc': { en: '2nd role to mention (optional)', fr: '2ᵉ rôle à mentionner (optionnel)' },
  'embed.opt.role3.desc': { en: '3rd role to mention (optional)', fr: '3ᵉ rôle à mentionner (optionnel)' },
  'embed.no_perms': {
    en: "❌ I'm missing permission to send messages or embeds in {channel}.",
    fr: "❌ Il me manque la permission d'envoyer des messages ou des embeds dans {channel}."
  },
  'embed.modal.title': { en: 'Compose an embed', fr: 'Composer un embed' },
  'embed.modal.titre': { en: 'Title', fr: 'Titre' },
  'embed.modal.description': { en: 'Description', fr: 'Description' },
  'embed.modal.couleur': { en: 'Color (e.g. #5865F2 or "blue")', fr: 'Couleur (ex : #5865F2 ou « bleu »)' },
  'embed.modal.image': { en: 'Image — https://… URL (optional)', fr: 'Image — URL https://… (optionnel)' },
  'embed.modal.footer': { en: 'Footer text (optional)', fr: 'Texte du pied de page (optionnel)' },

  // --- /sondage (native Discord poll) ---
  'sondage.cmd.desc': { en: 'Create a poll (native Discord vote)', fr: 'Créer un sondage (vote natif Discord)' },
  'sondage.opt.question.desc': { en: 'The question', fr: 'La question posée' },
  'sondage.opt.option1.desc': { en: 'Choice 1', fr: 'Choix 1' },
  'sondage.opt.option2.desc': { en: 'Choice 2', fr: 'Choix 2' },
  'sondage.opt.heures.desc': { en: 'Duration in hours (default 24)', fr: 'Durée du sondage en heures (défaut 24)' },
  'sondage.opt.multichoix.desc': { en: 'Allow multiple answers?', fr: 'Autoriser plusieurs réponses ?' },

  // --- /poll (persistent poll) ---
  'poll.cmd.desc': { en: 'Persistent poll (any duration, optional multi-choice)', fr: 'Sondage persistant (durée libre, multi-choix possible)' },
  'poll.sub.creer.desc': { en: 'Start a persistent poll', fr: 'Lancer un sondage persistant' },
  'poll.sub.annuler.desc': { en: 'Cancel and delete an active poll (and its votes)', fr: 'Annuler et supprimer un sondage en cours (et ses votes)' },
  'poll.opt.question.desc': { en: 'Question', fr: 'Question posée' },
  'poll.opt.options.desc': { en: 'Options separated by "|" (2-10)', fr: 'Options séparées par des « | » (2-10)' },
  'poll.opt.duree.desc': { en: 'Duration (e.g. 1h, 7d, 30d)', fr: 'Durée (ex 1h, 7d, 30d)' },
  'poll.opt.multichoix.desc': { en: 'Allow multiple choices per member', fr: 'Autoriser plusieurs choix par membre' },
  'poll.opt.anonyme.desc': { en: 'Hide individual voters', fr: 'Cacher les votants individuels' },
  'poll.opt.messageid.desc': { en: 'ID or link of the poll message (default: most recent)', fr: 'ID ou lien du message du sondage (défaut : le plus récent en cours)' },
  'poll.cancel.invalid_id': { en: '❌ Invalid message ID.', fr: '❌ ID de message invalide.' },
  'poll.cancel.none': { en: 'ℹ️ No active poll to cancel.', fr: 'ℹ️ Aucun sondage en cours à annuler.' },
  'poll.cancel.notfound': { en: '❌ Poll not found on this server.', fr: '❌ Sondage introuvable sur ce serveur.' },
  'poll.cancel.confirm': {
    en: '⚠️ Delete the poll **{question}** and all its votes? This cannot be undone.',
    fr: '⚠️ Supprimer le sondage **{question}** et tous ses votes ? Action irréversible.'
  },
  'poll.cancel.btn.confirm': { en: 'Cancel poll', fr: 'Annuler le sondage' },
  'poll.cancel.btn.keep': { en: 'Keep', fr: 'Garder' },
  'poll.create.invalid_duration': { en: '❌ Invalid duration (minimum 1 min).', fr: '❌ Durée invalide (minimum 1 min).' },
  'poll.create.invalid_options': { en: '❌ Provide between 2 and 10 options separated by `|`.', fr: '❌ Donner entre 2 et 10 options séparées par `|`.' },
  'poll.create.no_perms': { en: '❌ I\'m missing permissions in {channel}.', fr: '❌ Il me manque les permissions dans {channel}.' },
  'poll.create.ok': { en: '✅ Poll started for **{dur}**.', fr: '✅ Sondage lancé pour **{dur}**.' },
  'poll.channel_only': { en: '❌ This command must be run in a text channel.', fr: '❌ Cette commande doit être lancée dans un salon texte.' },

  // --- /help (command UI) ---
  'help.cmd.desc': {
    en: 'Show commands available at your permission level',
    fr: 'Afficher les commandes accessibles à votre niveau'
  },
  'help.tier.admin':  { en: 'administrator', fr: 'administrateur' },
  'help.tier.staff':  { en: 'staff',         fr: 'staff' },
  'help.tier.member': { en: 'member',         fr: 'membre' },
  'help.overview.title': { en: '📖 Command overview', fr: '📖 Inventaire des commandes' },
  'help.overview.desc': {
    en: '**{total} commands** in **{cats} modules** accessible at your level ({tier}).\nChoose a category from the dropdown to see each command\'s usage.',
    fr: '**{total} commandes** dans **{cats} modules** accessibles à votre niveau ({tier}).\nChoisir une catégorie dans le menu déroulant pour voir l\'usage de chaque commande.'
  },
  'help.overview.footer.public': {
    en: 'Some commands are only visible to staff or administrators.',
    fr: 'Certaines commandes ne sont visibles qu\'aux membres du staff ou de l\'administration.'
  },
  'help.overview.footer.staff': {
    en: 'You only see commands your role can use.',
    fr: 'Vous voyez uniquement les commandes que votre rôle peut utiliser.'
  },
  'help.menu.placeholder': { en: '📂 Choose a category…',      fr: '📂 Choisir une catégorie…' },
  'help.menu.home.label':  { en: 'Overview',                    fr: "Vue d'ensemble" },
  'help.menu.home.desc':   { en: 'Back to the module list',      fr: 'Revenir à la liste des modules' },
  'help.detail.footer':    { en: 'Select "Overview" to go back.', fr: 'Sélectionner « Vue d\'ensemble » pour revenir à la liste.' },

  // --- Common shared responses ---
  'common.text_channel_only': {
    en: '❌ This command must be run in a text channel.',
    fr: '❌ Cette commande doit être lancée dans un salon texte.'
  },
  'common.missing_perms_channel': {
    en: '❌ I\'m missing **Send Messages** or **Embed Links** permission in {channel}.',
    fr: '❌ Il me manque la permission **Envoyer des messages** ou **Liens intégrés** dans {channel}.'
  },
  'common.channel_not_found': { en: '❌ Channel not found.', fr: '❌ Salon introuvable.' },
  'common.member_not_found': { en: '❌ Member not found on this server.', fr: '❌ Membre introuvable sur le serveur.' },
  'common.self_action': { en: '❌ Cannot perform this action on yourself.', fr: '❌ Action impossible sur vous-même.' },
  'common.higher_role': {
    en: '❌ This member has a role equal to or higher than yours.',
    fr: '❌ Ce membre a un rôle supérieur ou égal au vôtre.'
  },
  'common.not_manageable': {
    en: '❌ I cannot perform this action on this member (role too high or missing permission).',
    fr: '❌ Je ne peux pas effectuer cette action sur ce membre (rôle trop élevé ou permission manquante).'
  },
  'common.invalid_duration': {
    en: '❌ Invalid duration. Examples: `10m`, `2h`, `1d`.',
    fr: '❌ Durée invalide. Exemples : `10m`, `2h`, `1d`.'
  },
  'common.panel_send_failed': { en: '❌ Failed to send the panel.', fr: '❌ Échec de l\'envoi du panneau.' },
  'common.no_panel': { en: 'ℹ️ No panel to remove.', fr: 'ℹ️ Aucun panneau à supprimer.' },
  'common.deployed_ok': { en: '✅ Panel deployed.', fr: '✅ Panneau déployé.' },

  // --- Community: /stats ---
  'stats.cmd.desc': { en: 'Stat channels: show member counts by role', fr: 'Salons compteurs : afficher le nombre de membres par rôle' },
  'stats.sub.creer.desc': { en: 'Create the stat category with a first counter', fr: 'Créer la catégorie statistique avec un premier compteur' },
  'stats.sub.ajouter.desc': { en: 'Add a role counter to the existing category', fr: 'Ajouter un compteur de rôle à la catégorie existante' },
  'stats.sub.retirer.desc': { en: 'Remove a role counter', fr: 'Retirer un compteur de rôle' },
  'stats.sub.liste.desc': { en: 'List the configured counters', fr: 'Lister les compteurs configurés' },
  'stats.sub.supprimer.desc': { en: 'Delete the stat category and all its counters', fr: 'Supprimer la catégorie statistique et tous ses compteurs' },
  'stats.opt.nom.desc': { en: 'Category name', fr: 'Nom de la catégorie' },
  'stats.opt.role.desc': { en: 'Role whose member count to display', fr: 'Rôle dont on affiche le nombre de membres' },
  'stats.opt.etiquette.desc': { en: 'Label shown instead of the role name (optional)', fr: 'Texte affiché à la place du nom du rôle (optionnel)' },
  'stats.opt.role_remove.desc': { en: 'Role of the counter to remove', fr: 'Rôle du compteur à retirer' },
  'stats.creer.exists': {
    en: '❌ A stat category already exists. Use `/stats ajouter`.',
    fr: '❌ Une catégorie statistique existe déjà. Utiliser `/stats ajouter`.'
  },
  'stats.creer.ok': { en: '✅ Stat category **{name}** created with a counter for {role}.', fr: '✅ Catégorie statistique **{name}** créée, avec un compteur pour {role}.' },
  'stats.ajouter.no_category': {
    en: '❌ No stat category. Create one first with `/stats creer`.',
    fr: '❌ Aucune catégorie statistique. À créer d\'abord avec `/stats creer`.'
  },
  'stats.ajouter.dup': { en: '❌ A counter already exists for {role}.', fr: '❌ Un compteur existe déjà pour {role}.' },
  'stats.ajouter.ok': { en: '✅ Counter added for {role}.', fr: '✅ Compteur ajouté pour {role}.' },
  'stats.retirer.none': { en: '❌ No counter for {role}.', fr: '❌ Aucun compteur pour {role}.' },
  'stats.retirer.ok': { en: '🗑️ Counter for {role} removed.', fr: '🗑️ Compteur pour {role} retiré.' },
  'stats.liste.empty': { en: 'ℹ️ No counters configured. Use `/stats creer`.', fr: 'ℹ️ Aucun compteur configuré. Utiliser `/stats creer`.' },
  'stats.liste.title': { en: '📊 Stat counters', fr: '📊 Compteurs statistiques' },
  'stats.supprimer.empty': {
    en: 'ℹ️ No stat category to delete.',
    fr: 'ℹ️ Aucune catégorie statistique à supprimer.'
  },
  'stats.supprimer.confirm': {
    en: '⚠️ Confirm deletion of the stat category and its **{count}** counter(s)? This cannot be undone.',
    fr: '⚠️ Confirmer la suppression de la catégorie statistique et de ses **{count}** compteur(s) ? Cette action est irréversible.'
  },

  // --- Community: /suggestion ---
  'suggestion.cmd.desc': { en: 'Submit a suggestion for the server', fr: 'Proposer une suggestion pour le serveur' },
  'suggestion.opt.proposition.desc': { en: 'Your suggestion', fr: 'Votre suggestion' },
  'suggestion.opt.categorie.desc': { en: 'Category / tag', fr: 'Catégorie / tag' },
  'suggestion.cooldown': {
    en: '⏳ Wait **{min} min** before your next suggestion.',
    fr: '⏳ Attendre encore **{min} min** avant votre prochaine suggestion.'
  },
  'suggestion.no_channel': {
    en: '⚠️ The suggestion channel is not configured. An admin must run `/config suggestions`.',
    fr: '⚠️ Le salon des suggestions n\'est pas configuré. Un admin doit faire `/config suggestions`.'
  },
  'suggestion.channel_missing': {
    en: '⚠️ The suggestion channel could not be found.',
    fr: '⚠️ Le salon des suggestions est introuvable.'
  },
  'suggestion.ok': { en: '✅ Suggestion **#{id}** sent to {channel}.', fr: '✅ Suggestion **#{id}** envoyée dans {channel}.' },
  'suggestion.ok_thread': { en: '✅ Suggestion **#{id}** sent to {channel} (thread <#{thread}>).', fr: '✅ Suggestion **#{id}** envoyée dans {channel} (thread <#{thread}>).' },

  // --- Community: /setup-captcha ---
  'setupcaptcha.cmd.desc': { en: 'Anti-bot verification (button)', fr: 'Vérification anti-robot (bouton)' },
  'setupcaptcha.sub.deployer.desc': { en: 'Deploy the verification message in this channel', fr: 'Déployer le message de vérification dans ce salon' },
  'setupcaptcha.sub.supprimer.desc': { en: 'Remove the verification message(s) and reset captcha settings', fr: 'Retirer le(s) message(s) de vérification et réinitialiser le captcha' },
  'setupcaptcha.no_panel': { en: 'ℹ️ No verification message to remove.', fr: 'ℹ️ Aucun message de vérification à supprimer.' },
  'setupcaptcha.deployed': { en: '✅ Verification message deployed in {channel}.', fr: '✅ Message de vérification déployé dans {channel}.' },
  'setupcaptcha.warn_disabled': { en: 'captcha is **disabled** (`/config captcha actif:true`)', fr: 'le CAPTCHA est **désactivé** (`/config captcha actif:true`)' },
  'setupcaptcha.warn_no_role': { en: 'no **unverified role** is set (`/config captcha … role-non-verifie:@role`)', fr: 'aucun **rôle non-vérifié** n\'est défini (`/config captcha … role-non-verifie:@rôle`)' },
  'setupcaptcha.deployed_warn': {
    en: '✅ Verification message deployed in {channel}.\n⚠️ Warning: {warnings}.',
    fr: '✅ Message de vérification déployé dans {channel}.\n⚠️ Attention : {warnings}.'
  },
  'setupcaptcha.failed': { en: '❌ Failed to send the verification message.', fr: '❌ Échec de l\'envoi du message de vérification.' },

  // --- Community: /setup-reglement ---
  'setupreglement.cmd.desc': { en: 'Official rules with button-based validation', fr: 'Règlement officiel avec validation par bouton' },
  'setupreglement.sub.deployer.desc': { en: 'Deploy the rules in a channel', fr: 'Déployer le règlement dans un salon' },
  'setupreglement.opt.salon.desc': { en: 'Target channel (default: current channel)', fr: 'Salon cible (défaut : salon courant)' },
  'setupreglement.sub.supprimer.desc': { en: 'Remove the deployed rule panel(s) and reset related settings', fr: 'Retirer le(s) règlement(s) déployé(s) et réinitialiser les réglages liés' },
  'setupreglement.no_panel': { en: 'ℹ️ No deployed rules to remove.', fr: 'ℹ️ Aucun règlement déployé à supprimer.' },
  'setupreglement.failed': { en: '❌ Failed to send the rules.', fr: '❌ Échec de l\'envoi du règlement.' },
  'setupreglement.ok': { en: '✅ Rules deployed.', fr: '✅ Règlement déployé.' },
  'setupreglement.ok_no_role': {
    en: '✅ Rules deployed.\n⚠️ No validation role configured — run `/config reglement role:<role>` or the button will grant no access.',
    fr: '✅ Règlement déployé.\n⚠️ Aucun rôle de validation configuré — faire `/config reglement role:<rôle>` sinon le bouton ne donnera aucun accès.'
  },

  // --- Community: /setup-roles ---
  'setuproles.cmd.desc': { en: 'Self-assignable role panels (buttons)', fr: 'Panneaux de rôles auto-attribuables (boutons)' },
  'setuproles.sub.creer.desc': { en: 'Deploy a button role panel', fr: 'Déployer un panneau de rôles à boutons (embed personnalisable)' },
  'setuproles.sub.liste.desc': { en: 'List the deployed role panels', fr: 'Lister les panneaux de rôles déployés' },
  'setuproles.sub.supprimer.desc': { en: 'Delete all deployed role panels', fr: 'Supprimer tous les panneaux de rôles déployés' },
  'setuproles.opt.titre.desc': { en: 'Embed title', fr: 'Titre de l\'embed' },
  'setuproles.opt.description.desc': { en: 'Embed text', fr: 'Texte de l\'embed' },
  'setuproles.opt.couleur.desc': { en: 'Color (e.g. #5865F2 or "blue")', fr: 'Couleur (ex : #5865F2 ou « bleu »)' },
  'setuproles.opt.image.desc': { en: 'Image — https://… URL (optional)', fr: 'Image — URL https://… (optionnel)' },
  'setuproles.opt.pied.desc': { en: 'Footer text (optional)', fr: 'Texte du pied de page (optionnel)' },
  'setuproles.unassignable': {
    en: '❌ I cannot assign: {roles}. Place my role above these (avoid integration-managed roles).',
    fr: '❌ Je ne peux pas attribuer : {roles}. Placer mon rôle au-dessus de ces rôles (et éviter les rôles gérés par une intégration).'
  },
  'setuproles.creer.ok': { en: '✅ Role panel deployed ({count} role(s)).', fr: '✅ Panneau de rôles déployé ({count} rôle(s)).' },
  'setuproles.liste.empty': { en: 'ℹ️ No role panels. Use `/setup-roles creer`.', fr: 'ℹ️ Aucun panneau de rôles. Utiliser `/setup-roles creer`.' },
  'setuproles.liste.title': { en: '🎭 Role panels', fr: '🎭 Panneaux de rôles' },
  'setuproles.supprimer.empty': { en: 'ℹ️ No role panels to delete.', fr: 'ℹ️ Aucun panneau de rôles à supprimer.' },
  'setuproles.supprimer.confirm': {
    en: '⚠️ Confirm deletion of **{count}** role panel(s)? Messages will be deleted. This cannot be undone.',
    fr: '⚠️ Confirmer la suppression des **{count}** panneau(x) de rôles ? Les messages seront effacés. Cette action est irréversible.'
  },

  // --- Community: /setup-reaction-roles ---
  'setuprr.cmd.desc': { en: 'Emoji → role panel (classic reaction-role style)', fr: 'Panneau emoji → rôle (style classique)' },
  'setuprr.sub.deployer.desc': { en: 'Deploy an emoji → role panel in this channel', fr: 'Déployer un panneau emoji → rôle dans ce salon' },
  'setuprr.sub.supprimer.desc': { en: 'Remove all reaction-role panels from the server', fr: 'Retirer tous les panneaux reaction-roles du serveur' },
  'setuprr.opt.titre.desc': { en: 'Panel title', fr: 'Titre du panneau' },
  'setuprr.opt.description.desc': { en: 'Panel description', fr: 'Description du panneau' },
  'setuprr.opt.paires.desc': { en: 'Emoji role pairs separated by commas — e.g. "🟦 @Blue, 🔴 @Red"', fr: 'Paires emoji rôle séparées par des virgules — ex. « 🟦 @Bleu, 🔴 @Rouge »' },
  'setuprr.opt.exclusif.desc': { en: 'Only one role from the list at a time (default: no)', fr: 'Un seul rôle parmi la liste à la fois (défaut : non)' },
  'setuprr.no_panel': { en: 'ℹ️ No reaction-role panels to remove.', fr: 'ℹ️ Aucun panneau reaction-roles à supprimer.' },
  'setuprr.invalid_pair': {
    en: '❌ Invalid pair format: `{chunk}`. Expected: "emoji @Role".',
    fr: '❌ Format de paire invalide : `{chunk}`. Attendu : « emoji @Rôle ».'
  },
  'setuprr.role_not_found': { en: '❌ Role not found: {emoji}.', fr: '❌ Rôle introuvable : {emoji}.' },
  'setuprr.not_assignable': {
    en: '❌ I cannot assign {role} (managed or higher than my role).',
    fr: '❌ Je ne peux pas attribuer {role} (rôle géré ou plus haut que le mien).'
  },
  'setuprr.invalid_count': { en: '❌ Provide between 1 and 10 pairs.', fr: '❌ Donner entre 1 et 10 paires.' },
  'setuprr.missing_perms': {
    en: '❌ I\'m missing **Send**, **Embeds** or **Reactions** permission in {channel}.',
    fr: '❌ Il me manque les permissions **Envoyer**, **Embeds** ou **Réactions** dans {channel}.'
  },
  'setuprr.ok': { en: '✅ Reaction-role panel deployed ({count} role(s)).', fr: '✅ Panneau reaction-roles déployé ({count} rôle(s)).' },

  // --- Community: /classement ---
  'classement.cmd.desc': { en: 'Auto-updated leaderboards (messages, invites)', fr: 'Classements auto-actualisés (messages, invitations)' },
  'classement.sub.messages.desc': { en: 'Deploy the most active members leaderboard', fr: 'Déployer le classement des membres les plus actifs' },
  'classement.sub.invitations.desc': { en: 'Deploy the top inviters leaderboard', fr: 'Déployer le classement des meilleurs inviteurs' },
  'classement.sub.liste.desc': { en: 'List the deployed leaderboards', fr: 'Lister les classements déployés' },
  'classement.sub.supprimer.desc': { en: 'Delete a leaderboard and reset its counters', fr: 'Supprimer un classement et réinitialiser ses compteurs' },
  'classement.opt.salon.desc': { en: 'Channel to post the leaderboard (default: current channel)', fr: 'Salon où poster le classement (défaut : salon courant)' },
  'classement.opt.top.desc': { en: 'Number of members to display (default: 10)', fr: 'Nombre de membres affichés (défaut : 10)' },
  'classement.opt.type.desc': { en: 'Which leaderboard to delete', fr: 'Quel classement supprimer' },
  'classement.invalid_channel': { en: '❌ Choose a valid text channel.', fr: '❌ Choisir un salon texte valide.' },
  'classement.failed': { en: '❌ Failed to deploy the leaderboard.', fr: '❌ Échec du déploiement du classement.' },
  'classement.ok': { en: '✅ Leaderboard deployed in {channel} — [see message]({url}).', fr: '✅ Classement déployé dans {channel} — [voir le message]({url}).' },
  'classement.ok_invites': {
    en: '✅ Leaderboard deployed in {channel} — [see message]({url}).\n*Invite tracking requires the bot to have **Manage Server** permission.*',
    fr: '✅ Classement déployé dans {channel} — [voir le message]({url}).\n*Le suivi des invitations nécessite la permission **Gérer le serveur** pour le bot.*'
  },

  // --- Tickets: /add-user ---
  'adduser.cmd.desc': { en: 'Add a user to the current ticket', fr: 'Ajouter un utilisateur au ticket courant' },
  'adduser.opt.user.desc': { en: 'Member to add', fr: 'Membre à ajouter' },
  'adduser.not_ticket': { en: '❌ Use this inside an open ticket.', fr: '❌ À utiliser dans un ticket ouvert.' },
  'adduser.ok': { en: '✅ {user} added to the ticket.', fr: '✅ {user} ajouté au ticket.' },

  // --- Tickets: /remove-user ---
  'removeuser.cmd.desc': { en: 'Remove a user from the current ticket', fr: 'Retirer un utilisateur du ticket courant' },
  'removeuser.opt.user.desc': { en: 'Member to remove', fr: 'Membre à retirer' },
  'removeuser.not_ticket': { en: '❌ Use this inside an open ticket.', fr: '❌ À utiliser dans un ticket ouvert.' },
  'removeuser.ok': { en: '✅ {user} removed from the ticket.', fr: '✅ {user} retiré du ticket.' },

  // --- Tickets: /ticket move ---
  'ticket.cmd.desc': { en: 'Advanced ticket management', fr: 'Gestion avancée du ticket courant' },
  'ticket.sub.move.desc': { en: 'Change this ticket\'s category', fr: 'Changer la catégorie de ce ticket' },
  'ticket.opt.categorie.desc': { en: 'New category', fr: 'Nouvelle catégorie' },
  'ticket.move.not_ticket': { en: '❌ This command must be run inside a ticket.', fr: '❌ Cette commande doit être lancée dans un ticket.' },
  'ticket.move.unknown_cat': { en: '❌ Unknown category.', fr: '❌ Catégorie inconnue.' },
  'ticket.move.same': { en: 'ℹ️ The ticket is already in this category.', fr: 'ℹ️ Le ticket est déjà dans cette catégorie.' },
  'ticket.move.ok': { en: '✅ Ticket moved to **{label}**.', fr: '✅ Ticket déplacé vers **{label}**.' },

  // --- Tickets: /ticket create ---
  'ticket.sub.create.desc': { en: 'Open a ticket for a member', fr: 'Ouvrir un ticket pour un membre' },
  'ticket.create.opt.user.desc': { en: 'Member to open the ticket for', fr: 'Membre pour qui ouvrir le ticket' },
  'ticket.create.opt.categorie.desc': { en: 'Ticket category', fr: 'Catégorie du ticket' },
  'ticket.create.bot': { en: '❌ You cannot open a ticket for a bot.', fr: '❌ Impossible d\'ouvrir un ticket pour un bot.' },
  'ticket.create.unknown_cat': { en: '❌ Unknown category.', fr: '❌ Catégorie inconnue.' },
  'ticket.create.no_role': { en: '❌ Category **{label}** has no responsible role configured. An admin must set one with `/config ticket-role`.', fr: '❌ La catégorie **{label}** n\'a pas de rôle responsable configuré. Un administrateur doit l\'attribuer avec `/config ticket-role`.' },
  'ticket.create.failed': { en: '❌ Could not create the channel (bot permissions or category full?).', fr: '❌ Impossible de créer le salon (permissions du bot ou catégorie pleine ?).' },
  'ticket.create.ok': { en: '✅ Ticket created for {user}: {channel}', fr: '✅ Ticket créé pour {user} : {channel}' },

  // --- Tickets: /ticket-stats ---
  'ticketstats.cmd.desc': { en: 'Show server ticket statistics', fr: 'Afficher les statistiques des tickets du serveur' },
  'ticketstats.title': { en: '📊 Ticket statistics', fr: '📊 Statistiques des tickets' },
  'ticketstats.open': { en: '🟢 Open', fr: '🟢 Ouverts' },
  'ticketstats.closed': { en: '🔒 Closed', fr: '🔒 Fermés' },
  'ticketstats.total': { en: '📁 Total', fr: '📁 Total' },
  'ticketstats.rating': { en: '⭐ Average rating', fr: '⭐ Note moyenne' },
  'ticketstats.rating.value': { en: '{avg} / 5  ({count} review(s))', fr: '{avg} / 5  ({count} avis)' },
  'ticketstats.rating.none': { en: 'No reviews', fr: 'Aucun avis' },

  // --- Tickets: /ticket-reviews ---
  'ticketreviews.cmd.desc': { en: 'Ratings and comments left on closed tickets', fr: 'Avis et commentaires laissés à la fermeture des tickets' },
  'ticketreviews.opt.member.desc': { en: 'Filter by ticket author', fr: 'Filtrer sur l\'auteur du ticket' },
  'ticketreviews.opt.categorie.desc': { en: 'Filter by category', fr: 'Filtrer sur une catégorie' },
  'ticketreviews.opt.ratingmin.desc': { en: 'Minimum rating (1-5)', fr: 'Note minimale (1-5)' },
  'ticketreviews.empty': { en: 'ℹ️ No reviews or comments match these filters.', fr: 'ℹ️ Aucun avis ni commentaire ne correspond à ces filtres.' },

  // --- Tickets: /tickets-ouverts ---
  'ticketsouverts.cmd.desc': { en: 'List open tickets grouped by category', fr: 'Lister les tickets ouverts groupés par catégorie' },
  'ticketsouverts.opt.categorie.desc': { en: 'Filter by category (among those you have access to)', fr: 'Filtrer sur une catégorie (parmi celles auxquelles vous avez accès)' },
  'ticketsouverts.opt.member.desc': { en: 'Filter by ticket author', fr: 'Filtrer sur l\'auteur du ticket' },
  'ticketsouverts.opt.claimed.desc': { en: 'false = unclaimed only; true = claimed only', fr: 'false = uniquement les tickets non-claim ; true = uniquement les claim' },
  'ticketsouverts.no_access': {
    en: '⛔ You are neither staff nor ticket-staff for any configured category. Ask an admin for a category role.',
    fr: '⛔ Vous n\'êtes ni staff ni ticket-staff d\'aucune catégorie configurée. Demander à un admin un rôle responsable de catégorie.'
  },
  'ticketsouverts.no_access_cat': {
    en: '⛔ You do not have access to the **{label}** category.',
    fr: '⛔ Vous n\'avez pas accès à la catégorie **{label}**.'
  },
  'ticketsouverts.title': { en: '🎫 Open tickets', fr: '🎫 Tickets ouverts' },

  // --- Tickets: /setup-tickets ---
  'setuptickets.cmd.desc': { en: 'Ticket panel', fr: 'Panneau de tickets' },
  'setuptickets.sub.deployer.desc': { en: 'Deploy the ticket panel in a channel', fr: 'Déployer le panneau de tickets dans un salon' },
  'setuptickets.opt.salon.desc': { en: 'Target channel (default: current channel)', fr: 'Salon cible (défaut : salon courant)' },
  'setuptickets.sub.supprimer.desc': { en: 'Remove the ticket panel(s) and reset the opening message', fr: 'Retirer le(s) panneau(x) de tickets et réinitialiser le message d\'ouverture' },
  'setuptickets.no_panel': { en: 'ℹ️ No ticket panels to remove.', fr: 'ℹ️ Aucun panneau de tickets à supprimer.' },
  'setuptickets.failed': { en: '❌ Failed to send the panel.', fr: '❌ Échec de l\'envoi du panneau.' },
  'setuptickets.ok': { en: '✅ Panel deployed.', fr: '✅ Panneau déployé.' },
  'setuptickets.ok_no_roles': {
    en: '✅ Panel deployed.\n⚠️ No category has a responsible role: ticket creation will be refused until you run `/config ticket-role`.',
    fr: '✅ Panneau déployé.\n⚠️ Aucune catégorie n\'a de rôle responsable : les ouvertures seront refusées tant que vous n\'aurez pas configuré `/config ticket-role`.'
  },

  // --- Moderation: /ban ---
  'ban.cmd.desc': { en: 'Ban a member from the server', fr: 'Bannir un membre du serveur' },
  'ban.opt.member.desc': { en: 'Member to ban', fr: 'Membre à bannir' },
  'ban.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'ban.opt.purge.desc': { en: 'Delete messages from the last N days (0-7)', fr: 'Supprimer les messages des N derniers jours (0-7)' },
  'ban.ok': { en: '🔨 **{tag}** has been banned (#{id}).{reason}', fr: '🔨 **{tag}** a été banni (#{id}).{reason}' },
  'ban.reason_suffix': { en: ' Reason: {reason}', fr: ' Raison : {reason}' },

  // --- Moderation: /kick ---
  'kick.cmd.desc': { en: 'Kick a member from the server', fr: 'Expulser un membre du serveur' },
  'kick.opt.member.desc': { en: 'Member to kick', fr: 'Membre à expulser' },
  'kick.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'kick.not_on_server': { en: '❌ This member is not on the server.', fr: '❌ Ce membre n\'est pas sur le serveur.' },
  'kick.ok': { en: '👢 **{tag}** has been kicked (#{id}).{reason}', fr: '👢 **{tag}** a été expulsé (#{id}).{reason}' },

  // --- Moderation: /warn ---
  'warn.cmd.desc': { en: 'Warn a member', fr: 'Avertir un membre' },
  'warn.opt.member.desc': { en: 'Member to warn', fr: 'Membre à avertir' },
  'warn.opt.reason.desc': { en: 'Reason for the warning', fr: 'Raison de l\'avertissement' },
  'warn.self': { en: '❌ You cannot warn yourself.', fr: '❌ Vous ne pouvez pas vous avertir vous-même.' },
  'warn.bot': { en: '❌ Cannot warn a bot.', fr: '❌ Impossible d\'avertir un bot.' },
  'warn.ok': { en: '⚠️ {user} received a warning (#{id}).{reason}', fr: '⚠️ {user} a reçu un avertissement (#{id}).{reason}' },

  // --- Moderation: /unwarn ---
  'unwarn.cmd.desc': { en: 'Remove a warning from the record', fr: 'Retirer un avertissement du casier' },
  'unwarn.opt.id.desc': { en: 'Sanction number (visible with /casier)', fr: 'Numéro de la sanction (visible avec /casier)' },
  'unwarn.notfound': { en: '❌ No active warning with ID #{id}.', fr: '❌ Aucun avertissement actif avec l\'identifiant #{id}.' },
  'unwarn.ok': { en: '✅ Warning #{id} removed from the record.', fr: '✅ Avertissement #{id} retiré du casier.' },

  // --- Moderation: /timeout ---
  'timeout.cmd.desc': { en: 'Temporarily mute a member', fr: 'Exclure temporairement un membre (réduction au silence)' },
  'timeout.opt.member.desc': { en: 'Member to mute', fr: 'Membre à exclure' },
  'timeout.opt.duration.desc': { en: 'E.g.: 10m, 2h, 1d (max 28d)', fr: 'Ex : 10m, 2h, 1d (maximum 28d)' },
  'timeout.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'timeout.invalid_duration': { en: '❌ Invalid duration. Examples: `10m`, `2h`, `1d`.', fr: '❌ Durée invalide. Exemples : `10m`, `2h`, `1d`.' },
  'timeout.too_long': { en: '❌ Maximum duration: 28 days.', fr: '❌ Durée maximale : 28 jours.' },
  'timeout.ok': { en: '⏳ **{tag}** is muted for **{dur}** (#{id}).{reason}', fr: '⏳ **{tag}** est exclu pour **{dur}** (#{id}).{reason}' },

  // --- Moderation: /untimeout ---
  'untimeout.cmd.desc': { en: 'Lift the temporary mute of a member', fr: 'Lever l\'exclusion temporaire d\'un membre' },
  'untimeout.opt.member.desc': { en: 'Member', fr: 'Membre' },
  'untimeout.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'untimeout.not_muted': { en: 'ℹ️ This member is not muted.', fr: 'ℹ️ Ce membre n\'est pas exclu.' },
  'untimeout.ok': { en: '✅ Mute lifted for **{tag}**.', fr: '✅ L\'exclusion de **{tag}** a été levée.' },

  // --- Moderation: /unban ---
  'unban.cmd.desc': { en: 'Unban a user', fr: 'Débannir un utilisateur' },
  'unban.opt.id.desc': { en: 'Discord ID of the user to unban', fr: 'ID Discord de l\'utilisateur à débannir' },
  'unban.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'unban.invalid_id': { en: '❌ Invalid ID (17-20 digits expected).', fr: '❌ Identifiant invalide (17 à 20 chiffres attendus).' },
  'unban.not_banned': { en: '❌ This user is not banned.', fr: '❌ Cet utilisateur n\'est pas banni.' },
  'unban.ok': { en: '♻️ **{tag}** has been unbanned.{reason}', fr: '♻️ **{tag}** a été débanni.{reason}' },

  // --- Moderation: /softban ---
  'softban.cmd.desc': { en: 'Ban then immediately unban (message purge)', fr: 'Bannir puis débannir immédiatement (purge des messages)' },
  'softban.opt.member.desc': { en: 'Member to softban', fr: 'Membre à softban' },
  'softban.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'softban.opt.purge.desc': { en: 'Delete messages from the last N days (1-7, default 1)', fr: 'Supprimer les messages des N derniers jours (1-7, défaut 1)' },
  'softban.ok': { en: '🧹 **{tag}** softbanned (#{id}) — messages from the last {days} day(s) deleted.', fr: '🧹 **{tag}** softban (#{id}) — messages des {days} dernier(s) jour(s) supprimés.' },

  // --- Moderation: /clear ---
  'clear.cmd.desc': { en: 'Bulk-delete messages from the channel', fr: 'Supprimer en masse des messages du salon' },
  'clear.opt.nombre.desc': { en: 'Number of messages to delete (1-100)', fr: 'Nombre de messages à supprimer (1-100)' },
  'clear.opt.member.desc': { en: 'Only delete messages from this member', fr: 'Ne supprimer que les messages de ce membre' },
  'clear.none': {
    en: '❌ No deletable messages found (too old, or none from this member recently).',
    fr: '❌ Aucun message supprimable trouvé (messages trop anciens, ou aucun de ce membre récemment).'
  },
  'clear.ok': { en: '🧹 **{count}** message(s) deleted{member}.', fr: '🧹 **{count}** message(s) supprimé(s){member}.' },
  'clear.ok_member': { en: ' from {user}', fr: ' de {user}' },
  'clear.partial': {
    en: '\n*{skipped} not deleted — too old (> 14 days) or not found.*',
    fr: '\n*{skipped} non supprimé(s) — trop anciens (> 14 jours) ou introuvables.*'
  },

  // --- Moderation: /casier ---
  'casier.cmd.desc': { en: 'Show a member\'s moderation record', fr: 'Afficher le casier de modération d\'un membre' },
  'casier.opt.member.desc': { en: 'Member', fr: 'Membre' },
  'casier.clean': { en: '✅ **{tag}** has a clean record.', fr: '✅ **{tag}** a un casier vierge.' },

  // --- Moderation: /casier-search ---
  'casiersearch.cmd.desc': { en: 'Search server-wide sanction records', fr: 'Rechercher dans les sanctions du serveur' },
  'casiersearch.opt.mod.desc': { en: 'Filter by moderator', fr: 'Filtrer par modérateur' },
  'casiersearch.opt.type.desc': { en: 'Filter by sanction type', fr: 'Filtrer par type de sanction' },
  'casiersearch.opt.keyword.desc': { en: 'Keyword in the reason', fr: 'Mot contenu dans la raison' },
  'casiersearch.need_filter': {
    en: '❌ Provide at least one filter (moderator, type, or keyword).',
    fr: '❌ Fournir au moins un filtre (modérateur, type, ou mot-clé).'
  },
  'casiersearch.empty': { en: 'ℹ️ No sanctions match these filters.', fr: 'ℹ️ Aucune sanction ne correspond à ces filtres.' },
  'casiersearch.title': { en: '🔎 Record search', fr: '🔎 Recherche dans le casier' },

  // --- Moderation: /note ---
  'note.cmd.desc': { en: 'Private staff notes on a member', fr: 'Notes privées staff sur un membre' },
  'note.sub.ajouter.desc': { en: 'Add a note on a member', fr: 'Ajouter une note sur un membre' },
  'note.sub.liste.desc': { en: 'List notes for a member', fr: 'Lister les notes d\'un membre' },
  'note.sub.retirer.desc': { en: 'Remove a note by its ID', fr: 'Retirer une note par son id' },
  'note.opt.member.desc': { en: 'Member concerned', fr: 'Membre concerné' },
  'note.opt.text.desc': { en: 'Note content', fr: 'Contenu de la note' },
  'note.opt.id.desc': { en: 'Note ID', fr: 'ID de la note' },
  'note.add.ok': { en: '📝 Note **#{id}** added on {tag}.', fr: '📝 Note **#{id}** ajoutée sur {tag}.' },
  'note.liste.empty': { en: 'ℹ️ No notes on {tag}.', fr: 'ℹ️ Aucune note sur {tag}.' },
  'note.delete.ok': { en: '🗑️ Note #{id} removed.', fr: '🗑️ Note #{id} retirée.' },
  'note.delete.notfound': { en: '❌ Note #{id} not found.', fr: '❌ Note #{id} introuvable.' },

  // --- Moderation: /role ---
  'role.cmd.desc': { en: 'Temporary role management', fr: 'Gestion des rôles temporaires' },
  'role.sub.temp.desc': { en: 'Assign a role for a limited duration', fr: 'Attribuer un rôle pour une durée limitée' },
  'role.sub.templiste.desc': { en: 'List active temporary roles', fr: 'Lister les rôles temporaires actifs' },
  'role.sub.tempannuler.desc': { en: 'Cancel a temporary role', fr: 'Annuler un rôle temporaire' },
  'role.opt.member.desc': { en: 'Member', fr: 'Membre' },
  'role.opt.role.desc': { en: 'Role to assign', fr: 'Rôle à attribuer' },
  'role.opt.duration.desc': { en: 'E.g. 10m, 2h, 1d, 7d', fr: 'Ex 10m, 2h, 1d, 7d' },
  'role.opt.reason.desc': { en: 'Reason', fr: 'Raison' },
  'role.opt.id.desc': { en: 'Assignment ID (see temp-liste)', fr: 'ID de l\'attribution (voir temp-liste)' },
  'role.temp.not_manageable': {
    en: '❌ I cannot assign {role} (managed role or higher than mine).',
    fr: '❌ Je ne peux pas attribuer {role} (rôle géré ou plus haut que le mien).'
  },
  'role.temp.ok': { en: '⏳ Role {role} assigned to {member} for **{dur}** (#{id}).', fr: '⏳ Rôle {role} attribué à {member} pour **{dur}** (#{id}).' },
  'role.liste.empty': { en: 'ℹ️ No active temporary roles.', fr: 'ℹ️ Aucun rôle temporaire en cours.' },
  'role.liste.title': { en: '⏳ Active temporary roles', fr: '⏳ Rôles temporaires en cours' },
  'role.annuler.notfound': { en: '❌ Assignment not found.', fr: '❌ Attribution introuvable.' },
  'role.annuler.ok': { en: '🗑️ Assignment #{id} cancelled.', fr: '🗑️ Attribution #{id} annulée.' },

  // --- Moderation: /lockdown ---
  'lockdown.cmd.desc': { en: 'Lock / unlock a channel or the whole server', fr: 'Verrouiller / déverrouiller un salon ou tout le serveur' },
  'lockdown.sub.salon.desc': { en: 'Lock a channel (removes SendMessages from @everyone)', fr: 'Verrouiller un salon (retire SendMessages à @everyone)' },
  'lockdown.sub.serveur.desc': { en: 'Lock all text channels on the server (admin only)', fr: 'Verrouiller tous les salons texte du serveur (réservé admin)' },
  'lockdown.sub.lift.desc': { en: 'Unlock a channel (or the whole server)', fr: 'Déverrouiller un salon (ou tout le serveur)' },
  'lockdown.opt.salon.desc': { en: 'Channel to lock (default: current channel)', fr: 'Salon à verrouiller (par défaut : le salon courant)' },
  'lockdown.opt.duration.desc': { en: 'Duration (e.g. 30m, 2h) — without = until manual lift', fr: 'Durée (ex 30m, 2h) — sans = jusqu\'au lift manuel' },
  'lockdown.opt.reason.desc': { en: 'Reason shown in the log', fr: 'Raison affichée dans le log' },
  'lockdown.opt.lift_salon.desc': { en: 'Channel to unlock (default: current channel)', fr: 'Salon à déverrouiller (par défaut : le salon courant)' },
  'lockdown.opt.lift_server.desc': { en: 'Unlock the whole server (admin only)', fr: 'Déverrouiller tout le serveur (réservé admin)' },
  'lockdown.salon.ok': { en: '🔒 {channel} locked{dur}.', fr: '🔒 {channel} verrouillé{dur}.' },
  'lockdown.dur_suffix': { en: ' for **{dur}**', fr: ' pour **{dur}**' },
  'lockdown.server.ok': { en: '🔒 **{count}** channel(s) locked{dur}.', fr: '🔒 **{count}** salons verrouillés{dur}.' },
  'lockdown.lift_salon.ok': { en: '🔓 {channel} unlocked.', fr: '🔓 {channel} déverrouillé.' },
  'lockdown.lift_server.ok': { en: '🔓 **{count}** channel(s) unlocked.', fr: '🔓 **{count}** salons déverrouillés.' },

  // --- Moderation: /backup ---
  'backup.cmd.desc': { en: 'Server configuration backup / restore', fr: 'Sauvegarde / restauration de la configuration du serveur' },
  'backup.sub.export.desc': { en: 'Export configuration as JSON', fr: 'Exporter la configuration en JSON' },
  'backup.sub.import.desc': { en: 'Import a configuration (attach the JSON file)', fr: 'Importer une configuration (joindre le fichier JSON)' },
  'backup.opt.fichier.desc': { en: 'JSON file produced by /backup export', fr: 'Fichier .json produit par /backup export' },
  'backup.export.ok': {
    en: '📦 **Backup produced.** Keep this file safe — it contains all configuration keys (including secrets like `mc_rcon_password` and the Twitch code).',
    fr: '📦 **Sauvegarde produite.** Conserver ce fichier en lieu sûr — il contient toutes les clés de configuration (y compris des secrets comme `mc_rcon_password` et le code Twitch).'
  },
  'backup.import.not_json': { en: '❌ Attach a `.json` file.', fr: '❌ Joindre un fichier `.json`.' },

  // --- Engagement: /giveaway ---
  'giveaway.cmd.desc': { en: 'Manage giveaways', fr: 'Gérer les giveaways' },
  'giveaway.sub.lancer.desc': { en: 'Start a giveaway', fr: 'Lancer un giveaway' },
  'giveaway.sub.terminer.desc': { en: 'End a giveaway immediately', fr: 'Terminer un giveaway immédiatement' },
  'giveaway.sub.relancer.desc': { en: 'Draw new winners', fr: 'Retirer de nouveaux gagnants' },
  'giveaway.sub.pause.desc': { en: 'Pause an ongoing giveaway', fr: 'Mettre en pause un giveaway en cours' },
  'giveaway.sub.reprendre.desc': { en: 'Resume a paused giveaway', fr: 'Reprendre un giveaway en pause' },
  'giveaway.sub.edit.desc': { en: 'Edit an ongoing giveaway', fr: 'Éditer un giveaway en cours' },
  'giveaway.sub.liste.desc': { en: 'List ongoing server giveaways', fr: 'Lister les giveaways en cours du serveur' },
  'giveaway.sub.info.desc': { en: 'Details of a giveaway', fr: 'Détails d\'un giveaway' },
  'giveaway.opt.lot.desc': { en: 'What is being given away', fr: 'Ce qui est à gagner' },
  'giveaway.opt.duree.desc': { en: 'E.g.: 30m, 6h, 2d', fr: 'Ex : 30m, 6h, 2d' },
  'giveaway.opt.gagnants.desc': { en: 'Number of winners (default 1)', fr: 'Nombre de gagnants (défaut 1)' },
  'giveaway.opt.age.desc': { en: 'Minimum server membership in days', fr: 'Ancienneté minimum sur le serveur en jours' },
  'giveaway.opt.role_requis.desc': { en: 'Required role to participate', fr: 'Rôle obligatoire pour participer' },
  'giveaway.opt.role_bonus.desc': { en: 'Role with multiplied entries', fr: 'Rôle avec entrées multipliées' },
  'giveaway.opt.mult.desc': { en: 'Bonus role multiplier (1-10)', fr: 'Multiplicateur du rôle bonus (1-10)' },
  'giveaway.opt.msgid.desc': { en: 'Giveaway message ID', fr: 'ID du message du giveaway' },
  'giveaway.opt.new_lot.desc': { en: 'New prize', fr: 'Nouveau lot' },
  'giveaway.opt.new_dur.desc': { en: 'New duration — recalculates end time', fr: 'Nouvelle durée — recalcule la fin' },
  'giveaway.opt.new_winners.desc': { en: 'New number of winners', fr: 'Nouveau nombre de gagnants' },
  'giveaway.invalid_duration': { en: '❌ Invalid duration (min 10s). E.g.: `30m`, `6h`, `2d`.', fr: '❌ Durée invalide (minimum 10s). Ex : `30m`, `6h`, `2d`.' },

  // --- Music ---
  'music.not_configured': { en: '⚠️ Music module is not configured.', fr: '⚠️ Le module musique n\'est pas configuré.' },
  'music.join_voice': { en: '❌ Join a voice channel first.', fr: '❌ Rejoindre d\'abord un salon vocal.' },
  'play.cmd.desc': { en: 'Play a YouTube track or playlist (link or keywords)', fr: 'Jouer un titre ou une playlist YouTube (lien ou mots-clés)' },
  'play.opt.query.desc': { en: 'Track to search, YouTube link or playlist link', fr: 'Titre à rechercher, lien YouTube ou lien de playlist' },
  'recherche.cmd.desc': { en: 'Search YouTube and pick a track from a list', fr: 'Rechercher un titre YouTube et le choisir dans une liste' },
  'recherche.opt.terms.desc': { en: 'Search keywords', fr: 'Mots-clés de recherche' },
  'pause.cmd.desc': { en: 'Pause playback', fr: 'Mettre la lecture en pause' },
  'resume.cmd.desc': { en: 'Resume playback', fr: 'Reprendre la lecture' },
  'skip.cmd.desc': { en: 'Skip to the next track', fr: 'Passer au titre suivant' },
  'stop.cmd.desc': { en: 'Stop playback and leave the channel', fr: 'Arrêter la lecture et quitter le salon' },
  'queue.cmd.desc': { en: 'Show the queue', fr: 'Afficher la file d\'attente' },
  'nowplaying.cmd.desc': { en: 'Show the current track with controls', fr: 'Afficher le titre en cours avec ses boutons' },
  'volume.cmd.desc': { en: 'Set playback volume (0-150)', fr: 'Régler le volume de lecture (0-150)' },
  'volume.opt.level.desc': { en: 'Volume level (0-150)', fr: 'Niveau de volume (0-150)' },
  'loop.cmd.desc': { en: 'Loop mode: off, current track, or full queue', fr: 'Boucle : désactivée, titre actuel, ou file entière' },
  'loop.opt.mode.desc': { en: 'Loop mode', fr: 'Mode de boucle' },
  'shuffle.cmd.desc': { en: 'Shuffle the queue order', fr: 'Mélanger l\'ordre de la file d\'attente' },
  'jump.cmd.desc': { en: 'Jump directly to a track in the queue', fr: 'Sauter directement à un titre de la file' },
  'jump.opt.pos.desc': { en: 'Position in the queue', fr: 'Position dans la file' },
  'seek.cmd.desc': { en: 'Seek to a specific point in the current track', fr: 'Se déplacer à un instant précis du titre en cours' },
  'seek.opt.seconds.desc': { en: 'Position in seconds', fr: 'Position en secondes' },
  'remove.cmd.desc': { en: 'Remove a track from the queue', fr: 'Retirer un titre de la file d\'attente' },
  'remove.opt.pos.desc': { en: 'Position of the track to remove', fr: 'Position du titre à retirer' },
  'clearqueue.cmd.desc': { en: 'Clear the entire queue', fr: 'Vider toute la file d\'attente' },
  'filter.cmd.desc': { en: 'Audio filter: bass boost, nightcore, vaporwave, 8D, karaoke', fr: 'Filtre audio : bass boost, nightcore, vaporwave, 8D, karaoké' },
  'filter.opt.preset.desc': { en: 'Filter preset', fr: 'Preset de filtre' },
  'lyrics.cmd.desc': { en: 'Show lyrics for the current track (if Lavalink supports it)', fr: 'Afficher les paroles du titre en cours (si le serveur Lavalink le permet)' },

  // --- Minecraft ---
  'mcstatus.cmd.desc': { en: "Show a Minecraft server's status", fr: "Afficher le statut d'un serveur Minecraft" },
  'mcstatus.opt.ip.desc': { en: 'Server address (default: the configured one)', fr: 'Adresse du serveur (par défaut : celui configuré)' },
  'mcstatus.no_ip': {
    en: '⚠️ No server configured. Provide an IP or run `/config minecraft ip:<address>`.',
    fr: '⚠️ Aucun serveur configuré. Préciser une IP, ou faire `/config minecraft ip:<adresse>`.'
  },
  'mcstatus.failed': { en: '❌ Could not retrieve server status.', fr: '❌ Impossible de récupérer le statut du serveur.' },
  'mclink.cmd.desc': { en: 'Link your Discord account to your Minecraft username', fr: 'Lier votre compte Discord à votre pseudo Minecraft' },
  'mclink.sub.demande.desc': { en: 'Request a link by connecting to the server', fr: 'Demande de liaison à valider en se connectant au serveur' },
  'mclink.sub.statut.desc': { en: 'Check your link', fr: 'Vérifier votre liaison' },
  'mclink.sub.delier.desc': { en: 'Remove your link', fr: 'Supprimer votre liaison' },
  'mclink.opt.pseudo.desc': { en: 'Your exact Minecraft username', fr: 'Votre pseudo Minecraft exact' },
  'mcsuivi.cmd.desc': { en: 'Continuously track a Minecraft server and alert a role', fr: 'Suivre un serveur Minecraft en continu et alerter un rôle' },
  'mcsuivi.sub.ajouter.desc': { en: 'Add a Minecraft server watcher', fr: 'Ajouter un suivi de serveur Minecraft' },
  'mcsuivi.sub.liste.desc': { en: 'List the configured Minecraft watchers', fr: 'Lister les suivis Minecraft configurés' },
  'mcsuivi.sub.supprimer.desc': { en: 'Remove a Minecraft watcher', fr: 'Supprimer un suivi Minecraft' },
  'mcsuivi.opt.ip.desc': { en: 'Server address', fr: 'Adresse du serveur' },
  'mcsuivi.opt.salon.desc': { en: 'Channel to display the status panel', fr: 'Salon où afficher le panneau de statut' },
  'mcsuivi.opt.role.desc': { en: 'Role mentioned on each status change', fr: 'Rôle mentionné à chaque changement de statut' },
  'mcsuivi.opt.intervalle.desc': { en: 'Refresh interval in minutes (2-60, default 5)', fr: 'Rafraîchissement en minutes (2-60, défaut 5)' },
  'mcsuivi.opt.id.desc': { en: 'Watcher ID (see /mcsuivi liste)', fr: 'ID du suivi (voir /mcsuivi liste)' },
  'mcwhitelist.cmd.desc': { en: 'Minecraft whitelist (via RCON)', fr: 'Whitelist Minecraft (via RCON)' },
  'mcwhitelist.sub.add.desc': { en: 'Add a username to the whitelist', fr: 'Ajouter un pseudo à la whitelist' },
  'mcwhitelist.sub.remove.desc': { en: 'Remove a username from the whitelist', fr: 'Retirer un pseudo de la whitelist' },
  'mcwhitelist.sub.list.desc': { en: 'Show the current whitelist', fr: 'Afficher la whitelist actuelle' },
  'mcwhitelist.opt.pseudo.desc': { en: 'Minecraft username', fr: 'Pseudo Minecraft' },
  'mcwhitelist.no_rcon': {
    en: '⚠️ RCON not configured for this server. Use `/config minecraft-rcon`.',
    fr: '⚠️ RCON non configuré pour ce serveur. Utiliser `/config minecraft-rcon`.'
  },

  // --- Git / GitHub ---
  'git.cmd.desc': { en: 'Track GitHub repository activity (commits, PRs, CI/CD, releases…)', fr: 'Suivre l\'activité de dépôts GitHub (commits, PR, CI/CD, releases…)' },
  'gitlink.cmd.desc': { en: 'Link your Discord account to your GitHub username (mentions in announcements)', fr: 'Lier votre compte Discord à votre pseudo GitHub (mentions dans les annonces)' },
  'gitlink.sub.lier.desc': { en: 'Register your GitHub username', fr: 'Déclarer votre pseudo GitHub' },
  'gitlink.sub.statut.desc': { en: 'Check your link', fr: 'Voir votre liaison' },
  'gitlink.sub.delier.desc': { en: 'Remove your link', fr: 'Supprimer votre liaison' },
  'gitlink.opt.pseudo.desc': { en: 'Your GitHub username', fr: 'Votre pseudo GitHub' },

  // --- Integrations: /notif ---
  'notif.cmd.desc': { en: 'Manage YouTube / Twitch / RSS notifications', fr: 'Gérer les notifications YouTube / Twitch / RSS' },
  'notif.sub.youtube.desc': { en: 'Follow a YouTube channel', fr: 'Suivre une chaîne YouTube' },
  'notif.sub.twitch.desc': { en: 'Follow a Twitch channel', fr: 'Suivre une chaîne Twitch' },
  'notif.sub.rss.desc': { en: 'Follow an RSS/Atom feed (Instagram, TikTok, X, blog… via RSSHub or native)', fr: 'Suivre un flux RSS / Atom (Instagram, TikTok, X, blog… via RSSHub ou natif)' },
  'notif.sub.liste.desc': { en: 'List configured notifications', fr: 'Lister les notifications configurées' },
  'notif.sub.supprimer.desc': { en: 'Delete a notification', fr: 'Supprimer une notification' },
  'notif.opt.yt_id.desc': { en: 'Channel ID (starts with UC…, see YouTube Advanced Settings)', fr: 'ID de la chaîne (commence par UC..., voir Paramètres avancés YouTube)' },
  'notif.opt.salon.desc': { en: 'Announcement channel', fr: 'Salon des annonces' },
  'notif.opt.nom.desc': { en: 'Display name for the source', fr: 'Nom affiché de la chaîne' },
  'notif.opt.role.desc': { en: 'Role to mention on each announcement', fr: 'Rôle à mentionner à chaque annonce' },
  'notif.opt.pseudo.desc': { en: 'Twitch streamer username', fr: 'Pseudo Twitch du streamer' },
  'notif.opt.rss_url.desc': { en: 'RSS/Atom feed URL (https://…)', fr: 'URL du flux RSS / Atom (https://...)' },
  'notif.opt.rss_nom.desc': { en: 'Display name for the source (e.g. "Instagram @builders")', fr: 'Nom affiché de la source (ex: « Instagram @builders »)' },
  'notif.opt.id.desc': { en: 'Notification ID (see /notif liste)', fr: 'ID de la notification (voir /notif liste)' },
  'notif.twitch_unavailable': {
    en: '⚠️ Twitch notifications are not available on this bot: the host must configure a Twitch application. YouTube and RSS remain available via `/notif`.',
    fr: '⚠️ Les notifications Twitch ne sont pas disponibles sur ce bot : l\'hébergeur doit configurer une application Twitch. YouTube et RSS restent disponibles via `/notif`.'
  }
} as const satisfies Record<string, { en: string; fr: string }>;

/** Union de toutes les clés de traduction disponibles. */
export type MessageKey = keyof typeof messages;
