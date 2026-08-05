import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/seo'

/** Generates /manifest.webmanifest — drives the Android "add to home screen" icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Hajj & Umrah Essentials`,
    short_name: SITE_NAME,
    description:
      'Complete Hajj & Umrah kits, ihram, abayas and attar — delivered across Pakistan.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFCFB',
    theme_color: '#0B5138',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
