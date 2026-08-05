'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, FormField } from '@/components/ui/field'
import type { Tier, VariantInput } from '@/types'

const TIERS: Tier[] = ['Economy', 'Standard', 'Premium']

export function emptyVariant(): VariantInput {
  return {
    sku: '',
    tier: 'Standard',
    price: 0,
    stock: 0,
    lowStockThreshold: 10,
  }
}

interface VariantEditorProps {
  variants: VariantInput[]
  onChange: (variants: VariantInput[]) => void
  /** Field-level errors keyed by `${index}.${field}` */
  errors?: Record<string, string>
  disabled?: boolean
}

/**
 * Prices are entered in RUPEES here and converted to paisas by the caller
 * on submit — keeping the raw rupee value in state avoids rounding drift
 * while the user is typing.
 */
export function VariantEditor({ variants, onChange, errors = {}, disabled }: VariantEditorProps) {
  function update(index: number, patch: Partial<VariantInput>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  function remove(index: number) {
    onChange(variants.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {variants.length === 0 && (
        <p className="text-sm text-ink-3">
          No variants yet. A product needs at least one variant to be purchasable.
        </p>
      )}

      {variants.map((variant, index) => (
        <div key={index} className="rounded-md border border-line p-4 bg-paper/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-ink-2">Variant {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={`Remove variant ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-alert" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              label="SKU"
              required
              error={errors[`${index}.sku`]}
              className="lg:col-span-2"
            >
              <Input
                value={variant.sku}
                onChange={(e) => update(index, { sku: e.target.value })}
                placeholder="YH-IHR-STD-M"
                disabled={disabled}
              />
            </FormField>

            <FormField label="Tier" required>
              <Select
                value={variant.tier}
                onChange={(e) => update(index, { tier: e.target.value as Tier })}
                disabled={disabled}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Size">
              <Input
                value={variant.size ?? ''}
                onChange={(e) => update(index, { size: e.target.value })}
                placeholder="M"
                disabled={disabled}
              />
            </FormField>

            <FormField label="Colour">
              <Input
                value={variant.color ?? ''}
                onChange={(e) => update(index, { color: e.target.value })}
                placeholder="White"
                disabled={disabled}
              />
            </FormField>

            <FormField label="Scent">
              <Input
                value={variant.scent ?? ''}
                onChange={(e) => update(index, { scent: e.target.value })}
                placeholder="Oud"
                disabled={disabled}
              />
            </FormField>

            <FormField
              label="Price (₨)"
              required
              error={errors[`${index}.price`]}
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={variant.price || ''}
                onChange={(e) => update(index, { price: Number(e.target.value) })}
                placeholder="1499"
                disabled={disabled}
              />
            </FormField>

            <FormField label="Compare at (₨)" hint="Shown struck through">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={variant.compareAtPrice || ''}
                onChange={(e) =>
                  update(index, {
                    compareAtPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="1999"
                disabled={disabled}
              />
            </FormField>

            <FormField label="Stock" required error={errors[`${index}.stock`]}>
              <Input
                type="number"
                min={0}
                value={variant.stock || 0}
                onChange={(e) => update(index, { stock: Number(e.target.value) })}
                disabled={disabled}
              />
            </FormField>

            <FormField label="Low stock alert at">
              <Input
                type="number"
                min={0}
                value={variant.lowStockThreshold ?? 10}
                onChange={(e) =>
                  update(index, { lowStockThreshold: Number(e.target.value) })
                }
                disabled={disabled}
              />
            </FormField>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...variants, emptyVariant()])}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5" />
        Add variant
      </Button>
    </div>
  )
}
