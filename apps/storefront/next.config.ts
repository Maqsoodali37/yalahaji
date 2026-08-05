import path from 'node:path'
import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'
import createNextIntlPlugin from 'next-intl/plugin'

// The repo keeps ONE .env at the root — there is no apps/storefront/.env.
// Next only looks in its own directory by default, so point it upward.
// No-ops in Docker, where the build context has no .env and the values
// arrive as build args instead.
loadEnvConfig(path.resolve(process.cwd(), '../..'))

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'yalahaji.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default withNextIntl(nextConfig)
