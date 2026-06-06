# 🎵 Install Lavalink (music module)

> 🇫🇷 **Version française → [LAVALINK.md](LAVALINK.md)** · ⬅️ [Back to README](../README_en.md)

The bot's music module doesn't play audio itself: it drives a **Lavalink server**,
a separate program that fetches and streams the sound. This is the approach used
by real music bots (robust and high quality).

As long as `LAVALINK_PASSWORD` is empty in `.env`, the music module stays
**disabled** — the rest of the bot works normally.

---

## 1. Prerequisites

- **Java 17 or newer** (Lavalink v4 requires it).
  Check: `java -version`. Otherwise: [Adoptium / Temurin](https://adoptium.net/).

## 2. Download Lavalink

1. Go to the [Lavalink releases](https://github.com/lavalink-devs/Lavalink/releases).
2. Download the **`Lavalink.jar`** of the latest **v4** release.
3. Put it in a dedicated folder, e.g. `lavalink/`.

## 3. Create `application.yml`

In the **same folder** as `Lavalink.jar`, create an `application.yml`:

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  plugins:
    # YouTube is no longer built into Lavalink v4: this plugin is required.
    - dependency: "dev.lavalink.youtube:youtube-plugin:1.18.1"
      repository: "https://maven.lavalink.dev/releases"
  server:
    password: "change-this-password"   # ⚠️ copy it into the bot's .env
    sources:
      youtube: false        # handled by the youtube-source plugin above
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false

plugins:
  youtube:
    enabled: true
    clients:
      - MUSIC
      - WEB
      - WEBEMBEDDED
      - ANDROID_VR

logging:
  level:
    root: INFO
    lavalink: INFO
```

> 💡 Check the latest plugin version on
> [youtube-source](https://github.com/lavalink-devs/youtube-source/releases)
> and adjust the `1.18.1` number if needed.

## 4. Run Lavalink

In the jar's folder:

```bash
java -jar Lavalink.jar
```

At startup you should see `Lavalink is ready to accept connections`.
Leave this program **running permanently**, alongside the bot.

> On a VPS, create a dedicated systemd service (like the bot), or run it in a
> `screen` / `tmux`. Pterodactyl-style panels often offer a ready-made Lavalink
> "egg". With the repo's [docker-compose](../docker-compose.yml), the `music`
> profile runs Lavalink next to the bot (mounts `lavalink/application.yml`).

## 5. Configure the bot

In the bot's `.env`, fill the matching values:

```bash
LAVALINK_HOST=localhost            # or the Lavalink IP / service name (e.g. "lavalink" in compose)
LAVALINK_PORT=2333
LAVALINK_PASSWORD=change-this-password   # identical to application.yml
# LAVALINK_SECURE=true             # only if Lavalink is behind https/wss
```

Then restart the bot. At startup the console should show
`🎵 Lavalink connecté (main).`

Don't forget to change the default password in both `application.yml` and `.env`!

## 6. Usage

Once connected: join a voice channel then `/play <title or link>`.
All commands are listed in `/help` → **🎵 Music** category.

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| `Module musique désactivé` at startup | `LAVALINK_PASSWORD` is empty in `.env`. |
| The bot doesn't connect to Lavalink | Check that Lavalink is running, and that host/port/password match on both sides. |
| `/play` never finds a result | The youtube-source plugin is misconfigured, or `youtube: false` is missing under `lavalink.server.sources`. |
| YouTube errors after a while | Update the youtube-source plugin (YouTube often changes its protections). |
| The bot joins voice but stays silent | Check that the bot has the **Connect** and **Speak** permissions in the voice channel. |
