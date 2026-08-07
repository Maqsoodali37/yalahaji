'use client'

import * as React from 'react'
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  ImageOff,
  Pencil,
  Plus,
  Trash2,
  Power,
  PowerOff,
  GripVertical,
} from 'lucide-react'
import { Badge } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useReorderCategories } from '@/hooks/use-categories'
import { formatDate } from '@/lib/utils'
import type { Category, ReorderCategoryItem } from '@/types'

// ─── Pure tree helpers — all immutable, all operate on the nested `children` shape ───

function collectDescendants(node: Category, into: Set<string>) {
  into.add(node.id)
  for (const child of node.children ?? []) collectDescendants(child, into)
}

/** Every id in the subtree rooted at `id`, including `id` itself. */
function descendantIds(tree: Category[], id: string): Set<string> {
  const result = new Set<string>()
  function walk(nodes: Category[]): boolean {
    for (const node of nodes) {
      if (node.id === id) {
        collectDescendants(node, result)
        return true
      }
      if (walk(node.children ?? [])) return true
    }
    return false
  }
  walk(tree)
  return result
}

function findParentId(tree: Category[], id: string, current: string | null = null): string | null | undefined {
  for (const node of tree) {
    if (node.id === id) return current
    const found = findParentId(node.children ?? [], id, node.id)
    if (found !== undefined) return found
  }
  return undefined
}

function findSiblings(tree: Category[], parentId: string | null): Category[] {
  if (parentId === null) return tree
  function walk(nodes: Category[]): Category[] | null {
    for (const node of nodes) {
      if (node.id === parentId) return node.children ?? []
      const found = walk(node.children ?? [])
      if (found) return found
    }
    return null
  }
  return walk(tree) ?? []
}

function removeNode(tree: Category[], id: string): { tree: Category[]; removed: Category | null } {
  let removed: Category | null = null
  function walk(nodes: Category[]): Category[] {
    const kept: Category[] = []
    for (const node of nodes) {
      if (node.id === id) {
        removed = node
        continue
      }
      kept.push({ ...node, children: walk(node.children ?? []) })
    }
    return kept
  }
  const next = walk(tree)
  return { tree: next, removed }
}

function insertNode(tree: Category[], node: Category, parentId: string | null, index: number): Category[] {
  if (parentId === null) {
    const next = [...tree]
    next.splice(index, 0, node)
    return next
  }
  function walk(nodes: Category[]): Category[] {
    return nodes.map((n) => {
      if (n.id === parentId) {
        const children = [...(n.children ?? [])]
        children.splice(index, 0, node)
        return { ...n, children }
      }
      return { ...n, children: walk(n.children ?? []) }
    })
  }
  return walk(tree)
}

type DropPosition = 'before' | 'after' | 'inside'

/** Computes the new tree plus the reorder payload for every sibling group the move touches. */
function computeMove(
  tree: Category[],
  draggedId: string,
  targetId: string | null,
  position: DropPosition,
): { tree: Category[]; items: ReorderCategoryItem[] } | null {
  if (targetId === draggedId) return null
  if (targetId && descendantIds(tree, draggedId).has(targetId)) return null // can't drop into your own subtree

  const oldParentId = findParentId(tree, draggedId) ?? null
  const { tree: withoutDragged, removed } = removeNode(tree, draggedId)
  if (!removed) return null

  let newParentId: string | null
  let insertIndex: number

  if (targetId === null) {
    // The root drop zone — always append at the end of the top level.
    newParentId = null
    insertIndex = withoutDragged.length
  } else if (position === 'inside') {
    newParentId = targetId
    insertIndex = findSiblings(withoutDragged, targetId).length
  } else {
    newParentId = findParentId(withoutDragged, targetId) ?? null
    const siblings = findSiblings(withoutDragged, newParentId)
    const targetIndex = siblings.findIndex((s) => s.id === targetId)
    insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  }

  const newTree = insertNode(withoutDragged, { ...removed, parentId: newParentId }, newParentId, insertIndex)

  const items: ReorderCategoryItem[] = []
  const groups = new Set([oldParentId, newParentId])
  for (const groupParentId of groups) {
    findSiblings(newTree, groupParentId).forEach((node, index) => {
      items.push({ id: node.id, parentId: groupParentId, order: index })
    })
  }

  return { tree: newTree, items }
}

// ─── Component ────────────────────────────────────────────────

