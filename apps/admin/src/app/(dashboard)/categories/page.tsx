'use client'

import * as React from 'react'
import { Plus, Search } from 'lucide-react'
import {
  useAdminCategoryTree,
  useDeleteCategory,
  useUpdateCategory,
  useBulkCategoryAction,
} from '@/hooks/use-categories'
import { RequireRole } from '@/components/layout/auth-gate'
import { CategoryTree } from '@/components/categories/category-tree'
import { CategoryFormDialog } from '@/components/categories/category-form-dialog'
import { Panel, PageHeader, ErrorState } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { Category } from '@/types'

export default function CategoriesPage() {
  return (
    <RequireRole>
      <CategoriesScreen />
    </RequireRole>
  )
}

function CategoriesScreen() {
  const { toast } = useToast()
  const { data, isLoading, isError, error, refetch } = useAdminCategoryTree()
  const deleteCategory = useDeleteCategory()
  const updateCategory = useUpdateCategory()
  const bulkAction = useBulkCategoryAction()

  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')
  const [featuredOnly, setFeaturedOnly] = React.useState(false)

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [formState, setFormState] = React.useState<{
    open: boolean
    category?: Category
    defaultParentId?: string | null
  }>({ open: false })
  const [deleteTarget, setDeleteTarget] = React.useState<Category | null>(null)
  const [statusTarget, setStatusTarget] = React.useState<Category | null>(null)
  const [bulkConfirm, setBulkConfirm] = React.useState<'enable' | 'disable' | 'delete' | null>(null)

  const tree = data ?? []

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      toast(`"${deleteTarget.nameEn}" deleted.`)
      setDeleteTarget(null)
    } catch (err) {
      // The API refuses with a 409 and a specific reason (subcategories or
      // assigned products) — surface that message verbatim rather than a
      // generic failure, since it tells staff exactly what to do next.
      toast(err instanceof Error ? err.message : 'Could not delete category.', 'error')
    }
  }

  async function handleToggleStatus() {
    if (!statusTarget) return
    const next = !statusTarget.isActive
    try {
      await updateCategory.mutateAsync({ id: statusTarget.id, input: { isActive: next } })
      toast(`"${statusTarget.nameEn}" ${next ? 'enabled' : 'disabled'}.`)
      setStatusTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update status.', 'error')
    }
  }

  async function handleBulk(action: 'enable' | 'disable' | 'delete') {
    try {
      const result = await bulkAction.mutateAsync({ ids: Array.from(selectedIds), action })
      setSelectedIds(new Set())
      setBulkConfirm(null)
      if (result.skipped.length === 0) {
        toast(`${result.updated} categor${result.updated === 1 ? 'y' : 'ies'} updated.`)
      } else {
        toast(
          `${result.updated} updated, ${result.skipped.length} skipped (${result.skipped
            .map((s) => `${s.name}: ${s.reason}`)
            .join('; ')}).`,
          result.updated > 0 ? 'success' : 'error',
        )
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk action failed.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="The catalogue taxonomy — nest, reorder and publish."
        action={
          <Button onClick={() => setFormState({ open: true })}>
            <Plus className="h-4 w-4" />
            New category
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search categories"
            />
          </div>

          <Select
            className="w-auto min-w-[130px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </Select>

          <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-line text-green accent-green cursor-pointer"
            />
            Featured only
          </label>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-line bg-green-tint/40">
            <p className="text-xs font-semibold text-ink-2">{selectedIds.size} selected</p>
            <Button variant="outline" size="sm" onClick={() => setBulkConfirm('enable')}>
              Enable
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkConfirm('disable')}>
              Disable
            </Button>
            <Button variant="danger-outline" size="sm" onClick={() => setBulkConfirm('delete')}>
              Delete
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ms-auto text-xs font-semibold text-ink-3 hover:text-ink"
            >
              Clear selection
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-md bg-line/60" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load categories.'}
            onRetry={() => void refetch()}
          />
        ) : (
          <CategoryTree
            nodes={tree}
            searchTerm={debouncedSearch}
            statusFilter={statusFilter}
            featuredOnly={featuredOnly}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onEdit={(cat) => setFormState({ open: true, category: cat })}
            onAddChild={(parentId) => setFormState({ open: true, defaultParentId: parentId })}
            onDelete={setDeleteTarget}
            onToggleStatus={setStatusTarget}
          />
        )}
      </Panel>

      <CategoryFormDialog
        open={formState.open}
        category={formState.category}
        defaultParentId={formState.defaultParentId}
        tree={tree}
        onClose={() => setFormState({ open: false })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.nameEn}"?`}
        description="This is a soft delete — the category is hidden from the storefront. It's blocked while subcategories or products are still attached."
        confirmLabel="Delete"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.isActive ? `Disable "${statusTarget?.nameEn}"?` : `Enable "${statusTarget?.nameEn}"?`}
        description={
          statusTarget?.isActive
            ? 'It will disappear from the storefront immediately, along with any subcategories that inherit its visibility.'
            : 'It becomes visible on the storefront immediately, provided its own parent is active too.'
        }
        confirmLabel={statusTarget?.isActive ? 'Disable' : 'Enable'}
        destructive={statusTarget?.isActive}
        loading={updateCategory.isPending}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        title={
          bulkConfirm === 'delete'
            ? `Delete ${selectedIds.size} categories?`
            : bulkConfirm === 'enable'
              ? `Enable ${selectedIds.size} categories?`
              : `Disable ${selectedIds.size} categories?`
        }
        description={
          bulkConfirm === 'delete'
            ? 'Soft delete — any category in the selection that still has subcategories or assigned products is skipped, not force-removed.'
            : undefined
        }
        confirmLabel={bulkConfirm === 'delete' ? 'Delete' : bulkConfirm === 'enable' ? 'Enable' : 'Disable'}
        destructive={bulkConfirm === 'delete'}
        loading={bulkAction.isPending}
        onConfirm={() => bulkConfirm && void handleBulk(bulkConfirm)}
        onCancel={() => setBulkConfirm(null)}
      />
    </>
  )
}
