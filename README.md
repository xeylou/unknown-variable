# 🤖 _unknown_variable — Bot Discord multifonction

Bot Discord multifonction (TypeScript strict + Prisma 7 + SQLite). 67 commandes, 16 composants, 7 events. Nom du bot personnalisable via `BOT_NAME`.

> 📘 Ce README couvre **tout** : installation, mise en route, hébergement, mises à jour et base de données. Seul le module musique a son guide dédié : [`LAVALINK.md`](LAVALINK.md).

**Modules :**
- 🎫 **Tickets** — panneau + sélecteur, catégories isolées par équipe, transcript, notation, réouverture 7 j en DM
- 🛡️ **Modération** — sanctions DM + casier + log, lockdown salon/serveur, anti-raid, auto-modération (phishing, tokens, Zalgo, mots, spam, invites)
- 📜 **Logs & Audit** — journal par catégorie (messages, membres, rôles, salons, vocal, serveur, modération, bot)
- 📜 **Règlement** — affichage en deux embeds + bouton d'acceptation → rôle d'accès
- 👋 **Accueil** — welcome card PNG, autorôle, CAPTCHA mathématique, message DM
- 🎉 **Engagement** — giveaways (conditions + multiplicateurs), suggestions (thread + vote), sondages persistants et natifs
- 🔊 **Vocaux temporaires** — salon « rejoindre pour créer » + panneau de contrôle
- 🧰 **Utilitaires** — `/userinfo`, `/serverinfo`, `/avatar`, `/ping`, `/botinfo`, rappels (ponctuels, récurrents, par rôle), tags FAQ, AFK, embed builder
- ⛏️ **Minecraft** — statut, suivi automatique, RCON (whitelist, rôle en jeu)
- 🔔 **Notifications** — YouTube, Twitch, et **flux RSS génériques** (Instagram, TikTok, X via RSSHub, Reddit, blogs, podcasts…) avec ping de rôle configurable
- 🐙 **GitHub** — suivi de dépôts privés (commits, PR/merges, **CI/CD**, releases, issues, reviews) en **hybride** webhooks temps réel + polling de secours ; statut pipeline live, ping de rôle sur échec CI, digest périodique, liaison GitHub↔Discord
- 🎵 **Musique** — lecture YouTube via Lavalink (file, filtres, paroles)
- 📊 **Salons statistiques** — compteurs de membres par rôle

---

## 1. Création du bot Discord

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (= `DISCORD_TOKEN`).
3. Onglet **Bot** → active les **Privileged Gateway Intents** :
   - `SERVER MEMBERS INTENT` ✅
   - `MESSAGE CONTENT INTENT` ✅
4. Onglet **General Information** → copie l'**Application ID** (= `CLIENT_ID`).
5. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Bot Permissions : `Manage Channels`, `Manage Roles`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Move Members`, `Mute Members`, `Deafen Members`, `Add Reactions`, `View Audit Log`
   - Plus simple : coche `Administrator` pour éviter les soucis de permission.
   - Copie l'URL en bas, ouvre-la, invite le bot sur ton serveur.

> 💡 Le **nom de l'application** (Developer Portal → General Information → *Name*) devient le nom affiché du bot dans Discord — repris automatiquement dans les embeds. Pour le branding interne (logs, User-Agent, nom du fichier BDD, statut), tu peux aussi définir `BOT_NAME` dans le `.env` (voir [§5](#5-variables-denvironnement-env)).

---

## 2. Préparation du serveur Discord

Active **Mode développeur** (Paramètres utilisateur → Avancés) pour pouvoir copier les IDs (clic droit → *Copier l'identifiant*). `GUILD_ID` = clic droit sur le serveur.

### Rôles à créer **avant** le démarrage du bot

| Rôle | Sert à | Comment |
|---|---|---|
| `Staff` | Modération (`KICK`/`BAN`/`TIMEOUT`/`WARN`…) | Créer un rôle « Staff », copier son ID → `STAFF_ROLE_ID` dans `.env`. |
| `Administration` *(optionnel)* | Commandes sensibles (`/config`, `/logs`, `/backup`, `/lockdown serveur`, `/setup-*`, `/role temp`, `/rappel-role`) | Créer un rôle « Admin », copier son ID → `ADMIN_ROLE_ID` dans `.env`. |
| `Membre vérifié` | Donné quand un membre clique « J'accepte le règlement » | À configurer après le boot via `/config reglement role:`. |
| **Un rôle par catégorie de ticket** | Équipe responsable d'une catégorie. **Seuls eux voient les tickets** de cette catégorie et reçoivent le ping à l'ouverture. | Un rôle par catégorie (`@Support`, `@Bug-team`, `@Builders`…). Les IDs iront dans `src/config.ts` (voir [§6.1](#61-srcconfigts--catégories-de-tickets-couleurs)). |

⚠️ **Hiérarchie cruciale** : le rôle du bot doit être **au-dessus** de tous les rôles qu'il manipule (Staff, Admin, rôles temporaires, rôles de tickets, autorôle). Sinon `Missing Permissions` sur les attribute/remove.

### Salons & catégories à créer

| Élément | Sert à | Variable / commande |
|---|---|---|
| Catégorie « Tickets » | Conteneur des salons de tickets | `TICKET_CATEGORY_ID` dans `.env` |
| Salon `#logs-tickets` (privé staff) | Transcripts à la fermeture | `LOGS_CHANNEL_ID` dans `.env` |
| Salon `#bienvenue` | Welcome card / message | `/config accueil` |
| Salon `#règlement` | Affichage du règlement | `/setup-reglement` |
| Salons `#logs-messages`, `#logs-modération`, etc. (privés staff) | Logs serveur catégorisés | `/logs salon …` |
| Salon `#suggestions` | Réception `/suggestion` | `/config suggestions` |
| Salon vocal « ➕ Créer un vocal » | Pattern « rejoindre pour créer » | `/config vocaux-temp` |
| Salon `#tickets` | Panneau de sélection des catégories | `/setup-tickets` (à lancer dedans) |

---

## 3. Installation locale

```bash
git clone <ton-repo> unknown_variable
cd unknown_variable
npm install                 # installe + génère le client Prisma (hook postinstall)
cp .env.example .env
# Édite .env avec tes valeurs
npx prisma db push          # crée la base SQLite + les tables (1ʳᵉ fois)
npm start
```

> Si tu vois `Cannot find module '.prisma/client'` au démarrage : le client Prisma n'a pas été généré — lance `npx prisma generate` (puis `npx prisma db push`).

