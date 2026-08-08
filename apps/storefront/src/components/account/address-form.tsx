'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { ApiError, type AddressInput } from '@/lib/api'
import {
  addressRules,
  hasErrors,
  validate,
  PROVINCES,
  type AddressFormValues,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'
import { COUNTRIES, DEFAULT_COUNTRY } from '@/lib/address'
import { ADDRESS_LABELS, type Address, type AddressLabelType } from '@/types'

const EMPTY: AddressInput = {
  label: 'Home',
  labelType: 'home',
  fullName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  area: '',
  city: '',
  province: '',
  country: DEFAULT_COUNTRY,
  postalCode: '',
  isDefaultShipping: false,
  isDefaultBilling: false,
}

/**
 * Create/edit dialog for a saved address.
 *
 * One component serves both operations because the fields and the rules are
 * identical — only the request differs. Splitting them is how the two drift
 * until "edit" quietly accepts something "create" rejects.
 *
 * It also serves checkout's "add a new address" flow, for the same reason one
 * level up: a second address form living in the checkout tree would be a
 * second place for the field list and the validation wiring to drift, and the
 * one that drifts is always the one nobody is looking at.
 */
export function AddressForm({
  initial,
  onSubmit,
  onClose,
  title,
  submitLabel,
}: {
  /** Present when editing; absent when creating. */
  initial?: Address
  onSubmit: (values: AddressInput) => Promise<void>
  onClose: () => void
  /** Overridden by checkout, which is adding an address mid-order. */
  title?: string
  submitLabel?: string
}) {
  const [values, setValues] = useState<AddressInput>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors<AddressFormValues>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!initial) {
      setValues(EMPTY)
      return
    }
    const { id: _id, ...rest } = initial
    setValues({ ...EMPTY, ...rest })
  }, [initial])

  // Escape closes, matching every other dismissible surface on the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /**
   * Apply a patch of one or more fields in a single state write.
   *
   * Multi-field updates MUST come through here rather than through two
   * `setField` calls. `setField` derives its next state from the
   * render-scoped `values`, so two calls in one handler both read the same
   * snapshot and the second silently discards the first. The label chips
   * write `labelType` and `label` together, which is exactly that case —
   * done as two calls, every address saves as `home` no matter which chip
   * was tapped, while `label` says "Office".
   */
  const setFields = (patch: Partial<AddressInput>) => {
    const next = { ...values, ...patch }
    setValues(next)
    if (submitted) setErrors(validate(next as AddressFormValues, addressRules))
  }

  const setField = (
    field: keyof AddressInput,
    value: string | boolean | AddressLabelType,
  ) => setFields({ [field]: value } as Partial<AddressInput>)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')

    const found = validate(values as AddressFormValues, addressRules)
    setErrors(found)
    if (hasErrors(found)) {
      // Move focus to the problem so the message is not announced off-screen
      // on a form this tall.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    setSaving(true)
    try {
      // Trim on the way out. Leading whitespace in a name or city is invisible
      // in the input but very visible on a shipping label.
      await onSubmit({
        ...values,
        // Falls back to the city so the list never renders an unlabelled card.
        label: values.label?.trim() || values.city.trim(),
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        // Empty optionals are sent as `null`, not `undefined`. This is an
        // update as much as a create — a customer clearing a field on an
        // existing address is editing it via PATCH, and `apiFetch` sends the
        // body through `JSON.stringify`, which drops a key whose value is
        // `undefined` entirely. An omitted key means "leave alone" on a
        // PATCH, so a cleared "Address Line 2"/"Area"/"Postal Code"/"Email"
        // was silently never cleared: the API left the old value in place and
        // it reappeared the next time the address list was fetched. `null` is
        // a real value in the JSON body, so the API can tell "clear it" apart
        // from "field not present" — the same rule already applied to
        // MenuItemInput's optional fields. `@IsEmail` still rejects a blank
        // *string*, which is exactly why this is `null` and not `''`.
        email: values.email?.trim() || null,
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2?.trim() || null,
        area: values.area?.trim() || null,
        city: values.city.trim(),
        province: values.province,
        country: values.country?.trim() || DEFAULT_COUNTRY,
        postalCode: values.postalCode?.trim() || null,
      })
      onClose()
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Could not save this address. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  const heading = title ?? (initial ? 'Edit address' : 'Add a new address')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-line rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        noValidate
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-lg">{heading}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-stone hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/*
          Chips rather than a dropdown: three realistic answers, and the label
          is what the customer scans for when picking an address at checkout,
          so it is worth one tap rather than two.

          The chip sets `labelType`, which is the enum code groups on. `label`
          stays free text alongside it — a row saved before the enum holds
          whatever was typed ("Warehouse", "Ammi's house"), and that string is
          still what gets displayed, so choosing "Other" keeps it editable
          instead of flattening it to a category it never was.
        */}
        <fieldset>
          <legend className="text-sm font-medium text-ink mb-1.5">Label</legend>
          <div className="flex gap-2 flex-wrap">
            {ADDRESS_LABELS.map((chip) => {
              const selected = values.labelType === chip.type
              return (
                <button
                  key={chip.type}
                  type="button"
                  // One write, not two — see `setFields`. Home and Office
                  // name themselves; "Other" clears the name so the text field
                  // below starts empty and ready, and the submit handler's
                  // city fallback covers someone who leaves it that way.
                  onClick={() =>
                    setFields({
                      labelType: chip.type,
                      label: chip.type === 'other' ? '' : chip.label,
                    })
                  }
                  aria-pressed={selected}
                  className={cn(
                    'px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors',
                    selected
                      ? 'border-green bg-green-tint text-green'
                      : 'border-line text-stone hover:border-green/40',
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
          {values.labelType === 'other' && (
            <input
              value={values.label ?? ''}
              onChange={(e) => setField('label', e.target.value)}
              className={cn(inputClass(), 'mt-2')}
              placeholder="Name this address (e.g. Warehouse)"
              aria-label="Address label"
              maxLength={40}
            />
          )}
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Full Name" required error={errors.fullName}>
            {(props) => (
              <input
                {...props}
                value={values.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                className={inputClass(errors.fullName)}
                placeholder="Muhammad Ali"
                autoComplete="name"
              />
            )}
          </FormField>

          <FormField label="Phone" required error={errors.phone}>
            {(props) => (
              <input
                {...props}
                value={values.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className={inputClass(errors.phone)}
                placeholder="+92 300 1234567"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Email (optional)"
          error={errors.email}
          hint="For delivery updates, if the recipient is not you."
        >
          {(props) => (
            <input
              {...props}
              value={values.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
              className={inputClass(errors.email)}
              placeholder="name@example.com"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          )}
        </FormField>

        <FormField label="Address Line 1" required error={errors.addressLine1}>
          {(props) => (
            <input
              {...props}
              value={values.addressLine1}
              onChange={(e) => setField('addressLine1', e.target.value)}
              className={inputClass(errors.addressLine1)}
              placeholder="House/Flat number, Street"
              autoComplete="address-line1"
            />
          )}
        </FormField>

        <FormField label="Address Line 2 (optional)" error={errors.addressLine2}>
          {(props) => (
            <input
              {...props}
              value={values.addressLine2 ?? ''}
              onChange={(e) => setField('addressLine2', e.target.value)}
              className={inputClass(errors.addressLine2)}
              placeholder="Landmark, building name"
              autoComplete="address-line2"
            />
          )}
        </FormField>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Area (optional)" error={errors.area}>
            {(props) => (
              <input
                {...props}
                value={values.area ?? ''}
                onChange={(e) => setField('area', e.target.value)}
                className={inputClass(errors.area)}
                placeholder="DHA Phase 5, Gulberg III"
                autoComplete="address-level3"
              />
            )}
          </FormField>

          <FormField label="City" required error={errors.city}>
            {(props) => (
              <input
                {...props}
                value={values.city}
                onChange={(e) => setField('city', e.target.value)}
                className={inputClass(errors.city)}
                placeholder="Lahore"
                autoComplete="address-level2"
              />
            )}
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Province" required error={errors.province}>
            {(props) => (
              <select
                {...props}
                value={values.province}
                onChange={(e) => setField('province', e.target.value)}
                className={inputClass(errors.province)}
                autoComplete="address-level1"
              >
                <option value="">Select</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="Country" required error={errors.country}>
            {(props) => (
              // A select with one option rather than a hidden field: the value
              // is on the form the customer is reading, so nothing is stored
              // that they were not shown. It becomes a real choice the day
              // COUNTRIES gains a second entry, with no change here.
              <select
                {...props}
                value={values.country ?? DEFAULT_COUNTRY}
                onChange={(e) => setField('country', e.target.value)}
                className={inputClass(errors.country)}
                autoComplete="country-name"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Postal Code (optional)" error={errors.postalCode}>
            {(props) => (
              <input
                {...props}
                value={values.postalCode ?? ''}
                onChange={(e) => setField('postalCode', e.target.value)}
                className={inputClass(errors.postalCode)}
                placeholder="54000"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            )}
          </FormField>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={values.isDefaultShipping}
              onChange={(e) => setField('isDefaultShipping', e.target.checked)}
              className="w-4 h-4 accent-green"
            />
            Use as my default delivery address
          </label>
          {/*
            Offered because the column exists and the customer may as well set
            it while they are here, but labelled honestly: cash on delivery is
            the only payment method, so nothing asks for a billing address yet.
            Presenting it as if it changed a checkout they will see would be
            the dead-control problem in a different shape.
          */}
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={values.isDefaultBilling}
              onChange={(e) => setField('isDefaultBilling', e.target.checked)}
              className="w-4 h-4 accent-green"
            />
            Use as my default billing address
          </label>
          <p className="text-xs text-stone ms-6">
            Billing addresses aren&apos;t used yet — orders are paid in cash on
            delivery.
          </p>
        </div>

        {submitted && hasErrors(errors) && (
          <p role="alert" className="text-sm text-alert">
            Please correct the highlighted fields to continue.
          </p>
        )}

        {formError && (
          <p role="alert" className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-sm px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving
              ? 'Saving…'
              : submitLabel ?? (initial ? 'Save changes' : 'Add address')}
          </button>
          <button type="button" onClick={onClose} className="btn-outline px-5 py-2.5">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
