# 🎵 Installer Lavalink (module musique)

> 🇬🇧 **English version → [LAVALINK_en.md](LAVALINK_en.md)** · ⬅️ [Retour au README](../README.md)

Le module musique du bot ne lit pas l'audio lui-même : il pilote un **serveur
Lavalink**, un programme séparé qui se charge de récupérer et diffuser le son.
C'est l'approche utilisée par les vrais bots musique (robuste et de bonne qualité).

Tant que `LAVALINK_PASSWORD` n'est pas renseigné dans le `.env`, le module
musique reste **désactivé** — le reste du bot fonctionne normalement.

---

## 1. Pré-requis

- **Java 17 ou plus récent** (Lavalink v4 l'exige).
  Vérifier : `java -version`. Sinon : [Adoptium / Temurin](https://adoptium.net/).

## 2. Télécharger Lavalink

1. Va sur les [releases de Lavalink](https://github.com/lavalink-devs/Lavalink/releases).
2. Télécharge le fichier **`Lavalink.jar`** de la dernière version **v4**.
3. Place-le dans un dossier dédié, par exemple `lavalink/`.

## 3. Créer `application.yml`

Dans le **même dossier** que `Lavalink.jar`, crée un fichier `application.yml` :

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  plugins:
    # YouTube n'est plus intégré à Lavalink v4 : il faut ce plugin.
    - dependency: "dev.lavalink.youtube:youtube-plugin:1.18.1"
      repository: "https://maven.lavalink.dev/releases"
  server:
    password: "change-moi-ce-mot-de-passe"   # ⚠️ à recopier dans le .env du bot
    sources:
      youtube: false        # géré par le plugin youtube-source ci-dessus
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

> 💡 Vérifie la dernière version du plugin sur
> [youtube-source](https://github.com/lavalink-devs/youtube-source/releases)
> et adapte le numéro `1.18.1` si besoin.

## 4. Lancer Lavalink

Dans le dossier du jar :

```bash
java -jar Lavalink.jar
```

Au démarrage tu dois voir `Lavalink is ready to accept connections`.
Laisse ce programme **tourner en permanence**, en parallèle du bot.

> Sur un VPS, crée un service systemd dédié (comme pour le bot), ou lance-le
> dans un `screen` / `tmux`. Sur un panel type Pterodactyl, beaucoup proposent
> un « egg » Lavalink prêt à l'emploi. Avec le [docker-compose](../docker-compose.yml)
> du dépôt, le profil `music` lance Lavalink à côté du bot (monte `lavalink/application.yml`).

## 5. Configurer le bot

Dans le fichier `.env` du bot, renseigne les mêmes informations :

```bash
LAVALINK_HOST=localhost            # ou l'IP / le nom de service Lavalink (ex. "lavalink" en compose)
LAVALINK_PORT=2333
LAVALINK_PASSWORD=change-moi-ce-mot-de-passe   # identique à application.yml
# LAVALINK_SECURE=true             # uniquement si Lavalink est derrière du https/wss
```

Puis redémarre le bot. Au démarrage, la console doit afficher
`🎵 Lavalink connecté (main).`

N'oublie pas de changer le mot de passe par défaut dans `application.yml` et `.env` !

## 6. Utilisation

Une fois connecté : rejoins un salon vocal puis `/play <titre ou lien>`.
Toutes les commandes sont listées dans `/help` → catégorie **🎵 Musique**.

---

## 🆘 Dépannage

| Problème | Solution |
|---|---|
| `Module musique désactivé` au démarrage | `LAVALINK_PASSWORD` est vide dans le `.env`. |
| Le bot ne se connecte pas à Lavalink | Vérifie que Lavalink tourne, et que host/port/mot de passe sont identiques des deux côtés. |
| `/play` ne trouve jamais de résultat | Le plugin youtube-source est mal configuré, ou `youtube: false` est manquant sous `lavalink.server.sources`. |
| YouTube renvoie des erreurs après un moment | Mets à jour le plugin youtube-source (YouTube change souvent ses protections). |
| Le bot rejoint le vocal mais reste muet | Vérifie que le bot a les permissions **Se connecter** et **Parler** dans le salon vocal. |
