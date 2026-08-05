# Yalahaji — Deploy to VPS (VPS Already Set Up)

> **Stack:** NestJS API · Next.js Storefront · Next.js Admin · MySQL 8 · Redis · MeiliSearch · MinIO · Nginx · Certbot  
> **VPS:** Hostinger KVM-2 · Ubuntu 22.04 · Docker Compose v2

---

## Prerequisites checklist

Before running anything, confirm:

- [ ] Docker installed: `docker --version`
- [ ] Docker Compose v2: `docker compose version`
- [ ] Ports 80 and 443 open in UFW: `sudo ufw status`
- [ ] Your DNS A records pointing to the VPS IP (see Step 2)
- [ ] You're logged in as the `deploy` user (or a user in the `docker` group)

---

## Step 1 — Clone the repo

```bash
cd /home/deploy
git clone https://github.com/YOUR_ORG/yalahaji.git
cd yalahaji
```

---

## Step 2 — Point DNS to your VPS

In your domain registrar (Hostinger DNS panel), add these A records:

| Host | Type | Points to |
|------|------|-----------|
| `@` | A | YOUR_VPS_IP |
| `www` | A | YOUR_VPS_IP |
| `admin` | A | YOUR_VPS_IP |
| `api` | A | YOUR_VPS_IP |

Wait 5–15 minutes for propagation. Verify with:

```bash
dig yalahaji.com +short
dig api.yalahaji.com +short
dig yh-admin.yalahaji.com +short
# All should return YOUR_VPS_IP
```

---

## Step 3 — Create the `.env` file

```bash
nano /home/deploy/yalahaji/.env
```

Paste and fill in real values:

```env
# ── General ──────────────────────────────────────────────────
NODE_ENV=production

# ── MySQL ────────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=CHANGE_ME_strong_root_pass
MYSQL_DATABASE=yalahaji
MYSQL_USER=yalahaji_user
MYSQL_PASSWORD=CHANGE_ME_strong_db_pass
MYSQL_HOST_PORT=3306

# ── Redis ─────────────────────────────────────────────────────
# (no password needed for internal-only Redis)

# ── MeiliSearch ───────────────────────────────────────────────
MEILI_MASTER_KEY=CHANGE_ME_long_random_string_32chars

# ── MinIO (object storage) ────────────────────────────────────
MINIO_ROOT_USER=yalahaji_minio
MINIO_ROOT_PASSWORD=CHANGE_ME_strong_minio_pass
MINIO_BUCKET=yalahaji

# ── NestJS API ────────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_very_long_random_jwt_secret
JWT_EXPIRES_IN=7d

# ── Next.js public URLs (used at build time) ──────────────────
NEXT_PUBLIC_API_URL=https://api.yalahaji.com/api/v1
NEXT_PUBLIC_SITE_URL=https://yalahaji.com
NEXT_PUBLIC_ADMIN_API_URL=https://api.yalahaji.com/api/v1
NEXT_PUBLIC_WHATSAPP_NUMBER=+9230000000000
```

> **Generate secure secrets:**
> ```bash
> openssl rand -hex 32   # use output for JWT_SECRET, MEILI_MASTER_KEY, etc.
> ```

---

## Step 4 — Issue SSL certificates (first time only)

The project uses an `init.conf` for the initial cert issuance. Here's the exact sequence:

### 4a. Start Nginx in HTTP-only mode

`nginx/conf.d/init.conf` is already in the repo — it serves port 80 for all domains so Certbot can validate them. Start only Nginx + Certbot:

```bash
cd /home/deploy/yalahaji
docker compose up -d nginx certbot
```

Check Nginx is running:

```bash
curl http://yalahaji.com
# → "OK — yalahaji.com is up. Please wait for SSL setup."
```

### 4b. Issue certificates (3 commands)

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

Each should print: `Successfully received certificate.`

### 4c. Download Certbot's SSL params

```bash
curl -sSo nginx/options-ssl-nginx.conf \
  https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf

curl -sSo nginx/ssl-dhparams.pem \
  https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem
```

### 4d. Switch to full SSL config

Delete the temporary init config and restart Nginx:

```bash
rm nginx/conf.d/init.conf
docker compose restart nginx
```

Nginx now reads `yalahaji.conf`, `admin.conf`, and `api.conf` — all with HTTPS.

---

## Step 5 — Build and launch all services

```bash
cd /home/deploy/yalahaji

# Build all Docker images (takes 5–15 min on first run)
docker compose build

# Start everything
docker compose up -d

# Watch startup (Ctrl+C to stop watching, containers keep running)
docker compose logs -f
```

**Startup order is automatic** — `depends_on` health checks ensure MySQL is healthy before the API starts, and the API is healthy before the storefronts start. The API also runs Prisma migrations automatically on startup via `docker-entrypoint.sh`.

---

## Step 6 — Verify everything is running

```bash
# Check container status
docker compose ps

# Expected output: all containers "Up" or "healthy"
# yalahaji-mysql       Up (healthy)
# yalahaji-redis       Up (healthy)
# yalahaji-meili       Up (healthy)
# yalahaji-minio       Up
# yalahaji-api         Up (healthy)
# yalahaji-storefront  Up (healthy)
# yalahaji-admin       Up (healthy)
# yalahaji-nginx       Up
# yalahaji-certbot     Up
```

