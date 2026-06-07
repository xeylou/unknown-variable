> 🇬🇧 **English version [README_en.md](README_en.md)**

# unknown-variable bot Discord 

Bot Discord **multifonction**, écrit en **TypeScript strict** sur **discord.js v14**, persistance avec **Prisma 7 + SQLite**. ~71 commandes slash, ~21 composants interactifs, modération, tickets, logs, accueil, engagement, intégrations (Minecraft, YouTube/Twitch/RSS, GitHub, musique Lavalink) et autre ! **Multi-serveur**, **bilingue FR/EN** (réponses selon la langue choisie), nom du bot **personnalisable**.

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white">
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue">
</p>

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| 🎫 **Tickets** | Panneau + sélecteur de catégories de tickets, **catégories isolées par équipe**, résumé à la fermeture, notation 1–5, commentaire et réouverture sous 7 j en MP |
| 🛡️ **Modération** | Sanctions avec raison en MP + casier pour le staff + log, `lockdown` des salons ou serveur, **anti-raid**, **auto-modération** (phishing, tokens, Zalgo, mots, spam, invites...) |
| 📜 **Logs et Audit** | Journal par catégorie : messages, action des membres, rôles, channels, vocaux, serveur, modération, actions du bot |
| ✅ **Accueil & vérification** | Règlement à accepter, autorôle à l'arrivée, **CAPTCHA visuel**, carte de bienvenue (avec ou sans image) en DM et salon bienvenue |
| 🎉 **Intéravtions** | Giveaways, suggestions (thread + vote), sondages persistants |
| 🔊 **Vocaux temporaires** | Salon "rejoindre pour créer" + panneau de contrôle avec mémoire des paramètres du salon |
| 🧰 **Utilitaires** | `/userinfo`, `/serverinfo`, `/avatar`, `/ping`, `/botinfo`, rappels (ponctuels, récurrents, par rôle), tags FAQ, AFK, formateur d'embed |
| ⛏️ **Minecraft** | Statut, suivi auto et alerte par rôle, RCON (whitelist, rôle en jeu), liaison Discord <-> pseudo MC |
| 🔔 **Notifications** | YouTube, Twitch, et **flux RSS génériques** (Instagram / TikTok / X via RSSHub, Reddit, blogs, podcasts…) avec ping |
| 🐙 **GitHub** | Suivi de dépôts (commits, PR, **CI/CD**, releases, issues, reviews) en **hybride** webhooks + polling, statut pipeline live, digest, liaison compte GitHub <-> Discord |
| 🎵 **Musique** | Lecture et intéraction avec **Lavalink** (filtres, paroles...) |
| 📊 **Salons statistiques** | Compteurs de membres par rôle, classements messages, invitations... dans des salons |

---

## 🚀 Démarrage rapide

```bash
git clone https://github.com/xeylou/unknown-variable.git bot_discord
cd bot_discord
npm install                 # deps + génère le client Prisma (postinstall)
cp .env.example .env        # remplire à minima DISCORD_TOKEN et CLIENT_ID
npx prisma db push          # crée data/ + tables SQLite
npm run deploy              # enregistre les slash-commands (global ; en dev : npm run deploy:guild)
npm start                   # lance le bot
```

> ⚠️ **Obligatoire dans le `.env`** : `DISCORD_TOKEN` et `CLIENT_ID`. Tout le reste configuré sur le serveur via `/config` après démarrage. Détail complet dans [docs/INSTALLATION.md](docs/INSTALLATION.md).

Avec Docker :

```bash
docker compose up -d                       # le bot seul
docker compose exec bot npm run deploy     # une seule fois, après le 1er démarrage
```

---

## 📚 Documentation

| Guide | Contenu |
|---|---|
| 📥 [Installation](docs/INSTALLATION.md) | Création du bot, portail Discord, prérequis, préparation, premier démarrage |
| ⚙️ [Configuration](docs/CONFIGURATION.md) | Variables du `.env`, commandes `/config`, système de permissions/niveaux d'accès, fichiers éditables |
| 🧾 [Commandes](docs/COMMANDS.md) | Catalogue complet par module, avec les niveaux d'accès |
| 🖥️ [Hébergement](docs/SELF_HOSTING.md) | Docker / Compose, systemd, Linux, sonde, mises à jour |
| 💾 [Base de données](docs/DATABASE.md) | Prisma, sauvegardes, `db push` vs migrations, passage à Postgres |
| 🎵 [Lavalink](docs/LAVALINK.md) | Installation du serveur musique |
| 🤝 [Contribuer](CONTRIBUTING.md) | Environnement de dev, conventions, ajouter une commande, i18n, PR |

🔒 Sécurité : [SECURITY.md](SECURITY.md) · 📅 Changements : [CHANGELOG.md](CHANGELOG.md) · 🤝 Conduite : [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## 🧱 Couches de développement

- **Runtime** : Node.js ≥ 20, exécuté via [`tsx`](https://github.com/privatenumber/tsx) (pas d'étape de build)
- **Discord** : [discordjs](https://discord.js.org/) v14 - intents `Guilds`, `GuildMessages`, `MessageContent`*, `GuildMembers`*, `GuildModeration`, `GuildVoiceStates`, `GuildExpressions`, `GuildInvites`, `GuildMessageReactions`
- **Base de données** : SQLite via Prisma 7 + adaptateur `@prisma/adapter-better-sqlite3`
- **Images** : `@napi-rs/canvas` (cartes de bienvenue, CAPTCHA)
- **Musique** : `lavalink-client` (serveur Lavalink séparé, optionnel)

> `MessageContent` et `GuildMembers` sont des **intents privilégiés**. Ils nécessitent une activation dans le Developer Portal, et une **approbation Discord** au-delà de 100 serveurs (vérification du bot). Plus d'infos sur [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## 📄 Licence

Distribué sous **GNU General Public License v3.0 (ou ultérieure)** - voir [`LICENSE`](LICENSE).
En résumé : utilisation, étude, modification et redistribution libres, y compris pour son propre serveur ; toute version **distribuée** doit rester sous GPL-3.0 et fournir son code source credité. Aucune garantie.
