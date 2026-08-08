'use client'

import * as React from 'react'
import { Plus, Search, RefreshCw, ListTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input, Select } from '@/components/ui/field'
import { ErrorState, PageHeader, Panel, PanelHeader, TableSkeleton } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { RequireRole } from '@/components/layout/auth-gate'
import { MenuTree } from '@/components/menus/menu-tree'
import { MenuItemDialog } from '@/components/menus/menu-item-dialog'
import {
  useCreateMenu,
  useDeleteMenuItem,
  useMenus,
  useMenuTree,
  usePublishMenus,
  useUpdateMenu,
} from '@/hooks/use-menus'
import type { MenuItem, MenuLocation, Role } from '@/types'

const MANAGE_ROLES: Role[] = ['admin', 'manager']

/**
 * Every location the storefront reads, whether or not a menu row exists yet.
 *
 * Listed here rather than derived from the API response so a location with no
 * menu is still offered — otherwise the only way to create the first sidebar
 * menu would be a POST by hand, which is the gap this screen exists to close.
 */
const LOCATIONS: Array<{ value: MenuLocation; label: string; description: string }> = [
  { value: 'header', label: 'Header', description: 'The main desktop navigation row.' },
  {
    value: 'mobile',
    label: 'Mobile drawer',
    description: 'The tree inside the mobile menu. Falls back to the header menu when empty.',
  },
  {
    value: 'footer',
    label: 'Footer',
    description: 'Top-level items are columns; their children are the links.',
  },
  {
    value: 'sidebar',
    label: 'Sidebar',
    description: 'Optional. Renders above the shop filters; nothing shows if no menu exists.',
  },
  {
    value: 'mega',
    label: 'Mega',
    description:
      'Reserved. A mega panel comes from a header item’s own flag, not from this location.',
  },
]

export default function MenusPage() {
  return (
    <RequireRole roles={MANAGE_ROLES}>
      <MenusScreen />
    </RequireRole>
  )
}

