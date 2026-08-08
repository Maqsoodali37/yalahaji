'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Page numbers with an ellipsis, always the same width.
 *
 * Rendering every page number is fine at five pages and unusable at fifty, and
 * a control whose width changes as you page through it moves the Next button
 * out from under the thumb between taps. This always yields at most seven
 * slots: first, last, the current page and its neighbours, with `null` where a
 * run was elided.
 */
function pageSlots(current: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const slots: Array<number | null> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) slots.push(null)
  for (let p = start; p <= end; p++) slots.push(p)
  if (end < total - 1) slots.push(null)

  slots.push(total)
  return slots
}

export function Pagination({
  page,
  totalPages,
  onChange,
  /** Announced to screen readers so the control says what it paginates. */
  label = 'Pagination',
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  label?: string
}) {
  // One page is not a choice, and a disabled pair of arrows under a short list
  // is furniture rather than a control.
  if (totalPages <= 1) return null

  const go = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return
    onChange(next)
  }

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1 flex-wrap">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="p-2 rounded-sm border border-line text-stone hover:border-green/40 hover:text-green disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-stone transition-colors"
      >
        {/* Logical direction, so the arrow points the right way in Urdu and
            Arabic. A hardcoded ChevronLeft points "back" only in LTR. */}
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
      </button>

      {pageSlots(page, totalPages).map((slot, i) =>
        slot === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-2 text-stone select-none">
            …
          </span>
        ) : (
          <button
            key={slot}
            onClick={() => go(slot)}
            aria-label={`Page ${slot}`}
            aria-current={slot === page ? 'page' : undefined}
            className={cn(
              'min-w-9 h-9 px-2 rounded-sm text-sm font-medium border transition-colors',
              slot === page
                ? 'border-green bg-green text-white'
                : 'border-line text-stone hover:border-green/40 hover:text-green',
            )}
          >
            {slot}
          </button>
        ),
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="p-2 rounded-sm border border-line text-stone hover:border-green/40 hover:text-green disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-stone transition-colors"
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
      </button>
    </nav>
  )
}
