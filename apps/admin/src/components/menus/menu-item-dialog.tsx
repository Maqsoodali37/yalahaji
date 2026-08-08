'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, FormField, Input, Select, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useAdminCategoryTree } from '@/hooks/use-categories'
import { useCreateMenuItem, useUpdateMenuItem } from '@/hooks/use-menus'
import { SingleImageUploader } from '@/components/categories/single-image-uploader'
import type {
  Category,
  MegaConfig,
  MegaMenuLayout,
  MenuDevice,
  MenuItem,
  MenuItemInput,
  MenuLinkType,
  MenuVisibility,
} from '@/types'

// ─── Mirrors of the API's validation ─────────────────────────────────────────
//
// The **third** copy of this rule, alongside `apps/api/src/menus/menu-constants.ts`
// and `apps/storefront/src/lib/menu-constants.ts`. The two of those are pinned
// to each other by a spec on each side; this one is not, because the admin app
// has no test runner — so it is called out here instead. **Change one, change
// all three.**
//
// Both exclusions matter: `//evil.example` reads as a path and resolves to
// another host, and `/\evil.example` resolves identically because URL parsing
// normalises `\` to `/`.
const INTERNAL_PATH_REGEX = /^\/(?![/\\])[^\s]*$/
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_MENU_URL = 2048
/** `@MaxLength(191)` on every short text column, matching the VARCHAR width. */
const MAX_TEXT = 191

const LINK_TYPES: Array<{ value: MenuLinkType; label: string; hint: string }> = [
  { value: 'category', label: 'Category', hint: 'Opens /shop/<slug>' },
  { value: 'product', label: 'Product', hint: 'Opens /products/<slug>' },
  { value: 'cms_page', label: 'Page', hint: 'A top-level page like /about or /terms' },
  { value: 'brand', label: 'Brand', hint: 'Opens the catalogue filtered by brand' },
  { value: 'collection', label: 'Collection', hint: 'Opens the catalogue filtered by collection' },
  { value: 'custom', label: 'Custom path', hint: 'Any internal path, e.g. /kit-builder' },
  { value: 'external', label: 'External URL', hint: 'A full https:// link to another site' },
  { value: 'heading', label: 'Heading', hint: 'A label with children and no link of its own' },
]

const VISIBILITIES: Array<{ value: MenuVisibility; label: string }> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'guest', label: 'Signed-out visitors only' },
  { value: 'customer', label: 'Signed-in customers only' },
  { value: 'retail', label: 'Retail customers only' },
  { value: 'wholesale', label: 'Wholesale customers only' },
]

const DEVICES: Array<{ value: MenuDevice; label: string }> = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop only' },
  { value: 'mobile', label: 'Mobile only' },
]

const LAYOUTS: Array<{ value: MegaMenuLayout; label: string; hint: string }> = [
  { value: 'columns', label: 'Columns', hint: 'Child links spread across the columns' },
  { value: 'columns_with_banner', label: 'Columns + banner', hint: 'The last column holds a promo image' },
  { value: 'featured_grid', label: 'Featured grid', hint: 'Image-led tiles, one per child' },
  { value: 'columns_with_products', label: 'Columns + products', hint: 'A product strip along the bottom' },
]

/** Slug-routed types need a target; the other three do not. */
const SLUG_ROUTED: MenuLinkType[] = ['category', 'product', 'cms_page', 'brand', 'collection']

type Tab = 'general' | 'translations' | 'visibility' | 'seo' | 'mega'

interface FormState {
  titleEn: string
  titleUr: string
  titleAr: string
  linkType: MenuLinkType
  targetSlug: string
  url: string
  icon: string
  image: string
  badgeEn: string
  badgeUr: string
  badgeAr: string
  isActive: boolean
  visibility: MenuVisibility
  device: MenuDevice
  publishFrom: string
  publishUntil: string
  isMegaMenu: boolean
  megaLayout: MegaMenuLayout
  megaColumns: number
  megaConfigJson: string
  relAttribute: string
  noFollow: boolean
  openInNewTab: boolean
  titleAttrEn: string
  titleAttrUr: string
  titleAttrAr: string
}

/** `2026-08-07T12:00:00.000Z` → `2026-08-07T12:00`, which is what a datetime-local input wants. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * `null`, not `undefined`, for a cleared date.
 *
 * In a PATCH the API reads an omitted key as "leave alone" and `null` as
 * "clear it". Returning `undefined` here meant an admin could set a publish
 * window but never remove one — the item stayed scheduled forever, and
 * narrowing a window produced a validation error naming the field they had
 * just emptied.
 */