function MenusScreen() {
  const { toast } = useToast()
  const menus = useMenus()
  const createMenu = useCreateMenu()
  const updateMenu = useUpdateMenu()
  const publish = usePublishMenus()
  const deleteItem = useDeleteMenuItem()

  const [location, setLocation] = React.useState<MenuLocation>('header')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')

  const [dialog, setDialog] = React.useState<{ item: MenuItem | null; parentId: string | null } | null>(
    null,
  )
  const [pendingDelete, setPendingDelete] = React.useState<MenuItem | null>(null)

  const current = menus.data?.find((m) => m.location === location)
  const tree = useMenuTree(current?.id)
  const meta = LOCATIONS.find((l) => l.value === location)!

  async function handleCreateMenu() {
    try {
      await createMenu.mutateAsync({ location, name: `${meta.label} navigation` })
      toast(`${meta.label} menu created. Add its first item to start.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create the menu.', 'error')
    }
  }

  async function handleToggleMenu() {
    if (!current) return
    try {
      await updateMenu.mutateAsync({ id: current.id, input: { isActive: !current.isActive } })
      toast(
        current.isActive
          ? `${meta.label} menu switched off — the storefront falls back for this location.`
          : `${meta.label} menu switched on.`,
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the menu.', 'error')
    }
  }

  async function handlePublish() {
    try {
      await publish.mutateAsync()
      toast('Caches cleared. Changes are live on the storefront.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not clear the caches.', 'error')
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      const { deleted } = await deleteItem.mutateAsync(pendingDelete.id)
      toast(
        deleted > 1
          ? `Deleted "${pendingDelete.title.en}" and ${deleted - 1} item${deleted - 1 === 1 ? '' : 's'} beneath it.`
          : `Deleted "${pendingDelete.title.en}".`,
      )
      setPendingDelete(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete the item.', 'error')
    }
  }

  const childCount = pendingDelete ? countDescendants(pendingDelete) : 0

  return (
    <>
      <PageHeader
        title="Menus"
        description="Every navigation menu on the storefront. Drag to reorder or nest; changes go live as soon as they save."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublish}
            loading={publish.isPending}
            title="Every save already clears the caches. Use this if a change has not appeared."
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Clear caches
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {LOCATIONS.map((l) => {
          const menu = menus.data?.find((m) => m.location === l.value)
          const active = location === l.value
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => setLocation(l.value)}
              aria-current={active ? 'true' : undefined}
              className={
                'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ' +
                (active
                  ? 'border-green bg-green-tint text-green'
                  : 'border-line bg-white text-ink-2 hover:bg-paper')
              }
            >
              {l.label}
              <span className="ms-1.5 text-ink-3">{menu ? (menu.itemCount ?? 0) : '–'}</span>
            </button>
          )
        })}
      </div>

      <Panel>
        <PanelHeader
          title={`${meta.label} menu`}
          description={meta.description}
          action={
            current ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleMenu}
                  loading={updateMenu.isPending}
                >
                  {current.isActive ? 'Switch off' : 'Switch on'}
                </Button>
                <Button size="sm" onClick={() => setDialog({ item: null, parentId: null })}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add item
                </Button>
              </div>
            ) : undefined
          }
        />

        {menus.isPending ? (
          <TableSkeleton rows={5} cols={3} />
        ) : menus.isError ? (
          <ErrorState
            message={menus.error instanceof Error ? menus.error.message : 'Could not load menus.'}
            onRetry={() => void menus.refetch()}
          />
        ) : !current ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <ListTree className="h-7 w-7 text-ink-3 mb-3" aria-hidden />
            <h3 className="text-sm font-semibold text-ink">
              No {meta.label.toLowerCase()} menu yet
            </h3>
            <p className="text-sm text-ink-3 mt-1 max-w-sm">{meta.description}</p>
            <Button size="sm" className="mt-4" onClick={handleCreateMenu} loading={createMenu.isPending}>
              Create the {meta.label.toLowerCase()} menu
            </Button>
          </div>
        ) : (
          <>
            {!current.isActive && (
              <p className="border-b border-line bg-paper px-5 py-2.5 text-xs text-ink-2">
                This menu is switched off. The storefront ignores it entirely and falls back for this
                location — items below still save, they just do not render.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                  aria-hidden
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search titles, slugs and links…"
                  className="ps-8"
                  aria-label="Search menu items"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-auto"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Switched off only</option>
              </Select>
            </div>

            {tree.isPending ? (
              <TableSkeleton rows={5} cols={3} />
            ) : tree.isError ? (
              <ErrorState
                message={
                  tree.error instanceof Error ? tree.error.message : 'Could not load the menu.'
                }
                onRetry={() => void tree.refetch()}
              />
            ) : (
              <MenuTree
                nodes={tree.data ?? []}
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onEdit={(item) => setDialog({ item, parentId: null })}
                onAddChild={(parentId) => setDialog({ item: null, parentId })}
                onDelete={(item) => setPendingDelete(item)}
              />
            )}
          </>
        )}
      </Panel>

      {dialog && current && (
        <MenuItemDialog
          // Remount per item. The dialog seeds its form state once, on mount —
          // correct today because the parent unmounts it on close, but a key
          // makes that independent of how the parent happens to be written.
          key={dialog.item?.id ?? `new-${dialog.parentId ?? 'root'}`}
          menuId={current.id}
          item={dialog.item}
          parentId={dialog.parentId}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title.en ?? ''}"?`}
        description={
          childCount > 0
            ? `This also deletes the ${childCount} item${childCount === 1 ? '' : 's'} nested beneath it. There is no undo.`
            : 'There is no undo.'
        }
        confirmLabel="Delete"
        destructive
        loading={deleteItem.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

/**
 * How many rows a delete will actually take.
 *
 * The API cascades on `parent_id`, so deleting a parent takes its whole
 * subtree. Saying so before the click is the difference between a considered
 * decision and a surprise — this dialog is the only place that consequence is
 * visible.
 */
function countDescendants(item: MenuItem): number {
  return (item.children ?? []).reduce((sum, child) => sum + 1 + countDescendants(child), 0)
}
