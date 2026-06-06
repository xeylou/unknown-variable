FROM node:22-alpine
WORKDIR /app

# Outils de compilation requis par better-sqlite3 (module natif)
RUN apk add --no-cache python3 make g++

# Dépendances — installées DEPUIS LE LOCKFILE (reproductible). `tsx` et `prisma`
# sont en `dependencies`, donc présents même avec --omit=dev (build allégé :
# pas d'eslint/vitest/typescript dans l'image).
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Code source
COPY . .

# Génère le client Prisma (filet si le postinstall a été sauté)
RUN npx prisma generate

# La base de données vit dans /app/data (à monter en volume pour la persistance).
# On en donne la propriété à l'utilisateur non-root `node` AVANT de déclarer le
# volume, pour qu'un volume nommé neuf hérite des bons droits d'écriture.
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]

# Sonde de santé : interroge le endpoint HTTP du bot (HEALTH_PORT, défaut 3001).
# ⚠️ Si tu changes HEALTH_PORT, adapte aussi le port ci-dessous (ou docker-compose).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# Au démarrage : synchronise les tables sur le volume monté (idempotent) puis lance le bot.
# ⚠️ `prisma db push` est nécessaire ici car la base vit dans le volume runtime, pas
# dans l'image. Les slash-commands restent à enregistrer une fois : `docker exec <c> npm run deploy`.
CMD ["sh", "-c", "npx prisma db push && npm start"]
