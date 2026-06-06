# 📥 Installation

> 🇫🇷 **Version française → [INSTALLATION.md](INSTALLATION.md)** · ⬅️ [Back to README](../README_en.md)

From zero to a running bot. Three steps: **(A)** create the Discord application, **(B)** prepare the server, **(C)** install and start. Then the **in-app setup**.

Companions: [Configuration](CONFIGURATION_en.md) · [Self-hosting](SELF_HOSTING_en.md) · [Database](DATABASE_en.md) · [Lavalink](LAVALINK_en.md).

---

## A. Discord application (Developer Portal)

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **Bot** tab → **Reset Token** → copy the token (= `DISCORD_TOKEN`).
3. **Bot** tab → enable the **Privileged Gateway Intents**:
   - ☑️ `SERVER MEMBERS INTENT`
   - ☑️ `MESSAGE CONTENT INTENT`
   - (`PRESENCE INTENT` is **not** required)
4. **General Information** tab → copy the **Application ID** (= `CLIENT_ID`). The *Name* field becomes the bot's **displayed name** in Discord (reused in embeds). For internal branding, see `BOT_NAME` in [Configuration](CONFIGURATION_en.md).
5. **OAuth2 → URL Generator** tab:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Manage Channels`, `Manage Roles`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Move Members`, `Mute Members`, `Deafen Members`, `Add Reactions`, `View Audit Log`
   - Simpler: tick `Administrator` (fine for personal use; discouraged in multi-server production).
   - Copy the URL at the bottom, open it, invite the bot.

> ⚠️ **Privileged intents & going public.** `MESSAGE CONTENT` (required by auto-moderation) and `SERVER MEMBERS` are **privileged** intents. Beyond **100 servers**, your bot must be **verified by Discord**, and `MESSAGE CONTENT` usage must be **justified and approved**. Plan this ahead if you target wide distribution.

---

## B. Discord server preparation

Enable **Developer Mode** (User Settings → Advanced) to copy IDs (right-click → *Copy ID*).

### Roles to create **before** startup

| Role | Used for | How |
|---|---|---|
| `Staff` | Moderation (`KICK`/`BAN`/`TIMEOUT`/`WARN`…) | Create a "Staff" role, then after boot: `/config staff role:@Staff` |
| `Administration` *(optional)* | Sensitive commands (`/config`, `/logs`, `/backup`, `/lockdown server`, `/setup-*`, `/role temp`) | Create an "Admin" role, then after boot: `/config admin role:@Admin` |
| `Verified member` | Granted when clicking "I accept the rules" | After boot: `/config reglement role:@Verified` |
| **One role per ticket category** | Team owning a category. **Only they see the tickets** of their category and get pinged. | One role per category (`@Support`, `@Bug-team`, `@Builders`…), assigned after boot via `/config ticket-role` |

> ⚠️ **Critical hierarchy**: the bot's role must be **above** every role it manages (Staff, Admin, temporary roles, ticket roles, autorole), otherwise you get `Missing Permissions` on assignments.

### Channels & categories to create

| Item | Used for | Command |
|---|---|---|
| "Tickets" category | Container for ticket channels | `/config tickets categorie:` |
| `#ticket-logs` (staff-private) | Transcripts on close | `/config tickets salon-logs:` |
| `#welcome` *(optional)* | Welcome card (no ping) | `/config accueil salon:` |
| `#rules` | Rules display | `/setup-reglement` |
| `#message-logs`, `#mod-logs`, … (staff-private) | Categorized server logs | `/logs salon …` |
| `#suggestions` | Receives `/suggestion` | `/config suggestions` |
| "➕ Create a voice" voice channel | "Join to create" pattern | `/config vocaux-temp` |
| `#tickets` | Category picker panel | `/setup-tickets` (run inside it) |

---

## C. Local installation

### Prerequisites

- **Node.js ≥ 20** (`node --version`)
- **git**
- *(Optional)* **Java 17+** only if you enable music — see [Lavalink](LAVALINK_en.md).

### Clone, configure, start

