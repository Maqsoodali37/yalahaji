#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Yala Haji — VPS Deployment Script
# Run on your VPS: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="/var/www/yalahaji"
IMAGE_NAME="yalahaji-storefront"
COMPOSE_FILE="$REPO_DIR/docker-compose.yml"

echo "═══════════════════════════════════════════"
echo "  Yala Haji — Deploying to VPS"
echo "═══════════════════════════════════════════"

# 1. Pull latest code
echo "[1/5] Pulling latest code..."
cd "$REPO_DIR"
git pull origin main

# 2. Build Docker image
echo "[2/5] Building Docker image..."
docker build -t "$IMAGE_NAME:latest" .

# 3. Bring down old containers gracefully
echo "[3/5] Stopping old containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

# 4. Start new containers
echo "[4/5] Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

# 5. Prune old images to free disk space
echo "[5/5] Cleaning up old images..."
docker image prune -f

echo ""
echo "✅ Deployment complete!"
echo "   Storefront: https://yalahaji.com"
echo "   Logs: docker compose logs -f storefront"
