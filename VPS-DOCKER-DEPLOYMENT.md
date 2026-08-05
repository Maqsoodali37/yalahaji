# Yalahaji — VPS Docker Deployment Guide

**VPS:** Hostinger KVM-2 · 2 vCPU · 8 GB RAM · 100 GB NVMe · Ubuntu 22.04  
**Stack:** NestJS API · Next.js Storefront · Next.js Admin · MySQL · Redis · MeiliSearch · Nginx · Certbot (Let's Encrypt)  
**Orchestration:** Docker Compose · no PM2 · no external paid services

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [VPS Initial Setup](#2-vps-initial-setup)
3. [Install Docker & Docker Compose](#3-install-docker--docker-compose)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Environment Variables](#5-environment-variables)
6. [Dockerfiles](#6-dockerfiles)
7. [Docker Compose Configuration](#7-docker-compose-configuration)
8. [Nginx Configuration](#8-nginx-configuration)
9. [SSL — Let's Encrypt via Certbot](#9-ssl--lets-encrypt-via-certbot)
10. [First-Time Deployment](#10-first-time-deployment)
11. [GitHub Actions CI/CD](#11-github-actions-cicd)
12. [Useful Commands](#12-useful-commands)
13. [Backups](#13-backups)
14. [Monitoring & Logs](#14-monitoring--logs)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Architecture Overview

```
Internet
    │
    ▼
Nginx (port 80 / 443)
    ├── yalahaji.com        → storefront:3000
    ├── yh-admin.yalahaji.com  → admin:3001
    └── api.yalahaji.com    → api:4000

Internal Docker network (yalahaji-net)
    ├── mysql:3306
    ├── redis:6379
    └── meilisearch:7700
```

All services communicate through a private Docker bridge network. Only Nginx is exposed to the public internet (ports 80 and 443). Every other service is internal-only.

Docker Compose replaces PM2 — `restart: unless-stopped` ensures auto-restart on crash or VPS reboot.

---

## 2. VPS Initial Setup

### 2.1 First login

```bash
ssh root@YOUR_VPS_IP
```

### 2.2 Create a non-root sudo user

```bash
adduser deploy
usermod -aG sudo deploy
# Copy SSH key to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Switch to the deploy user for all future steps:

```bash
su - deploy
```

### 2.3 System update

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw htop nano fail2ban
```

### 2.4 Configure firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # port 22
sudo ufw allow http         # port 80
sudo ufw allow https        # port 443
sudo ufw enable
sudo ufw status
```

All other ports (3000, 3001, 4000, 3306, 6379, 7700) stay closed externally. Services talk to each other inside Docker's private network.

### 2.5 Harden SSH (optional but recommended)

Edit `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart sshd
```

### 2.6 Fail2ban (brute-force protection)

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 3. Install Docker & Docker Compose

### 3.1 Install Docker Engine

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
newgrp docker          # apply group without logout
```

Verify:

```bash
docker --version
# Docker version 26.x.x
```

### 3.2 Docker Compose v2 (included with Docker Engine)

```bash
docker compose version
# Docker Compose version v2.x.x
```

Docker Compose v2 is a plugin (`docker compose`) — no separate install needed with the modern Docker Engine.

### 3.3 Enable Docker on boot

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Project Directory Structure

### 4.1 On the VPS

```
/home/deploy/
└── yalahaji/
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    ├── .env                        ← never commit this
    ├── nginx/
    │   ├── nginx.conf
    │   └── conf.d/
    │       ├── yalahaji.conf
    │       ├── admin.conf
    │       └── api.conf
    ├── certbot/
    │   ├── conf/                   ← Let's Encrypt certs (mounted volume)
    │   └── www/                    ← ACME challenge webroot
    ├── mysql/
    │   └── init/                   ← optional .sql seed files
    ├── api/                        ← NestJS source (git clone or bind mount)
    ├── storefront/                 ← Next.js storefront source
    └── admin/                      ← Next.js admin source
```

### 4.2 Monorepo layout (your GitHub repo)

```
yalahaji/
├── apps/
│   ├── api/                        ← NestJS
│   │   └── Dockerfile
│   ├── storefront/                 ← Next.js storefront
│   │   └── Dockerfile
│   └── admin/                      ← Next.js admin
│       └── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       ├── yalahaji.conf
│       ├── admin.conf
│       └── api.conf
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 5. Environment Variables

Create `/home/deploy/yalahaji/.env` on the VPS. **Never commit this file.**

```env
# ── General ──────────────────────────────────────────────
NODE_ENV=production
DOMAIN=yalahaji.com

# ── MySQL ─────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=change_me_root_pass
MYSQL_DATABASE=yalahaji
MYSQL_USER=yalahaji_user
MYSQL_PASSWORD=change_me_db_pass

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── MeiliSearch ───────────────────────────────────────────
MEILI_MASTER_KEY=change_me_meili_key
MEILI_URL=http://meilisearch:7700

# ── NestJS API ────────────────────────────────────────────
DATABASE_URL=mysql://yalahaji_user:change_me_db_pass@mysql:3306/yalahaji
JWT_SECRET=change_me_jwt_secret
JWT_EXPIRES_IN=7d
API_PORT=4000

# ── Next.js Storefront ────────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.yalahaji.com
NEXT_PUBLIC_SITE_URL=https://yalahaji.com

# ── Next.js Admin ─────────────────────────────────────────
NEXT_PUBLIC_ADMIN_API_URL=https://api.yalahaji.com
ADMIN_PORT=3001

# ── Certbot ───────────────────────────────────────────────
CERTBOT_EMAIL=your@email.com
```

Add `.env` to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

---

## 6. Dockerfiles

### 6.1 NestJS API — `apps/api/Dockerfile`

```dockerfile
# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/package.json ./

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### 6.2 Next.js Storefront — `apps/storefront/Dockerfile`

```dockerfile
# ── Stage 1: Dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

> Add `output: 'standalone'` to `next.config.js` for the standalone build to work.

```js
// next.config.js
module.exports = {
  output: 'standalone',
}
```

### 6.3 Next.js Admin — `apps/admin/Dockerfile`

Identical to the storefront Dockerfile. Change `EXPOSE 3000` to `EXPOSE 3001` and set `ENV PORT=3001`.

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
```

---

## 7. Docker Compose Configuration

### 7.1 `docker-compose.yml` (base — shared by dev & prod)

```yaml
version: "3.9"

networks:
  yalahaji-net:
    driver: bridge

volumes:
  mysql-data:
  redis-data:
  meili-data:
  certbot-conf:
  certbot-www:

services:

  # ── MySQL 8 ───────────────────────────────────────────────
  mysql:
    image: mysql:8.0
    container_name: yalahaji-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE:      ${MYSQL_DATABASE}
      MYSQL_USER:          ${MYSQL_USER}
      MYSQL_PASSWORD:      ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d   # seed SQL files (optional)
    networks:
      - yalahaji-net
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Redis 7 ───────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: yalahaji-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - yalahaji-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # ── MeiliSearch ───────────────────────────────────────────
  meilisearch:
    image: getmeili/meilisearch:v1.9
    container_name: yalahaji-meili
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY:   ${MEILI_MASTER_KEY}
      MEILI_ENV:          production
      MEILI_NO_ANALYTICS: "true"
    volumes:
      - meili-data:/meili_data
    networks:
      - yalahaji-net
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7700/health"]
      interval: 15s
      timeout: 5s
      retries: 5

  # ── NestJS API ────────────────────────────────────────────
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: yalahaji-api
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL:    ${REDIS_URL}
      MEILI_URL:    ${MEILI_URL}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      meilisearch:
        condition: service_healthy
    networks:
      - yalahaji-net
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 5

  # ── Next.js Storefront ────────────────────────────────────
  storefront:
    build:
      context: ./apps/storefront
      dockerfile: Dockerfile
    container_name: yalahaji-storefront
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: 3000
    depends_on:
      - api
    networks:
      - yalahaji-net

  # ── Next.js Admin ─────────────────────────────────────────
  admin:
    build:
      context: ./apps/admin
      dockerfile: Dockerfile
    container_name: yalahaji-admin
    restart: unless-stopped
    env_file: .env
    environment:
      PORT: 3001
    depends_on:
      - api
    networks:
      - yalahaji-net

  # ── Nginx ─────────────────────────────────────────────────
  nginx:
    image: nginx:1.26-alpine
    container_name: yalahaji-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot-conf:/etc/letsencrypt:ro
      - certbot-www:/var/www/certbot:ro
    depends_on:
      - storefront
      - admin
      - api
    networks:
      - yalahaji-net

  # ── Certbot ───────────────────────────────────────────────
  certbot:
    image: certbot/certbot:latest
    container_name: yalahaji-certbot
    volumes:
      - certbot-conf:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait $${!}; done"
    networks:
      - yalahaji-net
```

### 7.2 `docker-compose.prod.yml` (production overrides)

```yaml
version: "3.9"

services:
  api:
    image: ghcr.io/YOUR_GITHUB_USER/yalahaji-api:latest
    build: ~    # skip build in prod — use pre-built image

  storefront:
    image: ghcr.io/YOUR_GITHUB_USER/yalahaji-storefront:latest
    build: ~

  admin:
    image: ghcr.io/YOUR_GITHUB_USER/yalahaji-admin:latest
    build: ~
```

> In production CI, images are built in GitHub Actions and pushed to GitHub Container Registry (GHCR — free). The VPS just pulls them.

To use both files together:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 8. Nginx Configuration

### 8.1 `nginx/nginx.conf`

```nginx
user  nginx;
worker_processes  auto;          # auto = one per vCPU

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';

    access_log  /var/log/nginx/access.log  main;

    sendfile           on;
    keepalive_timeout  65;
    gzip               on;
    gzip_types         text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length    1000;

    # Security headers (applied globally)
    add_header X-Frame-Options         "SAMEORIGIN"   always;
    add_header X-Content-Type-Options  "nosniff"      always;
    add_header X-XSS-Protection        "1; mode=block" always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=web_limit:10m rate=60r/s;

    include /etc/nginx/conf.d/*.conf;
}
```

### 8.2 `nginx/conf.d/yalahaji.conf` (Storefront)

```nginx
# ── HTTP → HTTPS redirect ─────────────────────────────────
server {
    listen 80;
    server_name yalahaji.com www.yalahaji.com;

    # ACME challenge for Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://yalahaji.com$request_uri;
    }
}

# ── HTTPS ─────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name yalahaji.com www.yalahaji.com;

    ssl_certificate     /etc/letsencrypt/live/yalahaji.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yalahaji.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Redirect www → non-www
    if ($host = www.yalahaji.com) {
        return 301 https://yalahaji.com$request_uri;
    }

    limit_req zone=web_limit burst=20 nodelay;

    location / {
        proxy_pass         http://storefront:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.3 `nginx/conf.d/admin.conf` (Admin)

```nginx
server {
    listen 80;
    server_name yh-admin.yalahaji.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://yh-admin.yalahaji.com$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yh-admin.yalahaji.com;

    ssl_certificate     /etc/letsencrypt/live/yh-admin.yalahaji.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yh-admin.yalahaji.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    limit_req zone=web_limit burst=10 nodelay;

    # Optional: restrict admin to your IP
    # allow YOUR.OFFICE.IP.ADDRESS;
    # deny  all;

    location / {
        proxy_pass         http://admin:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.4 `nginx/conf.d/api.conf` (NestJS API)

```nginx
server {
    listen 80;
    server_name api.yalahaji.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://api.yalahaji.com$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yalahaji.com;

    ssl_certificate     /etc/letsencrypt/live/api.yalahaji.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yalahaji.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    limit_req zone=api_limit burst=50 nodelay;

    # CORS (adjust origins as needed)
    add_header Access-Control-Allow-Origin  "https://yalahaji.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    location / {
        proxy_pass         http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}
```

---

## 9. SSL — Let's Encrypt via Certbot

SSL is obtained once and auto-renewed every 12 hours via the certbot container.

### 9.1 DNS — point your domains first

In your domain registrar's DNS panel, add these A records pointing to your VPS IP:

| Record | Type | Value |
|--------|------|-------|
| `@` | A | YOUR_VPS_IP |
| `www` | A | YOUR_VPS_IP |
| `admin` | A | YOUR_VPS_IP |
| `api` | A | YOUR_VPS_IP |

Wait for DNS to propagate (usually 1–15 minutes with Hostinger DNS).

### 9.2 HTTP-only Nginx config for initial cert issuance

Before running Certbot, Nginx needs to serve the ACME challenge over plain HTTP. Use this **temporary** config that has no SSL blocks.

Create `nginx/conf.d/init.conf`:

```nginx
server {
    listen 80;
    server_name yalahaji.com www.yalahaji.com yh-admin.yalahaji.com api.yalahaji.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "OK";
    }
}
```

Start only nginx and certbot:

```bash
docker compose up -d nginx certbot
```

### 9.3 Issue certificates

Run once per domain (three separate commands):

```bash
# Storefront
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d yalahaji.com -d www.yalahaji.com

# Admin
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d yh-admin.yalahaji.com

# API
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d api.yalahaji.com
```

### 9.4 Download Certbot's recommended SSL params

```bash
curl -sSo nginx/options-ssl-nginx.conf \
  https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf

curl -sSo nginx/ssl-dhparams.pem \
  https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem
```

Mount them in docker-compose.yml nginx volumes:

```yaml
- ./nginx/options-ssl-nginx.conf:/etc/letsencrypt/options-ssl-nginx.conf:ro
- ./nginx/ssl-dhparams.pem:/etc/letsencrypt/ssl-dhparams.pem:ro
```

### 9.5 Switch to full SSL config

Delete `nginx/conf.d/init.conf` and replace with the three full configs from Section 8. Then:

```bash
docker compose restart nginx
```

### 9.6 Auto-renewal

The certbot service in docker-compose.yml already runs `certbot renew` every 12 hours. To also reload Nginx after renewal, add this cron job on the host:

```bash
crontab -e
```

```
0 */12 * * * docker exec yalahaji-nginx nginx -s reload
```

---

## 10. First-Time Deployment

### 10.1 Clone the repo on the VPS

```bash
cd /home/deploy
git clone https://github.com/YOUR_USER/yalahaji.git
cd yalahaji
```

### 10.2 Create the `.env` file

```bash
nano .env
# paste the contents from Section 5, filling in real values
```

### 10.3 Build and start everything

```bash
# Build all images locally on VPS (first time only)
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### 10.4 Run database migrations

```bash
docker compose exec api npm run migration:run
# or if using Prisma:
docker compose exec api npx prisma migrate deploy
```

### 10.5 Verify each service

```bash
# API health
curl http://localhost:4000/health

# Storefront
curl http://localhost:3000

# Admin
curl http://localhost:3001

# MeiliSearch
curl http://localhost:7700/health

# Redis
docker compose exec redis redis-cli ping
# → PONG

# MySQL
docker compose exec mysql mysqladmin ping -u root -p$MYSQL_ROOT_PASSWORD
```

---

## 11. GitHub Actions CI/CD

Every push to `main` triggers a build → push to GHCR → SSH deploy on VPS.

### 11.1 Add GitHub Secrets

In your repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | your VPS IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | private SSH key (full content of `~/.ssh/id_ed25519`) |
| `GHCR_TOKEN` | GitHub personal access token with `write:packages` |

### 11.2 `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}

jobs:
  build-and-push:
    name: Build Docker images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & push API
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-api:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

      - name: Build & push Storefront
        uses: docker/build-push-action@v5
        with:
          context: ./apps/storefront
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-storefront:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

      - name: Build & push Admin
        uses: docker/build-push-action@v5
        with:
          context: ./apps/admin
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-admin:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: SSH & deploy
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key:      ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/deploy/yalahaji

            # Pull latest code (nginx configs, compose files, etc.)
            git pull origin main

            # Log in to GHCR on VPS
            echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # Pull latest images
            docker compose -f docker-compose.yml -f docker-compose.prod.yml pull api storefront admin

            # Zero-downtime rolling restart
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps api
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps storefront
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps admin

            # Run DB migrations
            docker compose exec -T api npm run migration:run

            # Reload Nginx (picks up any config changes)
            docker exec yalahaji-nginx nginx -s reload

            # Clean up old images
            docker image prune -f
```

### 11.3 How it works

```
git push main
    │
    ▼
GitHub Actions (ubuntu runner)
    ├── Builds all 3 Docker images
    ├── Pushes to GitHub Container Registry (free, private)
    └── SSHes into VPS
            ├── git pull (nginx configs, compose files)
            ├── docker pull (new images)
            ├── docker compose up -d (rolling restart, one service at a time)
            ├── run DB migrations
            └── nginx -s reload
```

---

## 12. Useful Commands

### Service management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a single service
docker compose restart api

# Rebuild a single service after code change
docker compose build api && docker compose up -d api

# View running containers
docker compose ps

# Follow logs for all services
docker compose logs -f

# Follow logs for a specific service
docker compose logs -f api
docker compose logs -f nginx
```

### Exec into a container

```bash
docker compose exec api sh
docker compose exec mysql mysql -u root -p
docker compose exec redis redis-cli
```

### Database

```bash
# MySQL shell
docker compose exec mysql mysql -u yalahaji_user -p yalahaji

# Dump database
docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} yalahaji > backup.sql

# Restore database
docker compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} yalahaji < backup.sql
```

### Images & volumes

```bash
# List all volumes
docker volume ls

# Inspect a volume
docker volume inspect yalahaji_mysql-data

# Remove dangling images (free disk space)
docker image prune -f

# Full system cleanup (WARNING: removes all stopped containers, unused images)
docker system prune -af
```

---

## 13. Backups

Everything stateful lives in Docker named volumes. Back up the data directories.

### 13.1 MySQL backup script

Create `/home/deploy/backup-mysql.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/deploy/backups/mysql"
DATE=$(date +%Y-%m-%d_%H-%M)
FILENAME="${BACKUP_DIR}/yalahaji_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose -f /home/deploy/yalahaji/docker-compose.yml exec -T mysql \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" yalahaji \
  | gzip > "$FILENAME"

echo "Backup saved: $FILENAME"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

```bash
chmod +x /home/deploy/backup-mysql.sh
```

### 13.2 Schedule daily backups (cron)

```bash
crontab -e
```

```
# MySQL backup at 2 AM daily
0 2 * * * /home/deploy/backup-mysql.sh >> /home/deploy/backups/backup.log 2>&1

# Nginx reload for cert renewal at 3 AM daily
0 3 * * * docker exec yalahaji-nginx nginx -s reload
```

### 13.3 MeiliSearch backup

```bash
# MeiliSearch dumps via API
curl -X POST http://localhost:7700/dumps \
  -H "Authorization: Bearer ${MEILI_MASTER_KEY}"

# The dump is stored inside the meilisearch container volume
# Copy it out:
docker cp yalahaji-meili:/meili_data/dumps ./backups/meili/
```

---

## 14. Monitoring & Logs

### 14.1 Resource usage

```bash
# CPU / RAM per container (live)
docker stats

# Disk usage
df -h
docker system df
```

### 14.2 Nginx access logs

```bash
docker compose logs -f nginx
```

### 14.3 Netdata (optional — free system monitor)

Install Netdata on the host for a real-time dashboard at `http://YOUR_VPS_IP:19999`:

```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --non-interactive
```

Block port 19999 in UFW (access via SSH tunnel instead):

```bash
# On your local machine:
ssh -L 19999:localhost:19999 deploy@YOUR_VPS_IP
# Then open http://localhost:19999 in browser
```

### 14.4 UptimeKuma (self-hosted uptime monitoring)

Add an UptimeKuma service to docker-compose.yml:

```yaml
  uptimekuma:
    image: louislam/uptime-kuma:1
    container_name: yalahaji-uptime
    restart: unless-stopped
    volumes:
      - ./uptime-kuma-data:/app/data
    ports:
      - "3002:3001"        # access via http://YOUR_VPS_IP:3002
    networks:
      - yalahaji-net
```

Add UFW rule temporarily to set it up:

```bash
sudo ufw allow 3002/tcp
```

Then set it up, configure your monitors, and block the port again (access via SSH tunnel or add to Nginx).

---

## 15. Troubleshooting

### Container won't start

```bash
# Check exit code and last error
docker compose ps
docker compose logs api

# Common fix: check env vars
docker compose exec api printenv | grep DATABASE
```

### Cannot connect to MySQL

```bash
# Make sure mysql is healthy before api starts
docker compose ps mysql
# Status should be: healthy

# Test connection manually
docker compose exec api sh -c 'nc -zv mysql 3306'
```

### Nginx 502 Bad Gateway

```bash
# Check if upstream container is running
docker compose ps storefront

# Check nginx error log
docker compose logs nginx | grep error

# Test upstream directly
docker compose exec nginx wget -qO- http://storefront:3000
```

### SSL certificate errors

```bash
# Check cert expiry
docker compose exec nginx openssl x509 \
  -in /etc/letsencrypt/live/yalahaji.com/cert.pem \
  -noout -enddate

# Force renewal
docker compose run --rm certbot renew --force-renewal
docker exec yalahaji-nginx nginx -s reload
```

### Disk full

```bash
df -h
# Clean Docker artifacts
docker system prune -af --volumes   # WARNING: removes all unused volumes too
# Or selectively:
docker image prune -af
docker container prune -f
```

### Out of memory

```bash
free -h
docker stats --no-stream

# Identify the heavy hitter and adjust in docker-compose.yml:
services:
  mysql:
    mem_limit: 2g
  meilisearch:
    mem_limit: 512m
```

### Check all container health at once

```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

---

## Memory Budget (KVM-2, 8 GB RAM)

| Service | Typical RAM |
|---------|-------------|
| MySQL 8 | 1.0–2.0 GB |
| Redis | 100–256 MB |
| MeiliSearch | 256–512 MB |
| NestJS API | 150–300 MB |
| Next.js Storefront | 200–400 MB |
| Next.js Admin | 150–300 MB |
| Nginx | 20–50 MB |
| OS + Docker | ~700 MB |
| **Total** | ~3–5 GB |

KVM-2's 8 GB gives you roughly 3 GB of headroom for traffic spikes, caching, and future growth.

---

## Quick Reference Card

```bash
# Start everything
cd /home/deploy/yalahaji && docker compose up -d

# Stop everything
docker compose down

# Deploy new version (after CI pushes images)
docker compose pull && docker compose up -d

# View logs
docker compose logs -f [service]

# Open MySQL shell
docker compose exec mysql mysql -u yalahaji_user -p yalahaji

# Backup DB now
/home/deploy/backup-mysql.sh

# Check disk & RAM
df -h && free -h && docker stats --no-stream
```

---

*Generated for Yalahaji · Hostinger KVM-2 · Ubuntu 22.04 · Docker Compose v2*
