'use client'

import { useEffect } from 'react'
import '@/app/globals.css'

/**
 * Catches a failure in `[locale]/layout.tsx` itself — the one place the
 * locale-level `error.tsx` cannot reach, because that boundary lives inside
 * the layout that broke.
 *
 * Must render `<html>` and `<body>`: it replaces the root layout entirely,
 * and the root layout here renders neither.
 *
 * Plain English and inline styles on purpose — if the layout failed, its
 * i18n provider and its stylesheet link are exactly what may be missing, so
 * nothing on this page may depend on either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[storefront] root layout error', error)
  }, [error])

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          background: '#FAFCFB',
          color: '#0E2A1E',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.75rem', fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.75rem', color: '#46564D', lineHeight: 1.6 }}>
            We hit an unexpected problem loading this page. This one is on us — please
            try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#0B5138',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '0.7rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#68776F' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
