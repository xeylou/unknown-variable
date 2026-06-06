# 🖥️ Self-hosting & operations

> 🇫🇷 **Version française → [SELF_HOSTING.md](SELF_HOSTING.md)** · ⬅️ [Back to README](../README_en.md)

How to keep the bot running, update it, and monitor it. Prerequisites & first install: [Installation](INSTALLATION_en.md).

---

## Hosting options

### A. Docker Compose *(recommended)*

The repo ships a [`Dockerfile`](../Dockerfile) (Alpine image, non-root, healthcheck) and a [`docker-compose.yml`](../docker-compose.yml) with **profiles** for optional services.

```bash
cp .env.example .env && nano .env          # at least DISCORD_TOKEN + CLIENT_ID
docker compose up -d                       # the bot alone
docker compose exec bot npm run deploy     # registers slash commands (once)
docker compose logs -f bot                 # live logs
```

With optional services:

```bash
docker compose --profile music up -d                  # bot + Lavalink
docker compose --profile rss up -d                    # bot + RSSHub (Instagram/TikTok/X)
docker compose --profile music --profile rss up -d    # everything
```

- The SQLite database lives in the named volume `data` (persisted outside the image).
- For music: in `.env`, `LAVALINK_HOST=lavalink` and `LAVALINK_PASSWORD` (matching `lavalink/application.yml` — see [Lavalink](LAVALINK_en.md)).
- For RSSHub: pass the internal URL `http://rsshub:1200/...` to `/notif ajouter-rss`.

### B. Docker (no compose)

```bash
docker build -t unknown_variable .
docker run -d --name unknown_variable --restart unless-stopped \
  --env-file .env -v unknown_variable-data:/app/data unknown_variable
docker exec unknown_variable npm run deploy
docker logs -f unknown_variable
```

### C. Linux + systemd

The repo ships [`unknown_variable.service`](../unknown_variable.service) (runs the bot via `tsx`, no build).

```bash
sudo apt update && sudo apt install -y nodejs npm git
sudo adduser --disabled-password unknown_variable
sudo su - unknown_variable
git clone <your-repo> unknown_variable
cd unknown_variable && npm install
cp .env.example .env && nano .env
npx prisma db push && npm run deploy
exit

sudo cp /home/unknown_variable/unknown_variable/unknown_variable.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now unknown_variable
sudo systemctl status unknown_variable
```

> The unit runs `node_modules/.bin/tsx src/index.ts` and auto-restarts (`Restart=always`). On a fatal exception the bot exits with an error code and systemd restarts it.

### D. Managed platforms

| Platform | Price | Notes |
|---|---|---|
| **Railway** | ~$5/mo | Easiest: connect the repo, add `.env` vars. |
| **Fly.io** | Limited free, then ~$3/mo | `fly launch` detects the Dockerfile. |
| **Render** | Free (sleeps) or ~$7/mo | Pick *Background Worker*. |
| **Sparked Host / Pterodactyl** | ~€2/mo | Discord-bot specialised, web panel. |

⚠️ Avoid "free" tiers that sleep (Heroku free, Replit free, Glitch): a bot must stay connected at all times.

---

## Health probe & monitoring

The bot exposes an **always-on** HTTP endpoint: `GET /health` → `200 ok` (port `HEALTH_PORT`, default `3001`, `0` to disable).

- The Dockerfile `HEALTHCHECK` polls it automatically → `docker ps` shows `healthy`/`unhealthy`.
- Point an external monitor (UptimeRobot, Healthchecks.io…) at `http://<host>:3001/health`.

```bash
curl http://127.0.0.1:3001/health        # → ok
docker inspect --format '{{.State.Health.Status}}' unknown_variable
```

> ⚠️ The Dockerfile `HEALTHCHECK` targets port `3001` literally. If you change `HEALTH_PORT`, adjust the Dockerfile (or the `docker-compose.yml`).

---

## Updates

### Update the bot

