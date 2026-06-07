> 🇬🇧 **English version [CONFIGURATION_en.md](CONFIGURATION_en.md)** · [Retour au README](../README.md) ⬅️

# ⚙️ Configuration

Trois niveaux de configuration :
1. **Variables d'environnement** (`.env`) pour les secrets et options globales à l'hébergeur
2. **Fichiers source** (`src/`) pour le branding et contenus éditables (redémarrage requis).
3. **Configuration à chaud** (`/config`, `/logs`, …) **par serveur**, stockée en base, **sans redémarrage**.

---

## Variables d'environnement (`.env`)

Source de vérité : [`.env.example`](../.env.example) (copier en `.env`).

### Obligatoires

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Token du bot (Developer Portal -> Bot -> Reset Token) |
| `CLIENT_ID` | Application ID (Developer Portal -> General Information) |

> Le reste se configure **sur le serveur** via `/config`.

### Optionnelles

| Variable | Défaut | Description |
|---|---|---|
| `BOT_NAME` | `_unknown_variable` | Branding interne pour les fichiers (logs, User-Agent, statut, **nom du fichier BDD**). Différent du nom **affiché sur Discord** qui vient du Developer Portal. |
| `BOT_STATUS` | *(vide)* | Statuts tournants, séparés par `\|`. Placeholders `{name}` `{count}`. Défaut : `{name} \| /help \| {count} serveur(s)`. |
| `GUILD_ID` | *(vide)* | Serveur principal : déploiement instantané en dev (`npm run deploy:guild`) + **défaut** pour les `*_ROLE_ID` / `TICKET_*`. Inutile en multi-serveur. |
| `STAFF_ROLE_ID` | *(vide)* | **Défaut du serveur principal uniquement.** Préfèrer `/config staff`. |
| `ADMIN_ROLE_ID` | *(vide)* | **Défaut du serveur principal uniquement.** Préfèrer `/config admin`. |
| `TICKET_CATEGORY_ID` | *(vide)* | **Défaut du serveur principal uniquement.** Préfèrer `/config tickets`. |
| `LOGS_CHANNEL_ID` | *(vide)* | **Défaut du serveur principal uniquement.** Salon des résumés des tickets fermés. Préfèrer `/config tickets`. |
| `DATABASE_PATH` | `./data/<slug BOT_NAME>.db` | Chemin du fichier SQLite. ⚠️ À fixer explicitement si changement de `BOT_NAME` avec une base existante, sinon le bot pointera sur un nouveau fichier vide. |
| `HEALTH_PORT` | `3001` | Port de la **sonde de santé** HTTP (`GET /health` -> `ok`). `0` = désactivée. Sert au HEALTHCHECK Docker et au monitoring d'uptime. |
| `TWITCH_CLIENT_ID` · `TWITCH_CLIENT_SECRET` | *(vide)* | Sans eux, `/notif ajouter-twitch` est désactivé. Création sur <https://dev.twitch.tv/console/apps>. |
| `LAVALINK_HOST` · `LAVALINK_PORT` | `localhost` · `2333` | Serveur Lavalink (musique). |
| `LAVALINK_PASSWORD` | *(vide)* | **Sans mot de passe, le module musique est désactivé.** Voir [Lavalink](LAVALINK.md). |
| `LAVALINK_SECURE` | `false` | `true` si Lavalink utilise wss·https. |
| `GITHUB_TOKEN` | *(vide)* | PAT fine-grained **lecture seule** -> polling, `/git statut`, mention des auteurs. |
| `GITHUB_WEBHOOK_SECRET` | *(vide)* | Active le récepteur webhook (HMAC-SHA256) pour besoin temps réel. Sans token **ni** secret, le module GitHub est désactivé. |
| `GITHUB_WEBHOOK_PORT` · `_HOST` · `_PATH` | `3000` · `0.0.0.0` · `/github/webhook` | Écoute du récepteur webhook. |

> **L'intégration Github fonctionne en mode hybride** : renseigner `GITHUB_TOKEN` (polling, marche derrière un NAT) **et/ou** `GITHUB_WEBHOOK_SECRET` pour webhooks, en temps réel. Détails : [§ Suivi GitHub](#suivi-github).

La validation des variables se fait au démarrage (schéma **Zod**) : une variable obligatoire manquante ou invalide **arrête le bot** avec un message listant le problème.