function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * True for the shape the API returns when a row has no panel content at all.
 *
 * `GET /menus/admin/:id/tree` normalises `megaConfig` for every row, mega or
 * not, so a plain link comes back as `{featuredCategorySlugs: [], …}` rather
 * than `null`. Pre-filling the JSON box with that would show panel content on
 * every ordinary link, and saving would write an empty object into its column.
 */
function isEmptyMegaConfig(config: MegaConfig | null | undefined): boolean {
  if (!config) return true
  return (
    (config.featuredCategorySlugs?.length ?? 0) === 0 &&
    (config.featuredProductSlugs?.length ?? 0) === 0 &&
    !config.banner &&
    (config.blocks?.length ?? 0) === 0
  )
}

function initialMegaJson(item: MenuItem | null): string {
  if (!item || isEmptyMegaConfig(item.megaConfig)) return ''
  return JSON.stringify(item.megaConfig, null, 2)
}

function initialState(item: MenuItem | null): FormState {
  return {
    titleEn: item?.title.en ?? '',
    titleUr: item?.title.ur ?? '',
    titleAr: item?.title.ar ?? '',
    linkType: item?.linkType ?? 'custom',
    targetSlug: item?.targetSlug ?? '',
    url: item?.url ?? '',
    icon: item?.icon ?? '',
    image: item?.image ?? '',
    badgeEn: item?.badge?.en ?? '',
    badgeUr: item?.badge?.ur ?? '',
    badgeAr: item?.badge?.ar ?? '',
    isActive: item?.isActive !== false,
    visibility: item?.visibility ?? 'everyone',
    device: item?.device ?? 'all',
    publishFrom: toLocalInput(item?.publishFrom),
    publishUntil: toLocalInput(item?.publishUntil),
    isMegaMenu: item?.isMegaMenu ?? false,
    megaLayout: item?.megaLayout ?? 'columns',
    megaColumns: item?.megaColumns ?? 4,
    megaConfigJson: initialMegaJson(item),
    relAttribute: item?.relAttribute ?? '',
    noFollow: item?.noFollow ?? false,
    openInNewTab: item?.openInNewTab ?? false,
    titleAttrEn: item?.titleAttr?.en ?? '',
    titleAttrUr: item?.titleAttr?.ur ?? '',
    titleAttrAr: item?.titleAttr?.ar ?? '',
  }
}

function flattenCategories(nodes: Category[], depth = 0): Array<{ slug: string; label: string }> {
  return nodes.flatMap((node) => [
    {
      slug: node.slug,
      // U+00A0, not an ordinary space — browsers collapse runs of normal
      // whitespace inside an <option>, so the depth indent would vanish.
      //
      // Disabled categories are listed rather than hidden: an existing item
      // may already point at one, and dropping it from the picker would make
      // a valid target render as unset. Marked, so that now the picker reads
      // the admin tree rather than the public one, nobody selects a hidden
      // category by accident.
      label: `${'  '.repeat(depth)}${node.nameEn}${node.isActive ? '' : ' (disabled)'}`,
    },
    ...flattenCategories(node.children ?? [], depth + 1),
  ])
}

interface Props {
  menuId: string
  /** The item being edited, or null when creating. */
  item: MenuItem | null
  /** Parent for a new item. Ignored when editing — moving is a drag, not a form field. */
  parentId: string | null
  onClose: () => void
}

