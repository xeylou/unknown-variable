> 🇫🇷 **Version française [README.md](README.md)**

<h2 align="center">unknown-variable Discord bot</h2>

An **all-in-one** Discord bot written in **strict TypeScript** on **discord.js v14**, with **Prisma 7 + SQLite** for persistence. ~71 slash commands, ~21 interactive components, covering moderation, tickets, logging, onboarding, engagement, and integrations (Minecraft, YouTube/Twitch/RSS, GitHub, Lavalink music). **Multi-server**, **bilingual FR/EN** (replies follow the client's language), and the bot name is **customizable** via `BOT_NAME`.

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white">
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue">
</p>

---

<h2 align="center">✨ Features</h2>

| Module | Description |
|---|---|
| 🎫 **Tickets** | Panel + category picker, **per-team isolated categories**, transcript, 1–5 rating, comment, 7-day DM reopen |
| 🛡️ **Moderation** | Sanctions with DM + record + log, channel/server `lockdown`, **anti-raid**, **auto-moderation** (phishing, tokens, Zalgo, words, spam, invites) |
| 📜 **Logs & Audit** | Per-category log: messages, members, roles, channels, voice, server, moderation, bot actions |
| ✅ **Onboarding & verification** | Rules to accept, autorole, **visual CAPTCHA** shown ephemerally, welcome/goodbye cards (PNG, optional) in DM + channel, **short welcome message that pings** the member |
| 🎉 **Engagement** | Giveaways (requirements + multipliers), suggestions (thread + vote), persistent & native polls |
| 🔊 **Temporary voice** | "Join to create" channel + persistant control panel |
| 🧰 **Utilities** | `/userinfo`, `/serverinfo`, `/avatar`, `/ping`, `/botinfo`, reminders (one-off / recurring / per role), FAQ tags, AFK, embed builder |
| ⛏️ **Minecraft** | Status, auto-watch + role alert, RCON (whitelist, in-game role), Discord <-> MC username link, **in-game chat mirror** to a staff channel |
| 🔔 **Notifications** | YouTube, Twitch, and **generic RSS feeds** (Instagram / TikTok / X via RSSHub, Reddit, blogs, podcasts…) with role ping |
| 🐙 **GitHub** | Repo tracking (commits, PRs, **CI/CD**, releases, issues, reviews) in **hybrid** webhooks + polling, live pipeline status, digest, GitHub <-> Discord linking |
| 🎵 **Music** | Playback via **Lavalink** (queue, filters, lyrics) |
| 📊 **Stat channels** | Member-per-role counters, message / invite leaderboards |

---

<h2 align="center">🚀 Quick start</h2>

```bash
git clone https://github.com/xeylou/unknown-variable.git bot_discord
cd bot_discord
npm install                 # deps + generates the Prisma client (postinstall)
cp .env.example .env        # fill at least DISCORD_TOKEN and CLIENT_ID
npx prisma db push          # creates data/ + the SQLite tables
npm run deploy              # registers slash commands (global ; dev: npm run deploy:guild)
npm start                   # start the bot
```

> ⚠️ **Required** in `.env`: `DISCORD_TOKEN` and `CLIENT_ID`. Everything else is configured **per server** via `/config` after startup. Full guide: [docs/INSTALLATION_en.md](docs/INSTALLATION_en.md).

With Docker:

```bash
docker compose up -d                       # bot alone
docker compose exec bot npm run deploy     # after the first startup
```

---

<h2 align="center">📚 Docs</h2>

| Guide | Contents |
|---|---|
| 📥 [Installation](docs/INSTALLATION_en.md) | Discord Portal, prerequisites, server prep, first startup, running setup |
| ⚙️ [Configuration](docs/CONFIGURATION_en.md) | `.env` variables, `/config` commands, permission/tier system, editable files |
| 🧾 [Commands](docs/COMMANDS_en.md) | Full catalogue by module, with access tiers |
| 🖥️ [Self-hosting](docs/SELF_HOSTING_en.md) | Docker / Compose, systemd, Linux, health probe, updates |
| 💾 [Database](docs/DATABASE_en.md) | Prisma, backups, `db push` vs migrations, moving to Postgres |
| 🎵 [Lavalink](docs/LAVALINK_en.md) | Music server installation |
| 🤝 [Contributing](CONTRIBUTING_en.md) | Dev environment, conventions, adding a command, i18n, PRs |

🔒 Security: [SECURITY.md](SECURITY.md) · 📅 Changes: [CHANGELOG.md](CHANGELOG.md) · 🤝 Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

<h2 align="center">🧱 Tech stack</h2>

- **Runtime**: Node.js ≥ 20, run via [`tsx`](https://github.com/privatenumber/tsx) (no build step)
- **Discord**: [discord.js](https://discord.js.org/) v14 - intents `Guilds`, `GuildMessages`, `MessageContent`*, `GuildMembers`*, `GuildModeration`, `GuildVoiceStates`, `GuildExpressions`, `GuildInvites`, `GuildMessageReactions`
- **Database**: SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3`
- **Images**: `@napi-rs/canvas` (welcome cards, CAPTCHA)
- **Music**: `lavalink-client` (separate, optional Lavalink server)

> `MessageContent` and `GuildMembers` are **privileged intents**. They must be enabled in the Developer Portal and require **Discord approval beyond 100 servers** (bot verification). See [docs/INSTALLATION_en.md](docs/INSTALLATION_en.md).

---

<h2 align="center">📄 License</h2>

Distributed under the **GNU General Public License v3.0 (or later)** - see [`LICENSE`](LICENSE).
In short: free to use, study, modify and redistribute, including for your own server; any **distributed** modified version must remain GPL-3.0 and provide its source code. No warranty.
