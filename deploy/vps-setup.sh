#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Yala Haji — First-time VPS Setup (Ubuntu 22.04 / 24.04)
# Run once as root on a fresh VPS: bash vps-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="yalahaji.com"
REPO_URL="https://github.com/YOUR_ORG/yalahaji.git"   # ← update this
REPO_DIR="/var/www/yalahaji"
DEPLOY_USER="deploy"

echo "═══════════════════════════════════════════"
echo "  Yala Haji — VPS Initial Setup"
echo "═══════════════════════════════════════════"

# ── System packages ───────────────────────────────────────────────────────────
echo "[1/7] Installing system packages..."
apt-get update -q
apt-get install -y -q \
  curl git ufw fail2ban \
  ca-certificates gnupg lsb-release \
  certbot python3-certbot-nginx

# ── Docker ────────────────────────────────────────────────────────────────────
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | bash
fi
systemctl enable docker
systemctl start docker

# ── Deploy user ───────────────────────────────────────────────────────────────
echo "[3/7] Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
fi

# ── Firewall ──────────────────────────────────────────────────────────────────
echo "[4/7] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Clone repo ────────────────────────────────────────────────────────────────
echo "[5/7] Cloning repository..."
if [ ! -d "$REPO_DIR" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO_DIR"
fi

# ── SSL certificate ───────────────────────────────────────────────────────────
echo "[6/7] Obtaining SSL certificate..."
echo "  → Make sure DNS A records for $DOMAIN point to this server's IP first."
read -p "  Ready to issue SSL certificate? [y/N]: " answer
if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
  certbot certonly --standalone \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --agree-tos --non-interactive \
    --email admin@"$DOMAIN"
else
  echo "  Skipping SSL — run 'certbot certonly --standalone -d $DOMAIN' manually."
fi

# ── Auto-renew cron ───────────────────────────────────────────────────────────
echo "[7/7] Setting up cert auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker exec yalahaji-nginx nginx -s reload") | crontab -

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update REPO_URL in this script"
echo "  2. cd $REPO_DIR && bash deploy/deploy.sh"
