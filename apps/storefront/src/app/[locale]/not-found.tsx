import { NotFoundView } from '@/components/layout/not-found-view'

/**
 * The 404 boundary for everything under `/[locale]`. Rendered inside
 * `[locale]/layout.tsx`, so it gets the header, footer, `<html dir>` and
 * NextIntlClientProvider — which is the whole reason the catch-all route in
 * `[locale]/[...rest]` exists: without it an unmatched URL never enters this
 * segment and falls through to `app/not-found.tsx` instead.
 *
 * `not-found.tsx` cannot export `metadata`; the noindex tag lives in
 * NotFoundView, and the 404 status Next sets is what crawlers actually act on.
 */
export default function LocaleNotFound() {
  return <NotFoundView />
}
