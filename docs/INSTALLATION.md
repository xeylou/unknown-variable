> 🇬🇧 **English version [INSTALLATION_en.md](INSTALLATION_en.md)** · [Retour au README](../README.md) ⬅️

# 📥 Installation

Trois étapes : **(A)** créer l'application Discord, **(B)** préparer le serveur, **(C)** installer et démarrer. Puis **mise en route**.

Documentation en rapport : [Configuration](CONFIGURATION.md) · [Hébergement](SELF_HOSTING.md) · [Base de données](DATABASE.md) · [Lavalink](LAVALINK.md).

---

## A. Application Discord (Developer Portal)

1. Aller sur <https://discord.com/developers/applications> -> **New Application**.
2. Onglet **Bot** -> **Reset Token** -> copier le token (= `DISCORD_TOKEN`).
3. Onglet **Bot** -> activer les **Privileged Gateway Intents** :
   - ☑️ `SERVER MEMBERS INTENT`
   - ☑️ `MESSAGE CONTENT INTENT`
   - (`PRESENCE INTENT` **non** requis)
4. Onglet **General Information** -> copier l'**Application ID** (= `CLIENT_ID`). Le champ *Name* sera le **nom affiché** du bot dans Discord (aussi repris dans les embeds). Pour changer le nom des fichiers internes, changer `BOT_NAME` dans [Configuration](CONFIGURATION.md).
5. Onglet **OAuth2 -> URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : `Manage Channels`, `Manage Roles`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Move Members`, `Mute Members`, `Deafen Members`, `Add Reactions`, `View Audit Log`
   - Plus simple : cocher `Administrator` (déconseillé pour un usage multi-serveurs).
   - Copier l'URL en bas de page, l'ouvrir et inviter le bot.

> ⚠️ **Intents privilégiés & passage public.** `MESSAGE CONTENT` (requis par l'auto-modération) et `SERVER MEMBERS` sont des intents **privilégiés**. Si hébergés pour plus de **100 serveurs**, le bot devra être **vérifié par Discord**, et l'usage de `MESSAGE CONTENT` devra être **justifié et approuvé**. A anticipé si diffusion large.

---

## B. Préparation du serveur Discord

Activer le **Mode développeur** sur Discord (Paramètres utilisateur -> Avancés) pour copier les IDs (clic droit -> *Copier l'identifiant*) de n'importe quoi.

### Rôles à créer sur le serveur avant le démarrage

| Rôle | Sert à | Comment |
|---|---|---|
| `Staff` | Modération (`KICK`,`BAN`,`TIMEOUT`,`WARN`…) | Créer un rôle "Staff", puis sur le serveur : `/config staff role:@ROLE_STAFF` |
| `Administration` *(optionnelle)* | Commandes sensibles globales (`/config`, `/logs`, `/backup`, `/lockdown serveur`, `/setup-*`, `/role temp`) | Créer un rôle "Admin", puis sur le serveur : `/config admin role:@ROLE_ADMIN` |
| `Membre vérifié` | Donné au clic sur "J'accepte le règlement" | Sur le serveur : `/config reglement role:@ROLE_MEMBRE_VERIFIE` |
| **Un rôle par catégorie de ticket** | Équipe responsable d'une catégorie. **Seuls eux voient les tickets** de leur catégorie et reçoivent la mention. | Un rôle par catégorie (`@Support`, `@Bug-team`, `@Builders`…), assigné après sur le serveur via `/config ticket-role` |

> ⚠️ **Hiérarchie** : le rôle du bot doit être **au-dessus** de tous les rôles qu'il manipule (Staff, Admin, rôles temporaires, rôles de tickets, autorôle), sinon erreur `Missing Permissions` lors des attributions.

### Salons et catégories à créer

| Élément | Sert à | Commande |
|---|---|---|
| Catégorie "Tickets" | Catégorie pour les channels des tickets | `/config tickets categorie:` |
| `#logs-tickets` (privé au staff) | Resumé à la fermeture d'un ticket | `/config tickets salon-logs:` |
| `#bienvenue` *(optionnel)* | Carte de bienvenue (sans ping) | `/config accueil salon:` |
| `#règlement` | Affichage du règlement | `/setup-reglement` |
| `#logs-messages`, `#logs-modération`, … (privés au staff) | Logs serveur catégorisés | `/logs salon …` |
| `#suggestions` | Réception des `/suggestion` des membres | `/config suggestions` |
| Salon vocal "➕ Créer un vocal" | Pattern "rejoindre pour créer" | `/config vocaux-temp` |
| `#tickets` | Panneau de sélection des catégories | `/setup-tickets` |

---

## C. Installation locale

### Prérequis

- **Node.js ≥ 20** (`node --version`)
- **git**
- *(Optionnel)* **Java 17+** uniquement pour la musique - voir [Lavalink](LAVALINK.md).

### Cloner, configurer, démarrer