```bash
git clone https://github.com/xeylou/unknown-variable.git unknown_variable
cd unknown_variable
npm install                 # 1. deps + generates the Prisma client (postinstall hook)
cp .env.example .env        # 2. fill at least DISCORD_TOKEN, CLIENT_ID (+ BOT_NAME if desired)
npx prisma generate         # 3. (re)generate the client — safety net if postinstall was skipped
npx prisma db push          # 4. creates the data/ folder + the SQLite tables
npm run deploy              # 5. registers slash commands GLOBALLY (all servers, ~1 h propagation)
npm start                   # 6. start the bot
```

> **Order matters**: `db push` (4) must follow editing `.env` (the DB path depends on `BOT_NAME`), and `npm run deploy` (5) is **mandatory** — commands are **not** deployed automatically. **Re-run** it whenever you add/modify a command. In development, `npm run deploy:guild` is **instant** but requires `GUILD_ID` in `.env`.

At startup the console shows, among others:

```
[events:ready] Connecté en tant que <bot-name>
[events:ready] Modules : musique ⛔ · github ⛔ · twitch ⛔ · santé ✅ (:3001)
[events:ready] Présent sur 1 serveur(s) · 58 commande(s) chargée(s).
```

The full list of `.env` variables is in [Configuration → Environment variables](CONFIGURATION_en.md#environment-variables-env).

---

## D. In-app setup (once, in order)

When the bot is added, a welcome message already reminds admins of these steps.

```
1. /config staff role:@Staff   ·   /config admin role:@Admin
   → Declare moderation/admin roles. Without them, the bot relies on native
     Discord permissions.

2. /permissions check
   → "Fix everything" button: grants staff/admin/ticket-staff roles the Discord
     permissions so commands appear in their menus.

3. /logs tout-dans salon:#mod-logs
   → Enables the 8 log categories in one channel. Then refine with
     /logs salon categorie:messages salon:#message-logs

4. /config reglement role:@Verified
   → Role granted when a member clicks "I accept".

5. /setup-reglement
   → Run INSIDE #rules (stores the ID for sanction DMs).

6. /config autorole role:@Pending        (optional — pre-verification role)

7. /config accueil salon:#welcome carte-image:true message:"Welcome {username} 🎉"
   → DM (PNG card + orientation embed) + card posted in #welcome WITHOUT ping.
     Variables: {user} {username} {server} {count}.

8. /config suggestions salon:#suggestions

9. /config vocaux-temp salon:#➕-create-voice [categorie:#Voice]

10. /config tickets categorie:#Tickets salon-logs:#ticket-logs
    /config ticket-role categorie:support role:@Support   (repeat per category)
    → A category with no owner role refuses ticket creation.

11. /setup-tickets
    → Run INSIDE #tickets. Deploys the dropdown menu.
```

### Optional modules

```
/config automod actif:true phishing:true token-leak:true zalgo:true
/config antiraid actif:true age-min-compte:7 expulser-jeunes:true
/config captcha actif:true role-non-verifie:@Unverified role-verifie:@Verified
/setup-captcha                        # INSIDE #verification: deploys the button (challenge shown ephemerally)
/config minecraft ip:play.myserver.net salon-statut:#mc-status
/setup-roles role1:@Player role2:@Builder titre:"Pick your role"
/config invitation url:https://discord.gg/xxxx
```

External integrations (Twitch, YouTube, RSS, GitHub): see [Configuration → Tracking & notifications](CONFIGURATION_en.md#tracking--notifications).

---

## ✅ Post-installation checklist

- [ ] `/config staff` and `/config admin` → roles declared
- [ ] `/permissions check` → "Fix everything" → all roles ✅
- [ ] `/logs voir` → 8 categories configured
- [ ] A regular member sees `/help` and finds **only** public commands; staff see theirs too
- [ ] Test: open a ticket → the right role is pinged, only it + the author see the channel
- [ ] Test: kick an alt account → DM received, record updated, log in the mod channel
- [ ] Test: post a `discord.gg/xxxx` link (if automod is on) → removed
- [ ] Scheduled backup of `data/<bot>.db` — see [Database](DATABASE_en.md)

Trouble at startup? See [Self-hosting → Troubleshooting](SELF_HOSTING_en.md#troubleshooting).
