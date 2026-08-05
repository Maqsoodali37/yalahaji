'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Label + control + error message, wired together for screen readers.
 *
 * The error is rendered inside the same element every time rather than being
 * conditionally mounted, so assistive technology announces a change instead
 * of a new region appearing — and the layout does not jump as messages come
 * and go between keystrokes.
 */
export function FormField({
  label,
  error,
  required,
  hint,
  children,
  className,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  /** Receives the ids to attach to the control so label and error connect. */
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => React.ReactNode
  className?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block"
      >
        {label}
        {required && <span className="text-alert ms-0.5">*</span>}
      </label>

      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-stone mt-1">
          {hint}
        </p>
      )}

      <p
        id={errorId}
        role="alert"
        className={cn(
          'text-xs text-alert mt-1 transition-opacity',
          error ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden',
        )}
      >
        {error}
      </p>
    </div>
  )
}

/** Adds the invalid outline to the shared `input-base` style. */
export function inputClass(error?: string, extra?: string) {
  return cn('input-base', error && 'border-alert focus:border-alert', extra)
}
