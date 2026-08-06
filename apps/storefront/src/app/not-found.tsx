import Link from 'next/link'
import '@/app/globals.css'

/**
 * Last-resort 404, for requests that never reach the `[locale]` segment:
 * a path the middleware does not rewrite, or an invalid locale that makes
 * `[locale]/layout.tsx` call `notFound()` — when a layout 404s, Next renders
 * the boundary *above* it, which is this one.
 *
 * It renders its own `<html>` and `<body>` because the root layout renders
 * neither (`[locale]/layout.tsx` owns the document so it can set `lang` and
 * `dir`). Emitting a fragment here is what produced an unhydratable document
 * and the "Application error: a client-side exception has occurred" message.
 *
 * Deliberately static: no locale is known at this point, so there are no
 * messages to load, and nothing here may depend on a provider the root layout
 * does not mount. English, no header, no footer, no client JavaScript. Links
 * go to `/`, which the middleware redirects to the visitor's locale.
 */
export const metadata = {
  title: 'Page not found | Yala Haji',
  robots: { index: false, follow: false },
}

export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <main className="bg-paper min-h-screen flex items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-lg text-center">
            <p
              aria-hidden="true"
              className="text-gradient text-7xl md:text-9xl font-extrabold leading-none tracking-tight"
            >
              404
            </p>

            <h1 className="serif mt-4 text-3xl md:text-4xl text-ink text-balance">
              Page Not Found
            </h1>

            <p className="mt-3 text-ink-2 leading-relaxed text-balance">
              The page you&rsquo;re looking for doesn&rsquo;t exist, or it may have moved.
              Let&rsquo;s get you back on track.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link href="/" className="btn-primary">
                Back to Home
              </Link>
              <Link href="/en/shop" className="btn-outline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