---

## Configuration par fichiers (`src/`)

Un redémarrage est nécessaire après modification.

### `src/config.ts` couleurs & catégories de tickets

**Couleurs des embeds** (`colors`) format `0xRRGGBB` :

```ts
colors: {
  primary: 0x5865f2,  // bleu Discord pour la majorité des embeds
  neutral: 0x2b2d31,  // panneaux passifs
  success: 0x57f287,  // confirmations
  danger:  0xed4245,  // erreurs, sanctions
  warning: 0xfee75c   // avertissements, lockdown
}
```

**Catalogue des catégories de tickets possibles** (`tickets.categories`) structure/branding partagés :

```ts
categories: [
  { value: 'support', label: 'Support général',  description: 'Question ou aide',           emoji: '🛠️', staffRoleId: '' },
  { value: 'bug',     label: 'Signaler un bug',  description: 'Rapporter un problème',      emoji: '🐛', staffRoleId: '' },
  // …
]
```

| Champ | Rôle |
|---|---|
| `value` | Identifiant court (`[a-z0-9-]`), utilisé dans le nom du salon et la base |
| `label` / `description` / `emoji` | Affichage dans le menu déroulant |
| `staffRoleId` | **Normalement vide.** Le rôle responsable se configure **par serveur** via `/config ticket-role` |

> Le **rôle responsable** d'une catégorie se définit par serveur (`/config ticket-role`). Après modification du catalogue, **relancer `/setup-tickets`**.

### Autres contenus éditables

| Fichier | Contenu |
|---|---|
| [`src/data/reglement.ts`](../src/data/reglement.ts) | Texte du règlement (en-tête, articles, acceptation, footer). Découpé auto en 2 embeds (limite 6000 caractères) |
| [`src/data/help.ts`](../src/data/help.ts) | Catégories et signatures de `/help`, classement par tier |
| [`src/data/welcome.ts`](../src/data/welcome.ts) | Embed d'orientation sur le serveur envoyé en MP à la vérification |
| [`src/components/tickets.ts`](../src/components/tickets.ts) | `MAX_TICKETS_PER_DAY` (défaut 3), `REOPEN_WINDOW_MS` (défaut 7 j) |
| [`src/commands/community/suggest.ts`](../src/commands/community/suggest.ts) | `COOLDOWN_MS` (défaut 10 min), `TAGS` |
| [`src/i18n/messages.ts`](../src/i18n/messages.ts) | Traductions FR/EN (voir ci-dessous) |

### Internationalisation (`src/i18n/`)

L'**anglais est la langue canonique**, le français est servi selon `interaction.locale`. **Seules les descriptions et les réponses sont traduites : les noms de commandes/options restent inchangés.**

```ts
'avatar.title': {
  en: "{name}'s avatar",     // base canonique (anglais)
  fr: 'Avatar de {name}'     // affiché aux clients en français
}
```

- Définition : `.setDescription(base(key))` + `.setDescriptionLocalizations(frLoc(key))`.
- Réponse : `const lang = resolveLang(interaction.locale)` puis `t(lang, key, vars)`.
- `resolveLang` mappe un client `fr*` -> français, tout le reste -> anglais.