export function MenuItemDialog({ menuId, item, parentId, onClose }: Props) {
  const { toast } = useToast()
  const isEdit = !!item
  const create = useCreateMenuItem()
  const update = useUpdateMenuItem()
  // The ADMIN tree, not the public one. `useCategories()` returns active
  // categories only, so an item pointing at a deactivated category would have
  // a slug that is not among the options — the controlled <select> would
  // render as if nothing were chosen, even though the value is intact.
  const categories = useAdminCategoryTree()

  const [tab, setTab] = React.useState<Tab>('general')
  const [values, setValues] = React.useState<FormState>(() => initialState(item))
  /** The panel JSON as loaded, so an untouched config is never re-sent. */
  const initialMegaRef = React.useRef(initialMegaJson(item))
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
  // Errors appear on first submit, then live-validate as the field is corrected
  // — the pattern the storefront forms already use.
  const [submitted, setSubmitted] = React.useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const categoryOptions = React.useMemo(
    () => flattenCategories(categories.data ?? []),
    [categories.data],
  )

  const validate = React.useCallback((v: FormState): Partial<Record<keyof FormState, string>> => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (!v.titleEn.trim()) next.titleEn = 'An English title is required.'
    // Mirrors `@MaxLength(191)` on the DTO. Without it an over-long title
    // round-trips to the API and comes back as a raw error toast, after the
    // save appeared to be in progress.
    else if (v.titleEn.trim().length > MAX_TEXT) next.titleEn = `Keep the title under ${MAX_TEXT} characters.`

    // Every field the DTO caps at 191, not just the English title. Checking
    // three of twelve left the other nine round-tripping to a raw API error
    // toast — the exact failure this validation exists to prevent, and
    // sharpest on titleUr/titleAr, which are the same field in another locale.
    const CAPPED: Array<[keyof FormState, string]> = [
      ['titleUr', 'Urdu title'],
      ['titleAr', 'Arabic title'],
      ['icon', 'icon name'],
      ['image', 'image URL'],
      ['badgeEn', 'badge'],
      ['badgeUr', 'Urdu badge'],
      ['badgeAr', 'Arabic badge'],
      ['relAttribute', 'rel value'],
      ['titleAttrEn', 'title attribute'],
      ['titleAttrUr', 'Urdu title attribute'],
      ['titleAttrAr', 'Arabic title attribute'],
    ]
    for (const [key, label] of CAPPED) {
      const value = v[key]
      if (typeof value === 'string' && value.trim().length > MAX_TEXT) {
        next[key] = `Keep the ${label} under ${MAX_TEXT} characters.`
      }
    }
    if (v.megaColumns < 1 || v.megaColumns > 6) next.megaColumns = 'Columns must be between 1 and 6.'

    if (SLUG_ROUTED.includes(v.linkType)) {
      if (!v.targetSlug.trim()) next.targetSlug = 'Pick or enter the target slug.'
      else if (!SLUG_REGEX.test(v.targetSlug.trim())) {
        next.targetSlug = 'Slugs are lowercase words separated by hyphens.'
      }
    } else if (v.linkType === 'custom') {
      if (!v.url.trim()) next.url = 'A custom link needs an internal path.'
      else if (!INTERNAL_PATH_REGEX.test(v.url.trim())) {
        next.url = 'Must be an internal path starting with a single "/" — use External for another site.'
      }
    } else if (v.linkType === 'external') {
      if (!v.url.trim()) next.url = 'An external link needs a URL.'
      else if (!/^https?:\/\/[^\s]+$/i.test(v.url.trim())) {
        next.url = 'Must be a full http(s) URL.'
      }
    }
    if (v.url.length > MAX_MENU_URL) next.url = `Links are limited to ${MAX_MENU_URL} characters.`

    // A window that closes before it opens hides the item forever, silently.
    if (v.publishFrom && v.publishUntil && new Date(v.publishFrom) >= new Date(v.publishUntil)) {
      next.publishUntil = '"Publish until" must be after "Publish from".'
    }

    if (v.megaConfigJson.trim()) {
      try {
        const parsed: unknown = JSON.parse(v.megaConfigJson)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          next.megaConfigJson = 'Panel content must be a JSON object.'
        }
      } catch {
        next.megaConfigJson = 'Panel content is not valid JSON.'
      }
    }

    return next
  }, [])

  React.useEffect(() => {
    if (submitted) setErrors(validate(values))
  }, [values, submitted, validate])

  /** Which tab holds the first failing field, so submitting does not fail silently on a hidden one. */
  function tabForError(errs: Partial<Record<keyof FormState, string>>): Tab {
    if (errs.titleEn || errs.targetSlug || errs.url || errs.icon || errs.image || errs.badgeEn) {
      return 'general'
    }
    // Without these two branches a too-long Urdu title fell through to
    // 'general', where its message is not rendered — the form refused to
    // submit and showed nothing to explain why.
    if (errs.titleUr || errs.titleAr || errs.badgeUr || errs.badgeAr) return 'translations'
    if (errs.relAttribute || errs.titleAttrEn || errs.titleAttrUr || errs.titleAttrAr) return 'seo'
    if (errs.publishUntil) return 'visibility'
    if (errs.megaConfigJson || errs.megaColumns) return 'mega'
    return 'general'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setTab(tabForError(found))
      return
    }

    // `null` for a cleared field, NOT `undefined`.
    //
    // This is the whole reason `MenuItemInput` is nullable. `JSON.stringify`
    // drops an `undefined` value, so the key never reaches the API, and the
    // API reads an absent key as "leave this alone". Mapping a cleared input
    // to `undefined` therefore made fifteen fields set-once: the uploader's
    // Remove button did nothing on save, an expired item could never be
    // un-scheduled, and a wrong Urdu title was permanent.
    const blank = (v: string) => (v.trim() ? v.trim() : null)

    const payload: MenuItemInput = {
      titleEn: values.titleEn.trim(),
      titleUr: blank(values.titleUr),
      titleAr: blank(values.titleAr),
      linkType: values.linkType,
      // The two target fields are cleared when they do not apply to the chosen
      // link type, so switching a category link to an external one does not
      // leave a stale slug behind for whoever reads the row next.
      targetSlug: SLUG_ROUTED.includes(values.linkType) ? values.targetSlug.trim() : null,
      url:
        values.linkType === 'custom' || values.linkType === 'external'
          ? values.url.trim()
          : null,
      icon: blank(values.icon),
      image: blank(values.image),
      badgeEn: blank(values.badgeEn),
      badgeUr: blank(values.badgeUr),
      badgeAr: blank(values.badgeAr),
      isActive: values.isActive,
      visibility: values.visibility,
      device: values.device,
      publishFrom: fromLocalInput(values.publishFrom),
      publishUntil: fromLocalInput(values.publishUntil),
      isMegaMenu: values.isMegaMenu,
      megaLayout: values.isMegaMenu ? values.megaLayout : null,
      megaColumns: values.megaColumns,
      relAttribute: blank(values.relAttribute),
      noFollow: values.noFollow,
      openInNewTab: values.openInNewTab,
      titleAttrEn: blank(values.titleAttrEn),
      titleAttrUr: blank(values.titleAttrUr),
      titleAttrAr: blank(values.titleAttrAr),
    }

    // The panel config is sent ONLY when the admin actually edited it.
    //
    // The API normalises on read — it caps featured-slug lists at 24 and drops
    // keys it does not recognise — so re-sending an untouched config would
    // write the normalised version back and permanently lose whatever was
    // trimmed. Comparing against the text this dialog opened with means an
    // untouched panel is left exactly as it was stored.
    if (values.megaConfigJson.trim() !== initialMegaRef.current.trim()) {
      payload.megaConfig = values.megaConfigJson.trim()
        ? (JSON.parse(values.megaConfigJson) as MegaConfig)
        : null
    }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: item!.id, input: payload })
        toast('Menu item updated. The storefront cache has been refreshed.')
      } else {
        await create.mutateAsync({ ...payload, menuId, parentId })
        toast('Menu item added.')
      }
      onClose()
    } catch (err) {
      // Surfaced, never swallowed — a rejected save must reach the person who
      // made it. The API's message is more specific than anything generic here.
      toast(err instanceof Error ? err.message : 'Could not save the menu item.', 'error')
    }
  }

  const saving = create.isPending || update.isPending
  const needsSlug = SLUG_ROUTED.includes(values.linkType)
  const needsUrl = values.linkType === 'custom' || values.linkType === 'external'
  const linkHint = LINK_TYPES.find((t) => t.value === values.linkType)?.hint

  const TABS: Array<[Tab, string]> = [
    ['general', 'General'],
    ['translations', 'Translations'],
    ['visibility', 'Visibility'],
    ['seo', 'SEO'],
    ['mega', 'Mega panel'],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit menu item' : 'New menu item'}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-ink">
            {isEdit ? `Edit "${item!.title.en}"` : parentId ? 'New child item' : 'New menu item'}
          </h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close" type="button">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex border-b border-line px-5 overflow-x-auto">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                'whitespace-nowrap px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ' +
                (tab === key
                  ? 'border-green text-green'
                  : 'border-transparent text-ink-3 hover:text-ink')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'general' && (
            <>
              <FormField label="Title (English)" required error={errors.titleEn}>
                <Input
                  value={values.titleEn}
                  onChange={(e) => set('titleEn', e.target.value)}
                  placeholder="Ihram"
                />
              </FormField>

              <FormField label="Link type" hint={linkHint}>
                <Select
                  value={values.linkType}
                  onChange={(e) => set('linkType', e.target.value as MenuLinkType)}
                >
                  {LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              {needsSlug && values.linkType === 'category' && (
                <FormField
                  label="Category"
                  required
                  error={errors.targetSlug}
                  hint="The list is indented by depth — a subcategory is a valid target."
                >
                  <Select
                    value={values.targetSlug}
                    onChange={(e) => set('targetSlug', e.target.value)}
                  >
                    <option value="">Select a category…</option>
                    {categoryOptions.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              {needsSlug && values.linkType !== 'category' && (
                <FormField
                  label="Target slug"
                  required
                  error={errors.targetSlug}
                  hint="Lowercase words separated by hyphens, e.g. attar-oud."
                >
                  <Input
                    value={values.targetSlug}
                    onChange={(e) => set('targetSlug', e.target.value)}
                    placeholder="attar-oud"
                  />
                </FormField>
              )}

              {needsUrl && (
                <FormField
                  label={values.linkType === 'external' ? 'URL' : 'Path'}
                  required
                  error={errors.url}
                  hint={
                    values.linkType === 'external'
                      ? 'Must include https://. Opens off-site.'
                      : 'Starts with a single "/". A query string is fine: /shop?filter=sale'
                  }
                >
                  <Input
                    value={values.url}
                    onChange={(e) => set('url', e.target.value)}
                    placeholder={values.linkType === 'external' ? 'https://example.com' : '/kit-builder'}
                  />
                </FormField>
              )}

              {values.linkType === 'heading' && (
                <p className="rounded-md bg-paper px-3 py-2 text-xs text-ink-3">
                  A heading renders as a label, not a link — use it for a footer column title or a
                  dropdown group. Add child items under it; a heading with nothing beneath it is
                  not rendered at all.
                </p>
              )}

              <FormField
                label="Icon"
                error={errors.icon}
                hint="A Lucide icon name from the storefront allowlist, e.g. Package, Sparkles, Gift. An unrecognised name renders no icon."
              >
                <Input
                  value={values.icon}
                  onChange={(e) => set('icon', e.target.value)}
                  placeholder="Package"
                />
              </FormField>

              {/* The uploader renders its own label, so it is not wrapped in a
                  FormField — doing so would emit two labels for one control. */}
              <SingleImageUploader
                label="Image"
                hint="Shown in image-led mega layouts and beside the label in some themes."
                value={values.image}
                onChange={(url) => set('image', url ?? '')}
              />

              <FormField
                label="Badge (English)"
                error={errors.badgeEn}
                hint='A pill beside the label, e.g. "Sale". Also what gives a header link its accent styling.'
              >
                <Input
                  value={values.badgeEn}
                  onChange={(e) => set('badgeEn', e.target.value)}
                  placeholder="Sale"
                />
              </FormField>

              <Checkbox
                label="Active"
                checked={values.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
            </>
          )}

          {tab === 'translations' && (
            <>
              <p className="rounded-md bg-paper px-3 py-2 text-xs text-ink-3">
                Leave a field blank to fall back to English. A missing translation renders the
                English text, never an empty label.
              </p>
              <FormField label="Title (Urdu)" error={errors.titleUr}>
                <Input value={values.titleUr} onChange={(e) => set('titleUr', e.target.value)} dir="rtl" />
              </FormField>
              <FormField label="Title (Arabic)" error={errors.titleAr}>
                <Input value={values.titleAr} onChange={(e) => set('titleAr', e.target.value)} dir="rtl" />
              </FormField>
              <FormField label="Badge (Urdu)" error={errors.badgeUr}>
                <Input value={values.badgeUr} onChange={(e) => set('badgeUr', e.target.value)} dir="rtl" />
              </FormField>
              <FormField label="Badge (Arabic)" error={errors.badgeAr}>
                <Input value={values.badgeAr} onChange={(e) => set('badgeAr', e.target.value)} dir="rtl" />
              </FormField>
            </>
          )}

          {tab === 'visibility' && (
            <>
              <FormField
                label="Who can see this"
                hint="Checked against the signed-in account on the server — not something a visitor can change from the URL."
              >
                <Select
                  value={values.visibility}
                  onChange={(e) => set('visibility', e.target.value as MenuVisibility)}
                >
                  {VISIBILITIES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Device"
                hint="A layout rule, not an access rule — a desktop-only item is still in the page source. Use Visibility to gate access."
              >
                <Select value={values.device} onChange={(e) => set('device', e.target.value as MenuDevice)}>
                  {DEVICES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Publish from"
                hint="Leave blank to publish immediately. The item appears and disappears on its own — nobody has to be awake at the boundary."
              >
                <Input
                  type="datetime-local"
                  value={values.publishFrom}
                  onChange={(e) => set('publishFrom', e.target.value)}
                />
              </FormField>

              <FormField label="Publish until" error={errors.publishUntil} hint="Leave blank for no end date.">
                <Input
                  type="datetime-local"
                  value={values.publishUntil}
                  onChange={(e) => set('publishUntil', e.target.value)}
                />
              </FormField>
            </>
          )}

          {tab === 'seo' && (
            <>
              <Checkbox
                label="Add rel=&quot;nofollow&quot;"
                checked={values.noFollow}
                onChange={(e) => set('noFollow', e.target.checked)}
              />
              <Checkbox
                label="Open in a new tab"
                checked={values.openInNewTab}
                onChange={(e) => set('openInNewTab', e.target.checked)}
              />
              {values.openInNewTab && values.linkType === 'external' && (
                <p className="rounded-md bg-paper px-3 py-2 text-xs text-ink-3">
                  rel=&quot;noopener noreferrer&quot; is added automatically for external links
                  opening in a new tab — without it the opened page can navigate this one.
                </p>
              )}
              <FormField
                label="Extra rel tokens"
                error={errors.relAttribute}
                hint='Space-separated, e.g. "sponsored". nofollow and noopener are added by the API — do not repeat them.'
              >
                <Input
                  value={values.relAttribute}
                  onChange={(e) => set('relAttribute', e.target.value)}
                  placeholder="sponsored"
                />
              </FormField>
              <FormField label="Title attribute (English)" error={errors.titleAttrEn} hint="Tooltip text on the link.">
                <Input value={values.titleAttrEn} onChange={(e) => set('titleAttrEn', e.target.value)} />
              </FormField>
              <FormField label="Title attribute (Urdu)" error={errors.titleAttrUr}>
                <Input value={values.titleAttrUr} onChange={(e) => set('titleAttrUr', e.target.value)} dir="rtl" />
              </FormField>
              <FormField label="Title attribute (Arabic)" error={errors.titleAttrAr}>
                <Input value={values.titleAttrAr} onChange={(e) => set('titleAttrAr', e.target.value)} dir="rtl" />
              </FormField>
            </>
          )}

          {tab === 'mega' && (
            <>
              <Checkbox
                label="Render as a mega menu"
                checked={values.isMegaMenu}
                onChange={(e) => set('isMegaMenu', e.target.checked)}
              />
              <p className="rounded-md bg-paper px-3 py-2 text-xs text-ink-3">
                Only meaningful on a top-level header item. A mega menu with no children and no
                panel content falls back to an ordinary link rather than opening an empty box.
              </p>

              <FormField
                label="Layout"
                hint={LAYOUTS.find((l) => l.value === values.megaLayout)?.hint}
              >
                <Select
                  value={values.megaLayout}
                  onChange={(e) => set('megaLayout', e.target.value as MegaMenuLayout)}
                  disabled={!values.isMegaMenu}
                >
                  {LAYOUTS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Columns"
                error={errors.megaColumns}
                hint="1–6. The panel width follows the column count."
              >
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={values.megaColumns}
                  // Clamped at the source, not just validated. Left unclamped, an admin could
                  // type 7, switch the mega flag off, and be sent to a tab showing an error
                  // under an input the same form had just disabled.
                  onChange={(e) =>
                    set('megaColumns', Math.min(6, Math.max(1, Number(e.target.value) || 4)))
                  }
                  disabled={!values.isMegaMenu}
                />
              </FormField>

              <FormField
                label="Panel content (JSON)"
                error={errors.megaConfigJson}
                hint="Featured slugs, a banner and custom blocks. Anything the storefront does not recognise is ignored rather than breaking the menu."
              >
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  value={values.megaConfigJson}
                  onChange={(e) => set('megaConfigJson', e.target.value)}
                  placeholder={PANEL_PLACEHOLDER}
                  disabled={!values.isMegaMenu}
                />
              </FormField>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            {isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </footer>
      </form>
    </div>
  )
}

const PANEL_PLACEHOLDER = `{
  "featuredProductSlugs": ["ihram-premium"],
  "banner": {
    "image": "https://…/eid.webp",
    "href": "/shop?filter=sale",
    "heading": { "en": "Eid offers", "ur": "عید آفرز" }
  }
}`