> ⚠️ Avant le boot : configure les **catégories de tickets** dans `src/config.ts` (étape la plus oubliée — voir [§6.1](#61-srcconfigts--catégories-de-tickets-couleurs)). Une catégorie sans `staffRoleId` refuse la création de ticket.

### Mise en route en jeu (dans l'ordre, une seule fois)

À faire dans Discord après le premier boot :

```
1. /permissions check
   → Bouton « Tout corriger » : accorde aux rôles Staff/Admin/ticket-staff les
     perms Discord nécessaires pour que les /commandes apparaissent dans leur
     auto-complétion.

2. /logs tout-dans salon:#logs-modération
   → Active les 8 catégories de logs dans un salon. Granularise ensuite avec
     /logs salon categorie:messages salon:#logs-messages

3. /config reglement role:@Membre vérifié
   → Rôle donné quand un membre clique « J'accepte ».

4. /setup-reglement
   → À lancer DANS #règlement. Stocke l'ID du salon pour les DM de sanctions.

5. /config autorole role:@En attente        (optionnel)
   → Rôle attribué à chaque arrivée (typiquement « pré-vérification »).

6. /config accueil salon:#bienvenue carte-image:true
   → Welcome card. Ajoute message:"..." et/ou image-fond:https://...
     Variables : {user} {username} {server} {count}.

7. /config suggestions salon:#suggestions

8. /config vocaux-temp salon:#➕-créer-vocal [categorie:#Vocaux]

9. /setup-tickets
   → À lancer DANS #tickets. Déploie le menu déroulant.
```

### Modules optionnels à activer si voulus

```
/config automod actif:true phishing:true token-leak:true zalgo:true
/config antiraid actif:true age-min-compte:7 expulser-jeunes:true
/config captcha actif:true role-non-verifie:@Non-vérifié role-verifie:@Vérifié salon:#vérification
/config minecraft ip:play.monserveur.fr salon-statut:#statut-mc
/config minecraft-rcon host:play.monserveur.fr mot-de-passe:xxx port:25575 role-en-jeu:@En jeu
/setup-roles role1:@Joueur role2:@Builder titre:"Choisis ton rôle"
/config invitation url:https://discord.gg/xxxx
```

Référence complète de toutes les commandes de config : [§8](#8-configuration-à-chaud-via-commandes). Intégrations externes (Twitch, YouTube, RSS, GitHub) : [§8.5](#85-suivi--notifications).

---

## 4. Hébergement

### Option A — VPS Linux (recommandé, ~3-5 €/mois)

Providers : **Hetzner CX22** (~4 €/mois), **OVH VPS Starter**, **Contabo**, **Scaleway Stardust**.

```bash
sudo apt update && sudo apt install -y nodejs npm git
sudo adduser --disabled-password unknown_variable
sudo su - unknown_variable
git clone <ton-repo> unknown_variable
cd unknown_variable && npm install
cp .env.example .env && nano .env
exit

sudo cp /home/unknown_variable/unknown_variable/unknown_variable.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now unknown_variable
sudo systemctl status unknown_variable
```

### Option B — Docker

```bash
docker build -t unknown_variable .
docker run -d --name unknown_variable --restart unless-stopped \
  --env-file .env -v unknown_variable-data:/app/data unknown_variable
docker logs -f unknown_variable
```

### Option C — Plateformes managées

| Plateforme | Prix | Notes |
|---|---|---|
| **Railway** | ~5 $/mois | Le plus simple : connecte ton repo, ajoute les variables `.env` dans le dashboard. |
| **Fly.io** | Free limité, puis ~3 $/mois | `fly launch` détecte le Dockerfile. |
| **Render** | Free (s'endort) ou ~7 $/mois | Choisir *Background Worker*. |
| **Sparked Host / Pterodactyl** | ~2 €/mois | Spécialisé bots Discord, panel web. |

⚠️ **Ne jamais** héberger un bot sur Heroku free, Replit free, Glitch : ils s'endorment.

---

## 5. Variables d'environnement (`.env`)

Source de vérité : [`.env.example`](.env.example) (copier en `.env`).

### Obligatoires

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Token du bot (Developer Portal → Bot → Reset Token). |
| `CLIENT_ID` | Application ID (Developer Portal → General Information). |
| `GUILD_ID` | ID du serveur cible. |
| `STAFF_ROLE_ID` | Rôle modération. Reçoit les perms via `/permissions grant-staff`. |

### Optionnelles

| Variable | Défaut | Description |
|---|---|---|
| `BOT_NAME` | `_unknown_variable` | Nom de marque (logs, User-Agent, statut, nom du fichier BDD). Le nom **affiché dans Discord** vient lui du Developer Portal. |
| `BOT_STATUS` | *(vide)* | Statuts tournants, séparés par `\|`. Placeholders `{name}` `{count}`. Défaut : `{name} \| /help \| {count} serveur(s)`. |
| `ADMIN_ROLE_ID` | *(vide)* | Rôle « super-staff » pour les commandes sensibles. Sans ça, il faut la permission Discord « Administrateur ». |
| `TICKET_CATEGORY_ID` | *(vide)* | Catégorie Discord où ranger les salons de tickets. Sans ça, ils sont créés à la racine. |
| `LOGS_CHANNEL_ID` | *(vide)* | Salon où sont déposés les transcripts à la fermeture d'un ticket. |
| `DATABASE_PATH` | `./data/<slug BOT_NAME>.db` | Chemin du fichier SQLite. Dérivé de `BOT_NAME` si absent (défaut → `./data/unknown_variable.db`). ⚠️ Fixe-le explicitement si tu changes `BOT_NAME` avec une base existante, sinon le bot pointera sur un nouveau fichier vide. |
| `TWITCH_CLIENT_ID` | *(vide)* | Client ID Twitch — sans ça, `/notif ajouter-twitch` est désactivé. Création : https://dev.twitch.tv/console/apps |
| `TWITCH_CLIENT_SECRET` | *(vide)* | Secret Twitch. |
| `LAVALINK_HOST` | `localhost` | Hôte du serveur Lavalink (musique). |
| `LAVALINK_PORT` | `2333` | Port du serveur Lavalink. |
| `LAVALINK_PASSWORD` | *(vide)* | **Sans mot de passe, le module musique est désactivé.** Voir [`LAVALINK.md`](LAVALINK.md). |
| `LAVALINK_SECURE` | `false` | `true` si le serveur Lavalink utilise wss/https. |
| `GITHUB_TOKEN` | *(vide)* | PAT fine-grained **lecture seule** → active le polling, `/git statut` et la mention des auteurs. Sans token **ni** secret webhook, le module GitHub est désactivé. |
| `GITHUB_WEBHOOK_SECRET` | *(vide)* | Active le récepteur webhook (signatures HMAC-SHA256) → mode temps réel. |
| `GITHUB_WEBHOOK_PORT` | `3000` | Port d'écoute du récepteur webhook. |
| `GITHUB_WEBHOOK_HOST` | `0.0.0.0` | Adresse d'écoute du récepteur webhook. |
| `GITHUB_WEBHOOK_PATH` | `/github/webhook` | Chemin de l'endpoint webhook (`POST`). |

> **GitHub — mode hybride** : `GITHUB_TOKEN` (polling, marche derrière un NAT) et/ou `GITHUB_WEBHOOK_SECRET` (webhooks temps réel, exige que le bot soit joignable). Détails, scopes du PAT et config du webhook : [§8.5 Suivi GitHub](#suivi-github-git).

---

## 6. Configuration via fichiers (`src/`)

Ce qui se modifie en éditant un fichier source (un redémarrage du bot est nécessaire après changement).

### 6.1 `src/config.ts` — Catégories de tickets, couleurs

Ouvre [`src/config.ts`](src/config.ts) :

#### Couleurs des embeds (objet `colors`)

```ts
colors: {
  primary: 0x5865f2,  // bleu Discord — la majorité des embeds
  neutral: 0x2b2d31,  // panneau de tickets, panneaux passifs
  success: 0x57f287,  // confirmation d'action
  danger:  0xed4245,  // erreur, sanction, ban
  warning: 0xfee75c   // avertissement, lockdown
}
```

Format hexadécimal `0xRRGGBB`. Tu peux utiliser le sélecteur Discord pour trouver une teinte qui matche ton thème.

#### Catégories du menu de tickets (`tickets.categories`)

C'est la liste affichée dans le menu déroulant déployé par `/setup-tickets`. Édite, ajoute ou retire des entrées :

```ts
categories: [
  { value: 'support', label: 'Support général',  description: 'Question ou aide',           emoji: '🛠️', staffRoleId: '' },
  { value: 'bug',     label: 'Signaler un bug',  description: 'Rapporter un problème',      emoji: '🐛', staffRoleId: '' },
  { value: 'build',   label: 'Demande de build', description: 'Commander une construction', emoji: '🏗️', staffRoleId: '' },
  { value: 'staff',   label: 'Contact staff',    description: 'Demande privée au staff',    emoji: '👤', staffRoleId: '1507070171158941816' },
  { value: 'other',   label: 'Autre',            description: 'Autre demande',              emoji: '❓', staffRoleId: '' }
]
```

| Champ | Rôle |
|---|---|
| `value` | Identifiant court (utilisé dans le nom du salon `value-pseudo-numero` et la base). N'utilise que `[a-z0-9-]`. |
| `label` | Libellé affiché dans le menu et dans le titre de l'embed du ticket. |
| `description` | Sous-titre du menu déroulant. |
| `emoji` | Emoji affiché à gauche dans le menu. Unicode ou custom (`<:nom:id>`). |
| `staffRoleId` | **Obligatoire** — ID du rôle Discord responsable. Pingué à l'ouverture, seul à voir le ticket (avec `ADMIN_ROLE_ID`). Une catégorie sans `staffRoleId` refuse la création. |

⚠️ Après modification : relance `/setup-tickets` (les anciens panneaux ont un `customId` qui ne reflète pas les nouvelles valeurs).

### 6.2 `src/data/reglement.ts` — Texte du règlement

Affiché par `/setup-reglement`. Modifie librement :

```ts
{
  header: { title: '...', intro: '...' },         // En-tête
  acceptation: '...',                              // Texte au-dessus du bouton « J'accepte »
  footer: '...',                                   // Pied de page
  articles: [
    { emoji: '🤝', titre: 'Respect & savoir-vivre', contenu: '...' },
    { emoji: '🗣️', titre: 'Langage & ton',          contenu: '...' },
    // ...
  ]
}
```

Le règlement est découpé automatiquement en deux embeds (limite Discord 6000 caractères / embed). Tu peux ajouter autant d'articles que tu veux tant que le total reste sous la limite.

### 6.3 `src/data/help.ts` — Contenu de `/help`

Liste des catégories affichées et signature de chaque commande dans l'aide interactive. À éditer si tu ajoutes/retires une commande, ou si tu veux re-classer une commande par tier (`public` / `staff` / `ticket-staff` / `admin`).

```ts
{
  id: 'tickets',
  emoji: '🎫',
  label: 'Tickets',
  summary: '...',
  tip: '...',                       // Affiché en pied de page du détail
  defaultTier: 'staff',             // Tier par défaut des commandes de la catégorie
  commands: [
    { usage: '/setup-tickets', description: '...', tier: 'admin' },
    { usage: '/add-user <utilisateur>', description: '...', tier: 'ticket-staff' },
    // ...
  ]
}
```

### 6.4 `src/components/tickets.ts` — Limite de tickets / fenêtre de réouverture

| Constante | Défaut | Effet |
|---|---|---|
| `MAX_TICKETS_PER_DAY` | `3` | Plafond de tickets ouverts par membre sur 24 h. |
| `REOPEN_WINDOW_MS` | `7 * 24 * 3600 * 1000` | Fenêtre pendant laquelle un ticket fermé peut être rouvert depuis le DM. |

**Flux de fermeture** : à la fermeture, le DM envoyé à l'auteur contient 3 lignes de boutons :
1. **Notation 1-5 étoiles** → stockée dans `tickets.rating`.
2. **« Rouvrir le ticket »** → recrée le salon avec les permissions d'origine (fenêtre `REOPEN_WINDOW_MS`).
3. **« Laisser un commentaire »** → ouvre une modale ; le texte est stocké dans `tickets.comment` (max 1000 chars) et un embed est posté dans le salon de logs `moderation`. Consultation via `/ticket-reviews`.

Note et commentaire sont **indépendants** : on peut laisser l'un, l'autre, ou les deux.

### 6.5 `src/commands/community/suggest.ts` — Cooldown des suggestions

| Constante | Défaut | Effet |
|---|---|---|
| `COOLDOWN_MS` | `10 * 60 * 1000` | Délai mini entre deux `/suggestion` du même membre. |
| `TAGS` | 6 entrées | Catégories du choix `categorie:` du formulaire. |

---

## 7. Architecture & système de permissions

### Tiers (utilisateurs)

| Tier | Définition | Gate runtime |
|---|---|---|
| `public` | Tout le monde | Aucune restriction |
| `ticket-staff` | Membre d'un rôle `tickets.categories[].staffRoleId` | Visible sur `/help`, `/add-user`, `/remove-user`, `/ticket move` |
| `staff` | `STAFF_ROLE_ID` ou perm Discord `KickMembers` / `BanMembers` / `ModerateMembers` / `ManageMessages` | `requireStaff` |
| `admin` | Owner OU perm Discord `Administrator` OU `ADMIN_ROLE_ID` | `requireAdmin` |

### Permissions Discord vs rôles personnalisés

Discord n'affiche une slash-command à un membre **que si** son rôle possède la permission Discord requise par la commande. Les rôles `STAFF_ROLE_ID` / `ADMIN_ROLE_ID` que tu crées sont vides par défaut — il faut leur **accorder** les bonnes perms.

**Fais ça en un clic :**
```
/permissions check
```
Le bouton « Tout corriger » accorde au rôle staff, au rôle admin et aux rôles ticket-staff toutes les permissions Discord recommandées. Sinon, en granulaire :

| Commande | Action |
|---|---|
| `/permissions grant-staff` | Accorde à `STAFF_ROLE_ID` : Kick, Ban, ModerateMembers, ManageMessages, ManageNicknames, ManageChannels, ManageRoles, ViewAuditLog. |
| `/permissions grant-admin` | Accorde à `ADMIN_ROLE_ID` : tout ce que staff a + ManageGuild + MentionEveryone. |
| `/permissions grant-ticket-staff [role]` | Accorde ManageMessages à tous les `staffRoleId` configurés (ou à un rôle ponctuel). |

---

## 8. Configuration à chaud via commandes

Tout ce qui est listé ici est modifiable **sans redémarrage**, stocké en base SQLite (`guild_config`).

### 8.1 `/config <sous-commande>`

| Sous-commande | Paramètres | Effet |
|---|---|---|
| `voir` | — | Affiche l'état actuel de tout. |
| `automod` | `actif:bool` `[phishing:bool]` `[token-leak:bool]` `[zalgo:bool]` | Active/désactive l'auto-mod et ses sous-modules. |
| `mot-ajouter` / `mot-retirer` | `mot:string` | Mots interdits (case-insensitive, applique aussi aux variantes leet light). |
| `automod-spam` | `[messages:3-20]` `[secondes:3-30]` `[exclusion-minutes:1-60]` | Seuil et durée du timeout anti-spam. Défauts 5 / 7 / 5. |
| `invite-whitelist` | `action:add\|remove\|list` `[guild-id:string]` | Serveurs alliés autorisés à voir leurs invitations passer (sinon supprimées si automod actif). |
| `antiraid` | `actif:bool` `[age-min-compte:0-365]` `[expulser-jeunes:bool]` `[verrouillage-auto:bool]` `[quarantaine:role]` | Détection de vague + actions auto. `age-min-compte` 0 = désactivé. |
| `captcha` | `actif:bool` `[role-non-verifie:role]` `[role-verifie:role]` `salon:chan` | Vérification math à l'entrée. Le rôle non-verifie bloque l'accès, le rôle verifie le débloque après réussite. |
| `accueil` | `salon:chan` `[message:string]` `[carte-image:bool]` `[image-fond:url]` `[message-dm:string]` | Welcome dans le salon + DM. Variables : `{user}` `{username}` `{server}` `{count}`. `image-fond` accepte une URL `https://...` ou `retirer` pour revenir au dégradé. |
| `depart` | `salon:chan` `[message:string]` | Au revoir. Variables : `{username}` `{server}` `{count}`. |
| `autorole` | `role:role` | Rôle attribué à toute nouvelle arrivée. |
| `reglement` | `role:role` | Rôle donné au clic sur « J'accepte le règlement ». |
| `suggestions` | `salon:chan` | Salon de réception des `/suggestion`. |
| `vocaux-temp` | `salon:voice` `[categorie:category]` | Salon « rejoindre pour créer ». La catégorie indique où ranger les vocaux créés. |
| `minecraft` | `ip:string` `[salon-statut:chan]` | IP suivie + salon où afficher le statut auto-rafraîchi. |
| `minecraft-rcon` | `host:string` `mot-de-passe:string` `[port:1-65535]` `[role-en-jeu:role]` | RCON pour `/mcwhitelist` et le rôle attribué aux joueurs connectés. Port défaut 25575. |
| `invitation` | `[url:string]` | URL d'invitation Discord affichée dans les DM de kick/softban/unban. Vide = retirer. |
| `ticket-message` | `[message:string]` `[categorie:choix]` | **Message d'ouverture des tickets.** Vide = restaurer le défaut. Sans `categorie` = applique à toutes les catégories. Variables : `{user}` `{username}` `{category}` `{number}` `{server}`. Max 3500 caractères. |

### 8.2 `/logs <sous-commande>`

8 catégories : `messages` · `members` · `roles` · `channels` · `voice` · `server` · `moderation` · `botactions`.

| Sous-commande | Paramètres | Effet |
|---|---|---|
| `voir` | — | État de chaque catégorie. |
| `salon` | `categorie:choix` `salon:chan` | Définit le salon de cette catégorie et l'active. |
| `toggle` | `categorie:choix` `actif:bool` | Active/désactive la catégorie sans la déconfigurer. |
| `tout-dans` | `salon:chan` | Envoie **toutes** les catégories dans un seul salon (utile en démarrage). |

### 8.3 `/permissions <sous-commande>`

| Sous-commande | Paramètres | Effet |
|---|---|---|
| `check` | — | Affiche l'état des perms des 3 types de rôles bot + bouton « Tout corriger ». |
| `grant-staff` | — | Accorde les perms staff à `STAFF_ROLE_ID`. |
| `grant-admin` | — | Accorde les perms admin à `ADMIN_ROLE_ID`. |
| `grant-ticket-staff` | `[role:role]` | Accorde ManageMessages à tous les `staffRoleId` (ou à un rôle ponctuel). |

### 8.4 Déploiement de panneaux (`/setup-*`)

| Commande | Paramètres | Effet |
|---|---|---|
| `/setup-tickets` | — | Déploie le panneau du menu de tickets dans le salon courant. Relancer après modification de `tickets.categories`. |
| `/setup-reglement` | — | Déploie le règlement (textes de [`src/data/reglement.ts`](src/data/reglement.ts)) + bouton d'acceptation. |
| `/setup-roles` | `role1:role` `[titre]` `[description]` `[role2:role]…[role5:role]` | Panneau de rôles auto-attribuables (jusqu'à 5 rôles, boutons). |
| `/setup-reaction-roles` | `titre:string` `description:string` `paires:string` `[exclusif:bool]` | Panneau classique emoji → rôle. Format `paires` : `🟦 @Bleu, 🔴 @Rouge` (jusqu'à 10 paires). |

### 8.5 Suivi & notifications

| Commande | Paramètres | Effet |
|---|---|---|
| `/mcsuivi ajouter` | `ip:string` `salon:chan` `role:role` `[intervalle:2-60]` | Panneau de statut MC rafraîchi en boucle. Ping `role` à chaque changement on/off. |
| `/mcsuivi liste` / `supprimer id:int` | — | Lister / retirer un suivi. |
| `/notif ajouter-youtube` | `identifiant-chaine:string` `salon:chan` `[nom]` `[role]` | Suit une chaîne YouTube (ID `UC…`). |
| `/notif ajouter-twitch` | `pseudo:string` `salon:chan` `[role]` | Suit un streamer Twitch (nécessite `TWITCH_CLIENT_ID/SECRET` dans `.env`). |
| `/notif ajouter-rss` | `url:string` `salon:chan` `[nom]` `[role]` | Suit un flux **RSS / Atom** générique : Instagram, TikTok, X, Reddit, blogs… via [RSSHub](https://docs.rsshub.app/) ou un flux natif. Voir [§Instagram/TikTok/X](#instagram-tiktok-x-via-rss). |
| `/notif liste` / `supprimer id:int` | — | Lister / retirer une notification. |

L'option `[role]` ajoute une mention de rôle en tête de chaque annonce (utile pour ping `@Communauté`, `@News`, etc.).

#### Instagram, TikTok, X via RSS

Les plateformes Instagram / TikTok / X (Twitter) n'ont pas d'API publique gratuite stable. La solution : un **intermédiaire qui génère un flux RSS** à partir d'un profil. Le plus courant est **[RSSHub](https://docs.rsshub.app/)** (open-source, self-hostable, instance publique gratuite à `rsshub.app` — pour de la prod, héberge ta propre instance).

Exemples d'URL à passer à `/notif ajouter-rss` :

| Source | URL RSS |
|---|---|
| Instagram d'un compte | `https://rsshub.app/instagram/user/<username>` |
| TikTok d'un compte | `https://rsshub.app/tiktok/user/@<username>` |
| X / Twitter d'un compte | `https://rsshub.app/twitter/user/<username>` |
| Reddit subreddit | `https://www.reddit.com/r/<sub>/.rss` *(natif)* |
| Blog WordPress | `<blog>/feed/` *(natif)* |
| Podcast | URL du flux RSS du podcast *(natif)* |

⚠️ **Limites** :
- L'instance publique `rsshub.app` est rate-limitée et peut être bloquée par Instagram/TikTok par moments — pour un usage sérieux, **héberge ta propre instance** (Docker, 1 ligne).
- Le poll du bot tourne toutes les **5 min** — une annonce peut donc avoir jusqu'à 5 min de retard.
- À la première lecture, le bot mémorise l'état actuel **sans annoncer** (évite de flooder à la mise en place). Les publications **suivantes** déclenchent l'annonce.

#### Suivi GitHub (`/git`)

Suit l'activité de dépôts (commits, PR/merges, **CI/CD GitHub Actions**, releases, issues, reviews). **Hybride** : webhooks temps réel (`GITHUB_WEBHOOK_SECRET`) et/ou polling de secours (`GITHUB_TOKEN`) — une déduplication interne évite tout doublon. Le module reste désactivé tant qu'aucune des deux variables n'est remplie. Pour des dépôts **privés**, les deux approches marchent :

**Option A — Polling (recommandé, zéro infra réseau, marche derrière un NAT/box maison)**
1. Crée un *fine-grained PAT* sur https://github.com/settings/tokens (Tokens → Fine-grained), accès aux dépôts voulus, en **lecture seule** : *Metadata*, *Contents*, *Pull requests*, *Actions*, *Issues*.
2. `.env` : `GITHUB_TOKEN=github_pat_...` → redémarrer.
3. Le bot interroge l'API toutes les ~2 min. Premier passage : état mémorisé **sans annoncer** (évite le flood) ; les events suivants déclenchent les messages.

**Option B — Webhooks (temps réel, exige que le bot soit joignable depuis Internet)**
1. `.env` : `GITHUB_WEBHOOK_SECRET=<chaîne aléatoire>` (+ éventuellement `GITHUB_WEBHOOK_PORT`, défaut 3000) → redémarrer. Le bot expose `POST <hôte>:<port>/github/webhook` (signatures vérifiées en HMAC-SHA256).
2. Dépôt → *Settings → Webhooks → Add webhook* : Payload URL = `http(s)://<hôte>:<port>/github/webhook`, Content type = `application/json`, Secret = la même valeur, « Send me everything » (ou push / pull_request / workflow_run / release / issues / pull_request_review).
3. Derrière un NAT/box maison : expose le port via un tunnel (`cloudflared tunnel`, `smee.io`) — ou reste en **Option A** (aucune ouverture de port).

> Renseigner **les deux** = mode hybride : webhooks pour le temps réel + polling lent en filet de sécurité (réconciliation ~10 min). Pense à `npm run deploy` après avoir activé le module (les commandes `/git` ne s'enregistrent que si `GITHUB_TOKEN`/`GITHUB_WEBHOOK_SECRET` est défini).

| Commande | Paramètres | Effet |
|---|---|---|
| `/git suivre` | `depot:owner/repo` `salon:chan` `[branches]` `[role]` `[salon-statut]` `[events]` | Suit un dépôt. `role` pingué sur **échec CI**, `salon-statut` = embed « pipeline » édité en place. |
| `/git liste` / `retirer id:int` / `config id:int [..]` | — | Lister / retirer / reconfigurer un dépôt suivi. |
| `/git statut` | `depot:owner/repo` | État instantané : dernier commit, PR ouvertes, dernière CI *(nécessite `GITHUB_TOKEN`)*. |
| `/git lier-membre` | `membre:user` `pseudo-github:string` | Lie un membre Discord à un pseudo GitHub (mention auto dans les annonces). |
| `/git digest` / `digest-off` | `salon:chan` `[frequence]` `[heure]` | Récap périodique (commits, PR mergées, releases, état CI). |
| `/gitlink lier\|statut\|delier` | `[pseudo-github]` | Chaque membre déclare son pseudo GitHub pour être mentionné sur ses commits / PR. |

### 8.6 Salons statistiques

| Commande | Paramètres | Effet |
|---|---|---|
| `/stats creer` | `nom:string` `role:role` `[etiquette]` | Crée la catégorie statistique avec un premier compteur. |
| `/stats ajouter` | `role:role` `[etiquette]` | Ajoute un compteur à la catégorie existante. |
| `/stats retirer` | `role:role` | Retire un compteur. |
| `/stats liste` / `supprimer` | — | Lister / tout supprimer (avec confirmation). |

> Discord limite les renommages de salon à ~2 par 10 min — un compteur se met à jour au mieux toutes les ~6 min.

### 8.7 Sauvegarde / restauration

| Commande | Paramètres | Effet |
|---|---|---|
| `/backup export` | — | Exporte tout `guild_config` + stats + mc_watchers + notifications + tags + reaction-roles en JSON. |
| `/backup import` | `fichier:.json` | Restaure une configuration. Volatiles non couverts : tickets, sanctions, giveaways, rappels, polls, suggestions, vocaux-temp. |

---

## 9. Catalogue complet des commandes

### 🎫 Tickets

| Commande | Tier | Description |
|---|---|---|
| `/setup-tickets` | admin | Déploie le panneau (à faire une fois). |
| `/add-user <utilisateur>` | ticket-staff | Ajoute un membre au ticket courant. |
| `/remove-user <utilisateur>` | ticket-staff | Retire un membre. |
| `/ticket move <categorie>` | ticket-staff | Change la catégorie du ticket courant (renomme le salon). |
| `/ticket-stats` | staff | Statistiques globales (ouverts, fermés, note moyenne). |
| `/tickets-ouverts [categorie] [membre] [pris-en-charge]` | ticket-staff | Liste les tickets ouverts groupés par catégorie. Un ticket-staff ne voit que **ses catégories** ; staff/admin voient tout. |
| `/ticket-reviews [membre] [categorie] [rating-min]` | staff | Avis & commentaires laissés par les auteurs à la fermeture (note + texte libre). Paginé (5/page, session 5 min). |
| 🔘 Prendre en charge / Fermer / Rouvrir | staff / membre | Boutons dans le ticket / DM de fermeture. |

### 🛡️ Modération

| Commande | Tier | Description |
|---|---|---|
| `/warn <membre> [raison]` | staff | Avertir (ajouté au casier). |
| `/unwarn <id>` | staff | Retirer un avertissement. |
| `/kick <membre> [raison]` | staff | Expulser. |
| `/softban <membre> [raison] [purge-jours:0-7]` | staff | Ban + unban immédiat (purge messages sans bannir durablement). |
| `/ban <membre> [raison] [purge-jours:0-7]` | staff | Bannir. |
| `/unban <identifiant> [raison]` | staff | Débannir par ID. |
| `/timeout <membre> <durée> [raison]` | staff | Exclure temporairement (max 28 j). Durées : `10m`, `2h`, `1d`. |
| `/untimeout <membre> [raison]` | staff | Lever un timeout. |
| `/casier <membre>` | staff | Historique paginé des sanctions. |
| `/casier-search [moderateur] [type] [mot-cle]` | staff | Recherche dans le casier global. |
| `/note ajouter\|liste\|retirer` | staff | Notes privées staff sur un membre. |
| `/role temp <membre> <role> <duree> [raison]` | staff | Rôle temporaire (retrait auto). |
| `/role temp-liste` / `temp-annuler <id>` | staff | Gestion des rôles temporaires. |
| `/lockdown salon [salon] [duree] [raison]` | staff | Verrouille un salon (auto-restauration si `duree`). |
| `/lockdown serveur [duree] [raison]` | admin | Lockdown global. |
| `/lockdown lift [salon] [serveur:bool]` | staff / admin | Déverrouille. |
| `/clear <nombre:1-100> [membre]` | staff | Supprime en masse. |

### 👋 Communauté

| Commande | Tier | Description |
|---|---|---|
| `/setup-reglement` | admin | Déploie le règlement + bouton. |
| `/setup-roles` | admin | Panneau de rôles auto-attribuables (boutons). |
| `/setup-reaction-roles` | admin | Panneau classique emoji → rôle (réactions). |
| `/suggestion <proposition> [categorie]` | public | Cooldown 10 min · thread auto · vote 👍/👎 · validation staff. |

### 🎉 Engagement

| Commande | Tier | Description |
|---|---|---|
| `/giveaway lancer <lot> <duree> [gagnants] [age-min] [role-requis] [role-bonus] [multiplicateur]` | admin | Lance un giveaway avec conditions et multiplicateur. |
| `/giveaway pause\|reprendre\|edit\|liste\|info\|terminer\|relancer` | admin | Gestion fine. |
| `/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]` | staff | Sondage natif Discord (24 h défaut). |
| `/poll <question> <options "\|"> <duree> [multi-choix] [anonyme]` | staff | Sondage persistant (durée libre). |

### 🧰 Utilitaires

| Commande | Tier | Description |
|---|---|---|
| `/userinfo [membre]` | staff | Infos d'un membre. |
| `/serverinfo` | staff | Infos du serveur. |
| `/avatar [membre]` | staff | Avatar en grand. |
| `/ping` | staff | Latence du bot. |
| `/botinfo` | staff | Stats du bot (disponibilité, serveurs, latence). |
| `/embed <salon> [role1…3]` | staff | Compose un embed via formulaire et l'envoie. |
| `/rappel set\|liste\|supprimer` | staff | Rappels personnels ponctuels. |
| `/rappel-rec set\|liste\|supprimer` | staff | Rappels récurrents (daily/weekly/monthly). |
| `/rappel-role <role> <message> [frequence] [delai]` | admin | Rappel pour un rôle entier (ponctuel ou récurrent). |
| `/tag show\|liste\|ajouter\|editer\|retirer` | staff (show/liste = public) | Tags FAQ. |
| `/afk [raison]` | staff | Marque AFK ; le bot répond aux pings. |
| `/help` | ticket-staff+ | Aide interactive filtrée par tier. |

### ⛏️ Minecraft & intégrations

| Commande | Tier | Description |
|---|---|---|
| `/mcstatus [ip]` | staff | Statut d'un serveur MC (par défaut celui configuré). |
| `/mclink demande\|statut\|delier` | staff | Lier le compte Discord à un pseudo MC. Validation par connexion au serveur (RCON). |
| `/mcsuivi ajouter\|liste\|supprimer` | admin | Panneau de statut auto-rafraîchi + alerte de rôle. |
| `/mcwhitelist add\|remove\|list` | admin | Whitelist via RCON. |
| `/notif ajouter-youtube\|ajouter-twitch\|ajouter-rss\|liste\|supprimer` | admin | Notifications YouTube / Twitch / RSS (Instagram, TikTok, X via RSSHub, blogs…). Option `role` pour ping. |

### 🐙 Git / GitHub

| Commande | Tier | Description |
|---|---|---|
| `/git suivre\|liste\|config\|retirer` | admin | Gère les dépôts suivis (salon, rôle, branches, events, salon-statut). |
| `/git statut <depot>` | admin | État instantané d'un dépôt (dernier commit, PR ouvertes, dernière CI). |
| `/git lier-membre <membre> <pseudo>` | admin | Lie un membre à un pseudo GitHub (mention auto). |
| `/git digest\|digest-off` | admin | Active / désactive le récap périodique d'activité. |
| `/gitlink lier\|statut\|delier` | staff | Liaison auto-déclarée pseudo GitHub ↔ compte Discord. |

> **Hybride** webhooks + polling de secours — voir [§5](#5-variables-denvironnement-env) (`GITHUB_*`) et [§8.5 Suivi GitHub](#suivi-github-git). Sans `GITHUB_TOKEN` ni `GITHUB_WEBHOOK_SECRET`, le module est désactivé (commandes non déployées).

### 🎵 Musique

> Nécessite un serveur **Lavalink** — voir [`LAVALINK.md`](LAVALINK.md). Sans `LAVALINK_PASSWORD`, le module est désactivé.

| Commande | Description |
|---|---|
| `/play <recherche>` | Joue un titre/playlist YouTube ou ajoute à la file. |
| `/recherche <termes>` | Recherche YouTube avec menu. |
| `/pause` / `/resume` / `/skip` / `/stop` | Contrôles. |
| `/queue` / `/nowplaying` | File · titre en cours. |
| `/volume <0-150>` / `/seek <secondes>` | Volume · saut temporel. |
| `/loop <mode>` / `/shuffle` / `/jump <position>` | Boucle, mélange, saut de piste. |
| `/remove <position>` / `/clearqueue` | Retire un titre / vide la file. |
| `/filter <preset>` | Bass boost, nightcore, vaporwave, 8D, karaoké. |
| `/lyrics` | Paroles du titre en cours. |

### 📊 Salons statistiques · ⚙️ Configuration

Voir [§8.6](#86-salons-statistiques) et [§8.1](#81-config-sous-commande).

---

## 10. Structure du projet

```
src/
├── index.ts              Point d'entrée (client, intents, chargement, login)
├── config.ts             Configuration centrale (couleurs, catégories de tickets, .env)
├── database.ts           Prisma + helpers de config (guild_config)
├── deploy-commands.ts    Déploie les slash-commands (guild ou global)
├── types.ts              Types centralisés (CommandModule, ComponentModule, EventModule)
├── handlers/             Chargeurs : commandes, composants, événements
├── events/               Événements Discord (logs, automod, anti-raid, captcha…)
├── commands/             Slash-commands, rangées par module
│   ├── tickets/   moderation/   community/   utility/
│   ├── integrations/   minecraft/   music/   giveaways/   git/
├── components/           Boutons / menus / modales (routage par customId)
├── features/             Logique métier (logger, automod, giveaways, mcwatch, github/…)
├── utils/                Helpers (durations, permissions, sanctions, configCache, logger)
├── workers/              Workers Node (welcomecard.worker.ts — rend la PNG hors event loop)
└── data/                 Contenus éditables (reglement.ts, help.ts)
data/                     Base SQLite (créée automatiquement)
prisma/
└── schema.prisma         Schéma de base
```

Données persistantes : `data/unknown_variable.db`. **Sauvegarde ce dossier** pour ne rien perdre.

---

## 11. Maintenance & mises à jour

### Commandes courantes

```bash
sudo journalctl -u unknown_variable -f      # logs en direct
sudo systemctl restart unknown_variable     # redémarrer
```

### Mettre à jour le bot

```bash
cd /home/unknown_variable/unknown_variable
git pull
npm install            # réinstalle si besoin + régénère le client Prisma (hook postinstall)
npx prisma db push     # uniquement si prisma/schema.prisma a changé (voir §12)
sudo systemctl restart unknown_variable
sudo journalctl -u unknown_variable -f      # surveille le redémarrage
```

**Avant un `git pull` :**
- Sauvegarde la BDD : `cp data/<bot>.db data/backup-$(date +%F).db`.
- Sauvegarde la config en jeu : `/backup export` dans Discord (garde le `.json` à part).

**Si le redémarrage échoue** → `sudo journalctl -u unknown_variable -n 100 --no-pager`. Causes classiques :
- `Used disallowed intents` → intent activé dans le code mais pas dans le Developer Portal.
- `Cannot find module '.prisma/client'` → `npx prisma generate` puis `npx prisma db push`.
- Token invalide → token régénéré dans le Portal mais pas reporté dans `.env`.

### Re-déployer les slash-commands

Déployées automatiquement au boot pour `GUILD_ID`. Pour les pousser **globalement** (tous serveurs, propagation ~1 h) : `npm run deploy:global`.

### Mettre à jour les dépendances npm

```bash
npm outdated          # liste ce qui peut bouger
npm update            # respecte le semver de package.json (^x.y.z)
npm audit && npm audit fix
npm start             # teste en local avant systemctl restart
```

**Mise à jour majeure** (`discord.js` v14→v15, Prisma 7→8…) — risquée : lire le CHANGELOG, bumper manuellement, `npm install` en test, `npx tsc --noEmit`, tester en local contre un serveur de test, puis déployer.

**Dépendances natives à surveiller :**

| Dépendance | Point d'attention |
|---|---|
| `better-sqlite3` | Compilation native — peut nécessiter `apt install build-essential python3`. Échec → `npm rebuild better-sqlite3 --build-from-source`. |
| `@napi-rs/canvas` | Binding Rust pré-buildé ; sur ARM/Alpine, vérifier le bon binaire. |
| `@prisma/adapter-better-sqlite3` | Doit être de la **même version majeure** que `@prisma/client` (les deux en 7.x). |

### Mettre à jour Lavalink (musique)

YouTube change ses protections régulièrement — cause #1 des pannes de musique. Détails dans [`LAVALINK.md`](LAVALINK.md). En résumé : arrêter Lavalink, sauvegarder `Lavalink.jar` + `application.yml`, télécharger la dernière v4 ([releases](https://github.com/lavalink-devs/Lavalink/releases)), et surtout **bumper le plugin YouTube** dans `application.yml` (`dev.lavalink.youtube:youtube-plugin:X.Y.Z`) quand `/play` ne renvoie plus rien. Lavalink v4 exige **Java 17+**.

### Mettre à jour l'hôte

Au moins tous les 3 mois : `sudo apt update && sudo apt upgrade -y`, puis `sudo systemctl restart unknown_variable lavalink`.

### Rotation du token Discord

En cas de fuite (commit accidentel du `.env`, partage) : Developer Portal → **Bot → Reset Token**, mettre à jour `.env`, `sudo systemctl restart unknown_variable`. L'ancien token meurt immédiatement.

---

## 12. Base de données

### Stack & stockage

- **SQLite**, fichier unique `data/<bot>.db` (chemin via `DATABASE_PATH`, dérivé de `BOT_NAME` sinon).
- **Prisma 7** + driver adapter `@prisma/adapter-better-sqlite3` ([src/database.ts](src/database.ts)). `schema.prisma` ne contient **pas** d'URL : elle est injectée à l'exécution depuis `config.database.path` (chemin absolu).
- Cache mémoire des clés `guild_config` ([src/utils/configCache.ts](src/utils/configCache.ts), TTL 60 s, invalidation à l'écriture).

### Modèles principaux

| Table | Contenu | Durabilité |
|---|---|---|
| `guild_config` | Config clé/valeur (~80+ clés) | Durable |
| `tickets` | Tickets (numéro, catégorie, claim, rating, commentaire) | Durable |
| `sanctions` | Casier : warn/kick/ban/timeout/softban | Durable |
| `tags` | FAQ `/tag` | Durable |
| `notifications` | Abonnements YouTube/Twitch/RSS | Durable |
| `github_repos` / `github_seen` / `github_links` | Dépôts suivis, dédup, liaisons GitHub↔Discord | Durable |
| `mc_watchers`, `mc_links`, `mc_link_codes` | Suivi & liaisons Minecraft | Durable |
| `stat_channels` | Compteurs de membres par rôle | Durable |
| `reaction_role_panels` / `_entries` | Panneaux reaction-roles | Durable |
| `temp_roles` | Rôles temporaires à expirer | Durable (sinon retrait raté) |
| `reminders` / `recurring_reminders` | Rappels persos & récurrents | Volatile |
| `polls` / `poll_votes` | Sondages persistants | Volatile |
| `giveaways` / `giveaway_entries` | Giveaways en cours | Volatile |
| `suggestions`, `temp_voice`, `afk`, `captcha_pending` | États transitoires | Volatile |

**`/backup export` n'exporte que les tables durables** (config + stats + mc_watchers + notifications + tags + reaction-roles) — c'est pour migrer une config vers un autre serveur, pas du disaster recovery. Pour ce dernier, copie le fichier `.db` complet.

### Sauvegardes

```bash
# Snapshot ponctuel
cp data/<bot>.db data/backup-$(date +%F-%H%M).db

# Sauvegarde 100 % propre, même bot allumé (SQLite WAL)
sqlite3 data/<bot>.db ".backup data/snapshot.db"
```

Cron quotidien + rotation 7 jours (`crontab -e`) :
```cron
0 3 * * * cp /home/unknown_variable/unknown_variable/data/<bot>.db /home/unknown_variable/backups/uv-$(date +\%F).db && find /home/unknown_variable/backups -name 'uv-*.db' -mtime +7 -delete
```

Restauration :
```bash
sudo systemctl stop unknown_variable
cp data/backup-2026-05-25.db data/<bot>.db
sudo systemctl start unknown_variable
```

### Migrations Prisma (`db push`)

Le repo **n'a pas de dossier `prisma/migrations/`** : les changements de schéma sont propagés avec **`prisma db push`** (compare `schema.prisma` à la base et applique le diff, sans fichier de migration). Adapté au mono-instance, et **idempotent**. Routine après un changement de schéma :

```bash
git pull
npx prisma generate     # régénère le client TS (auto via postinstall)
npx prisma db push      # synchronise la base
sudo systemctl restart unknown_variable
```

- **Sûr** : ajouter une table, une colonne **nullable** ou avec `@default`, un index.
- **Dangereux (perte de données)** : renommer/supprimer une colonne, changer un type, ajouter une colonne `NOT NULL` sans `@default` sur une table peuplée.

Dans les cas dangereux, vérifie d'abord, puis sauvegarde si besoin :
```bash
npx prisma db push --dry-run     # liste les changements sans les appliquer
```
Si tu vois `⚠️ data loss warning`, **sauvegarde la base avant**.

> Multi-instance / versionnement : passe aux vraies migrations — `npx prisma migrate dev --name <nom>` puis `npx prisma migrate deploy` en prod (baseline d'une base existante avec `prisma migrate resolve --applied <init>`).

### Inspection / debug

```bash
sqlite3 data/<bot>.db                                # REPL SQL : .tables, SELECT…, .quit
npx prisma studio --schema=prisma/schema.prisma      # UI web → http://localhost:5555
```

### Migration de serveur (changement de VPS)

```bash
# Ancien serveur
sudo systemctl stop unknown_variable
tar czf uv-data.tgz data/ .env src/config.ts         # le code vient de git

# Nouveau serveur
git clone <repo> unknown_variable && cd unknown_variable
npm install
tar xzf ../uv-data.tgz
# pas besoin de db push : le schéma est déjà appliqué dans le .db copié
sudo systemctl enable --now unknown_variable
```

### Passer à Postgres/MySQL (si SQLite devient limitant)

1. `provider = "sqlite"` → `"postgresql"` dans [prisma/schema.prisma](prisma/schema.prisma).
2. Remplacer l'adapter dans [src/database.ts](src/database.ts) par `@prisma/adapter-pg` (ou équivalent).
3. Adapter `.env` (`DATABASE_URL=postgres://...`).
4. Migrer les données : `pgloader sqlite:///data/<bot>.db postgresql://...`.
5. `npx prisma migrate dev --name init-postgres`.

---

## 13. Dépannage

| Problème | Solution |
|---|---|
| `Used disallowed intents` | Active les Privileged Intents dans le Developer Portal (§1). |
| `Cannot find module '.prisma/client/default'` | Client Prisma non généré : `npx prisma generate`, puis `npx prisma db push`. (Généré aussi par le hook `postinstall` au `npm install`.) |
| `tsx: not found` | Dépendances non installées : `npm install` dans le dossier du bot. |
| Slash-commands invisibles dans Discord | Lance `/permissions check` → bouton « Tout corriger ». Discord met le cache à jour après quelques secondes (parfois reconnexion du client). |
| Le bot ne crée pas les salons | Place son rôle au-dessus du rôle Staff + vérifie la permission `Manage Channels`. |
| `Missing Permissions` | Le bot n'a pas accès à la catégorie cible — ajuste les permissions de la catégorie. |
| Ticket : « catégorie n'a pas de rôle responsable » | Édite [`src/config.ts`](src/config.ts) → remplis `staffRoleId` de la catégorie concernée, redémarre, relance `/setup-tickets`. |
| Welcome card noire / vide | Le worker `welcomecard.worker.ts` a planté — vérifie les logs. Désactive avec `/config accueil carte-image:false`. |
| Image de fond ne s'affiche pas | L'URL doit être en `https://...` et pointer directement vers un fichier image (PNG/JPG/WebP). Discord CDN OK. Si la requête échoue, la carte retombe sur le dégradé sans erreur. |
| Musique ne joue rien | Vérifie `LAVALINK_PASSWORD` et que le serveur Lavalink tourne (voir [`LAVALINK.md`](LAVALINK.md)). |
| RCON échoue | `/config minecraft-rcon` — l'IP/port/mot de passe doivent correspondre à `enable-rcon=true` dans `server.properties`. |
| Twitch désactivé | `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` requis dans `.env`. |
| Notifications YouTube vides | L'ID doit commencer par `UC…` (Paramètres avancés → Identifiant de chaîne, pas le pseudo). |
| `/git` invisible dans Discord | Le module GitHub n'est déployé que si `GITHUB_TOKEN` **ou** `GITHUB_WEBHOOK_SECRET` est défini — ajoute-le puis `npm run deploy`. |
| Aucune annonce GitHub | Vérifie le token/secret. En polling, le 1ᵉʳ passage mémorise l'état **sans annoncer** ; pousse un nouveau commit pour tester. |
| Webhook GitHub renvoie 401 | Le *Secret* du webhook (Settings du dépôt) doit être **identique** à `GITHUB_WEBHOOK_SECRET`. |
| « Une catégorie statistique existe déjà » | `/stats supprimer` puis `/stats creer`. |
| Token Discord exposé sur GitHub | **Régénère immédiatement** dans Developer Portal → Bot → Reset Token. |

---

## 14. Checklist post-installation

- [ ] `/permissions check` → bouton « Tout corriger » → tous les rôles ✅
- [ ] `/logs voir` → 8 catégories configurées
- [ ] Un membre lambda **ne voit pas** `/help` (réservé staff/ticket-staff) ; un membre du staff **le voit**
- [ ] Test : ouvrir un ticket → le bon rôle est pingué, et seuls lui + l'auteur voient le salon
- [ ] Test : kick un compte alt → DM reçu, casier mis à jour, log dans le salon de modération
- [ ] Test : poster un lien `discord.gg/xxxx` (si automod actif) → supprimé
- [ ] Sauvegarde de `data/<bot>.db` planifiée (voir [§12](#12-base-de-données))
