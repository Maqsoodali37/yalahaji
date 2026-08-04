import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface PolicyPageProps {
  eyebrow: string
  title: string
  intro?: string
  /** ISO date string, e.g. '2026-08-05' */
  updated?: string
  locale: string
  children: React.ReactNode
}

/** Shared shell for About / Shipping / Returns / Terms pages. */
export function PolicyPage({
  eyebrow,
  title,
  intro,
  updated,
  locale,
  children,
}: PolicyPageProps) {
  return (
    <div className="bg-paper min-h-screen">
      {/* Header band */}
      <div className="border-b border-line bg-white py-10">
        <div className="container-max">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-stone mb-4">
            <Link href={`/${locale}`} className="hover:text-green transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 opacity-50" />
            <span className="text-ink font-semibold">{title}</span>
          </nav>

          <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
            {eyebrow}
          </span>
          <h1 className="serif text-3xl md:text-4xl text-ink mb-2">{title}</h1>
          {intro && <p className="text-ink-2 text-sm max-w-2xl">{intro}</p>}
          {updated && (
            <p className="text-xs text-stone mt-4">
              Last updated:{' '}
              {new Date(updated).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="container-max py-10">
        <div className="max-w-3xl bg-white border border-line rounded-md p-7 md:p-10">
          {children}
        </div>

        {/* Help footer */}
        <div className="max-w-3xl mt-6 bg-green-tint border border-line rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-ink text-sm mb-1">Still have a question?</h3>
            <p className="text-sm text-ink-2">
              Our team replies on WhatsApp within minutes during business hours.
            </p>
          </div>
          <a
            href="https://wa.me/923111234567"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-shrink-0"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Prose primitives ─────────────────────────────────────── */

export function PolicySection({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="font-bold text-ink text-base mb-3">{heading}</h2>
      <div className="space-y-3 text-sm text-ink-2 leading-relaxed">{children}</div>
    </section>
  )
}

export function PolicyList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Callout box for important terms. */
export function PolicyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gold-tint border border-gold/25 rounded-sm p-4 text-sm text-ink-2 leading-relaxed">
      {children}
    </div>
  )
}