Test each endpoint:

```bash
# API health (should return {"status":"ok"})
curl https://api.yalahaji.com/api/v1/health

# Storefront
curl -I https://yalahaji.com
# → HTTP/2 200

# Admin
curl -I https://yh-admin.yalahaji.com
# → HTTP/2 200

# Redis
docker compose exec redis redis-cli ping
# → PONG

# MeiliSearch
curl http://localhost:7700/health
# → {"status":"available"}
```

---

## Step 7 — Create the MinIO bucket

MinIO starts empty. Create the bucket manually once:

```bash
# Open MinIO console in browser: http://YOUR_VPS_IP:9001
# Login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD from .env
# Create a bucket named "yalahaji"
# Set bucket access policy to "public" (for product images)
```

Or via CLI inside the container:

```bash
docker compose exec minio sh -c \
  "mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD && \
   mc mb local/yalahaji && \
   mc anonymous set download local/yalahaji"
```

> **Security:** Close MinIO console port after setup.
> ```bash
> sudo ufw delete allow 9001/tcp
> ```

---

## Step 8 — Set up cron jobs

```bash
crontab -e
```

Add these lines:

```
# Daily MySQL backup at 2 AM
0 2 * * * cd /home/deploy/yalahaji && docker compose exec -T mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" yalahaji | gzip > /home/deploy/backups/mysql/yalahaji_$(date +\%Y-\%m-\%d).sql.gz

# Nginx reload for cert renewal at 3 AM (works with the certbot container's auto-renew)
0 3 * * * docker exec yalahaji-nginx nginx -s reload

# Clean up old backups (keep 7 days)
0 4 * * * find /home/deploy/backups/mysql -name "*.sql.gz" -mtime +7 -delete
```

Create backup directory:

```bash
mkdir -p /home/deploy/backups/mysql
```

---

## Step 9 — Set up GitHub Actions CI/CD (optional but recommended)

Every `git push main` will build new images and deploy to the VPS automatically.

### 9a. Add GitHub secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Full content of `~/.ssh/id_ed25519` (private key) |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` scope |

Generate an SSH key pair if needed:
```bash
# On the VPS
ssh-keygen -t ed25519 -C "deploy@yalahaji" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519   # copy this → VPS_SSH_KEY secret
```

### 9b. Create the workflow file

`.github/workflows/deploy.yml` — create this in your repo:

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
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - name: Build & push API
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push Storefront
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-storefront:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push Admin
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.admin
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/yalahaji-admin:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: SSH & deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/deploy/yalahaji

            # Pull latest code (nginx configs, compose files)
            git pull origin main

            # Log in to GHCR
            echo "${{ secrets.GHCR_TOKEN }}" | \
              docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # Pull new images
            docker compose -f docker-compose.yml -f docker-compose.prod.yml \
              pull api storefront admin

            # Rolling restart (one service at a time)
            docker compose -f docker-compose.yml -f docker-compose.prod.yml \
              up -d --no-deps api
            docker compose -f docker-compose.yml -f docker-compose.prod.yml \
              up -d --no-deps storefront
            docker compose -f docker-compose.yml -f docker-compose.prod.yml \
              up -d --no-deps admin

            # Reload Nginx
            docker exec yalahaji-nginx nginx -s reload

            # Clean up old images
            docker image prune -f
```

---

## Quick reference

```bash
# View all container status
docker compose ps

# Follow logs (all services)
docker compose logs -f

# Follow a specific service
docker compose logs -f api

# Restart a single service
docker compose restart api

# Open MySQL shell
docker compose exec mysql mysql -u yalahaji_user -p yalahaji

# Manual DB backup
docker compose exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} yalahaji \
  | gzip > /home/deploy/backups/mysql/manual_$(date +%Y-%m-%d).sql.gz

# Check disk and memory
df -h && free -h

# Live container resource usage
docker stats

# Force SSL cert renewal
docker compose run --rm certbot renew --force-renewal
docker exec yalahaji-nginx nginx -s reload

# Full redeploy after code change (manual)
git pull origin main
docker compose build
docker compose up -d
```

---

## Troubleshooting

**API container keeps restarting**
```bash
docker compose logs api --tail 50
# Usually: wrong DATABASE_URL in .env, or MySQL not yet healthy
```

**Nginx 502 Bad Gateway**
```bash
docker compose ps              # check upstream is running
docker compose logs nginx      # look for "connect() failed"
docker compose exec nginx wget -qO- http://api:4000/api/v1/health
```

**SSL cert not found on startup**
```bash
# Certs must exist before switching from init.conf to full SSL configs
# If you see "cannot load certificate", re-run the certbot commands in Step 4b
docker compose run --rm certbot certificates   # list existing certs
```

**MinIO uploads failing**
```bash
# Confirm bucket exists and is public
docker compose exec minio sh -c \
  "mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD && mc ls local/"
```

**Out of disk space**
```bash
docker image prune -af        # remove unused images
docker system df              # see what's using space
```

---

*Yalahaji · Hostinger KVM-2 · Ubuntu 22.04 · Docker Compose v2*
