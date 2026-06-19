# ⚙️ Configuration

> 🇫🇷 **Version française → [CONFIGURATION.md](CONFIGURATION.md)** · ⬅️ [Back to README](../README_en.md)

> ℹ️ Command and option **names are not localized** (only descriptions and replies are). Slash-command tokens below (`salon`, `categorie`, `role`…) appear as they actually are in the bot.

Three configuration levels:
1. **Environment variables** (`.env`) — secrets and host-wide options.
2. **Source files** (`src/`) — branding and editable content (restart required).
3. **Live configuration** (`/config`, `/logs`, …) — **per server**, stored in the database, **no restart**.

---

## Environment variables (`.env`)

Source of truth: [`.env.example`](../.env.example) (copy to `.env`).

### Required

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token (Developer Portal → Bot → Reset Token). |
| `CLIENT_ID` | Application ID (Developer Portal → General Information). |

> Everything else is configured **per server** via `/config` — no per-server env vars needed. That is what makes the bot multi-server.

### Optional

| Variable | Default | Description |
|---|---|---|
| `BOT_NAME` | `_unknown_variable` | Internal branding (logs, User-Agent, status, **DB file name**). The name **shown in Discord** comes from the Developer Portal. |
| `BOT_STATUS` | *(empty)* | Rotating statuses, separated by `\|`. Placeholders `{name}` `{count}`. Default: `{name} \| /help \| {count} serveur(s)`. |
| `GUILD_ID` | *(empty)* | Main server: instant dev deploy (`npm run deploy:guild`) + **default** for `*_ROLE_ID` / `TICKET_*`. Not needed for multi-server. |
| `STAFF_ROLE_ID` | *(empty)* | **Main server default only.** Prefer `/config staff`. |
| `ADMIN_ROLE_ID` | *(empty)* | **Main server default only.** Prefer `/config admin`. |
| `TICKET_CATEGORY_ID` | *(empty)* | **Main server default only.** Prefer `/config tickets`. |
| `LOGS_CHANNEL_ID` | *(empty)* | **Main server default only.** Transcripts channel. Prefer `/config tickets`. |
| `DATABASE_PATH` | `./data/<BOT_NAME slug>.db` | SQLite file path. ⚠️ Set it explicitly if you change `BOT_NAME` with an existing DB, otherwise the bot points to a new empty file. |
| `HEALTH_PORT` | `3001` | HTTP **health probe** port (`GET /health` → `ok`). `0` = disabled. Used by the Docker HEALTHCHECK and uptime monitoring. |
| `MC_CHAT_PORT` / `_HOST` | `0` / `0.0.0.0` | HTTP receiver for the **Minecraft chat mirror** (`POST /mc-chat`). `0` = disabled. Per-server secret auth (`/config minecraft-chat`). See the bridge `scripts/mc-chat-bridge.mjs`. |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | *(empty)* | Without them, `/notif ajouter-twitch` is disabled. Create one: <https://dev.twitch.tv/console/apps>. |
| `LAVALINK_HOST` / `LAVALINK_PORT` | `localhost` / `2333` | Lavalink server (music). |
| `LAVALINK_PASSWORD` | *(empty)* | **Without a password, the music module is disabled.** See [Lavalink](LAVALINK_en.md). |
| `LAVALINK_SECURE` | `false` | `true` if Lavalink uses wss/https. |
| `GITHUB_TOKEN` | *(empty)* | **Read-only** fine-grained PAT → polling, `/git statut`, author mentions. |
| `GITHUB_WEBHOOK_SECRET` | *(empty)* | Enables the webhook receiver (HMAC-SHA256) → real time. Without a token **or** secret, the GitHub module is disabled. |
| `GITHUB_WEBHOOK_PORT` / `_HOST` / `_PATH` | `3000` / `0.0.0.0` / `/github/webhook` | Webhook receiver listen settings. |

