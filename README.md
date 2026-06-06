# 🤖 _unknown_variable — Bot Discord multifonction

> 🇬🇧 **English version → [README_en.md](README_en.md)**

Bot Discord **tout-en-un**, écrit en **TypeScript strict** sur **discord.js v14**, persistance **Prisma 7 + SQLite**. ~71 commandes slash, ~21 composants interactifs, modération, tickets, logs, accueil, engagement, intégrations (Minecraft, YouTube/Twitch/RSS, GitHub, musique Lavalink). **Multi-serveur**, **bilingue FR/EN** (réponses selon la langue du client), nom du bot **personnalisable** via `BOT_NAME`.

<p>
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white">
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue">
</p>

---

## ✨ Fonctionnalités

| Module | En bref |
|---|---|
| 🎫 **Tickets** | Panneau + sélecteur de catégories, **catégories isolées par équipe**, transcript, notation 1–5 ★, commentaire, réouverture 7 j en DM |
| 🛡️ **Modération** | Sanctions avec DM + casier + log, `lockdown` salon/serveur, **anti-raid**, **auto-modération** (phishing, tokens, Zalgo, mots, spam, invites) |
| 📜 **Logs & Audit** | Journal par catégorie : messages, membres, rôles, salons, vocal, serveur, modération, actions du bot |
| ✅ **Accueil & vérification** | Règlement à accepter → rôle, autorôle, **CAPTCHA visuel** en éphémère, carte de bienvenue (PNG) en MP + salon |
| 🎉 **Engagement** | Giveaways (conditions + multiplicateurs), suggestions (thread + vote), sondages persistants & natifs |
| 🔊 **Vocaux temporaires** | Salon « rejoindre pour créer » + panneau de contrôle |
| 🧰 **Utilitaires** | `/userinfo`, `/serverinfo`, `/avatar`, `/ping`, `/botinfo`, rappels (ponctuels / récurrents / par rôle), tags FAQ, AFK, embed builder |
| ⛏️ **Minecraft** | Statut, suivi auto + alerte de rôle, RCON (whitelist, rôle en jeu), liaison Discord ↔ pseudo MC |
| 🔔 **Notifications** | YouTube, Twitch, et **flux RSS génériques** (Instagram / TikTok / X via RSSHub, Reddit, blogs, podcasts…) avec ping de rôle |
| 🐙 **GitHub** | Suivi de dépôts (commits, PR, **CI/CD**, releases, issues, reviews) en **hybride** webhooks + polling, statut pipeline live, digest, liaison GitHub ↔ Discord |
| 🎵 **Musique** | Lecture via **Lavalink** (file, filtres, paroles) |
| 📊 **Salons statistiques** | Compteurs de membres par rôle, classements messages / invitations |

---

## 🚀 Démarrage rapide

```bash
git clone https://github.com/xeylou/unknown-variable.git bot_discord
cd bot_discord
npm install                 # deps + génère le client Prisma (postinstall)
cp .env.example .env        # remplis au minimum DISCORD_TOKEN et CLIENT_ID
npx prisma db push          # crée data/ + les tables SQLite
npm run deploy              # enregistre les slash-commands (global, ~1 h ; en dev : npm run deploy:guild)
npm start                   # lance le bot
```

> **Obligatoire** dans le `.env` : `DISCORD_TOKEN` et `CLIENT_ID`. Tout le reste se configure **par serveur** via `/config` après le démarrage. Détail complet : [docs/INSTALLATION.md](docs/INSTALLATION.md).

Avec Docker :

```bash
docker compose up -d                       # le bot seul
docker compose exec bot npm run deploy     # une seule fois, après le 1er démarrage
```

---

## 📚 Documentation

| Guide | Contenu |
|---|---|
| 📥 [Installation](docs/INSTALLATION.md) | Portal Discord, prérequis, préparation du serveur, premier démarrage, mise en route en jeu |
| ⚙️ [Configuration](docs/CONFIGURATION.md) | Variables `.env`, commandes `/config`, système de permissions/tiers, fichiers éditables |
| 🧾 [Commandes](docs/COMMANDS.md) | Catalogue complet par module, avec les tiers d'accès |
| 🖥️ [Hébergement](docs/SELF_HOSTING.md) | Docker / Compose, systemd, Linux, sonde de santé, mises à jour |
| 💾 [Base de données](docs/DATABASE.md) | Prisma, sauvegardes, `db push` vs migrations, passage à Postgres |
| 🎵 [Lavalink](docs/LAVALINK.md) | Installation du serveur musique |
| 🤝 [Contribuer](CONTRIBUTING.md) | Environnement de dev, conventions, ajouter une commande, i18n, PR |

🔒 Sécurité : [SECURITY.md](SECURITY.md) · 📅 Changements : [CHANGELOG.md](CHANGELOG.md) · 🤝 Conduite : [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## 🧱 Stack technique

- **Runtime** : Node.js ≥ 20, exécuté via [`tsx`](https://github.com/privatenumber/tsx) (pas d'étape de build).
- **Discord** : [discord.js](https://discord.js.org/) v14 — intents `Guilds`, `GuildMessages`, `MessageContent`*, `GuildMembers`*, `GuildModeration`, `GuildVoiceStates`, `GuildExpressions`, `GuildInvites`, `GuildMessageReactions`.
- **Base de données** : SQLite via Prisma 7 + adaptateur `@prisma/adapter-better-sqlite3`.
- **Images** : `@napi-rs/canvas` (cartes de bienvenue, CAPTCHA).
- **Musique** : `lavalink-client` (serveur Lavalink séparé, optionnel).

> \* `MessageContent` et `GuildMembers` sont des **intents privilégiés**. Ils nécessitent une activation dans le Developer Portal, et une **approbation Discord** au-delà de 100 serveurs (vérification du bot). Voir [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## 📄 Licence

Distribué sous **GNU General Public License v3.0 (ou ultérieure)** — voir [`LICENSE`](LICENSE).
En résumé : utilisation, étude, modification et redistribution libres, y compris pour ton propre serveur ; toute version **distribuée** doit rester sous GPL-3.0 et fournir son code source. Aucune garantie.
