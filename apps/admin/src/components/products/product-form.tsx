'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Checkbox, FormField } from '@/components/ui/field'
import { VariantEditor, emptyVariant } from './variant-editor'
import { MediaManager } from './media-manager'
import { useCategories } from '@/hooks/use-products'
import { slugify, rupeesToPaisas, paisasToRupees } from '@/lib/utils'
import type { MediaInput, Product, ProductInput, VariantInput } from '@/types'

export interface ProductFormValues extends Omit<ProductInput, 'variants' | 'images'> {
  variants: VariantInput[]
  images: MediaInput[]
  isActive?: boolean
}

interface ProductFormProps {
  /** Existing product when editing; omit to create. */
  product?: Product
  submitting?: boolean
  onSubmit: (values: ProductInput & { isActive?: boolean }) => void | Promise<void>
}

function blankValues(): ProductFormValues {
  return {
    slug: '',
    sku: '',
    nameEn: '',
    nameUr: '',
    nameAr: '',
    descEn: '',
    descUr: '',
    descAr: '',
    shortDescEn: '',
    shortDescUr: '',
    shortDescAr: '',
    categoryId: '',
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    isFeatured: false,
    metaTitle: '',
    metaDesc: '',
    badges: [],
    tags: [],
    variants: [emptyVariant()],
    images: [],
  }
}

/** Map an API product onto form state (paisas → rupees for price inputs). */
function toFormValues(product: Product): ProductFormValues {
  return {
    slug: product.slug,
    sku: product.sku,
    nameEn: product.nameEn,
    nameUr: product.nameUr,
    nameAr: product.nameAr,
    descEn: product.descEn,
    descUr: product.descUr,
    descAr: product.descAr,
    shortDescEn: product.shortDescEn,
    shortDescUr: product.shortDescUr,
    shortDescAr: product.shortDescAr,
    categoryId: product.category?.id ?? '',
    isKit: product.isKit,
    hasGiftWrap: product.hasGiftWrap,
    hasPreOrder: product.hasPreOrder,
    isFeatured: product.isFeatured,
    metaTitle: product.metaTitle ?? '',
    metaDesc: product.metaDesc ?? '',
    badges: product.badges?.map((b) => b.badge) ?? [],
    tags: product.tags?.map((t) => t.tag) ?? [],
    isActive: product.isActive,
    // The API returns these already sorted by `order`; position in this array
    // is what the next save writes back, so it must not be re-sorted here.
    images: (product.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt ?? '',
      isPrimary: img.isPrimary,
    })),
    variants: product.variants.map((v) => ({
      sku: v.sku,
      tier: v.tier,
      size: v.size ?? undefined,
      color: v.color ?? undefined,
      colorHex: v.colorHex ?? undefined,
      scent: v.scent ?? undefined,
      price: paisasToRupees(v.price),
      compareAtPrice: v.compareAtPrice ? paisasToRupees(v.compareAtPrice) : undefined,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
    })),
  }
}

