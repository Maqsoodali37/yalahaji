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
import type { Address } from '@/types'

const EMPTY: AddressInput = {
  label: '',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false,
}

/**
 * Create/edit dialog for a saved address.
 *
 * One component serves both operations because the fields and the rules are
 * identical — only the request differs. Splitting them is how the two drift
 * until "edit" quietly accepts something "create" rejects.
 */
export function AddressForm({
  initial,
  onSubmit,
  onClose,
}: {
  /** Present when editing; absent when creating. */
  initial?: Address
  onSubmit: (values: AddressInput) => Promise<void>
  onClose: () => void
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

  const setField = (field: keyof AddressInput, value: string | boolean) => {
    const next = { ...values, [field]: value }
    setValues(next)
    if (submitted) setErrors(validate(next as AddressFormValues, addressRules))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')

    const found = validate(values as AddressFormValues, addressRules)
    setErrors(found)
    if (hasErrors(found)) return

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
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2?.trim() || undefined,
        city: values.city.trim(),
        province: values.province,
        postalCode: values.postalCode?.trim() || undefined,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Edit address' : 'Add a new address'}
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
          <h3 className="font-bold text-ink text-lg">
            {initial ? 'Edit address' : 'Add a new address'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-stone hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <FormField label="Label (optional)">
          {(props) => (
            <input
              {...props}
              value={values.label ?? ''}
              onChange={(e) => setField('label', e.target.value)}
              className={inputClass()}
              placeholder="Home, Office…"
              maxLength={40}
            />
          )}
        </FormField>

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
              placeholder="Area, Neighbourhood"
              autoComplete="address-line2"
            />
          )}
        </FormField>

        <div className="grid sm:grid-cols-3 gap-4">
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

          <FormField label="Postal Code" error={errors.postalCode}>
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

        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => setField('isDefault', e.target.checked)}
            className="w-4 h-4 accent-green"
          />
          Use as my default delivery address
        </label>

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
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add address'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline px-5 py-2.5">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