> **Pour traduire les commandes en anglais** voir [CONTRIBUTING](../CONTRIBUTING.md#i18n).

---

## Système de permissions (tiers)

| Tier | Définition | Gate runtime |
|---|---|---|
| `public` | Tout le monde | Aucune restriction |
| `ticket-staff` | Membre d'un rôle de catégorie de ticket (`/config ticket-role`) | `/add-user`, `/remove-user`, `/ticket move` |
| `staff` | Rôle staff (`/config staff`) **ou** perm Discord `KickMembers` / `BanMembers` / `ModerateMembers` / `ManageMessages` | `requireStaff` |
| `admin` | Owner, perm Discord `Administrator`, **ou** rôle admin (`/config admin`) | `requireAdmin` |

**Permissions Discord vs rôles personnalisés.** Discord n'affiche une commande à un membre **que si** son rôle possède la permission Discord requise. Les rôles staff/admin que tu crées sont vides par défaut - il faut leur **accorder** les perms :

```
/permissions check        -> bouton "Tout corriger"
```

| Commande | Action |
|---|---|
| `/permissions grant-staff` | Kick, Ban, ModerateMembers, ManageMessages, ManageNicknames, ManageChannels, ManageRoles, ViewAuditLog au rôle staff |
| `/permissions grant-admin` | Tout ce que staff a + ManageGuild + MentionEveryone au rôle admin |
| `/permissions grant-ticket-staff [role]` | ManageMessages à tous les rôles de catégories (ou à un rôle ponctuel) |

---

## Configuration à chaud (par serveur)

Ci-dessous modifiable **sans redémarrage**, stocké en base (`guild_config`).

### `/config <sous-commande>`

| Sous-commande | Paramètres | Effet |
|---|---|---|
| `voir` | - | Affiche l'état actuel. |
| `staff` · `admin` | `[role]` | Rôle modération · administration (vide = retirer). |
| `tickets` | `[categorie]` `[salon-logs]` | Catégorie des tickets + salon des transcripts. |
| `ticket-role` | `categorie` `[role]` | Rôle responsable d'une catégorie (vide = désactive la catégorie). |
| `automod` | `actif` `[phishing]` `[token-leak]` `[zalgo]` | Auto-modération et sous-modules. |
| `mot-ajouter` · `mot-retirer` | `mot` | Mots interdits (insensible à la casse, variantes leet). |
| `automod-spam` | `[messages:3-20]` `[secondes:3-30]` `[exclusion-minutes:1-60]` | Seuil·durée du timeout anti-spam (défauts 5 · 7 · 5). |
| `invite-whitelist` | `action:add\|remove\|list` `[guild-id]` | Serveurs alliés dont les invitations passent. |
| `antiraid` | `actif` `[age-min-compte:0-365]` `[expulser-jeunes]` `[verrouillage-auto]` `[quarantaine:role]` | Détection de vague + actions. |
| `captcha` | `actif` `[role-non-verifie]` `[role-verifie]` | Vérification visuelle (6 caractères, défi en éphémère). |
| `accueil` | `[message]` `[salon]` `[carte-image]` `[image-fond:url]` | Bienvenue à l'obtention du rôle règlement : MP (carte + embed) et carte postée dans `salon` **sans ping**. Variables : `{user}` `{username}` `{server}` `{count}`. |
| `depart` | `salon` `[message]` | Au revoir. Variables : `{username}` `{server}` `{count}`. |
| `autorole` | `role` | Rôle attribué à chaque arrivée. |
| `reglement` | `role` | Rôle donné au clic sur "J'accepte". |
| `suggestions` | `salon` | Salon de réception des `/suggestion`. |
| `vocaux-temp` | `salon:voice` `[categorie]` | Salon "rejoindre pour créer". |
| `minecraft` | `ip` `[salon-statut]` | IP suivie + salon de statut auto-rafraîchi. |
| `minecraft-rcon` | `host` `mot-de-passe` `[port:1-65535]` `[role-en-jeu]` | RCON pour `/mcwhitelist` + rôle en jeu. |
| `invitation` | `[url]` | URL d'invitation affichée dans les MP de kick·softban·unban. |
| `ticket-message` | `[message]` `[categorie]` | Message d'ouverture des tickets (max 3500 car.). Variables : `{user}` `{username}` `{category}` `{number}` `{server}`. |

### `/logs <sous-commande>`

8 catégories : `messages` · `members` · `roles` · `channels` · `voice` · `server` · `moderation` · `botactions`.

| Sous-commande | Paramètres | Effet |
|---|---|---|
| `voir` | - | État de chaque catégorie. |
| `salon` | `categorie` `salon` | Définit le salon d'une catégorie et l'active. |
| `toggle` | `categorie` `actif` | Active·désactive sans déconfigurer. |
| `tout-dans` | `salon` | Toutes les catégories dans un seul salon (utile au démarrage). |

### Déploiement de panneaux (`/setup-*`)

| Commande | Effet |
|---|---|
| `/setup-tickets deployer [salon:]` | Panneau du menu de tickets dans le salon indiqué (ou le salon courant). |
| `/setup-reglement deployer [salon:]` | Règlement (textes de `src/data/reglement.ts`) + bouton d'acceptation, dans le salon indiqué (ou le salon courant). |
| `/setup-captcha` | Bouton de vérification (défi affiché en éphémère). |
| `/setup-roles role1:… [titre] [description] [role2…role5]` | Panneau de rôles auto-attribuables (boutons, jusqu'à 5). |
| `/setup-reaction-roles titre: description: paires: [exclusif]` | Panneau emoji -> rôle (`🟦 @Bleu, 🔴 @Rouge`, jusqu'à 10 paires). |

### Suivi et notifications

| Commande | Effet |
|---|---|
| `/notif ajouter-youtube identifiant-chaine:UC… salon: [nom] [role]` | Suit une chaîne YouTube. |
| `/notif ajouter-twitch pseudo: salon: [role]` | Suit un streamer Twitch (nécessite `TWITCH_*`). |
| `/notif ajouter-rss url: salon: [nom] [role]` | Suit un flux **RSS/Atom** générique. |
| `/notif liste` · `/notif supprimer id:` | Lister · retirer (autocomplétion sur l'`id`). |
| `/mcsuivi ajouter\|liste\|supprimer` | Panneau de statut MC auto-rafraîchi + alerte de rôle. |

L'option `[role]` ajoute une mention de rôle en tête de chaque annonce. À la première lecture, l'état est mémorisé **sans annoncer** (anti-flood) ; les publications suivantes déclenchent un message. Poll +/- toutes les 5 min.

#### Instagram / TikTok / X via RSS

Ces plateformes n'ont pas d'API publique gratuite stable. Passe par **[RSSHub](https://docs.rsshub.app/)** (open-source, self-hostable) :

| Source | URL RSS |
|---|---|
| Instagram | `https://rsshub.app/instagram/user/<username>` |
| TikTok | `https://rsshub.app/tiktok/user/@<username>` |
| X / Twitter | `https://rsshub.app/twitter/user/<username>` |
| Reddit | `https://www.reddit.com/r/<sub>/.rss` *(natif)* |
| Blog WordPress | `<blog>/feed/` *(natif)* |

> L'instance publique `rsshub.app` est rate-limitée ; pour de la prod, héberger sa propre instance (profil `rss` du [docker-compose](../docker-compose.yml)).

#### Suivi GitHub

**Hybride** : webhooks temps réel (`GITHUB_WEBHOOK_SECRET`) et·ou polling de secours (`GITHUB_TOKEN`). Déduplication interne. Désactivé tant qu'aucune des deux variables n'est remplie.

- **Polling (recommandé, marche derrière un NAT)** : *fine-grained PAT* **lecture seule** (Metadata, Contents, Pull requests, Actions, Issues) -> `GITHUB_TOKEN` -> redémarrer. Poll ≈ 2 min.
- **Webhooks (temps réel)** : `GITHUB_WEBHOOK_SECRET` -> le bot expose `POST <hôte>:<port>/github/webhook`. Côté dépôt : *Settings -> Webhooks*, Content type `application/json`, même secret. Derrière un NAT : tunnel (`cloudflared`, `smee.io`).

| Commande | Effet |
|---|---|
| `/git suivre depot: salon: [branches] [role] [salon-statut] [events]` | Suit un dépôt. `role` pingué sur **échec CI** ; `salon-statut` = embed pipeline live. |
| `/git liste` · `/git config id:` · `/git retirer id:` | Gérer (autocomplétion sur l'`id`). |
| `/git statut depot:` | État instantané (autocomplétion sur les dépôts suivis ; nécessite `GITHUB_TOKEN`). |
| `/git lier-membre` · `/git digest` · `/git digest-off` | Liaison auteur, récap périodique. |
| `/gitlink lier\|statut\|delier` | Chaque membre déclare son pseudo GitHub. |

### Salons statistiques

`/stats creer` · `ajouter` · `retirer` · `liste` · `supprimer`. Discord limite les renommages de salon à ~2·10 min -> un compteur se met à jour au mieux toutes les ~6 min.

### Sauvegarde · restauration

- `/backup export` - exporte `guild_config` + stats + mc_watchers + notifications + tags + reaction-roles en JSON (migration de config, **pas** disaster recovery).
- `/backup import fichier:.json` - restaure. Voir [Base de données](DATABASE.md) pour la sauvegarde complète du `.db`.

---

➡️ Catalogue exhaustif des commandes : [Commandes](COMMANDS.md).
