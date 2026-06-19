# Mettre à jour le bot en production (runbook)

Procédure pour déployer une nouvelle version

## Contexte
Certains fichiers sont **personnalisés en local** (catégories de
tickets dans `src/config.ts`, `src/data/welcome.ts`, panneau
`src/commands/tickets/setup-tickets.ts`). Ces customisations sont **commitées
localement**, la branche prod est « ahead of origin » et `git pull` devient un
**merge** (et non plus le `git stash` d'avant).

> 💡 Pour supprimer définitivement les conflits au `pull`, voir
> [Annexe C](#annexe-c--réduire-les-conflits-recommandé).

---

## 1. Récupérer la nouvelle version
```bash
git pull
```
- **Pas de conflit** -> étape 2.
- **Conflit** (`both modified`) sur un fichier personnalisé → garder **TA**
  version, puis finaliser le merge :
  ```bash
  # éditer le(s) fichier(s) : retirer <<<<<<< ======= >>>>>>>, garder ton contenu
  # (ou restaurer depuis une sauvegarde)
  git add <fichier-résolu> [...]
  git diff --cached --check        # ne doit RIEN afficher (aucun marqueur)
  git commit                       # finalise le merge
  ```

## 2. Dépendances / base (seulement si concerné)
```bash
# package.json modifié (nouvelle dépendance) :
npm install                        # relance aussi `prisma generate`
# prisma/schema.prisma modifié (nouvelle table/colonne) :
npx prisma db push
```
Sinon, rien à faire.

## 3. Redéployer les commandes slash (si commandes/options ajoutées)
```bash
npm run deploy                     # global (propagation jusqu'à ~1 h)
# serveur de test : npm run deploy:guild   (instantané, via GUILD_ID)
```

## 4. Redémarrer le bot
```bash
sudo systemctl restart <service>   # systemd
# ou : pm2 restart <nom>           # pm2
# ou : arrêter (Ctrl+C) puis `npm start`  (idéalement dans screen/tmux)
```

## 5. Vérifications
```bash
npm run typecheck                  # optionnel : détecte une casse de types
```
- Logs de démarrage sans erreur (« Connecté en tant que … »).
- `/config voir` dans Discord → réglages corrects.
- Tester rapidement la/les fonctionnalité(s) touchée(s).

---

## Annexe A — Miroir du chat Minecraft (pont)
Le **pont** (`scripts/mc-chat-bridge.mjs`) tourne sur la machine du serveur MC et
POST le chat au bot. Il **ne lit pas le `.env`** : ses variables se passent au
lancement. Côté bot, seul `MC_CHAT_PORT` (+ `MC_CHAT_HOST`) est nécessaire dans
`.env`.

Lancement manuel (test) :
```bash
cd /opt/sentra2
BOT_URL=http://localhost:3002/mc-chat \
GUILD_ID=<guild-id> \
MC_CHAT_SECRET=<secret affiché par /config minecraft-chat> \
LOG_PATH=/opt/s1.khaeris.fr/logs/latest.log \
node scripts/mc-chat-bridge.mjs
```
Le secret se (re)génère via `/config minecraft-chat regenerer-secret:true` — penser
à mettre à jour le pont après une régénération.

## Annexe B — Lancer le pont en service (survie aux reboots)
`/etc/systemd/system/mc-chat-bridge.service` :
```ini
[Unit]
Description=Pont chat Minecraft -> bot Discord
After=network.target

[Service]
WorkingDirectory=/opt/sentra2
Environment=BOT_URL=http://localhost:3002/mc-chat
Environment=GUILD_ID=<guild-id>
Environment=MC_CHAT_SECRET=<secret>
Environment=LOG_PATH=/opt/s1.khaeris.fr/logs/latest.log
ExecStart=/usr/bin/node scripts/mc-chat-bridge.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mc-chat-bridge
sudo journalctl -u mc-chat-bridge -f      # voir les logs / erreurs
```

## Annexe C — Réduire les conflits (recommandé)
Tant que les customisations vivent dans des fichiers **suivis** (`config.ts`,
`welcome.ts`, `setup-tickets.ts`), chaque `pull` qui retouche ces fichiers peut
créer un conflit. Pour l'éliminer : déplacer ces **données** hors du code
(fichier d'override gitignoré chargé au runtime, ou réglages en BDD via
`/config`). À planifier côté dev.
