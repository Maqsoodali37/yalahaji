'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Input ────────────────────────────────────────────────────

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('field', className)} {...props} />
))
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn('field-textarea', className)} {...props} />
))
Textarea.displayName = 'Textarea'

// ─── Select ───────────────────────────────────────────────────

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('field cursor-pointer pr-8', className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

// ─── Checkbox ─────────────────────────────────────────────────

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ className, label, id, ...props }, ref) => {
  const generated = React.useId()
  const inputId = id ?? generated
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border-line text-green accent-green cursor-pointer',
          className,
        )}
        {...props}
      />
      <span className="text-sm text-ink-2">{label}</span>
    </label>
  )
})
Checkbox.displayName = 'Checkbox'

// ─── Labelled wrapper ─────────────────────────────────────────

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const generated = React.useId()

  // Associate the label with its control automatically when the caller has
  // not done it by hand.
  //
  // A `<label>` with no `htmlFor` is attached to nothing: clicking it does
  // nothing, and a screen reader announces the input as unlabelled. Most call
  // sites in this app omit it, so relying on every author to remember has not
  // worked — doing it here fixes the ones already written and the ones nobody
  // has written yet.
  //
  // Only a lone element child that carries no `id` of its own is touched. A
  // caller that set either an `htmlFor` or an `id` has said what it wants, and
  // multiple children or a fragment have no single control to point at.
  //
  // A child that wraps its control in a <div> would still get the id on the
  // wrapper, where `for` is inert. No call site does that today; pass
  // `htmlFor` explicitly if one ever needs to.
  let control = children
  let targetId = htmlFor

  // The Fragment check is not pedantry: `isValidElement` returns true for a
  // fragment, React silently discards an `id` placed on one, and the label
  // would then point at an element that does not exist — worse than no
  // association, because the markup looks correct.
  if (!targetId && React.isValidElement(children) && children.type !== React.Fragment) {
    const existingId = (children.props as { id?: string }).id
    targetId = existingId ?? generated
    if (!existingId) {
      control = React.cloneElement(children as React.ReactElement<{ id?: string }>, {
        id: targetId,
      })
    }
  }

  return (
    <div className={className}>
      <label htmlFor={targetId} className="label">
        {label}
        {required && <span className="text-alert ml-0.5">*</span>}
      </label>
      {control}
      {error ? <p className="error-text">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}