> **GitHub — hybrid mode**: set `GITHUB_TOKEN` (polling, works behind NAT) **and/or** `GITHUB_WEBHOOK_SECRET` (real-time webhooks). Details: [§ GitHub tracking](#github-tracking).

Variables are validated at startup (**Zod** schema): a missing or invalid required variable **stops the bot** with a message pinpointing the issue.

---

## Source-file configuration (`src/`)

A restart is required after changes.

### `src/config.ts` — colors & ticket categories

**Embed colors** (`colors`) — `0xRRGGBB` format:

```ts
colors: {
  primary: 0x5865f2,  // Discord blue — most embeds
  neutral: 0x2b2d31,  // passive panels
  success: 0x57f287,  // confirmations
  danger:  0xed4245,  // errors, sanctions
  warning: 0xfee75c   // warnings, lockdown
}
```

**Ticket category catalogue** (`tickets.categories`) — structure/branding shared by all servers:

```ts
categories: [
  { value: 'support', label: 'Support général',  description: 'Question ou aide',           emoji: '🛠️', staffRoleId: '' },
  { value: 'bug',     label: 'Signaler un bug',  description: 'Rapporter un problème',      emoji: '🐛', staffRoleId: '' },
  // …
]
```

| Field | Role |
|---|---|
| `value` | Short id (`[a-z0-9-]`), used in the channel name and the database. |
| `label` / `description` / `emoji` | Dropdown display. |
| `staffRoleId` | **Normally empty.** The owner role is configured **per server** via `/config ticket-role`. |

> 🎯 A category's **owner role** is set per server (`/config ticket-role`), not here — that's what makes tickets multi-server. After editing the catalogue, **re-run `/setup-tickets`**.

### Other editable content

| File | Contents |
|---|---|
| [`src/data/reglement.ts`](../src/data/reglement.ts) | Rules text (header, articles, acceptance, footer). Auto-split into 2 embeds (6000-char limit). |
| [`src/data/help.ts`](../src/data/help.ts) | `/help` categories and command signatures, per-tier classification. |
| [`src/data/welcome.ts`](../src/data/welcome.ts) | Second orientation embed DMed on verification. |
| [`src/components/tickets.ts`](../src/components/tickets.ts) | `MAX_TICKETS_PER_DAY` (default 3), `REOPEN_WINDOW_MS` (default 7 d). |
| [`src/commands/community/suggest.ts`](../src/commands/community/suggest.ts) | `COOLDOWN_MS` (default 10 min), `TAGS`. |
| [`src/i18n/messages.ts`](../src/i18n/messages.ts) | FR/EN translations (see below). |

### Internationalization (`src/i18n/`)

The bot is **bilingual**: **English is the canonical language**, French is served based on `interaction.locale`. **Only descriptions and replies are translated — command/option names stay unchanged.**

```ts
'avatar.title': {
  en: "{name}'s avatar",     // canonical base (English)
  fr: 'Avatar de {name}'     // shown to French clients
}
```

- Definition side: `.setDescription(base(key))` + `.setDescriptionLocalizations(frLoc(key))`.
- Reply side: `const lang = resolveLang(interaction.locale)` then `t(lang, key, vars)`.
- `resolveLang` maps a `fr*` client → French, everything else → English.

> 🔧 **Progressive rollout**: the foundation is in place; commands are converted over time. Unconverted ones stay French, breaking nothing. See [CONTRIBUTING](../CONTRIBUTING_en.md#i18n).

---

## Permission system (tiers)

| Tier | Definition | Runtime gate |
|---|---|---|
| `public` | Everyone | No restriction |
| `ticket-staff` | Member of a ticket-category role (`/config ticket-role`) | `/add-user`, `/remove-user`, `/ticket move` |
| `staff` | Staff role (`/config staff`) **or** Discord perm `KickMembers` / `BanMembers` / `ModerateMembers` / `ManageMessages` | `requireStaff` |
| `admin` | Owner, Discord perm `Administrator`, **or** admin role (`/config admin`) | `requireAdmin` |

**Discord permissions vs custom roles.** Discord shows a command to a member **only if** their role has the required Discord permission. The staff/admin roles you create are empty by default — you must **grant** the perms:

```
/permissions check        → "Fix everything" button
```

| Command | Action |
|---|---|
| `/permissions grant-staff` | Kick, Ban, ModerateMembers, ManageMessages, ManageNicknames, ManageChannels, ManageRoles, ViewAuditLog to the staff role. |
| `/permissions grant-admin` | Everything staff has + ManageGuild + MentionEveryone to the admin role. |
| `/permissions grant-ticket-staff [role]` | ManageMessages to all category roles (or a one-off role). |

---

## Live configuration (per server)

Everything below changes **without a restart**, stored in the database (`guild_config`).

### `/config <subcommand>`

| Subcommand | Parameters | Effect |
|---|---|---|
| `voir` | — | Shows the current state. |
| `staff` / `admin` | `[role]` | Moderation / administration role (empty = remove). |
| `tickets` | `[categorie]` `[salon-logs]` | Ticket category + transcripts channel. |
| `ticket-role` | `categorie` `[role]` | Owner role of a category (empty = disable the category). |
| `automod` | `actif` `[phishing]` `[token-leak]` `[zalgo]` `[majuscules]` | Auto-moderation and sub-modules (each toggle on/off independently; `majuscules` = block excessive capitals). |
| `mot-ajouter` / `mot-retirer` | `mot` | Banned words (case-insensitive, leet variants). |
| `automod-spam` | `[messages:3-20]` `[secondes:3-30]` `[exclusion-minutes:1-60]` | Anti-spam timeout threshold/duration (defaults 5 / 7 / 5). |
| `invite-whitelist` | `action:add\|remove\|list` `[guild-id]` | Allied servers whose invites are allowed. |
| `antiraid` | `actif` `[age-min-compte:0-365]` `[expulser-jeunes]` `[verrouillage-auto]` `[quarantaine:role]` | Wave detection + actions. **The minimum-age filter is skipped when the captcha is enabled** (it already gates entry). |
| `captcha` | `actif` `[role-non-verifie]` `[role-verifie]` | Visual verification (6 characters, challenge shown ephemerally). |
| `accueil` | `[message]` `[salon]` `[carte-image]` `[image-fond:url]` | Welcome on rules-role grant: DM (card + embed) and card posted in `salon` **without ping**. Variables: `{user}` `{username}` `{server}` `{count}`. |
| `accueil-court` | `[salon]` `[message]` `[desactiver]` | Short welcome message that **pings the member**, posted in `salon` when the rules role is granted. Variables: `{user}` `{username}` `{server}` `{count}`. |
| `depart` | `salon` `[message]` `[carte-image]` `[image-fond:url]` | Goodbye (optional image card, e.g. staff channel). Variables: `{username}` `{server}` `{count}`. |
| `autorole` | `role` | Role granted on every join. |
| `reglement` | `role` | Role granted on clicking "I accept". |
| `suggestions` | `salon` | Channel receiving `/suggestion`. |
| `vocaux-temp` | `salon:voice` `[categorie]` | "Join to create" channel. |
| `minecraft` | `ip` `[salon-statut]` | Tracked IP + auto-refreshed status channel. |
| `minecraft-rcon` | `host` `mot-de-passe` `[port:1-65535]` `[role-en-jeu]` | RCON for `/mcwhitelist` + in-game role. |
| `minecraft-chat` | `[salon]` `[regenerer-secret]` `[desactiver]` | Read-only mirror of MC chat in a staff `salon`. Returns the endpoint + secret for the `scripts/mc-chat-bridge.mjs` bridge. Requires `MC_CHAT_PORT`. |
| `invitation` | `[url]` | Invite URL shown in kick/softban/unban DMs. |
| `ticket-message` | `[message]` `[categorie]` | Ticket opening message (max 3500 chars). Variables: `{user}` `{username}` `{category}` `{number}` `{server}`. |

### `/logs <subcommand>`

8 categories: `messages` · `members` · `roles` · `channels` · `voice` · `server` · `moderation` · `botactions`.

| Subcommand | Parameters | Effect |
|---|---|---|
| `voir` | — | State of each category. |
| `salon` | `categorie` `salon` | Sets a category's channel and enables it. |
| `toggle` | `categorie` `actif` | Enable/disable without unconfiguring. |
| `tout-dans` | `salon` | All categories into one channel (handy at start). |

### Panel deployment (`/setup-*`)

| Command | Effect |
|---|---|
| `/setup-tickets deployer [salon:]` | Ticket menu panel in the given channel (or the current one). |
| `/setup-reglement deployer [salon:]` | Rules (`src/data/reglement.ts`) + accept button, in the given channel (or the current one). |
| `/setup-captcha` | Verification button (challenge shown ephemerally). |
| `/setup-roles role1:… [titre] [description] [role2…role5]` | Self-assignable role panel (buttons, up to 5). |
| `/setup-reaction-roles titre: description: paires: [exclusif]` | Emoji → role panel (`🟦 @Blue, 🔴 @Red`, up to 10 pairs). |

### Tracking & notifications

| Command | Effect |
|---|---|
| `/notif ajouter-youtube identifiant-chaine:UC… salon: [nom] [role]` | Tracks a YouTube channel. |
| `/notif ajouter-twitch pseudo: salon: [role]` | Tracks a Twitch streamer (requires `TWITCH_*`). |
| `/notif ajouter-rss url: salon: [nom] [role]` | Tracks a generic **RSS/Atom** feed. |
| `/notif liste` · `/notif supprimer id:` | List / remove (autocomplete on `id`). |
| `/mcsuivi ajouter\|liste\|supprimer` | Auto-refreshed MC status panel + role alert. |

The `[role]` option prepends a role mention to each announcement. On first read, the state is memorized **without announcing** (anti-flood); subsequent posts trigger a message. Poll ≈ every 5 min.

#### Instagram / TikTok / X via RSS

These platforms have no stable free public API. Use **[RSSHub](https://docs.rsshub.app/)** (open-source, self-hostable):

| Source | RSS URL |
|---|---|
| Instagram | `https://rsshub.app/instagram/user/<username>` |
| TikTok | `https://rsshub.app/tiktok/user/@<username>` |
| X / Twitter | `https://rsshub.app/twitter/user/<username>` |
| Reddit | `https://www.reddit.com/r/<sub>/.rss` *(native)* |
| WordPress blog | `<blog>/feed/` *(native)* |

> The public `rsshub.app` instance is rate-limited; for production, self-host (the `rss` profile of the [docker-compose](../docker-compose.yml)).

#### GitHub tracking

**Hybrid**: real-time webhooks (`GITHUB_WEBHOOK_SECRET`) and/or backup polling (`GITHUB_TOKEN`). Internal dedup. Disabled until one of the two is set.

- **Polling (recommended, works behind NAT)**: **read-only** fine-grained PAT (Metadata, Contents, Pull requests, Actions, Issues) → `GITHUB_TOKEN` → restart. Poll ≈ 2 min.
- **Webhooks (real time)**: `GITHUB_WEBHOOK_SECRET` → the bot exposes `POST <host>:<port>/github/webhook`. On the repo: *Settings → Webhooks*, Content type `application/json`, same secret. Behind a NAT: tunnel (`cloudflared`, `smee.io`).

| Command | Effect |
|---|---|
| `/git suivre depot: salon: [branches] [role] [salon-statut] [events]` | Tracks a repo. `role` pinged on **CI failure**; `salon-statut` = live pipeline embed. |
| `/git liste` · `/git config id:` · `/git retirer id:` | Manage (autocomplete on `id`). |
| `/git statut depot:` | Instant state (autocomplete on tracked repos; requires `GITHUB_TOKEN`). |
| `/git lier-membre` · `/git digest` · `/git digest-off` | Author linking, periodic digest. |
| `/gitlink lier\|statut\|delier` | Each member declares their GitHub username. |

### Stat channels

`/stats creer` · `ajouter` · `retirer` · `liste` · `supprimer`. Discord throttles channel renames to ~2 / 10 min → a counter updates at best every ~6 min.

### Backup / restore

- `/backup export` — exports `guild_config` + stats + mc_watchers + notifications + tags + reaction-roles as JSON (config migration, **not** disaster recovery).
- `/backup import fichier:.json` — restores. See [Database](DATABASE_en.md) for full `.db` backup.

---

➡️ Full command catalogue: [Commands](COMMANDS_en.md).
