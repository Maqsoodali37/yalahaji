# ─────────────────────────────────────────────────────────────────────────────
# Yala Haji — NestJS API
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy all source including prisma schema
COPY . .

# Generate Prisma client then compile TypeScript
RUN npx prisma generate
RUN npm run build

# Compile the seed script separately (plain CommonJS, not swept into nest build)
RUN npx tsc -p tsconfig.seed.json

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist        ./dist
COPY --from=builder --chown=nestjs:nodejs /app/dist-seed   ./dist-seed
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma      ./prisma

COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nestjs
EXPOSE 4000

# 127.0.0.1 not "localhost": busybox wget prefers ::1 (IPv6), but the app
# binds to 0.0.0.0 (IPv4) — so "localhost" gets connection-refused.
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=10 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
