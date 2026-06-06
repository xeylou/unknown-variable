# 📥 Installation

> 🇬🇧 **English version → [INSTALLATION_en.md](INSTALLATION_en.md)** · ⬅️ [Retour au README](../README.md)

De zéro à un bot opérationnel. Trois étapes : **(A)** créer l'application Discord, **(B)** préparer le serveur, **(C)** installer et démarrer. Puis la **mise en route en jeu**.

Compagnons : [Configuration](CONFIGURATION.md) · [Hébergement](SELF_HOSTING.md) · [Base de données](DATABASE.md) · [Lavalink](LAVALINK.md).

---

## A. Application Discord (Developer Portal)

1. Va sur <https://discord.com/developers/applications> → **New Application**.
2. Onglet **Bot** → **Reset Token** → copie le token (= `DISCORD_TOKEN`).
3. Onglet **Bot** → active les **Privileged Gateway Intents** :
   - ☑️ `SERVER MEMBERS INTENT`
   - ☑️ `MESSAGE CONTENT INTENT`
   - (`PRESENCE INTENT` **non** requis)
4. Onglet **General Information** → copie l'**Application ID** (= `CLIENT_ID`). Le champ *Name* y devient le **nom affiché** du bot dans Discord (repris dans les embeds). Pour le branding interne, voir `BOT_NAME` dans [Configuration](CONFIGURATION.md).
5. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : `Manage Channels`, `Manage Roles`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Move Members`, `Mute Members`, `Deafen Members`, `Add Reactions`, `View Audit Log`
   - Plus simple : cocher `Administrator` (OK pour un usage perso ; déconseillé en prod multi-serveurs).
   - Copie l'URL en bas de page, ouvre-la, invite le bot.

> ⚠️ **Intents privilégiés & passage public.** `MESSAGE CONTENT` (requis par l'auto-modération) et `SERVER MEMBERS` sont des intents **privilégiés**. Au-delà de **100 serveurs**, ton bot doit être **vérifié par Discord**, et l'usage de `MESSAGE CONTENT` doit être **justifié et approuvé**. Anticipe cette démarche si tu vises une diffusion large.

---

## B. Préparation du serveur Discord

Active le **Mode développeur** (Paramètres utilisateur → Avancés) pour copier les IDs (clic droit → *Copier l'identifiant*).

### Rôles à créer **avant** le démarrage

| Rôle | Sert à | Comment |
|---|---|---|
| `Staff` | Modération (`KICK`/`BAN`/`TIMEOUT`/`WARN`…) | Créer un rôle « Staff », puis après le boot : `/config staff role:@Staff` |
| `Administration` *(optionnel)* | Commandes sensibles (`/config`, `/logs`, `/backup`, `/lockdown serveur`, `/setup-*`, `/role temp`) | Créer un rôle « Admin », puis après le boot : `/config admin role:@Admin` |
| `Membre vérifié` | Donné au clic sur « J'accepte le règlement » | Après le boot : `/config reglement role:@Membre vérifié` |
| **Un rôle par catégorie de ticket** | Équipe responsable d'une catégorie. **Seuls eux voient les tickets** de leur catégorie et reçoivent le ping. | Un rôle par catégorie (`@Support`, `@Bug-team`, `@Builders`…), assigné après le boot via `/config ticket-role` |

> ⚠️ **Hiérarchie cruciale** : le rôle du bot doit être **au-dessus** de tous les rôles qu'il manipule (Staff, Admin, rôles temporaires, rôles de tickets, autorôle), sinon `Missing Permissions` lors des attributions.

### Salons & catégories à créer

| Élément | Sert à | Commande |
|---|---|---|
| Catégorie « Tickets » | Conteneur des salons de tickets | `/config tickets categorie:` |
| `#logs-tickets` (privé staff) | Transcripts à la fermeture | `/config tickets salon-logs:` |
| `#bienvenue` *(optionnel)* | Carte de bienvenue (sans ping) | `/config accueil salon:` |
| `#règlement` | Affichage du règlement | `/setup-reglement` |
| `#logs-messages`, `#logs-modération`, … (privés staff) | Logs serveur catégorisés | `/logs salon …` |
| `#suggestions` | Réception des `/suggestion` | `/config suggestions` |
| Salon vocal « ➕ Créer un vocal » | Pattern « rejoindre pour créer » | `/config vocaux-temp` |
| `#tickets` | Panneau de sélection des catégories | `/setup-tickets` (à lancer dedans) |

---

## C. Installation locale

### Prérequis

- **Node.js ≥ 20** (`node --version`)
- **git**
- *(Optionnel)* **Java 17+** uniquement si tu actives la musique — voir [Lavalink](LAVALINK.md).

### Cloner, configurer, démarrer