export function ProductForm({ product, submitting, onSubmit }: ProductFormProps) {
  const router = useRouter()
  const categories = useCategories()
  const isEdit = !!product

  const [values, setValues] = useState<ProductFormValues>(
    product ? toFormValues(product) : blankValues(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugTouched, setSlugTouched] = useState(isEdit)

  // Re-seed the form once the product finishes loading on the edit route.
  useEffect(() => {
    if (product) {
      setValues(toFormValues(product))
      setSlugTouched(true)
    }
  }, [product])

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-derive the slug from the English name until the user edits it.
  function handleNameEn(value: string) {
    setValues((prev) => ({
      ...prev,
      nameEn: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}

    if (!values.nameEn.trim()) next.nameEn = 'English name is required.'
    if (!values.slug.trim()) next.slug = 'Slug is required.'
    if (!values.sku.trim()) next.sku = 'SKU is required.'
    if (!values.categoryId) next.categoryId = 'Pick a category.'
    if (!values.shortDescEn.trim()) next.shortDescEn = 'Short description is required.'
    if (!values.descEn.trim()) next.descEn = 'Description is required.'

    if (values.variants.length === 0) {
      next.variants = 'Add at least one variant.'
    }
    values.variants.forEach((v, i) => {
      if (!v.sku.trim()) next[`${i}.sku`] = 'Required'
      if (!v.price || v.price <= 0) next[`${i}.price`] = 'Must be greater than 0'
      if (v.stock < 0) next[`${i}.stock`] = 'Cannot be negative'
    })

    const skus = values.variants.map((v) => v.sku.trim()).filter(Boolean)
    if (new Set(skus).size !== skus.length) {
      next.variants = 'Variant SKUs must be unique.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Mirror English into Urdu/Arabic when left blank — the API requires them,
    // and an untranslated string beats a failed save.
    const payload: ProductInput & { isActive?: boolean } = {
      ...values,
      nameUr: values.nameUr.trim() || values.nameEn,
      nameAr: values.nameAr.trim() || values.nameEn,
      descUr: values.descUr.trim() || values.descEn,
      descAr: values.descAr.trim() || values.descEn,
      shortDescUr: values.shortDescUr.trim() || values.shortDescEn,
      shortDescAr: values.shortDescAr.trim() || values.shortDescEn,
      metaTitle: values.metaTitle?.trim() || undefined,
      metaDesc: values.metaDesc?.trim() || undefined,
      variants: values.variants.map((v) => ({
        ...v,
        price: rupeesToPaisas(v.price),
        compareAtPrice: v.compareAtPrice ? rupeesToPaisas(v.compareAtPrice) : undefined,
        size: v.size?.trim() || undefined,
        color: v.color?.trim() || undefined,
        scent: v.scent?.trim() || undefined,
      })),
      // `order` is the array index, assigned by the API from the position it
      // receives. Blank alt text is dropped rather than sent as "" — the
      // storefront adapter falls back to the product name, which is a better
      // description than an empty string.
      images: values.images.map((img, index) => ({
        url: img.url,
        alt: img.alt?.trim() || undefined,
        isPrimary: !!img.isPrimary,
        order: index,
      })),
    }

    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* ─── Basics ────────────────────────────────────── */}
      <Panel>
        <PanelHeader title="Basics" description="How the product is identified across the store." />
        <div className="panel-pad grid gap-4 sm:grid-cols-2">
          <FormField label="Name (English)" required error={errors.nameEn} className="sm:col-span-2">
            <Input
              value={values.nameEn}
              onChange={(e) => handleNameEn(e.target.value)}
              placeholder="Premium Ihram Set"
            />
          </FormField>

          <FormField label="Slug" required error={errors.slug} hint="Used in the storefront URL">
            <Input
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', slugify(e.target.value))
              }}
              placeholder="premium-ihram-set"
            />
          </FormField>

          <FormField label="SKU" required error={errors.sku}>
            <Input
              value={values.sku}
              onChange={(e) => set('sku', e.target.value)}
              placeholder="YH-IHR-001"
            />
          </FormField>

          <FormField label="Category" required error={errors.categoryId}>
            <Select
              value={values.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Name (Urdu)" hint="Falls back to English if blank">
            <Input
              value={values.nameUr}
              onChange={(e) => set('nameUr', e.target.value)}
              dir="rtl"
            />
          </FormField>

          <FormField label="Name (Arabic)" hint="Falls back to English if blank">
            <Input
              value={values.nameAr}
              onChange={(e) => set('nameAr', e.target.value)}
              dir="rtl"
            />
          </FormField>
        </div>
      </Panel>

      {/* ─── Descriptions ──────────────────────────────── */}
      <Panel>
        <PanelHeader title="Descriptions" />
        <div className="panel-pad space-y-4">
          <FormField
            label="Short description (English)"
            required
            error={errors.shortDescEn}
            hint="One line, shown on cards and listings"
          >
            <Input
              value={values.shortDescEn}
              onChange={(e) => set('shortDescEn', e.target.value)}
              placeholder="Unstitched, alcohol-free cotton ihram for two."
            />
          </FormField>

          <FormField label="Full description (English)" required error={errors.descEn}>
            <Textarea
              value={values.descEn}
              onChange={(e) => set('descEn', e.target.value)}
              rows={5}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Short description (Urdu)">
              <Input
                value={values.shortDescUr}
                onChange={(e) => set('shortDescUr', e.target.value)}
                dir="rtl"
              />
            </FormField>
            <FormField label="Short description (Arabic)">
              <Input
                value={values.shortDescAr}
                onChange={(e) => set('shortDescAr', e.target.value)}
                dir="rtl"
              />
            </FormField>
            <FormField label="Full description (Urdu)">
              <Textarea
                value={values.descUr}
                onChange={(e) => set('descUr', e.target.value)}
                dir="rtl"
                rows={4}
              />
            </FormField>
            <FormField label="Full description (Arabic)">
              <Textarea
                value={values.descAr}
                onChange={(e) => set('descAr', e.target.value)}
                dir="rtl"
                rows={4}
              />
            </FormField>
          </div>
        </div>
      </Panel>

      {/* ─── Media ─────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title="Photos"
          description="The primary photo is what appears on cards, search results and the cart."
        />
        <div className="panel-pad">
          <MediaManager
            images={values.images}
            onChange={(images) => set('images', images)}
            disabled={submitting}
          />
        </div>
      </Panel>

      {/* ─── Variants ──────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title="Variants & pricing"
          description="Every purchasable combination of size, colour or scent."
        />
        <div className="panel-pad">
          {errors.variants && <p className="error-text mb-3">{errors.variants}</p>}
          <VariantEditor
            variants={values.variants}
            onChange={(v) => set('variants', v)}
            errors={errors}
            disabled={submitting}
          />
          {isEdit && (
            <p className="hint mt-4">
              Note: editing variants here updates this form only. Stock and price changes
              on existing variants save via the product update.
            </p>
          )}
        </div>
      </Panel>

      {/* ─── Options & SEO ─────────────────────────────── */}
      <Panel>
        <PanelHeader title="Options & SEO" />
        <div className="panel-pad space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Checkbox
              label="Featured on homepage"
              checked={!!values.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
            />
            <Checkbox
              label="This is a kit"
              checked={!!values.isKit}
              onChange={(e) => set('isKit', e.target.checked)}
            />
            <Checkbox
              label="Offer gift wrap"
              checked={!!values.hasGiftWrap}
              onChange={(e) => set('hasGiftWrap', e.target.checked)}
            />
            <Checkbox
              label="Allow pre-order"
              checked={!!values.hasPreOrder}
              onChange={(e) => set('hasPreOrder', e.target.checked)}
            />
            {isEdit && (
              <Checkbox
                label="Active (visible on storefront)"
                checked={values.isActive !== false}
                onChange={(e) => set('isActive', e.target.checked)}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Meta title" hint="Defaults to the product name">
              <Input
                value={values.metaTitle ?? ''}
                onChange={(e) => set('metaTitle', e.target.value)}
                maxLength={60}
              />
            </FormField>
            <FormField label="Meta description" hint="Aim for under 160 characters">
              <Input
                value={values.metaDesc ?? ''}
                onChange={(e) => set('metaDesc', e.target.value)}
                maxLength={160}
              />
            </FormField>
          </div>

          <FormField
            label="Tags"
            hint="Comma separated — used for search and related products"
          >
            <Input
              value={values.tags?.join(', ') ?? ''}
              onChange={(e) =>
                set(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
              placeholder="ihram, cotton, hajj"
            />
          </FormField>
        </div>
      </Panel>

      {/* ─── Sticky actions ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-line px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-10">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting}>
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  )
}
