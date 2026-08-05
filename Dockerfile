# ─────────────────────────────────────────────────────────────────────────────
# Yala Haji — Next.js Storefront
# Build context: monorepo root
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY apps/storefront/package*.json ./
# npm ci, not npm install — install lets React drift off the lockfile, and a
# React minor ahead of what Next 15.1.3 vendors breaks RSC streaming with
# "Expected a suspended thenable".
RUN npm ci

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/storefront/ .

# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time —
# setting them only at runtime in docker-compose has no effect. They must be
# passed as build args here.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ARG NEXT_PUBLIC_FACEBOOK_APP_ID=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_FACEBOOK_APP_ID=$NEXT_PUBLIC_FACEBOOK_APP_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ARG PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:$PORT/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