```bash
cd /home/unknown_variable/unknown_variable
git pull
npm install                 # reinstall if needed + regenerate the Prisma client (postinstall)
npx prisma db push          # only if prisma/schema.prisma changed — see Database
sudo systemctl restart unknown_variable
sudo journalctl -u unknown_variable -f
```

**Before a `git pull`:** back up the database (`cp data/<bot>.db data/backup-$(date +%F).db`) and the live config (`/backup export`). Details: [Database](DATABASE_en.md).

On Docker: `git pull && docker compose up -d --build` (the `CMD`'s `prisma db push` syncs the DB at startup).

### Re-deploy slash commands

`npm run deploy` (global, ~1 h propagation) **after adding or modifying** a command. In dev, `npm run deploy:guild` is instant (requires `GUILD_ID`).

### Update dependencies

```bash
npm outdated && npm update          # respects package.json semver
npm audit && npm audit fix
npm run check                       # typecheck + lint + tests before deploying
```

**Major update** (discord.js v14→v15, Prisma 7→8…): read the CHANGELOG, bump manually, `npm install`, `npm run check`, test locally, then deploy.

**Native dependencies to watch:**

| Dependency | Watch out |
|---|---|
| `better-sqlite3` | Native module — `apt install build-essential python3` if the build fails; otherwise `npm rebuild better-sqlite3 --build-from-source`. |
| `@napi-rs/canvas` | Prebuilt binding; on ARM/Alpine, check the right binary. |
| `@prisma/adapter-better-sqlite3` | Same major version as `@prisma/client` (both 7.x). |

### Lavalink, host, token rotation

- **Lavalink**: YouTube changes its protections → bump the YouTube plugin when `/play` returns nothing. See [Lavalink](LAVALINK_en.md).
- **Host**: at least every 3 months, `sudo apt update && sudo apt upgrade -y` then restart the services.
- **Discord token** (on leak): Developer Portal → Bot → **Reset Token**, update `.env`, restart. The old token dies immediately. See [SECURITY.md](../SECURITY.md).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Used disallowed intents` | Enable the Privileged Intents in the Developer Portal (see [Installation §A](INSTALLATION_en.md#a-discord-application-developer-portal)). |
| `Cannot find module '.prisma/client'` | Client not generated: `npx prisma generate` then `npx prisma db push`. |
| `tsx: not found` | Dependencies not installed: `npm install`. |
| `The table main.X does not exist` at boot | `db push` targeted a different file than the runtime — misaligned paths (`BOT_NAME` / `DATABASE_PATH`). Re-run `npx prisma db push` then `npm start`. |
| No slash commands (never appeared) | You didn't run `npm run deploy` (global, ~1 h). In dev, `npm run deploy:guild` is instant. |
| Commands deployed but invisible to a role | `/permissions check` → "Fix everything" (Discord only shows a command to roles holding the required perm). |
| `❌ Erreur de configuration dans le fichier .env` (bot exits) | A required variable is missing/invalid — the message lists which one. |
| Container stays `unhealthy` | Check that `HEALTH_PORT` isn't `0` and matches the `HEALTHCHECK` port (3001). |
| The bot doesn't create channels | Bot's role above the Staff role + `Manage Channels` permission. |
| `Missing Permissions` | The bot can't access the target category — adjust its permissions. |
| Ticket: "category has no owner role" | `/config ticket-role categorie:… role:…` (per server). |
| Black / empty welcome card | Check the logs; disable with `/config accueil carte-image:false`. |
| Music plays nothing | `LAVALINK_PASSWORD` + Lavalink server running — see [Lavalink](LAVALINK_en.md). |
| `/git` invisible | GitHub module deployed only if `GITHUB_TOKEN` **or** `GITHUB_WEBHOOK_SECRET` is set → then `npm run deploy`. |
| GitHub webhook returns 401 | The webhook *Secret* must be **identical** to `GITHUB_WEBHOOK_SECRET`. |

Logs: `sudo journalctl -u unknown_variable -f` (systemd) or `docker compose logs -f bot` (Docker). More DB detail: [Database](DATABASE_en.md).
