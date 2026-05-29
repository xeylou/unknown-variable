FROM node:22-alpine
WORKDIR /app

# Outils de compilation requis par better-sqlite3 (module natif)
RUN apk add --no-cache python3 make g++

# Dépendances — tsx et prisma sont nécessaires à l'exécution (le bot tourne via tsx)
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm install

# Code source
COPY . .

# Génère le client Prisma
RUN npx prisma generate

# La base de données vit dans /app/data (à monter en volume pour la persistance)
VOLUME ["/app/data"]

# Au démarrage : synchronise les tables sur le volume monté (idempotent) puis lance le bot.
# ⚠️ `prisma db push` est nécessaire ici car la base vit dans le volume runtime, pas
# dans l'image. Les slash-commands restent à enregistrer une fois : `docker exec <c> npm run deploy`.
CMD ["sh", "-c", "npx prisma db push && npm start"]
