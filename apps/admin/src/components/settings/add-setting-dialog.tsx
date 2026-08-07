'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField, Input, Textarea, Select, Checkbox } from '@/components/ui/field'
import type { ConfigValueType, SettingInput } from '@/types'

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/
const CATEGORY_PATTERN = /^[a-z][a-z0-9_-]*$/

interface FormState {
  key: string
  value: string
  valueType: ConfigValueType
  category: string
  description: string
  isPublic: boolean
}

const EMPTY: FormState = {
  key: '',
  value: '',
  valueType: 'string',
  category: 'general',
  description: '',
  isPublic: false,
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {}

  if (!form.key.trim()) errors.key = 'Key is required.'
  else if (form.key.length > 120) errors.key = 'Key must be 120 characters or fewer.'
  else if (!KEY_PATTERN.test(form.key))
    errors.key = 'Lowercase snake_case only, e.g. free_shipping_threshold.'

  if (!form.category.trim()) errors.category = 'Category is required.'
  else if (!CATEGORY_PATTERN.test(form.category)) errors.category = 'Lowercase only.'

  if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'

  if (!form.value.trim()) {
    errors.value = 'Value is required.'
  } else if (form.valueType === 'number' && !Number.isFinite(Number(form.value))) {
    errors.value = 'Must be a number.'
  } else if (form.valueType === 'boolean' && !['true', 'false'].includes(form.value)) {
    errors.value = 'Must be true or false.'
  } else if (form.valueType === 'json') {
    try {
      JSON.parse(form.value)
    } catch {
      errors.value = 'Must be valid JSON.'
    }
  }

  return errors
}

export function AddSettingDialog({
  open,
  categories,
  saving,
  onCreate,
  onClose,
}: {
  open: boolean
  categories: string[]
  saving: boolean
  onCreate: (input: SettingInput) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    setForm(EMPTY)
    setErrors({})
    setSubmitted(false)
    onClose()
  }

  function submit() {
    setSubmitted(true)
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onCreate({
      key: form.key.trim(),
      value: form.valueType === 'boolean' ? form.value : form.value.trim(),
      valueType: form.valueType,
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      isPublic: form.isPublic,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Add configuration"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-lg p-5 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-ink mb-4">Add configuration</h2>

        <div className="space-y-4">
          <FormField label="Key" htmlFor="setting-key" required error={submitted ? errors.key : undefined}>
            <Input
              id="setting-key"
              value={form.key}
              onChange={(e) => set('key', e.target.value)}
              placeholder="free_shipping_threshold"
              className="font-mono text-xs"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" htmlFor="setting-type" required>
              <Select
                id="setting-type"
                value={form.valueType}
                onChange={(e) => set('valueType', e.target.value as ConfigValueType)}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </Select>
            </FormField>

            <FormField
              label="Category"
              htmlFor="setting-category"
              required
              error={submitted ? errors.category : undefined}
            >
              <Input
                id="setting-category"
                list="setting-categories"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              />
              <datalist id="setting-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormField>
          </div>

          <FormField label="Value" htmlFor="setting-value" required error={submitted ? errors.value : undefined}>
            {form.valueType === 'boolean' ? (
              <Select
                id="setting-value"
                value={form.value || 'true'}
                onChange={(e) => set('value', e.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            ) : form.valueType === 'json' ? (
              <Textarea
                id="setting-value"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                rows={3}
                className="font-mono text-xs"
                placeholder='{"text":"Eid sale"}'
              />
            ) : (
              <Input
                id="setting-value"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                inputMode={form.valueType === 'number' ? 'decimal' : undefined}
                placeholder={form.valueType === 'number' ? '299900' : 'Yala Haji'}
              />
            )}
          </FormField>

          <FormField
            label="Description"
            htmlFor="setting-description"
            hint="Shown to staff in this panel so the key is not a guess."
            error={submitted ? errors.description : undefined}
          >
            <Textarea
              id="setting-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
            />
          </FormField>

          <Checkbox
            label="Public — exposed to the storefront via GET /settings/public"
            checked={form.isPublic}
            onChange={(e) => set('isPublic', e.target.checked)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={saving}>
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
