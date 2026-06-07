> 🇬🇧 **English version [COMMANDS_en.md](COMMANDS_en.md)** · [Retour au README](../README.md) ⬅️

# 🧾 Catalogue des commandes

Toutes les commandes slash, par module, avec leur **tier** d'accès (`public` · `ticket-staff` · `staff` · `admin`, voir [Configuration → Permissions](CONFIGURATION.md#système-de-permissions-tiers)). Plusieurs options à identifiant bénéficient de l'**autocomplétion** (notées 💡).

`/help` est interactif : chaque membre n'y voit **que** les commandes qu'il peut utiliser.

---

## 🎫 Tickets

| Commande | Tier | Description |
|---|---|---|
| `/setup-tickets deployer [salon:]` | admin | Déploie le panneau dans le salon indiqué (ou le salon courant). |
| `/add-user <utilisateur>` | ticket-staff | Ajoute un membre au ticket courant. |
| `/remove-user <utilisateur>` | ticket-staff | Retire un membre. |
| `/ticket move <categorie>` | ticket-staff | Change la catégorie du ticket (renomme aussi le salon). |
| `/ticket create <utilisateur> <categorie>` | admin | Ouvre un ticket au nom d'un membre dans une catégorie donnée (le membre est mentionné dans le salon). |
| `/ticket-stats` | staff | Statistiques globales (tickets ouverts, fermés, note moyenne). |
| `/tickets-ouverts [categorie] [membre] [pris-en-charge]` | ticket-staff | Tickets ouverts groupés par catégorie (un ticket-staff ne voit que ses catégories). |
| `/ticket-reviews [membre] [categorie] [rating-min]` | staff | Avis et commentaires laissés à la fermeture (paginé). |
| 🔘 Prendre en charge · Fermer · Rouvrir | staff · membre | Boutons dans le ticket · le DM de fermeture. |

## 🛡️ Modération

| Commande | Tier | Description |
|---|---|---|
| `/warn <membre> [raison]` | staff | Avertir (ajouté au casier). |
| `/unwarn <id>` | staff | Retirer un avertissement. |
| `/kick <membre> [raison]` | staff | Expulser. |
| `/softban <membre> [raison] [purge-jours:0-7]` | staff | Ban + unban immédiat (purge sans bannir durablement). |
| `/ban <membre> [raison] [purge-jours:0-7]` | staff | Bannir. |
| `/unban <identifiant> [raison]` | staff | Débannir par ID. |
| `/timeout <membre> <durée> [raison]` | staff | Exclure temporairement (max 28 j ; `10m`, `2h`, `1d`...). |
| `/untimeout <membre> [raison]` | staff | Lever un timeout. |
| `/casier <membre>` | staff | Historique paginé des sanctions. |
| `/casier-search [moderateur] [type] [mot-cle]` | staff | Recherche dans le casier global. |
| `/note ajouter\|liste\|retirer` | staff | Notes privées staff sur un membre. |
| `/role temp <membre> <role> <duree> [raison]` | staff | Rôle temporaire (retrait auto). |
| `/role temp-liste` · `/role temp-annuler <id>` 💡 | staff | Gestion des rôles temporaires. |
| `/lockdown salon [salon] [duree] [raison]` | staff | Verrouille un salon (auto-restauration si `duree`). |
| `/lockdown serveur [duree] [raison]` | admin | Lockdown global. |
| `/lockdown lift [salon] [serveur:bool]` | staff · admin | Déverrouille. |
| `/clear <nombre:1-100> [membre]` | staff | Supprime en masse. |

## 👋 Communauté

| Commande | Tier | Description |
|---|---|---|
| `/setup-reglement deployer [salon:]` | admin | Déploie le règlement + bouton dans le salon indiqué (ou le salon courant). |
| `/setup-captcha` | admin | Déploie le bouton de vérification (défi en éphémère). |
| `/setup-roles` | admin | Panneau de rôles auto-attribuables (boutons). |
| `/setup-reaction-roles` | admin | Panneau emoji → rôle (réactions). |
| `/suggestion <proposition> [categorie]` | public | Cooldown 10 min · thread auto · vote 👍/👎 · validation staff. |

## 🎉 Engagement

