# 🧾 Command catalogue

> 🇫🇷 **Version française → [COMMANDS.md](COMMANDS.md)** · ⬅️ [Back to README](../README_en.md)

> ℹ️ Command/option **names are not localized**; the French tokens below are the actual ones.

All slash commands, by module, with their access **tier** (`public` / `ticket-staff` / `staff` / `admin` — see [Configuration → Permissions](CONFIGURATION_en.md#permission-system-tiers)). Several id-bearing options support **autocomplete** (marked 💡).

`/help` is interactive: each member only sees the commands they can use.

---

## 🎫 Tickets

| Command | Tier | Description |
|---|---|---|
| `/setup-tickets` | admin | Deploys the panel (once). |
| `/add-user <utilisateur>` | ticket-staff | Adds a member to the current ticket. |
| `/remove-user <utilisateur>` | ticket-staff | Removes a member. |
| `/ticket move <categorie>` | ticket-staff | Changes the ticket category (renames the channel). |
| `/ticket create <utilisateur> <categorie>` | admin | Opens a ticket on behalf of a member in a given category (the member is pinged in the channel). |
| `/ticket-stats` | staff | Global stats (open, closed, average rating). |
| `/tickets-ouverts [categorie] [membre] [pris-en-charge]` | ticket-staff | Open tickets grouped by category (ticket-staff sees only their categories). |
| `/ticket-reviews [membre] [categorie] [rating-min]` | staff | Ratings & comments left on close (paginated). |
| 🔘 Claim / Close / Reopen | staff / member | Buttons in the ticket / close DM. |

## 🛡️ Moderation

| Command | Tier | Description |
|---|---|---|
| `/warn <membre> [raison]` | staff | Warn (added to the record). |
| `/unwarn <id>` | staff | Remove a warning. |
| `/kick <membre> [raison]` | staff | Kick. |
| `/softban <membre> [raison] [purge-jours:0-7]` | staff | Ban + immediate unban (purge without a lasting ban). |
| `/ban <membre> [raison] [purge-jours:0-7]` | staff | Ban. |
| `/unban <identifiant> [raison]` | staff | Unban by ID. |
| `/timeout <membre> <durée> [raison]` | staff | Temporary timeout (max 28 d; `10m`, `2h`, `1d`). |
| `/untimeout <membre> [raison]` | staff | Lift a timeout. |
| `/casier <membre>` | staff | Paginated sanction history. |
| `/casier-search [moderateur] [type] [mot-cle]` | staff | Search the global record. |
| `/note ajouter\|liste\|retirer` | staff | Private staff notes on a member. |
| `/role temp <membre> <role> <duree> [raison]` | staff | Temporary role (auto-removed). |
| `/role temp-liste` · `/role temp-annuler <id>` 💡 | staff | Manage temporary roles. |
| `/lockdown salon [salon] [duree] [raison]` | staff | Lock a channel (auto-restore if `duree`). |
| `/lockdown serveur [duree] [raison]` | admin | Global lockdown. |
| `/lockdown lift [salon] [serveur:bool]` | staff / admin | Unlock. |
| `/clear <nombre:1-100> [membre]` | staff | Bulk delete. |

## 👋 Community

| Command | Tier | Description |
|---|---|---|
| `/setup-reglement` | admin | Deploys the rules + button. |
| `/setup-captcha` | admin | Deploys the verification button (challenge shown ephemerally). |
| `/setup-roles` | admin | Self-assignable role panel (buttons). |
| `/setup-reaction-roles` | admin | Emoji → role panel (reactions). |
| `/suggestion <proposition> [categorie]` | public | 10-min cooldown · auto thread · 👍/👎 vote · staff approval. |

## 🎉 Engagement

| Command | Tier | Description |
|---|---|---|
| `/giveaway lancer <lot> <duree> [gagnants] [age-min] [role-requis] [role-bonus] [multiplicateur]` | admin | Starts a giveaway (requirements + multiplier). |
| `/giveaway pause\|reprendre\|edit\|liste\|info\|terminer\|relancer` 💡 | admin | Fine management (autocomplete on `message-id`). |
| `/sondage <question> <option1> <option2> [option3…5] [heures] [choix-multiple]` | staff | Native Discord poll (24 h default). |
| `/poll <question> <options "\|"> <duree> [multi-choix] [anonyme]` | staff | Persistent poll (arbitrary duration). |

## 🧰 Utilities

| Command | Tier | Description |
|---|---|---|
| `/userinfo [membre]` | staff | Member info. |
| `/serverinfo` | staff | Server info. |
| `/avatar [membre]` | staff | Large avatar. |
| `/ping` | staff | Bot latency. |
| `/botinfo` | staff | Bot stats (uptime, servers, latency). |
| `/embed <salon> [role1…3]` | staff | Compose an embed via form and send it. |
| `/rappel set\|liste\|supprimer` | public | Personal one-off reminders. |
| `/rappel-rec set\|liste\|supprimer` | public | Recurring reminders (daily/weekly/monthly). |
| `/rappel-role <role> <message> [frequence] [delai]` | admin | Reminder for an entire role. |
| `/tag show\|liste\|ajouter\|editer\|retirer` 💡 | staff (show/liste = public) | FAQ tags (autocomplete on `nom`). |
| `/afk [raison]` | public | Mark AFK; the bot replies to pings. |
| `/help` | public | Interactive, tier-filtered help. |

## ⛏️ Minecraft & integrations

| Command | Tier | Description |
|---|---|---|
| `/mcstatus [ip]` | staff | MC server status. |
| `/mclink demande\|statut\|delier` | staff | Link the Discord account to an MC username (RCON validation). |
| `/mcsuivi ajouter\|liste\|supprimer` 💡 | admin | Auto-refreshed status panel + role alert (autocomplete on `id`). |
| `/mcwhitelist add\|remove\|list` | admin | Whitelist via RCON. |
| `/notif ajouter-youtube\|ajouter-twitch\|ajouter-rss\|liste\|supprimer` 💡 | admin | YouTube / Twitch / RSS notifications (autocomplete on `id`). |

## 🐙 Git / GitHub

| Command | Tier | Description |
|---|---|---|
| `/git suivre\|liste\|config\|retirer` 💡 | admin | Manage tracked repos (autocomplete on `id`). |
| `/git statut <depot>` 💡 | admin | Instant repo state (autocomplete on tracked repos). |
| `/git lier-membre <membre> <pseudo>` | admin | Link a member to a GitHub username. |
| `/git digest\|digest-off` | admin | Periodic activity digest. |
| `/gitlink lier\|statut\|delier` | staff | Self-declared GitHub ↔ Discord linking. |

> Without `GITHUB_TOKEN` or `GITHUB_WEBHOOK_SECRET`, the module is disabled (commands not deployed). See [Configuration → GitHub tracking](CONFIGURATION_en.md#github-tracking).

## 🎵 Music

> Requires a **Lavalink** server — see [Lavalink](LAVALINK_en.md). Without `LAVALINK_PASSWORD`, the module is disabled (commands not deployed).

| Command | Description |
|---|---|
| `/play <recherche>` | Plays a YouTube track/playlist or queues it. |
| `/recherche <termes>` | YouTube search with a menu. |
| `/pause` · `/resume` · `/skip` · `/stop` | Controls. |
| `/queue` · `/nowplaying` | Queue · current track. |
| `/volume <0-150>` · `/seek <secondes>` | Volume · time seek. |
| `/loop <mode>` · `/shuffle` · `/jump <position>` | Loop, shuffle, jump. |
| `/remove <position>` · `/clearqueue` | Remove a track / clear the queue. |
| `/filter <preset>` | Bass boost, nightcore, vaporwave, 8D, karaoke. |
| `/lyrics` | Lyrics of the current track. |

## 📊 Stat channels · ⚙️ Configuration

`/stats`, `/config`, `/logs`, `/permissions`, `/backup`, `/setup-*`: see [Configuration](CONFIGURATION_en.md).