interface CategoryTreeProps {
  nodes: Category[]
  searchTerm: string
  statusFilter: 'all' | 'active' | 'inactive'
  featuredOnly: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (cat: Category) => void
  onAddChild: (parentId: string) => void
  onDelete: (cat: Category) => void
  onToggleStatus: (cat: Category) => void
}

/** Which nodes pass the search/status/featured filters, keeping a matching descendant's ancestors visible. */
function computeVisibility(
  nodes: Category[],
  searchTerm: string,
  statusFilter: 'all' | 'active' | 'inactive',
  featuredOnly: boolean,
): Set<string> {
  const term = searchTerm.trim().toLowerCase()
  const visible = new Set<string>()

  function ownMatch(node: Category): boolean {
    if (statusFilter === 'active' && !node.isActive) return false
    if (statusFilter === 'inactive' && node.isActive) return false
    if (featuredOnly && !node.featured) return false
    if (term && !node.nameEn.toLowerCase().includes(term) && !node.slug.toLowerCase().includes(term)) {
      return false
    }
    return true
  }

  function walk(node: Category): boolean {
    const childMatches = (node.children ?? []).map(walk)
    const isVisible = ownMatch(node) || childMatches.some(Boolean)
    if (isVisible) visible.add(node.id)
    return isVisible
  }

  nodes.forEach(walk)
  return visible
}

export function CategoryTree({
  nodes,
  searchTerm,
  statusFilter,
  featuredOnly,
  selectedIds,
  onToggleSelect,
  onEdit,
  onAddChild,
  onDelete,
  onToggleStatus,
}: CategoryTreeProps) {
  const { toast } = useToast()
  const reorder = useReorderCategories()

  const [tree, setTree] = React.useState(nodes)
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(nodes.map((n) => n.id)))
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<{ id: string | null; position: DropPosition } | null>(null)

  // Re-sync from the server whenever the query result changes — a rename, a
  // status toggle or another admin's edit all need to land here, not just
  // drag-and-drop's own optimistic write.
  React.useEffect(() => {
    setTree(nodes)
    setExpanded((prev) => {
      const next = new Set(prev)
      nodes.forEach((n) => next.add(n.id))
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes])

  const visible = React.useMemo(
    () => computeVisibility(tree, searchTerm, statusFilter, featuredOnly),
    [tree, searchTerm, statusFilter, featuredOnly],
  )
  const filtering = !!searchTerm.trim() || statusFilter !== 'all' || featuredOnly

  // The dragged node and everything under it — dropping on any of these would
  // nest a category inside its own descendant. Computed once per drag rather
  // than left for the API to reject, so hovering one shows "not allowed"
  // instead of accepting the drop and silently doing nothing.
  const blockedIds = React.useMemo(
    () => (draggingId ? descendantIds(tree, draggingId) : new Set<string>()),
    [tree, draggingId],
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function commitMove(targetId: string | null, position: DropPosition) {
    if (!draggingId) return
    const result = computeMove(tree, draggingId, targetId, position)
    setDraggingId(null)
    setDropTarget(null)
    if (!result) return // no-op move, or a move that would create a cycle

    const previous = tree
    setTree(result.tree) // optimistic — persists immediately, feels instant

    try {
      await reorder.mutateAsync(result.items)
    } catch (err) {
      setTree(previous) // rollback on failure
      toast(err instanceof Error ? err.message : 'Could not save the new order.', 'error')
    }
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <FolderTree className="h-7 w-7 text-ink-3 mb-3" aria-hidden />
        <h3 className="text-sm font-semibold text-ink">No categories yet</h3>
        <p className="text-sm text-ink-3 mt-1">Create your first category to start building the tree.</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      <ul>
        {tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            visible={visible}
            filtering={filtering}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            blockedIds={blockedIds}
            commitMove={commitMove}
          />
        ))}
      </ul>

      {/* Always-present root drop zone — the only way to promote a nested
          category back to the top level, or to reorder it past the last root row. */}
      <div
        onDragOver={(e) => {
          if (!draggingId) return
          e.preventDefault()
          setDropTarget({ id: null, position: 'after' })
        }}
        onDrop={(e) => {
          e.preventDefault()
          void commitMove(null, 'after')
        }}
        className={
          'mt-1 rounded-md border border-dashed px-3 py-2 text-center text-xs transition-colors ' +
          (draggingId
            ? dropTarget?.id === null
              ? 'border-green bg-green-tint text-green'
              : 'border-line text-ink-3'
            : 'hidden')
        }
      >
        Drop here to move to the top level
      </div>
    </div>
  )
}

