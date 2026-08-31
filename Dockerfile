# ===== Stage 1 : build du client =====
FROM node:20-alpine AS client-build
WORKDIR /build/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ===== Stage 2 : dépendances serveur =====
# (outils de compilation pour better-sqlite3 si pas de binaire précompilé musl)
FROM node:20-alpine AS server-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# ===== Stage 3 : image finale =====
FROM node:20-alpine
WORKDIR /app

COPY --from=server-deps /app/node_modules ./node_modules
COPY server/src ./src

# Front buildé servi par Express
COPY --from=client-build /build/client/dist ./client/dist

# Tables du jeu (prix, taux) : le serveur les relit pour valider les
# sauvegardes poussées — une seule source de vérité, zéro divergence.
COPY client/src/game/constants.js client/src/game/format.js ./client/src/game/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Base SQLite sur un volume (persist en dehors du conteneur)
VOLUME ["/app/data"]

CMD ["node", "src/index.js"]
