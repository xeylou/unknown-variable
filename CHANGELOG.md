# Changelog

Tous les changements notables de ce projet sont consignés ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ;
versionnage [SemVer](https://semver.org/lang/fr/).

> 🇬🇧 Entries are written in French (the project's default doc language).

## [Non publié] — Unreleased

### Ajouté
- **Autocomplétion** des options à identifiant : `/notif supprimer`, `/mcsuivi supprimer`,
  `/git retirer|config|statut`, `/role temp-annuler`, `/giveaway` (message), `/tag` (nom).
  Nouveau helper `utils/autocomplete.respondChoices` + routeur dans `interactionCreate`.
- **Sonde de santé** HTTP toujours active (`GET /health`, `HEALTH_PORT`, défaut 3001) — pour le
  HEALTHCHECK Docker et le monitoring d'uptime.
- **`docker-compose.yml`** avec profils optionnels `music` (Lavalink) et `rss` (RSSHub).
- **Bannière de configuration** au démarrage : récap des modules actifs/inactifs.
- Refonte complète de la **documentation** : `README` allégé + `docs/` (INSTALLATION,
  CONFIGURATION, COMMANDS, SELF_HOSTING, DATABASE, LAVALINK), **bilingue FR/EN** (suffixe `_en`),
  + `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`.

### Modifié
- **Dockerfile** durci : `npm ci` (reproductible), utilisateur non-root `node`, `HEALTHCHECK`.
- `tsx` et `prisma` déplacés en `dependencies` (requis au runtime) — évite un crash sous
  `NODE_ENV=production`.
- `uncaughtException` provoque désormais un arrêt propre puis `exit(1)` (relance par systemd/Docker).
- Factorisation du découpage des fichiers de commandes (`utils/commandFiles.ts`), partagé par le
  chargeur et le déployeur.
- `SETUP.md` et `LAVALINK.md` (racine) absorbés dans `docs/` ; références mises à jour.

## [1.0.0] — 2026-06-06

État initial public du bot : tickets, modération + casier, logs/audit, accueil & vérification
(règlement, autorôle, CAPTCHA visuel, carte de bienvenue), engagement (giveaways, suggestions,
sondages), vocaux temporaires, utilitaires, Minecraft (statut, suivi, RCON), notifications
(YouTube/Twitch/RSS), suivi GitHub hybride, musique Lavalink, salons statistiques & classements.
Socle d'internationalisation FR/EN (pilote `/avatar`).
