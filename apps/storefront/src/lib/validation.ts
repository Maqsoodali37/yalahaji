// ─────────────────────────────────────────────────────────────
// Shared form validation for the storefront.
//
// Every rule here has a counterpart in the API's DTOs. The server is the
// authority — this layer exists so a customer finds out about a bad phone
// number while they are still looking at the field, not after a round trip
// that returns a class-validator string written for developers.
//
// Keeping the rules in one module is what stops the two sides drifting: when
// the API tightens a constraint, there is exactly one place here to match it.
// ─────────────────────────────────────────────────────────────

import { isValidPakistaniPhone } from './api'

/** Field name → message. A field is only present when it is invalid. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>

/**
 * A rule returns a message when the value is unacceptable, or `undefined`
 * when it passes. Returning the message rather than a boolean keeps the
 * reason next to the condition that produced it.
 */
export type Rule<V, T = unknown> = (value: V, all: T) => string | undefined

export type RuleSet<T> = {
  [K in keyof T]?: Rule<T[K], T>[]
}

/**
 * Runs each field's rules in order and keeps the first failure. Later rules
 * assume earlier ones passed, so "required" must come first — otherwise a
 * blank field reports a format complaint instead of that it is missing.
 */
export function validate<T extends object>(values: T, rules: RuleSet<T>): FieldErrors<T> {
  const errors: FieldErrors<T> = {}

  for (const key of Object.keys(rules) as (keyof T)[]) {
    const fieldRules = rules[key]
    if (!fieldRules) continue

    for (const rule of fieldRules) {
      const message = rule(values[key], values)
      if (message) {
        errors[key] = message
        break
      }
    }
  }

  return errors
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0
}

// ─── Rules ────────────────────────────────────────────────────────────────────
//
// `required` trims before testing so a field of spaces is treated as empty —
// it satisfies a browser's `required` attribute but is not an answer.

export const required =
  (message = 'This field is required.'): Rule<unknown> =>
  (value) => {
    if (value === undefined || value === null) return message
    if (typeof value === 'string' && value.trim() === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    return undefined
  }

export const minLength =
  (min: number, message?: string): Rule<string | undefined> =>
  (value) =>
    (value ?? '').trim().length < min
      ? message ?? `Must be at least ${min} characters.`
      : undefined

/**
 * Guards against values the database column cannot hold. The limits mirror
 * the API's `@MaxLength` decorators.
 */
export const maxLength =
  (max: number, message?: string): Rule<string | undefined> =>
  (value) =>
    (value ?? '').trim().length > max
      ? message ?? `Must be ${max} characters or fewer.`
      : undefined

export const phone =
  (message = 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.'): Rule<string | undefined> =>
  (value) =>
    isValidPakistaniPhone(value ?? '') ? undefined : message

/**
 * Deliberately permissive. Rejecting unusual-but-legal addresses is worse
 * than letting the API have the final word, so this only catches shapes that
 * cannot be an address at all.
 */
export const email =
  (message = 'Enter a valid email address.'): Rule<string | undefined> =>
  (value) => {
    const trimmed = (value ?? '').trim()
    if (trimmed === '') return undefined // use `required` when it is mandatory
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) ? undefined : message
  }

/**
 * `YH-<year>-<sequence>-<token>`, e.g. `YH-2026-1001-K7QX9M`.
 *
 * **Mirrors `ORDER_NUMBER_REGEX` in `apps/api/src/orders/dto/track-order.dto.ts`.
 * Change one, change both** — a looser rule here produces a rejection the
 * customer was never warned about; a stricter one blocks a number the API
 * would have accepted.
 *
 * The token alphabet is Crockford Base32, so `I`, `L`, `O` and `U` are absent.
 * Catching those here is the point of validating client-side at all: someone
 * who reads `0` as `O` off a WhatsApp message gets told the format is wrong,
 * rather than a bare "order not found" that suggests their order is missing.
 */
export const ORDER_NUMBER_REGEX = /^YH-\d{4}-\d{4,}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/

export const orderNumber =
  (
    message = 'Enter the full order number from your confirmation, e.g. YH-2026-1001-K7QX9M.',
  ): Rule<string | undefined> =>
  (value) =>
    ORDER_NUMBER_REGEX.test((value ?? '').trim().toUpperCase()) ? undefined : message

/** Pakistan Post uses five digits. Optional everywhere it appears. */
export const postalCode =
  (message = 'Postal code should be 5 digits, e.g. 54000.'): Rule<string | undefined> =>
  (value) => {
    const trimmed = (value ?? '').trim()
    if (trimmed === '') return undefined
    return /^[0-9]{5}$/.test(trimmed) ? undefined : message
  }

export const oneOf =
  <V>(allowed: readonly V[], message = 'Choose one of the available options.'): Rule<V> =>
  (value) =>
    allowed.includes(value) ? undefined : message

export const inRange =
  (min: number, max: number, message?: string): Rule<number | undefined> =>
  (value) => {
    if (value === undefined || Number.isNaN(value)) return message ?? 'Enter a number.'
    return value < min || value > max
      ? message ?? `Must be between ${min} and ${max}.`
      : undefined
  }

/**
 * Password strength is intentionally length-only, matching the API. Composition
 * rules (a digit, a symbol) push people toward `Password1!` and are weaker in
 * practice than simply asking for more characters.
 */
export const password = (min = 8): Rule<string | undefined> =>
  minLength(min, `Password must be at least ${min} characters.`)

// ─── Rule sets shared across screens ──────────────────────────────────────────

export interface AddressFormValues {
  fullName?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  province?: string
  postalCode?: string
}

/**
 * Used by both checkout and the saved-addresses screen. They render different
 * layouts but describe the same thing, and a rule that applies in one place
 * and not the other would be a bug rather than a feature.
 */
export const addressRules: RuleSet<AddressFormValues> = {
  fullName: [required('Enter the recipient’s full name.'), minLength(2), maxLength(120)],
  phone: [required('A phone number is required for delivery.'), phone()],
  addressLine1: [
    required('Enter a street address.'),
    minLength(5, 'Enter a fuller address so the courier can find it.'),
    maxLength(200),
  ],
  addressLine2: [maxLength(200)],
  city: [required('Enter a city.'), minLength(2), maxLength(80)],
  province: [required('Select a province.')],
  postalCode: [postalCode()],
}

export const PROVINCES = [
  'Punjab',
  'Sindh',
  'KPK',
  'Balochistan',
  'Azad Kashmir',
  'Gilgit-Baltistan',
] as const

export type Province = (typeof PROVINCES)[number]