| Commande | Tier | Description |
|---|---|---|
| `/giveaway lancer <lot> <duree> [gagnants] [age-min] [role-requis] [role-bonus] [multiplicateur]` | admin | Lance un giveaway (conditions + multiplicateur). |
| `/giveaway pause\|reprendre\|edit\|liste\|info\|terminer\|relancer` 💡 | admin | Gestion fine (autocomplétion sur `message-id`). |
| `/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]` | staff | Sondage natif Discord (24 h défaut). |
| `/poll <question> <options "\|"> <duree> [multi-choix] [anonyme]` | staff | Sondage persistant (durée libre). |

## 🧰 Utilitaires

| Commande | Tier | Description |
|---|---|---|
| `/userinfo [membre]` | staff | Infos d'un membre. |
| `/serverinfo` | staff | Infos du serveur. |
| `/avatar [membre]` | staff | Avatar en grand. |
| `/ping` | staff | Latence du bot. |
| `/botinfo` | staff | Stats du bot (disponibilité, serveurs, latence). |
| `/embed <salon> [role1…3]` | staff | Compose un embed via formulaire et l'envoie. |
| `/rappel set\|liste\|supprimer` | public | Rappels personnels ponctuels. |
| `/rappel-rec set\|liste\|supprimer` | public | Rappels récurrents (daily/weekly/monthly). |
| `/rappel-role <role> <message> [frequence] [delai]` | admin | Rappel pour un rôle entier. |
| `/tag show\|liste\|ajouter\|editer\|retirer` 💡 | staff (show/liste = public) | Tags FAQ (autocomplétion sur `nom`). |
| `/afk [raison]` | public | Marque AFK. |
| `/help` | public | Aide interactive filtrée par tier. |

## ⛏️ Minecraft & intégrations

| Commande | Tier | Description |
|---|---|---|
| `/mcstatus [ip]` | staff | Statut d'un serveur MC. |
| `/mclink demande\|statut\|delier` | staff | Lier le compte Discord à un pseudo MC (validation RCON). |
| `/mcsuivi ajouter\|liste\|supprimer` 💡 | admin | Panneau de statut auto-rafraîchi + alerte de rôle (autocomplétion sur `id`). |
| `/mcwhitelist add\|remove\|list` | admin | Whitelist via RCON. |
| `/notif ajouter-youtube\|ajouter-twitch\|ajouter-rss\|liste\|supprimer` 💡 | admin | Notifications YouTube · Twitch · RSS (autocomplétion sur `id`). |

## 🐙 Git / GitHub

| Commande | Tier | Description |
|---|---|---|
| `/git suivre\|liste\|config\|retirer` 💡 | admin | Gère les dépôts suivis (autocomplétion sur `id`). |
| `/git statut <depot>` 💡 | admin | État instantané d'un dépôt (autocomplétion sur les dépôts suivis). |
| `/git lier-membre <membre> <pseudo>` | admin | Lie un membre à un pseudo GitHub. |
| `/git digest\|digest-off` | admin | Récap périodique d'activité. |
| `/gitlink lier\|statut\|delier` | staff | Liaison auto-déclarée pseudo GitHub <->> Discord. |

> Sans `GITHUB_TOKEN` ni `GITHUB_WEBHOOK_SECRET`, le module est désactivé (commandes non déployées). Voir [Configuration → Suivi GitHub](CONFIGURATION.md#suivi-github).

## 🎵 Musique

> Nécessite un serveur **Lavalink** — voir [Lavalink](LAVALINK.md). Sans `LAVALINK_PASSWORD`, le module est désactivé (commandes non déployées).

| Commande | Description |
|---|---|
| `/play <recherche>` | Joue un titre/playlist YouTube ou ajoute à la file. |
| `/recherche <termes>` | Recherche YouTube avec menu. |
| `/pause` · `/resume` · `/skip` · `/stop` | Contrôles. |
| `/queue` · `/nowplaying` | File · titre en cours. |
| `/volume <0-150>` · `/seek <secondes>` | Volume · saut temporel. |
| `/loop <mode>` · `/shuffle` · `/jump <position>` | Boucle, mélange, saut de piste. |
| `/remove <position>` · `/clearqueue` | Retire un titre · vide la file. |
| `/filter <preset>` | Bass boost, nightcore, vaporwave, 8D, karaoké. |
| `/lyrics` | Paroles du titre en cours. |

## 📊 Salons statistiques · ⚙️ Configuration

`/stats`, `/config`, `/logs`, `/permissions`, `/backup`, `/setup-*` : voir [Configuration](CONFIGURATION.md).
