# 💾 Database

> 🇫🇷 **Version française → [DATABASE.md](DATABASE.md)** · ⬅️ [Back to README](../README_en.md)

Storage, backups, schema migrations, and optionally moving to Postgres.

---

## Stack & storage

- **SQLite**, single file `data/<bot>.db` (path via `DATABASE_PATH`, derived from `BOT_NAME` otherwise).
- **Prisma 7** + the `@prisma/adapter-better-sqlite3` driver adapter ([`src/database.ts`](../src/database.ts)). Note: `schema.prisma` contains **no** datasource URL — it's injected at runtime from `config.database.path` resolved to an absolute path.
- Two in-memory caches in front of `guild_config`: [`configCache`](../src/utils/configCache.ts) (60 s TTL, invalidated on write) and [`guildSettings`](../src/utils/guildSettings.ts) (a **synchronous** roles/channels cache, loaded at boot, updated on every write) — the permission layer reads roles without hitting the database.

> ⚠️ `better-sqlite3` is **synchronous**: every query blocks the event loop. Fine at moderate load; at large scale (sharding / multi-instance), consider Postgres (see below).

## Main models

| Table | Contents | Durability |
|---|---|---|
| `guild_config` | Key/value config (~80+ keys) | Durable |
| `tickets` | Tickets (number, category, claim, rating, comment) | Durable |
| `sanctions` | Record: warn/kick/ban/timeout/softban | Durable |
| `tags` | `/tag` FAQ | Durable |
| `notifications` | YouTube/Twitch/RSS subscriptions | Durable |
| `github_repos` / `github_seen` / `github_links` | Tracked repos, dedup, links | Durable |
| `mc_watchers`, `mc_links`, `mc_link_codes` | Minecraft watch & links | Durable |
| `stat_channels`, `leaderboard_panels`, `message_counts`, `invite_counts` | Counters & leaderboards | Durable |
| `reaction_role_panels` / `_entries`, `button_role_panels`, `deployed_panels` | Persisted panels | Durable |
| `temp_roles` | Temporary roles to expire | Durable (else removal missed) |
| `reminders` / `recurring_reminders` | Personal & recurring reminders | Volatile |
| `polls` / `poll_votes` | Persistent polls | Volatile |
| `giveaways` / `giveaway_entries` | Running giveaways | Volatile |
| `suggestions`, `temp_voice`, `afk`, `captcha_pending` | Transient states | Volatile |

> **`/backup export` only exports durable tables** (config + stats + mc_watchers + notifications + tags + reaction-roles) — it's for **migrating a config** to another server, **not** disaster recovery. For that, copy the full `.db` file.

---

## Backups

```bash
# One-off snapshot
cp data/<bot>.db data/backup-$(date +%F-%H%M).db

# Fully clean backup, even with the bot running (SQLite WAL)
sqlite3 data/<bot>.db ".backup data/snapshot.db"
```

Daily cron + 7-day rotation (`crontab -e`):

```cron
0 3 * * * cp /home/unknown_variable/unknown_variable/data/<bot>.db /home/unknown_variable/backups/uv-$(date +\%F).db && find /home/unknown_variable/backups -name 'uv-*.db' -mtime +7 -delete
```

Restore:

```bash
sudo systemctl stop unknown_variable
cp data/backup-2026-05-25.db data/<bot>.db
sudo systemctl start unknown_variable
```

---

## Schema migrations (`db push`)

The repo has **no `prisma/migrations/` folder**: schema changes are propagated with **`prisma db push`** (compares `schema.prisma` to the database and applies the diff, with no migration file). Suited to single-instance use, and **idempotent**.

Routine after a schema change:

```bash
git pull
npx prisma generate     # regenerates the TS client (auto via postinstall)
npx prisma db push      # syncs the database
sudo systemctl restart unknown_variable
```

- **Safe**: add a table, a **nullable** column or one with `@default`, an index.
- **Dangerous (data loss)**: rename/drop a column, change a type, add a `NOT NULL` column without `@default` on a populated table.

In dangerous cases, check first:

```bash
npx prisma db push --dry-run     # lists changes without applying them
```

If you see `⚠️ data loss warning`, **back up the database first**.

> **Multi-instance / versioning**: switch to real migrations — `npx prisma migrate dev --name <name>` then `npx prisma migrate deploy` in production (baseline an existing DB with `prisma migrate resolve --applied <init>`).

---

## Inspection / debug

```bash
sqlite3 data/<bot>.db                                # SQL REPL: .tables, SELECT…, .quit
npx prisma studio --schema=prisma/schema.prisma      # web UI → http://localhost:5555
```

## Server migration (changing VPS)

```bash
# Old server
sudo systemctl stop unknown_variable
tar czf uv-data.tgz data/ .env src/config.ts         # the code comes from git

# New server
git clone <repo> unknown_variable && cd unknown_variable
npm install
tar xzf ../uv-data.tgz
# no db push needed: the schema is already applied in the copied .db
sudo systemctl enable --now unknown_variable
```

## Moving to Postgres/MySQL (if SQLite becomes limiting)

Relevant for multi-instance / sharding, or under heavy write concurrency.

1. `provider = "sqlite"` → `"postgresql"` in [`prisma/schema.prisma`](../prisma/schema.prisma).
2. Replace the adapter in [`src/database.ts`](../src/database.ts) with `@prisma/adapter-pg` (or equivalent).
3. Adapt `.env` (`DATABASE_URL=postgres://...`).
4. Migrate the data: `pgloader sqlite:///data/<bot>.db postgresql://...`.
5. `npx prisma migrate dev --name init-postgres`.
