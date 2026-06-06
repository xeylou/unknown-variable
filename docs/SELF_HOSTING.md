# 🖥️ Hébergement & exploitation

> 🇬🇧 **English version → [SELF_HOSTING_en.md](SELF_HOSTING_en.md)** · ⬅️ [Retour au README](../README.md)

Comment faire tourner le bot en continu, le mettre à jour et le surveiller. Pré-requis & première installation : [Installation](INSTALLATION.md).

---

## Options d'hébergement

### A. Docker Compose *(recommandé)*

Le dépôt fournit un [`Dockerfile`](../Dockerfile) (image Alpine, non-root, healthcheck) et un [`docker-compose.yml`](../docker-compose.yml) avec des **profils** pour les services optionnels.

```bash
cp .env.example .env && nano .env          # DISCORD_TOKEN + CLIENT_ID au minimum
docker compose up -d                       # le bot seul
docker compose exec bot npm run deploy     # enregistre les slash-commands (une fois)
docker compose logs -f bot                 # logs en direct
```

Avec les services optionnels :

```bash
docker compose --profile music up -d                  # bot + Lavalink
docker compose --profile rss up -d                    # bot + RSSHub (Instagram/TikTok/X)
docker compose --profile music --profile rss up -d    # tout
```

- La base SQLite vit dans le volume nommé `data` (persistée hors de l'image).
- Pour la musique : dans `.env`, `LAVALINK_HOST=lavalink` et `LAVALINK_PASSWORD` (identique à `lavalink/application.yml` — voir [Lavalink](LAVALINK.md)).
- Pour RSSHub : passe l'URL interne `http://rsshub:1200/...` à `/notif ajouter-rss`.

### B. Docker (sans compose)

```bash
docker build -t unknown_variable .
docker run -d --name unknown_variable --restart unless-stopped \
  --env-file .env -v unknown_variable-data:/app/data unknown_variable
docker exec unknown_variable npm run deploy
docker logs -f unknown_variable
```

### C. Linux + systemd

Le dépôt fournit [`unknown_variable.service`](../unknown_variable.service) (lance le bot via `tsx`, pas de build).

```bash
sudo apt update && sudo apt install -y nodejs npm git
sudo adduser --disabled-password unknown_variable
sudo su - unknown_variable
git clone <ton-repo> unknown_variable
cd unknown_variable && npm install
cp .env.example .env && nano .env
npx prisma db push && npm run deploy
exit

sudo cp /home/unknown_variable/unknown_variable/unknown_variable.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now unknown_variable
sudo systemctl status unknown_variable
```

> Le service exécute `node_modules/.bin/tsx src/index.ts` et redémarre automatiquement (`Restart=always`). Sur une exception fatale, le bot quitte avec un code d'erreur et systemd le relance.

### D. Plateformes managées

| Plateforme | Prix | Notes |
|---|---|---|
| **Railway** | ~5 $/mois | Le plus simple : connecte le repo, ajoute les variables `.env`. |
| **Fly.io** | Free limité, puis ~3 $/mois | `fly launch` détecte le Dockerfile. |
| **Render** | Free (s'endort) ou ~7 $/mois | Choisir *Background Worker*. |
| **Sparked Host / Pterodactyl** | ~2 €/mois | Spécialisé bots Discord, panel web. |

⚠️ Évite les offres « free » qui s'endorment (Heroku free, Replit free, Glitch) : un bot doit rester connecté en permanence.

---

## Sonde de santé & monitoring

Le bot expose un micro endpoint HTTP **toujours actif** : `GET /health` → `200 ok` (port `HEALTH_PORT`, défaut `3001`, `0` pour désactiver).

- Le `HEALTHCHECK` du Dockerfile l'interroge automatiquement → `docker ps` affiche `healthy`/`unhealthy`.
- Branche un moniteur externe (UptimeRobot, Healthchecks.io…) sur `http://<hôte>:3001/health`.

```bash
curl http://127.0.0.1:3001/health        # → ok
docker inspect --format '{{.State.Health.Status}}' unknown_variable
```

> ⚠️ Le `HEALTHCHECK` du Dockerfile cible le port `3001` en dur. Si tu changes `HEALTH_PORT`, adapte le Dockerfile (ou le `docker-compose.yml`).

---

## Mises à jour

### Mettre à jour le bot

```bash
cd /home/unknown_variable/unknown_variable
git pull
npm install                 # réinstalle si besoin + régénère le client Prisma (postinstall)
npx prisma db push          # uniquement si prisma/schema.prisma a changé — voir Base de données
sudo systemctl restart unknown_variable
sudo journalctl -u unknown_variable -f
```

**Avant un `git pull` :** sauvegarde la base (`cp data/<bot>.db data/backup-$(date +%F).db`) et la config en jeu (`/backup export`). Détails : [Base de données](DATABASE.md).

En Docker : `git pull && docker compose up -d --build` (le `prisma db push` du `CMD` synchronise la base au démarrage).

### Re-déployer les slash-commands

`npm run deploy` (global, propagation ~1 h) **après avoir ajouté ou modifié** une commande. En dev, `npm run deploy:guild` est instantané (exige `GUILD_ID`).

### Mettre à jour les dépendances

```bash
npm outdated && npm update          # respecte le semver de package.json
npm audit && npm audit fix
npm run check                       # typecheck + lint + tests avant de déployer
```

**Mise à jour majeure** (discord.js v14→v15, Prisma 7→8…) : lire le CHANGELOG, bumper manuellement, `npm install`, `npm run check`, tester en local, puis déployer.

**Dépendances natives à surveiller :**

| Dépendance | Point d'attention |
|---|---|
| `better-sqlite3` | Module natif — `apt install build-essential python3` si la compilation échoue ; sinon `npm rebuild better-sqlite3 --build-from-source`. |
| `@napi-rs/canvas` | Binding pré-buildé ; sur ARM/Alpine, vérifier le bon binaire. |
| `@prisma/adapter-better-sqlite3` | Même version majeure que `@prisma/client` (les deux en 7.x). |

### Lavalink, hôte, rotation du token

- **Lavalink** : YouTube change ses protections → bumper le plugin YouTube quand `/play` ne renvoie plus rien. Voir [Lavalink](LAVALINK.md).
- **Hôte** : au moins tous les 3 mois, `sudo apt update && sudo apt upgrade -y` puis redémarrage des services.
- **Token Discord** (en cas de fuite) : Developer Portal → Bot → **Reset Token**, mettre à jour `.env`, redémarrer. L'ancien token meurt immédiatement. Voir [SECURITY.md](../SECURITY.md).

---

## Dépannage

| Problème | Solution |
|---|---|
| `Used disallowed intents` | Active les Privileged Intents dans le Developer Portal (voir [Installation §A](INSTALLATION.md#a-application-discord-developer-portal)). |
| `Cannot find module '.prisma/client'` | Client non généré : `npx prisma generate` puis `npx prisma db push`. |
| `tsx: not found` | Dépendances non installées : `npm install`. |
| `The table main.X does not exist` au boot | `db push` a visé un autre fichier que le runtime — chemins désalignés (`BOT_NAME` / `DATABASE_PATH`). Relance `npx prisma db push` puis `npm start`. |
| Aucune slash-command (jamais apparues) | Tu n'as pas lancé `npm run deploy` (global, ~1 h). En dev, `npm run deploy:guild` est instantané. |
| Commandes déployées mais invisibles pour un rôle | `/permissions check` → « Tout corriger » (Discord n'affiche une commande qu'aux rôles ayant la perm requise). |
| `❌ Erreur de configuration dans le fichier .env` (le bot quitte) | Une variable obligatoire manque/est invalide — le message liste laquelle. |
| Le conteneur reste `unhealthy` | Vérifie que `HEALTH_PORT` n'est pas à `0` et correspond au port du `HEALTHCHECK` (3001). |
| Le bot ne crée pas les salons | Rôle du bot au-dessus du rôle Staff + permission `Manage Channels`. |
| `Missing Permissions` | Le bot n'a pas accès à la catégorie cible — ajuste ses permissions. |
| Ticket : « catégorie n'a pas de rôle responsable » | `/config ticket-role categorie:… role:…` (par serveur). |
| Welcome card noire / vide | Vérifie les logs ; désactive avec `/config accueil carte-image:false`. |
| Musique ne joue rien | `LAVALINK_PASSWORD` + serveur Lavalink en marche — voir [Lavalink](LAVALINK.md). |
| `/git` invisible | Module GitHub déployé seulement si `GITHUB_TOKEN` **ou** `GITHUB_WEBHOOK_SECRET` est défini → puis `npm run deploy`. |
| Webhook GitHub renvoie 401 | Le *Secret* du webhook doit être **identique** à `GITHUB_WEBHOOK_SECRET`. |

Logs : `sudo journalctl -u unknown_variable -f` (systemd) ou `docker compose logs -f bot` (Docker). Plus de détail BDD : [Base de données](DATABASE.md).
