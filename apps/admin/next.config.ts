import path from 'node:path'
import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'

// The repo keeps ONE .env at the root — there is no apps/admin/.env.
// Next only looks in its own directory by default, so point it upward.
// No-ops in Docker, where the build context has no .env and the values
// arrive as build args instead.
loadEnvConfig(path.resolve(process.cwd(), '../..'))

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}

export default nextConfig
