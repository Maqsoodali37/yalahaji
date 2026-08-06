import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

/**
 * Catch-all for any URL under a locale that matches no real route:
 * `/en/random-page`, `/en/collections/invalid-slug`, `/en/shop/a/b/c`.
 *
 * Without it, Next resolves an unmatched path *before* it reaches the
 * `[locale]` segment and renders `app/not-found.tsx` under the root layout —
 * which deliberately renders nothing but `children`, no `<html>`, no `<body>`
 * and no NextIntlClientProvider. That produced a document React could not
 * hydrate, and the customer saw "Application error: a client-side exception
 * has occurred" instead of a 404.
 *
 * Making the URL match here puts it inside `[locale]/layout.tsx`, so
 * `[locale]/not-found.tsx` renders with the full chrome and i18n context.
 * Next still sends HTTP 404 — `notFound()` sets the status, not the file.
 *
 * More specific segments always win over a catch-all, so this shadows nothing.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function CatchAllNotFound() {
  notFound()
}
