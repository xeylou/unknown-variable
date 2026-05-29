# 🛠️ Guide d'installation, mise à jour & base de données

Trois parties :
1. [Installation initiale (zéro → bot opérationnel)](#-partie-1--installation-initiale-zéro--bot-opérationnel)
2. [Mises à jour (bot, dépendances, Lavalink)](#-partie-2--mises-à-jour-bot-dépendances-lavalink)
3. [Base de données : comportement & migrations](#-partie-3--base-de-données--comportement--migrations)

Document compagnon de [`README.md`](README.md) (qui liste exhaustivement ce qui est configurable) et [`LAVALINK.md`](LAVALINK.md) (installation du serveur musique).

---

# 🚀 Partie 1 — Installation initiale (zéro → bot opérationnel)

## A. Côté Discord Developer Portal

1. https://discord.com/developers/applications → **New Application**.
2. **Bot** → **Reset Token** → copier le token (= `DISCORD_TOKEN`).
3. **Bot** → activer :
   - ☑️ `SERVER MEMBERS INTENT`
   - ☑️ `MESSAGE CONTENT INTENT`
   - (`PRESENCE INTENT` non requis)
4. **General Information** → copier l'**Application ID** (= `CLIENT_ID`).
5. **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions minimales : `Manage Channels`, `Manage Roles`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Move Members`, `Mute Members`, `Deafen Members`, `Add Reactions`, `View Audit Log`
   - Plus simple : `Administrator` (déconseillé en prod multi-serveurs, OK pour un perso).
   - Ouvrir l'URL, inviter le bot.

## B. Côté serveur Discord

Activer **Mode développeur** (Paramètres utilisateur → Avancés) pour copier les IDs (clic droit → *Copier l'identifiant*).

### Rôles à créer **avant** le démarrage du bot

| Rôle | Sert à | Comment |
|---|---|---|
| `Staff` | Modération (`KICK`/`BAN`/`TIMEOUT`/`WARN`…) | Créer un rôle « Staff », copier son ID → `STAFF_ROLE_ID` dans `.env` |
| `Administration` *(optionnel)* | Commandes sensibles (`/config`, `/logs`, `/backup`, `/lockdown serveur`, `/setup-*`) | Créer un rôle « Admin », copier son ID → `ADMIN_ROLE_ID` dans `.env` |
| `Membre vérifié` | Donné quand un membre clique « J'accepte le règlement » | À configurer après le boot via `/config reglement role:` |
| **Un rôle par catégorie de ticket** | Équipe responsable d'une catégorie. **Seuls eux voient les tickets** de cette catégorie et reçoivent le ping à l'ouverture. | Un rôle par catégorie (`@Support`, `@Bug-team`, `@Builders`, `@Staff-privé`…). Copier les IDs — ils iront dans `src/config.ts` |

⚠️ **Hiérarchie cruciale** : le rôle du bot doit être **au-dessus** de tous les rôles qu'il manipule (Staff, Admin, rôles temporaires, rôles de tickets, autorôle). Sinon `Missing Permissions` sur les attribute/remove.

### Salons & catégories à créer

| Élément | Sert à | Variable / commande |
|---|---|---|
| Catégorie « Tickets » | Conteneur des salons de tickets | `TICKET_CATEGORY_ID` dans `.env` |
| Salon `#logs-tickets` (privé staff) | Transcripts à la fermeture | `LOGS_CHANNEL_ID` dans `.env` |
| Salon `#bienvenue` | Welcome card / message | `/config accueil` |
| Salon `#règlement` | Affichage du règlement | `/setup-reglement` |
| Salons `#logs-messages`, `#logs-modération`, etc. (privés staff) | Logs serveur catégorisés | `/logs salon ...` |
| Salon `#suggestions` | Réception `/suggestion` | `/config suggestions` |
| Salon vocal « ➕ Créer un vocal » | Pattern « rejoindre pour créer » | `/config vocaux-temp` |
| Salon `#tickets` | Panneau de sélection des catégories | `/setup-tickets` (à lancer dedans) |

## C. Côté machine (local ou VPS)

### Pré-requis

- **Node.js ≥ 20** (`node --version`).
- **git**.
- ~~Pas de Java requis~~ sauf si tu actives la musique → voir partie Lavalink.

### Cloner & installer

```bash
git clone <ton-repo> unknown_variable
cd unknown_variable
npm install
cp .env.example .env
```

### Remplir le `.env`

Obligatoires : `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `STAFF_ROLE_ID`.
Recommandés : `ADMIN_ROLE_ID`, `TICKET_CATEGORY_ID`, `LOGS_CHANNEL_ID`.
Optionnels : Twitch (`TWITCH_CLIENT_ID`/`SECRET`), Lavalink (`LAVALINK_*`). Voir [§5 du README](README.md#5-variables-denvironnement-env).

### Configurer les catégories de tickets dans `src/config.ts`

C'est l'étape **la plus oubliée**. Édite `tickets.categories` :

```ts
{ value: 'support', label: 'Support général', description: '...', emoji: '🛠️',
  staffRoleId: '123456789012345678' },   // ← ID du rôle responsable
{ value: 'bug',     label: 'Signaler un bug', ..., staffRoleId: '...' },
{ value: 'build',   label: 'Demande de build', ..., staffRoleId: '...' },
{ value: 'staff',   label: 'Contact staff',    ..., staffRoleId: '...' },
{ value: 'other',   label: 'Autre',            ..., staffRoleId: '...' }
```

Une catégorie sans `staffRoleId` → la création de ticket sera refusée avec un message clair. Tu peux laisser à vide les catégories que tu n'utilises pas (ou les retirer du tableau).

### Personnaliser le règlement *(optionnel)*

Édite [`src/data/reglement.ts`](src/data/reglement.ts) : titre, intro, articles, texte d'acceptation, footer. Tout est repris tel quel dans `/setup-reglement`.

### Démarrer

```bash
npm start
```

Au boot tu dois voir :
```
✅ X commandes enregistrées pour la guilde <GUILD_ID>
[main] info Bot connecté : <nom-du-bot>
```

Si Lavalink configuré : `🎵 Lavalink connecté`. Sinon : `Module musique désactivé.`

## D. Configuration en jeu (dans l'ordre)

À faire **une seule fois**, dans Discord, après le premier boot :

```
1. /permissions check
   → Bouton « Tout corriger » : accorde aux rôles Staff/Admin/ticket-staff
     toutes les perms Discord pour que les /commandes apparaissent dans
     leur auto-complétion.

2. /logs tout-dans salon:#logs-modération
   → Active les 8 catégories de logs dans un salon. Tu pourras ensuite
     les granulariser avec /logs salon catégorie:messages salon:#logs-messages

3. /config reglement role:@Membre vérifié
   → Le rôle donné quand un membre clique « J'accepte ».

4. /setup-reglement
   → À lancer DANS le salon #règlement.
     Stocke automatiquement l'ID du salon pour les DMs de sanctions.

5. /config autorole role:@En attente
   → (optionnel) Rôle attribué à chaque arrivée — typiquement un rôle
     « pré-vérification » sans accès, levé par le bouton règlement.

6. /config accueil salon:#bienvenue carte-image:true
   → Active welcome card. Ajoute message:"..." pour un texte custom.
     Ajoute image-fond:https://... pour une image de fond personnalisée.
     Variables : {user} {username} {server} {count}.

7. /config suggestions salon:#suggestions
   → Salon où atterrissent les /suggestion.

8. /config vocaux-temp salon:#➕-créer-vocal [categorie:#Vocaux]
   → Salon « rejoindre pour créer ».

9. /setup-tickets
   → À lancer DANS le salon #tickets. Déploie le menu déroulant.
```

### Modules optionnels à activer si voulus

```
/config automod actif:true phishing:true token-leak:true zalgo:true
/config antiraid actif:true age-min-compte:7 expulser-jeunes:true
/config captcha actif:true role-non-verifie:@Non-vérifié role-verifie:@Vérifié salon:#vérification
/config minecraft ip:play.monserveur.fr salon-statut:#statut-mc
/config minecraft-rcon host:play.monserveur.fr mot-de-passe:xxx port:25575 role-en-jeu:@En jeu
/setup-roles role1:@Joueur role2:@Builder titre:"Choisis ton rôle"
/config ticket-message message:"Bonjour {user} 👋\nDécris {category} en détail."
/config invitation url:https://discord.gg/xxxx
```

### Si Twitch/YouTube

1. Pour Twitch : créer une app sur https://dev.twitch.tv/console/apps → `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` dans `.env` → redémarrer.
2. `/notif ajouter-twitch pseudo:<pseudo> salon:#streams [role:@News]`
3. YouTube : `/notif ajouter-youtube identifiant-chaine:UC... salon:#vidéos [role:@News]` (ID au format `UC…`, trouvé dans Paramètres avancés YouTube — pas le handle `@`).

### Si Instagram / TikTok / X (via RSS)

Pas d'API publique gratuite stable pour ces plateformes — la solution est de passer par **[RSSHub](https://docs.rsshub.app/)**, qui génère un flux RSS à partir d'un profil. L'instance publique `rsshub.app` suffit pour démarrer ; pour de la prod, héberge ta propre instance Docker :

```bash
docker run -d --name rsshub --restart unless-stopped -p 1200:1200 diygod/rsshub
# Flux disponibles ensuite sur http://localhost:1200/...
```

Puis dans Discord :
```
/notif ajouter-rss url:https://rsshub.app/instagram/user/<username> salon:#insta nom:"Instagram @builders" role:@Communauté
/notif ajouter-rss url:https://rsshub.app/tiktok/user/@<username>    salon:#tiktok nom:"TikTok @builders"   role:@Communauté
/notif ajouter-rss url:https://rsshub.app/twitter/user/<username>    salon:#twitter nom:"X @builders"      role:@Communauté
```

À la première lecture le bot mémorise l'état actuel **sans annoncer** (évite de flooder à la mise en place). Les publications suivantes déclenchent un message dans le salon avec ping du rôle si défini. Le poll tourne toutes les **5 minutes** — une annonce peut donc avoir jusqu'à 5 min de retard.

### Si musique

Voir [`LAVALINK.md`](LAVALINK.md). Résumé :
1. Java 17+ installé sur la même machine (ou autre, accessible réseau).
2. Télécharger `Lavalink.jar` v4, créer `application.yml` à côté avec un mot de passe et le plugin YouTube.
3. Lancer `java -jar Lavalink.jar` (en service systemd ou screen sur VPS).
4. `.env` du bot : `LAVALINK_HOST=localhost`, `LAVALINK_PORT=2333`, `LAVALINK_PASSWORD=<même que yml>`.
5. Redémarrer le bot.

### Si suivi GitHub (commits, PR/merges, CI/CD, releases)

Le module est **hybride** et reste désactivé tant qu'aucune des deux variables n'est remplie. Pour des dépôts **privés**, les deux approches marchent — choisis selon ton réseau :

**Option A — Polling (recommandé, zéro infra réseau, marche derrière un NAT/maison)**
1. Crée un *fine-grained PAT* sur https://github.com/settings/tokens (Tokens → Fine-grained). Donne-lui accès aux dépôts voulus, en **lecture seule** : *Metadata*, *Contents*, *Pull requests*, *Actions*, *Issues*.
2. `.env` : `GITHUB_TOKEN=github_pat_...` → redémarrer.
3. Le bot interroge l'API toutes les ~2 min. Premier passage : état mémorisé **sans annoncer** (évite le flood), les events suivants déclenchent les messages.

**Option B — Webhooks (temps réel, exige que le bot soit joignable depuis Internet)**
1. `.env` : `GITHUB_WEBHOOK_SECRET=<chaîne aléatoire>` (+ éventuellement `GITHUB_WEBHOOK_PORT`, défaut 3000) → redémarrer. Le bot expose alors `POST <hôte>:<port>/github/webhook` (signatures vérifiées en HMAC-SHA256).
2. Dans le dépôt : *Settings → Webhooks → Add webhook*. Payload URL = `http(s)://<ton-hôte>:<port>/github/webhook`, Content type = `application/json`, Secret = la même valeur, « Send me everything » (ou sélectionne push / pull_request / workflow_run / release / issues / pull_request_review).
3. Derrière un NAT/box maison : expose le port via un tunnel (`cloudflared tunnel`, `smee.io`) — ou reste en **Option A** qui ne demande aucune ouverture de port.

> Renseigner **les deux** = mode hybride : webhooks pour le temps réel + polling lent en filet de sécurité (réconciliation toutes les 10 min). La déduplication interne empêche tout doublon.

Puis dans Discord :
```
/git suivre depot:owner/repo salon:#dev [branches:main,release] [role:@Devs] [salon-statut:#ci]
/git statut depot:owner/repo          # état instantané (dernier commit, PR ouvertes, CI)
/git digest salon:#recap frequence:daily heure:9
/gitlink lier pseudo-github:<ton-pseudo>   # chaque membre, pour être mentionné sur ses commits
```
`role` est pingué uniquement sur **échec CI** ; `salon-statut` affiche un embed « pipeline » mis à jour en place à chaque run. `/git liste`, `/git config <id>`, `/git retirer <id>` gèrent les abonnements.

## E. Pour passer en production (VPS systemd)

⚠️ **Bug à corriger dans `unknown_variable.service`** : il invoque `/usr/bin/node src/index.js`, or le projet est TypeScript sans build. Remplace par :

```ini
ExecStart=/home/unknown_variable/unknown_variable/node_modules/.bin/tsx src/index.ts
```

Sinon le service crashera avec `Cannot find module`.

## F. Checklist post-installation

- [ ] `/permissions check` → bouton « Tout corriger » → tous les rôles ✅
- [ ] `/logs voir` → 8 catégories configurées
- [ ] Un membre lambda voit `/help` ? Non → bon (réservé staff/ticket-staff)
- [ ] Un membre du staff voit `/help` ? Oui → bon
- [ ] Test : ouvrir un ticket → le bon rôle est pingué, le salon a les bonnes perms (le membre voit, son staff voit, le reste non)
- [ ] Test : kick un compte alt → DM reçu, casier mis à jour, log dans le salon de modération
- [ ] Test : poster un lien `discord.gg/xxxx` (si automod actif) → supprimé
- [ ] Sauvegarder `data/unknown_variable.db` quelque part

---

# 🔄 Partie 2 — Mises à jour (bot, dépendances, Lavalink)

## A. Mettre à jour le code du bot

### Méthode courante

```bash
cd /home/unknown_variable/unknown_variable
git pull
npm install               # installe les nouvelles deps si package.json a bougé
npx prisma generate       # régénère le client Prisma si schema.prisma a changé
sudo systemctl restart unknown_variable
sudo journalctl -u unknown_variable -f    # surveille le redémarrage
```

### Avant de pull

- **Sauvegarde la BDD** : `cp data/unknown_variable.db data/backup-$(date +%F).db`
- **Sauvegarde la config en jeu** : `/backup export` dans Discord → garde le `.json` à part. Couvre `guild_config` + stats + mc_watchers + notifications + tags + reaction-roles.

### Si le redémarrage échoue

```bash
sudo journalctl -u unknown_variable -n 100 --no-pager
```

Pannes classiques :
- `Used disallowed intents` → Tu as activé un nouvel intent dans le code mais pas dans le Developer Portal.
- `Cannot find module '@prisma/client'` → `npm install` n'a pas tourné, ou `npx prisma generate` manque.
- `Error: ENOTSUP: operation not supported on socket` → Probablement la BDD verrouillée par un autre process (ancien bot pas tué).
- Token invalide → token régénéré dans le Portal mais pas mis à jour dans `.env`.

## B. Mettre à jour les dépendances npm

### Routine sûre (mises à jour mineures + patch)

```bash
npm outdated                  # liste ce qui peut bouger
npm update                    # respecte semver du package.json (^x.y.z)
npm audit                     # signale les CVE
npm audit fix                 # corrige automatiquement quand possible
npm start                     # teste en local avant systemctl restart
```

### Mise à jour majeure (`discord.js` v14→v15, Prisma 7→8, etc.)

Bien plus risqué — change de breaking changes. À faire :
1. Lire le **CHANGELOG** de la lib avant de bump.
2. Bump manuellement dans `package.json`.
3. `npm install` dans un environnement de test (pas direct en prod).
4. `npx tsc --noEmit` pour voir si la compilation casse.
5. Lancer le bot localement contre un serveur de test.
6. Une fois validé → push, pull en prod, restart.

### Dépendances natives à surveiller

| Dépendance | Pourquoi spécial |
|---|---|
| `better-sqlite3` | Compilation native — peut nécessiter `apt install build-essential python3` sur le VPS. Échec → `npm rebuild better-sqlite3 --build-from-source`. |
| `@napi-rs/canvas` | Binding Rust — pré-built pour les plateformes courantes. Sur ARM/Alpine, vérifier que le bon binaire est disponible. |
| `@prisma/adapter-better-sqlite3` | Doit être de la **même version major que `@prisma/client`** (les deux en 7.x). |

## C. Mettre à jour Lavalink

Lavalink évolue de son côté, et **YouTube change ses protections régulièrement** — c'est la cause #1 des pannes de musique.

### Mise à jour du `.jar`

```bash
cd /chemin/vers/lavalink
# Arrêter Lavalink
sudo systemctl stop lavalink     # ou kill du process
# Sauvegarder
cp Lavalink.jar Lavalink.jar.bak
cp application.yml application.yml.bak
# Télécharger la dernière v4 depuis https://github.com/lavalink-devs/Lavalink/releases
wget -O Lavalink.jar <URL_du_jar>
sudo systemctl start lavalink
sudo journalctl -u lavalink -f
```

### Mise à jour du plugin YouTube (le plus fréquent)

C'est ce plugin qui casse quand YouTube change ses signatures. Symptômes : `/play` renvoie 0 résultat, ou erreurs `Sign in to confirm you're not a bot`.

1. Vérifie la dernière version sur https://github.com/lavalink-devs/youtube-source/releases
2. Édite `application.yml` :
   ```yaml
   lavalink:
     plugins:
       - dependency: "dev.lavalink.youtube:youtube-plugin:X.Y.Z"   # ← bump ici
   ```
3. Redémarre Lavalink. Lavalink télécharge automatiquement la nouvelle version au boot.

### Compatibilité Java

Lavalink v4 exige **Java 17+**. Si tu mets à jour vers une v5 future, vérifie d'abord les pré-requis Java sur leur GitHub. Sur Ubuntu :
```bash
sudo apt install temurin-21-jre        # OpenJDK Temurin
java -version
```

## D. Mettre à jour le système hôte

Pas de fréquence spécifique, mais à faire au moins **tous les 3 mois** :

```bash
sudo apt update && sudo apt upgrade -y
sudo systemctl restart unknown_variable lavalink    # si patches kernel/glibc
```

Si Node lui-même reçoit une nouvelle LTS, prévoir un test en local avant.

## E. Rotation du token Discord

Si tu suspectes une fuite (commit accidentel du `.env`, partage) :

1. Developer Portal → **Bot** → **Reset Token** → copier le nouveau.
2. Mettre à jour `.env`.
3. `sudo systemctl restart unknown_variable`.
4. Le bot redémarre, l'ancien token est mort.

---

# 💾 Partie 3 — Base de données : comportement & migrations

## A. Stack et stockage

- **SQLite** via fichier unique `data/unknown_variable.db` (chemin configurable via `DATABASE_PATH` dans `.env`).
- Accès via **Prisma 7** + **driver adapter** `@prisma/adapter-better-sqlite3` ([src/database.ts](src/database.ts)). Particularité : `schema.prisma` ne contient **pas** d'URL de datasource — elle est injectée à l'exécution depuis `config.database.path` résolu en chemin absolu.
- Cache mémoire pour les clés `guild_config` ([src/utils/configCache.ts](src/utils/configCache.ts), TTL 60 s, invalidation à l'écriture).

## B. Modèles principaux

| Table | Contenu | Volatile ? |
|---|---|---|
| `guild_config` | Clés/valeurs de config (clé/valeur arbitraires, ~80+ clés différentes utilisées) | Durable |
| `tickets` | Tickets ouverts/fermés (numéro, catégorie, claim, rating) | Durable |
| `sanctions` | Casier : warn/kick/ban/timeout/softban | Durable |
| `tags` | FAQ `/tag` | Durable |
| `notifications` | YouTube/Twitch suivis | Durable |
| `mc_watchers` | Serveurs MC suivis en continu | Durable |
| `mc_links` / `mc_link_codes` | Liaisons compte Discord ↔ pseudo MC | Durable |
| `stat_channels` | Compteurs de membres par rôle | Durable |
| `reaction_role_panels` / `reaction_role_entries` | Panneaux reaction-roles | Durable |
| `reminders` / `recurring_reminders` | Rappels persos & récurrents | Volatile (peut être perdu sans drame) |
| `polls` / `poll_votes` | Sondages persistants | Volatile |
| `giveaways` / `giveaway_entries` | Giveaways en cours | Volatile (vide à la fin) |
| `suggestions` | Suggestions actives | Volatile |
| `temp_voice` | Salons vocaux temporaires en cours | Volatile (recréé au prochain join) |
| `temp_roles` | Rôles temporaires à expirer | Durable (si perdu, les rôles ne seront pas retirés à temps) |
| `afk` | Statuts AFK | Volatile |

**Distinction importante** : `/backup export` n'exporte **que les tables durables** (config + stats + mc_watchers + notifications + tags + reaction-roles). C'est pour migrer une config vers un autre serveur, pas pour disaster recovery.

Pour la **disaster recovery**, copie le fichier `.db` complet.

## C. Sauvegardes

### Manuelles ponctuelles

```bash
# Snapshot daté
cp data/unknown_variable.db data/backup-$(date +%F-%H%M).db
```

### Automatique (cron quotidien)

```bash
crontab -e
```
```cron
# Tous les jours à 3 h, snapshot + rotation 7 jours
0 3 * * * cp /home/unknown_variable/unknown_variable/data/unknown_variable.db /home/unknown_variable/backups/uv-$(date +\%F).db && find /home/unknown_variable/backups -name 'uv-*.db' -mtime +7 -delete
```

⚠️ SQLite peut être copié à chaud (les writes en cours seront perdus mais le fichier reste cohérent grâce au WAL). Pour une sauvegarde 100% propre :
```bash
sqlite3 data/unknown_variable.db ".backup data/snapshot.db"
```

### Restauration

```bash
sudo systemctl stop unknown_variable
cp data/backup-2026-05-25.db data/unknown_variable.db
sudo systemctl start unknown_variable
```

## D. Migrations Prisma — comportement actuel

### État actuel du projet

Le repo **ne contient pas de dossier `prisma/migrations/`**. Les modifications de schéma sont propagées avec **`prisma db push`** : Prisma compare `schema.prisma` à la base et applique les diffs, sans créer de fichier de migration.

C'est le mode adapté à un projet mono-instance comme ici. Avantages : simple, rapide. Inconvénients : aucune trace des changements, et `db push` peut **détruire des données** (drop de colonne, changement de type) sans avertissement automatique en mode non-interactif.

### Routine actuelle après un changement de schéma

```bash
git pull                       # récupère le nouveau schema.prisma
npx prisma generate            # régénère le client TS (typage)
npx prisma db push             # synchronise la BDD
sudo systemctl restart unknown_variable
```

> 💡 La feature **notifications RSS** (mai 2026) ajoute la colonne `role_id` (nullable) à la table `notifications` — `db push` la créera sans toucher aux données existantes. Tes notifications YouTube/Twitch déjà configurées restent valides, simplement sans rôle pingué jusqu'à ce que tu en ajoutes un via `/notif supprimer` + ré-ajout.

> 💡 La feature **commentaire de ticket** (mai 2026) ajoute la colonne `comment` (nullable, String) à la table `tickets` — `db push` la créera sans toucher aux tickets existants. Les anciens tickets restent valides, sans commentaire, jusqu'à ce qu'un membre en laisse un sur un nouveau ticket fermé.

`db push` est **idempotent** : tu peux le lancer plusieurs fois sans danger si rien n'a changé.

### Quand `db push` est sûr

- Ajouter une nouvelle table.
- Ajouter une nouvelle colonne **nullable** ou avec un `@default`.
- Ajouter un index.

### Quand `db push` casse des données — à vérifier manuellement

- Renommer une colonne (Prisma drop + crée → données perdues sur l'ancienne).
- Changer un type (`Int` → `String`, etc.).
- Supprimer une colonne (suppression définitive).
- Ajouter une colonne `NOT NULL` sans `@default` sur une table déjà peuplée → erreur.

Dans ces cas, lance d'abord :
```bash
npx prisma db push --dry-run    # liste les changements sans les appliquer
```

Si tu vois `⚠️ data loss warning`, **sauvegarde la base avant**.

### Pour passer aux vraies migrations (recommandé en multi-instance)

Si tu héberges le bot sur plusieurs machines, ou si tu veux versionner les changements :

```bash
npx prisma migrate dev --name <nom>     # crée un fichier dans prisma/migrations/
```

Puis en prod :
```bash
git pull
npx prisma migrate deploy               # applique uniquement les migrations non appliquées
```

Conversion d'un projet `db push` vers migrations : il faut **baseline** la BDD existante avec `prisma migrate resolve --applied <nom_initial>`. C'est un peu de friction, mais ça sécurise les déploiements.

## E. Inspection / debug

```bash
# Ouvrir un REPL SQL
sqlite3 data/unknown_variable.db
> .tables
> SELECT * FROM guild_config WHERE guild_id = '...' AND key LIKE 'log_%';
> .quit

# Ou via Prisma Studio (UI web)
npx prisma studio --schema=prisma/schema.prisma
# Ouvre http://localhost:5555
```

## F. Migration de serveur (changement de VPS)

```bash
# Sur l'ancien
sudo systemctl stop unknown_variable
tar czf uv-data.tgz data/ .env src/config.ts   # le code vient de git
# scp uv-data.tgz vers le nouveau

# Sur le nouveau
git clone <repo> unknown_variable && cd unknown_variable
npm install
tar xzf ../uv-data.tgz
npx prisma generate
# (pas besoin de db push, le schéma est déjà appliqué dans le .db copié)
sudo systemctl enable --now unknown_variable
```

## G. Changement de SGBD (SQLite → Postgres/MySQL)

Si un jour tu déploies sur plusieurs serveurs et que SQLite devient limitant :
1. Changer `provider = "sqlite"` → `"postgresql"` dans [`prisma/schema.prisma`](prisma/schema.prisma) (ou `mysql`).
2. Remplacer l'adapter dans [`src/database.ts`](src/database.ts) par `@prisma/adapter-pg` (ou équivalent).
3. Adapter le `.env` (`DATABASE_URL=postgres://...`).
4. **Migrer les données** : `pgloader sqlite:///data/unknown_variable.db postgresql://...` ou export/import SQL manuel.
5. Tester `npx prisma migrate dev --name init-postgres`.

C'est un chantier sérieux mais réaliste en quelques heures.
