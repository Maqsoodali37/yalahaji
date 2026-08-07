'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Checkbox, FormField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { SingleImageUploader } from './single-image-uploader'
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories'
import { slugify } from '@/lib/utils'
import type { Category, CategoryInput } from '@/types'

type Tab = 'basics' | 'translations' | 'seo'

interface FlatOption {
  id: string
  label: string
  depth: number
}

/** Indented flat list for the parent picker — a `<select>` has no concept of nesting. */
function flattenForPicker(nodes: Category[], depth = 0): FlatOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.nameEn, depth },
    ...flattenForPicker(node.children ?? [], depth + 1),
  ])
}

/** Every id in the subtree rooted at `id` (inclusive) — these can't legally become its parent. */
function descendantIds(nodes: Category[], id: string): Set<string> {
  const result = new Set<string>()
  function findAndCollect(list: Category[]): boolean {
    for (const node of list) {
      if (node.id === id) {
        collect(node)
        return true
      }
      if (findAndCollect(node.children ?? [])) return true
    }
    return false
  }
  function collect(node: Category) {
    result.add(node.id)
    for (const child of node.children ?? []) collect(child)
  }
  findAndCollect(nodes)
  return result
}

interface FormState {
  slug: string
  nameEn: string
  nameUr: string
  nameAr: string
  descEn: string
  descUr: string
  descAr: string
  image?: string
  bannerImage?: string
  parentId: string
  featured: boolean
  isActive: boolean
  seoTitleEn: string
  seoTitleUr: string
  seoTitleAr: string
  seoDescEn: string
  seoDescUr: string
  seoDescAr: string
}

type LocaleKey = 'nameEn' | 'nameUr' | 'nameAr'
  | 'descEn' | 'descUr' | 'descAr'
  | 'seoTitleEn' | 'seoTitleUr' | 'seoTitleAr'
  | 'seoDescEn' | 'seoDescUr' | 'seoDescAr'

/**
 * Explicit field lookup per locale rather than building the key with a
 * template literal (`` `name${locale}` ``) at each call site — a typo in a
 * locale suffix there would still satisfy `keyof FormState` structurally
 * wrong, and this way every field name is written out once, here.
 */
const LOCALE_FIELDS: Record<
  'En' | 'Ur' | 'Ar',
  { label: string; name: LocaleKey; desc: LocaleKey; seoTitle: LocaleKey; seoDesc: LocaleKey }
> = {
  En: { label: 'English', name: 'nameEn', desc: 'descEn', seoTitle: 'seoTitleEn', seoDesc: 'seoDescEn' },
  Ur: { label: 'Urdu', name: 'nameUr', desc: 'descUr', seoTitle: 'seoTitleUr', seoDesc: 'seoDescUr' },
  Ar: { label: 'Arabic', name: 'nameAr', desc: 'descAr', seoTitle: 'seoTitleAr', seoDesc: 'seoDescAr' },
}
const LOCALE_KEYS: Array<'En' | 'Ur' | 'Ar'> = ['En', 'Ur', 'Ar']

function blank(defaultParentId?: string | null): FormState {
  return {
    slug: '',
    nameEn: '',
    nameUr: '',
    nameAr: '',
    descEn: '',
    descUr: '',
    descAr: '',
    image: undefined,
    bannerImage: undefined,
    parentId: defaultParentId ?? '',
    featured: false,
    isActive: true,
    seoTitleEn: '',
    seoTitleUr: '',
    seoTitleAr: '',
    seoDescEn: '',
    seoDescUr: '',
    seoDescAr: '',
  }
}

