# 🔒 Politique de sécurité · Security Policy

*🇫🇷 Français ci-dessous · 🇬🇧 English below*

---

## 🇫🇷 Français

### Versions supportées

Le projet suit un modèle de **publication continue** : seule la dernière version de la branche `main` est maintenue. Mets-toi à jour (`git pull`) avant de signaler un problème.

### Signaler une vulnérabilité

**Ne crée pas d'issue publique** pour une faille de sécurité. Préviens en privé :

1. **GitHub** → onglet *Security* → *Report a vulnerability* (avis de sécurité privé), **ou**
2. **e-mail** : <xeylou.pro@gmail.com> (objet : `SECURITY — unknown-variable`).

Indique : description, étapes de reproduction, impact, version/commit concerné. Réponse visée sous **72 h** ; un correctif est publié dès que possible selon la gravité, puis divulgué.

### Bonnes pratiques pour les hébergeurs

- **Ne committe jamais ton `.env`** (il est gitignoré). En cas de fuite du token : Developer Portal → Bot → **Reset Token**, mets à jour `.env`, redémarre — l'ancien token meurt aussitôt.
- Utilise un **PAT GitHub fine-grained en lecture seule** (`GITHUB_TOKEN`) et un **secret webhook fort** (`GITHUB_WEBHOOK_SECRET`, signatures vérifiées en HMAC-SHA256).
- Si tu exposes le webhook GitHub ou la sonde de santé à Internet, place-les derrière un reverse-proxy TLS et/ou un tunnel.
- Accorde au bot le **minimum de permissions** nécessaires (évite `Administrator` en multi-serveurs) et garde son rôle au-dessus de ceux qu'il gère.
- Sauvegarde régulièrement `data/<bot>.db` (voir [docs/DATABASE.md](docs/DATABASE.md)).

---

## 🇬🇧 English

### Supported versions

The project follows a **rolling-release** model: only the latest `main` is maintained. Update (`git pull`) before reporting an issue.

### Reporting a vulnerability

**Do not open a public issue** for a security flaw. Report privately:

1. **GitHub** → *Security* tab → *Report a vulnerability* (private advisory), **or**
2. **e-mail**: <xeylou.pro@gmail.com> (subject: `SECURITY — unknown-variable`).

Include: description, reproduction steps, impact, affected version/commit. Targeted response within **72 h**; a fix is released as soon as possible depending on severity, then disclosed.

### Best practices for self-hosters

- **Never commit your `.env`** (it is gitignored). On token leak: Developer Portal → Bot → **Reset Token**, update `.env`, restart — the old token dies immediately.
- Use a **read-only fine-grained GitHub PAT** (`GITHUB_TOKEN`) and a **strong webhook secret** (`GITHUB_WEBHOOK_SECRET`, HMAC-SHA256 verified signatures).
- If you expose the GitHub webhook or the health probe to the Internet, put them behind a TLS reverse proxy and/or a tunnel.
- Grant the bot the **least privilege** required (avoid `Administrator` in multi-server setups) and keep its role above those it manages.
- Back up `data/<bot>.db` regularly (see [docs/DATABASE_en.md](docs/DATABASE_en.md)).
