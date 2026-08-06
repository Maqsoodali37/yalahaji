#!/bin/sh
set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Running seed (safe to re-run)..."
node dist-seed/prisma/seed.js || echo "Seed skipped or already done."

echo "🚀 Starting API..."
exec node dist/main.js