function fromCategory(cat: Category): FormState {
  return {
    slug: cat.slug,
    nameEn: cat.nameEn,
    nameUr: cat.nameUr,
    nameAr: cat.nameAr,
    descEn: cat.descEn ?? '',
    descUr: cat.descUr ?? '',
    descAr: cat.descAr ?? '',
    image: cat.image ?? undefined,
    bannerImage: cat.bannerImage ?? undefined,
    parentId: cat.parentId ?? '',
    featured: cat.featured,
    isActive: cat.isActive,
    seoTitleEn: cat.seoTitleEn ?? '',
    seoTitleUr: cat.seoTitleUr ?? '',
    seoTitleAr: cat.seoTitleAr ?? '',
    seoDescEn: cat.seoDescEn ?? '',
    seoDescUr: cat.seoDescUr ?? '',
    seoDescAr: cat.seoDescAr ?? '',
  }
}

interface CategoryFormDialogProps {
  open: boolean
  /** Present when editing; omit to create. */
  category?: Category
  /** Pre-selected parent when opened via "Add child". Ignored when editing. */
  defaultParentId?: string | null
  /** Full tree — used to build the parent picker and to exclude the edited category's own subtree. */
  tree: Category[]
  onClose: () => void
}

export function CategoryFormDialog({
  open,
  category,
  defaultParentId,
  tree,
  onClose,
}: CategoryFormDialogProps) {
  const { toast } = useToast()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const isEdit = !!category

  const [tab, setTab] = React.useState<Tab>('basics')
  const [values, setValues] = React.useState<FormState>(() =>
    category ? fromCategory(category) : blank(defaultParentId),
  )
  const [slugTouched, setSlugTouched] = React.useState(isEdit)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    setTab('basics')
    setErrors({})
    setValues(category ? fromCategory(category) : blank(defaultParentId))
    setSlugTouched(!!category)
    // Re-seed only when the dialog opens for a (possibly different) target —
    // not on every render, or a keystroke would reset itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id, defaultParentId])

  if (!open) return null

  const excluded = category ? descendantIds(tree, category.id) : new Set<string>()
  const parentOptions = flattenForPicker(tree).filter((opt) => !excluded.has(opt.id))

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

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
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug)) {
      next.slug = 'Lowercase letters, numbers and single hyphens only.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) setTab('basics')
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload: CategoryInput = {
      slug: values.slug,
      nameEn: values.nameEn.trim(),
      // Mirrors ProductForm: an untranslated string beats a failed save when
      // English is the only language staff have filled in yet.
      nameUr: values.nameUr.trim() || values.nameEn.trim(),
      nameAr: values.nameAr.trim() || values.nameEn.trim(),
      descEn: values.descEn.trim() || undefined,
      descUr: values.descUr.trim() || undefined,
      descAr: values.descAr.trim() || undefined,
      image: values.image,
      bannerImage: values.bannerImage,
      parentId: values.parentId || null,
      featured: values.featured,
      isActive: values.isActive,
      seoTitleEn: values.seoTitleEn.trim() || undefined,
      seoTitleUr: values.seoTitleUr.trim() || undefined,
      seoTitleAr: values.seoTitleAr.trim() || undefined,
      seoDescEn: values.seoDescEn.trim() || undefined,
      seoDescUr: values.seoDescUr.trim() || undefined,
      seoDescAr: values.seoDescAr.trim() || undefined,
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: category.id, input: payload })
        toast(`"${payload.nameEn}" saved.`)
      } else {
        await create.mutateAsync(payload)
        toast(`"${payload.nameEn}" created.`)
      }
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save category.', 'error')
    }
  }

  const submitting = create.isPending || update.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit category' : 'New category'}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-ink">
            {isEdit ? `Edit "${category!.nameEn}"` : 'New category'}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink"
            aria-label="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex border-b border-line px-5">
          {(
            [
              ['basics', 'General'],
              ['translations', 'Translations'],
              ['seo', 'SEO'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                'px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px ' +
                (tab === key ? 'border-green text-green' : 'border-transparent text-ink-3 hover:text-ink')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {tab === 'basics' && (
              <>
                <FormField label="Name (English)" required error={errors.nameEn}>
                  <Input value={values.nameEn} onChange={(e) => handleNameEn(e.target.value)} placeholder="Ihram Sets" />
                </FormField>

                <FormField label="Slug" required error={errors.slug} hint="Used in the storefront URL — editable, but must stay unique">
                  <Input
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      set('slug', slugify(e.target.value))
                    }}
                    placeholder="ihram-sets"
                  />
                </FormField>

                <FormField label="Parent category" hint="Leave unset for a top-level category">
                  <Select value={values.parentId} onChange={(e) => set('parentId', e.target.value)}>
                    <option value="">— Top level —</option>
                    {parentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {'—'.repeat(opt.depth)} {opt.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <SingleImageUploader
                  label="Category image"
                  hint="Shown in the tree and on category cards"
                  value={values.image}
                  onChange={(url) => set('image', url)}
                  disabled={submitting}
                />

                <SingleImageUploader
                  label="Banner image"
                  hint="Wide header for the shop category page"
                  aspect="wide"
                  value={values.bannerImage}
                  onChange={(url) => set('bannerImage', url)}
                  disabled={submitting}
                />

                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <Checkbox
                    label="Featured"
                    checked={values.featured}
                    onChange={(e) => set('featured', e.target.checked)}
                  />
                  <Checkbox
                    label="Active (visible on storefront)"
                    checked={values.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                </div>
              </>
            )}

            {tab === 'translations' && (
              <>
                <p className="text-xs text-ink-3">
                  Urdu and Arabic fall back to the English value when left blank.
                </p>
                {LOCALE_KEYS.filter((k) => k !== 'En').map((key) => {
                  const fields = LOCALE_FIELDS[key]
                  return (
                    <div key={key} className="space-y-3 rounded-md border border-line p-3">
                      <p className="text-xs font-semibold text-ink-2">{fields.label}</p>
                      <FormField label={`Name (${fields.label})`}>
                        <Input
                          value={values[fields.name]}
                          onChange={(e) => set(fields.name, e.target.value)}
                          dir="rtl"
                        />
                      </FormField>
                      <FormField label={`Description (${fields.label})`}>
                        <Textarea
                          value={values[fields.desc]}
                          onChange={(e) => set(fields.desc, e.target.value)}
                          dir="rtl"
                          rows={3}
                        />
                      </FormField>
                    </div>
                  )
                })}
                <FormField label="Description (English)">
                  <Textarea value={values.descEn} onChange={(e) => set('descEn', e.target.value)} rows={3} />
                </FormField>
              </>
            )}

            {tab === 'seo' && (
              <>
                {LOCALE_KEYS.map((key) => {
                  const fields = LOCALE_FIELDS[key]
                  return (
                    <div key={key} className="space-y-3 rounded-md border border-line p-3">
                      <p className="text-xs font-semibold text-ink-2">{fields.label}</p>
                      <FormField label="SEO title" hint="Defaults to the category name">
                        <Input
                          value={values[fields.seoTitle]}
                          onChange={(e) => set(fields.seoTitle, e.target.value)}
                          maxLength={60}
                          dir={key === 'En' ? undefined : 'rtl'}
                        />
                      </FormField>
                      <FormField label="SEO description" hint="Aim for under 160 characters">
                        <Textarea
                          value={values[fields.seoDesc]}
                          onChange={(e) => set(fields.seoDesc, e.target.value)}
                          maxLength={320}
                          rows={2}
                          dir={key === 'En' ? undefined : 'rtl'}
                        />
                      </FormField>
                    </div>
                  )
                })}

                {/* Google search preview — English only, since it's what the storefront's default locale ships. */}
                <div className="rounded-md border border-line p-3">
                  <p className="text-xs font-semibold text-ink-2 mb-2">Search preview</p>
                  <p className="text-[13px] text-[#1a0dab] truncate">
                    {values.seoTitleEn.trim() || values.nameEn.trim() || 'Category name'}
                  </p>
                  <p className="text-xs text-[#006621]">yalahaji.com › shop › {values.slug || 'category-slug'}</p>
                  <p className="text-xs text-ink-3 line-clamp-2">
                    {values.seoDescEn.trim() || 'A description will show here once written.'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