```bash
git clone https://github.com/xeylou/unknown-variable.git unknown_variable
cd unknown_variable
npm install                 # 1. deps + génère le client Prisma (hook postinstall)
cp .env.example .env        # 2. remplis au minimum DISCORD_TOKEN, CLIENT_ID (+ BOT_NAME si voulu)
npx prisma generate         # 3. (re)génère le client — filet si le postinstall a été sauté
npx prisma db push          # 4. crée le dossier data/ + les tables SQLite
npm run deploy              # 5. enregistre les slash-commands GLOBALEMENT (tous serveurs, propagation ~1 h)
npm start                   # 6. lance le bot
```

> **Ordre important** : `db push` (4) doit suivre l'édition du `.env` (le chemin de la base dépend de `BOT_NAME`), et `npm run deploy` (5) est **indispensable** — les commandes ne se déploient **pas** automatiquement. À **relancer** à chaque ajout/modification de commande. En développement, `npm run deploy:guild` est **instantané** mais exige `GUILD_ID` dans le `.env`.

Au démarrage, la console affiche notamment :

```
[events:ready] Connecté en tant que <nom-du-bot>
[events:ready] Modules : musique ⛔ · github ⛔ · twitch ⛔ · santé ✅ (:3001)
[events:ready] Présent sur 1 serveur(s) · 58 commande(s) chargée(s).
```

Le détail des variables `.env` est dans [Configuration → Variables d'environnement](CONFIGURATION.md#variables-denvironnement-env).

---

## D. Mise en route en jeu (une seule fois, dans l'ordre)

À l'ajout du bot, un message d'accueil rappelle déjà ces étapes aux admins.

```
1. /config staff role:@Staff   ·   /config admin role:@Admin
   → Déclare les rôles modération/admin. Sans eux, le bot se base sur les
     permissions Discord natives.

2. /permissions check
   → Bouton « Tout corriger » : accorde aux rôles staff/admin/ticket-staff les
     permissions Discord pour que les commandes apparaissent dans leur menu.

3. /logs tout-dans salon:#logs-modération
   → Active les 8 catégories de logs dans un salon. Granularise ensuite avec
     /logs salon categorie:messages salon:#logs-messages

4. /config reglement role:@Membre vérifié
   → Rôle donné quand un membre clique « J'accepte ».

5. /setup-reglement
   → À lancer DANS #règlement (stocke l'ID pour les DM de sanctions).

6. /config autorole role:@En attente        (optionnel — rôle pré-vérification)

7. /config accueil salon:#bienvenue carte-image:true message:"Bienvenue {username} 🎉"
   → MP (carte PNG + embed d'orientation) + carte postée dans #bienvenue SANS ping.
     Variables : {user} {username} {server} {count}.

8. /config suggestions salon:#suggestions

9. /config vocaux-temp salon:#➕-créer-vocal [categorie:#Vocaux]

10. /config tickets categorie:#Tickets salon-logs:#logs-tickets
    /config ticket-role categorie:support role:@Support   (répéter par catégorie)
    → Une catégorie sans rôle responsable refuse la création de ticket.

11. /setup-tickets
    → À lancer DANS #tickets. Déploie le menu déroulant.
```

### Modules optionnels

```
/config automod actif:true phishing:true token-leak:true zalgo:true
/config antiraid actif:true age-min-compte:7 expulser-jeunes:true
/config captcha actif:true role-non-verifie:@Non-vérifié role-verifie:@Vérifié
/setup-captcha                        # DANS #vérification : déploie le bouton (défi en éphémère)
/config minecraft ip:play.monserveur.fr salon-statut:#statut-mc
/setup-roles role1:@Joueur role2:@Builder titre:"Choisis ton rôle"
/config invitation url:https://discord.gg/xxxx
```

Intégrations externes (Twitch, YouTube, RSS, GitHub) : voir [Configuration → Suivi & notifications](CONFIGURATION.md#suivi--notifications).

---

## ✅ Checklist post-installation

- [ ] `/config staff` et `/config admin` → rôles déclarés
- [ ] `/permissions check` → « Tout corriger » → tous les rôles ✅
- [ ] `/logs voir` → 8 catégories configurées
- [ ] Un membre lambda voit `/help` et n'y trouve **que** les commandes publiques ; le staff y voit les siennes
- [ ] Test : ouvrir un ticket → le bon rôle est pingué, seuls lui + l'auteur voient le salon
- [ ] Test : kick un compte alt → DM reçu, casier mis à jour, log dans le salon de modération
- [ ] Test : poster un lien `discord.gg/xxxx` (si automod actif) → supprimé
- [ ] Sauvegarde de `data/<bot>.db` planifiée — voir [Base de données](DATABASE.md)

Problème au démarrage ? Voir [Hébergement → Dépannage](SELF_HOSTING.md#dépannage).