interface TreeRowProps {
  node: Category
  depth: number
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  visible: Set<string>
  filtering: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (cat: Category) => void
  onAddChild: (parentId: string) => void
  onDelete: (cat: Category) => void
  onToggleStatus: (cat: Category) => void
  draggingId: string | null
  setDraggingId: (id: string | null) => void
  dropTarget: { id: string | null; position: DropPosition } | null
  setDropTarget: (v: { id: string | null; position: DropPosition } | null) => void
  blockedIds: Set<string>
  commitMove: (targetId: string | null, position: DropPosition) => void
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  visible,
  filtering,
  selectedIds,
  onToggleSelect,
  onEdit,
  onAddChild,
  onDelete,
  onToggleStatus,
  draggingId,
  setDraggingId,
  dropTarget,
  setDropTarget,
  blockedIds,
  commitMove,
}: TreeRowProps) {
  if (!visible.has(node.id)) return null

  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = filtering ? true : expanded.has(node.id)
  const isDragging = draggingId === node.id
  const isDropTarget = dropTarget?.id === node.id

  function handleDragOver(e: React.DragEvent) {
    // `blockedIds` is the dragged node plus every one of its descendants —
    // dropping on any of them would nest a category inside itself. Not
    // calling `preventDefault()` here is what makes the browser show a
    // "no-drop" cursor instead of accepting the drop.
    if (!draggingId || blockedIds.has(node.id)) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height
    const position: DropPosition = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'
    setDropTarget({ id: node.id, position })
  }

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          setDraggingId(node.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDraggingId(null)
          setDropTarget(null)
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => {
          if (isDropTarget) setDropTarget(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (dropTarget?.id === node.id) void commitMove(node.id, dropTarget.position)
        }}
        style={{ paddingInlineStart: `${depth * 22}px` }}
        className={
          'group flex items-center gap-2 rounded-md py-1.5 pe-2 border border-transparent ' +
          (isDragging ? 'opacity-40' : '') +
          (isDropTarget && dropTarget?.position === 'inside' ? ' bg-green-tint border-green' : '') +
          (isDropTarget && dropTarget?.position === 'before' ? ' border-t-2 border-t-green' : '') +
          (isDropTarget && dropTarget?.position === 'after' ? ' border-b-2 border-b-green' : '') +
          ' hover:bg-paper'
        }
      >
        <GripVertical className="h-3.5 w-3.5 text-ink-3 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" aria-hidden />

        <input
          type="checkbox"
          checked={selectedIds.has(node.id)}
          onChange={() => onToggleSelect(node.id)}
          className="h-3.5 w-3.5 rounded border-line text-green accent-green cursor-pointer shrink-0"
          aria-label={`Select ${node.nameEn}`}
        />

        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className="shrink-0 text-ink-3 disabled:opacity-0"
          disabled={!hasChildren}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="block h-4 w-4" />
          )}
        </button>

        {node.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.image} alt="" className="h-7 w-7 shrink-0 rounded border border-line object-cover" />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-paper">
            <ImageOff className="h-3.5 w-3.5 text-ink-3" aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="truncate text-sm font-semibold text-ink hover:text-green"
            >
              {node.nameEn}
            </button>
            {node.featured && <Badge className="bg-gold-tint text-gold-deep text-[10px]">Featured</Badge>}
            <Badge
              className={
                (node.isActive ? 'bg-green-light text-[#137A4C]' : 'bg-paper text-ink-3') + ' text-[10px]'
              }
            >
              {node.isActive ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <p className="truncate text-[11px] text-ink-3 font-mono">/{node.slug}</p>
        </div>

        <span className="hidden sm:inline text-[11px] text-ink-3 tabular-nums shrink-0" title="Products in this category">
          {node.productCount ?? 0} products
        </span>
        <span className="hidden md:inline text-[11px] text-ink-3 tabular-nums shrink-0" title="Sort order">
          #{node.order}
        </span>
        <span className="hidden lg:inline text-[11px] text-ink-3 shrink-0" title="Created">
          {node.createdAt ? formatDate(node.createdAt) : '—'}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Add child category under ${node.nameEn}`}
            onClick={() => onAddChild(node.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Edit ${node.nameEn}`} onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={node.isActive ? `Disable ${node.nameEn}` : `Enable ${node.nameEn}`}
            onClick={() => onToggleStatus(node)}
          >
            {node.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${node.nameEn}`} onClick={() => onDelete(node)}>
            <Trash2 className="h-3.5 w-3.5 text-alert" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              visible={visible}
              filtering={filtering}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              blockedIds={blockedIds}
              commitMove={commitMove}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
