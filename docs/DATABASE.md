> 🇬🇧 **English version [DATABASE_en.md](DATABASE_en.md)** · [Retour au README](../README.md) ⬅️

# 💾 Base de données

Stockage, sauvegardes, migrations de schéma et passage éventuel à Postgres.

---

## Stack t stockage

- **SQLite**, fichier unique `data/<bot>.db` (chemin via `DATABASE_PATH`, dérivé de `BOT_NAME` sinon).
- **Prisma 7** + driver adapter `@prisma/adapter-better-sqlite3` ([`src/database.ts`](../src/database.ts)). Particularité : `schema.prisma` ne contient **pas** d'URL de datasource, elle est injectée à l'exécution depuis `config.database.path`, résolu en chemin absolu.
- Deux caches en mémoire devant `guild_config` : [`configCache`](../src/utils/configCache.ts) (TTL 60 s, invalidation à l'écriture) et [`guildSettings`](../src/utils/guildSettings.ts) (cache **synchrone** des rôles/salons, chargé au boot, mis à jour à chaque écriture). La couche permissions lit les rôles sans toucher la base.

> ⚠️ `better-sqlite3` est **synchrone** : chaque requête bloque l'event loop. A grande échelle (sharding / multi-instance), envisager Postgres (voir plus bas).

## Modèles principaux

| Table | Contenu | Durabilité |
|---|---|---|
| `guild_config` | Config clé/valeur (~80+ clés) | Durable |
| `tickets` | Tickets (numéro, catégorie, claim, rating, commentaire) | Durable |
| `sanctions` | Casier : warn·kick·ban·timeout·softban | Durable |
| `tags` | FAQ `/tag` | Durable |
| `notifications` | Abonnements YouTube·Twitch·RSS | Durable |
| `github_repos` · `github_seen` · `github_links` | Dépôts suivis, dédup, liaisons | Durable |
| `mc_watchers`, `mc_links`, `mc_link_codes` | Suivi & liaisons Minecraft | Durable |
| `stat_channels`, `leaderboard_panels`, `message_counts`, `invite_counts` | Compteurs & classements | Durable |
| `reaction_role_panels` · `_entries`, `button_role_panels`, `deployed_panels` | Panneaux persistés | Durable |
| `temp_roles` | Rôles temporaires à expirer | Durable (sinon retrait raté) |
| `reminders` · `recurring_reminders` | Rappels persos et récurrents | Volatile |
| `polls` · `poll_votes` | Sondages persistants | Volatile |
| `giveaways` · `giveaway_entries` | Giveaways en cours | Volatile |
| `suggestions`, `temp_voice`, `afk`, `captcha_pending` | États transitoires | Volatile |

> **`/backup export` n'exporte que les tables durables** (config + stats + mc_watchers + notifications + tags + reaction-roles). Pour **migrer une configuration**, **pas** du disaster recovery. Pour ce dernier, copier le fichier `.db` complet.

---

## Sauvegardes

```bash
# Snapshot ponctuel
cp data/<bot>.db data/backup-$(date +%F-%H%M).db

# Sauvegarde 100 % propre, même bot allumé (SQLite WAL)
sqlite3 data/<bot>.db ".backup data/snapshot.db"
```

Cron quotidien + rotation 7 jours (`crontab -e`) :

```cron
0 3 * * * cp /home/unknown_variable/unknown_variable/data/<bot>.db /home/unknown_variable/backups/uv-$(date +\%F).db && find /home/unknown_variable/backups -name 'uv-*.db' -mtime +7 -delete
```

Restauration :

```bash
systemctl stop unknown_variable
cp data/backup-2026-05-25.db data/<bot>.db
systemctl start unknown_variable
```

---

## Migrations de schéma (`db push`)

Le repo **n'a pas de dossier `prisma/migrations/`** : les changements de schéma sont propagés avec **`prisma db push`** (comparer `schema.prisma` à la base et appliquer le diff, sans fichier de migration). Adapté au mono-instance, et **idempotent**.

Routine après un changement de schéma :

```bash
git pull
npx prisma generate     # régénère le client TS (auto via postinstall)
npx prisma db push      # synchronise la base
systemctl restart unknown_variable
```

- **Sûr** : ajouter une table, une colonne **nullable** ou avec `@default`, un index.
- **Dangereux (perte de données)** : renommer/supprimer une colonne, changer un type, ajouter une colonne `NOT NULL` sans `@default` sur une table peuplée.

Dans les cas dangereux, vérifie d'abord :

```bash
npx prisma db push --dry-run     # liste les changements sans les appliquer
```

Si tu vois `⚠️ data loss warning`, **sauvegarde la base avant**.

> **Multi-instance / versionnement** : passer aux vraies migrations : `npx prisma migrate dev --name <nom>` puis `npx prisma migrate deploy` en prod (baseline d'une base existante avec `prisma migrate resolve --applied <init>`).

---

## Inspection / debug

```bash
sqlite3 data/<bot>.db                                # REPL SQL : .tables, SELECT…, .quit
npx prisma studio --schema=prisma/schema.prisma      # URL web http://localhost:5555
```

## Migration de serveur (changement de VPS)

```bash
# Ancien serveur
systemctl stop unknown_variable
tar czf uv-data.tgz data/ .env src/config.ts         # le code vient de git

# Nouveau serveur
git clone <repo> unknown_variable && cd unknown_variable
npm install
tar xzf ../uv-data.tgz
# pas besoin de db push : le schéma est déjà appliqué dans le .db copié
systemctl enable --now unknown_variable
```

## Passer à Postgres/MySQL (si SQLite devient limitant)

Pertinent en multi-instance / sharding, ou en cas de forte concurrence d'écritures.

1. `provider = "sqlite"` -> `"postgresql"` dans [`prisma/schema.prisma`](../prisma/schema.prisma).
2. Remplacer l'adapter dans [`src/database.ts`](../src/database.ts) par `@prisma/adapter-pg` (ou équivalent).
3. Adapter `.env` (`DATABASE_URL=postgres://...`).
4. Migrer les données : `pgloader sqlite:///data/<bot>.db postgresql://...`.
5. `npx prisma migrate dev --name init-postgres`.