```bash
git clone https://github.com/xeylou/unknown-variable.git bot_discord
cd bot_discord
npm install                 # deps + génère le client Prisma (hook postinstall)
cp .env.example .env        # remplir à minima DISCORD_TOKEN, CLIENT_ID (+ BOT_NAME si voulu)
npx prisma generate         # (re)génère le client - filet de sécurité si le postinstall a été oublié
npx prisma db push          # crée le dossier data/ + les tables SQLite
npm run deploy              # enregistre les slash-commands GLOBALEMENT (tous serveurs, propagation ~1 h)
npm start                   # lance le bot
```

> **Ordre** : `db push` doit suivre l'édition du `.env` (le chemin vers la base dépend de `BOT_NAME`), et `npm run deploy` est **indispensable** (les commandes ne se déploient **pas** automatiquement). Commande à **relancer** à chaque ajout·modification de commande. En développement, `npm run deploy:guild` est **instantané** mais exige `GUILD_ID` dans le `.env`.

Au démarrage, la console affichera :

```
[events:ready] Connecté en tant que <nom-du-bot>
[events:ready] Modules : musique ⛔ · github ⛔ · twitch ⛔ · santé ✅ (:3001)
[events:ready] Présent sur 1 serveur(s) · 58 commande(s) chargée(s).
```

Le détail des variables `.env` est dans [Configuration, Variables d'environnement](CONFIGURATION.md#variables-denvironnement-env).

---

## D. Mise en route (une seule fois, dans l'ordre)

À l'ajout du bot, un message d'accueil rappelle ces étapes aux admins.

```
1. /config staff role:@ROLE_STAFF   ·   /config admin role:@ROLE_ADMIN
   -> Déclare les rôles de modération/admin. Sans eux, le bot se base sur les permissions Discord natives.

2. /permissions check
   -> Bouton "Tout corriger" : accorde aux rôles staff·admin·ticket-staff les permissions Discord pour que les commandes apparaissent dans leur Discord.

3. /logs tout-dans salon:#logs-modération
   -> Active les 8 catégories de logs dans un salon. Possible de tous les séparer avec 
      /logs salon categorie:messages salon:#logs-messages

4. /config reglement role:@ROLE_APRES_ACCEPTATION_DU_REGLEMENT
   -> Rôle donné quand un membre clique "J'accepte".

5. /setup-reglement deployer [salon:#règlement]
   -> Sans l'option salon, déploie dans le salon courant. Stocke l'ID du salon
     pour le mentionner en DM lors de message de sanctions.

6. /config autorole role:@ROLE_NON_VERIFIE        (optionnel - rôle pré-vérification Captcha)

7. /config accueil salon:#bienvenue carte-image:true message:"Bienvenue {username} 🎉"
   -> MP (carte PNG + embed d'orientation) + carte postée dans #bienvenue sans ping.
     Variables : {user} {username} {server} {count}.

8. /config suggestions salon:#suggestions
   -> Réception des `/suggestion` des membres.

9. /config vocaux-temp salon:#➕-créer-vocal [categorie:#Vocaux]

10. /config tickets categorie:#Tickets salon-logs:#logs-tickets
    /config ticket-role categorie:support role:@ROLE_STAFF_SUPPORT   (répéter par catégorie)
    -> Une catégorie sans rôle responsable refuse la création de ticket.

11. /setup-tickets deployer [salon:#tickets]
    -> Déploie le menu déroulant. Sans l'option salon, déploie dans le salon courant.
```

### Modules optionnels

```
/config automod actif:true phishing:true token-leak:true zalgo:true
/config antiraid actif:true age-min-compte:7 expulser-jeunes:true
/config captcha actif:true role-non-verifie:@Non-vérifié role-verifie:@Vérifié
/setup-captcha                        # dans #vérification : déploie le bouton (défi en éphémère)
/config minecraft ip:play.monserveur.fr salon-statut:#statut-mc
/setup-roles role1:@Joueur role2:@Builder titre:"Choisis ton rôle"
/config invitation url:https://discord.gg/xxxx
```

Intégrations externes (Twitch, YouTube, RSS, GitHub) : voir [Configuration -> Suivi & notifications](CONFIGURATION.md#suivi--notifications).

---

## ✅ Checklist post-installation

- [ ] `/config staff` et `/config admin` -> rôles déclarés
- [ ] `/permissions check` -> "Tout corriger" -> tous les rôles ✅
- [ ] `/logs voir` -> 8 catégories configurées
- [ ] Un membre lambda voit `/help` et n'y trouve **que** les commandes publiques ; le staff y voit les siennes
- [ ] Test : ouvrir un ticket -> le bon rôle est pingué, seuls lui + l'auteur voient le salon
- [ ] Test : kick un compte alt -> DM reçu, casier mis à jour, log dans le salon de modération
- [ ] Test : poster un lien `discord.gg/xxxx` (si automod actif) -> supprimé
- [ ] Sauvegarde de `data/<bot>.db` planifiée - voir [Base de données](DATABASE.md)

Problème au démarrage ? Voir [Hébergement -> Dépannage](SELF_HOSTING.md#dépannage).
