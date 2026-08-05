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
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-alert ml-0.5">*</span>}
      </label>
      {children}
      {error ? <p className="error-text">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}
