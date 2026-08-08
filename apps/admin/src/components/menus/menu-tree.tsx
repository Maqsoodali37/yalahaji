'use client'

import * as React from 'react'
import {
  ChevronRight,
  ChevronDown,
  ListTree,
  Pencil,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  EyeOff,
  Clock,
  LayoutGrid,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { Badge } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import { useReorderMenuItems } from '@/hooks/use-menus'
import {
  computeMove,
  computeVisibility,
  describeTarget,
  descendantIds,
  scheduleState,
  type DropPosition,
} from './menu-tree-utils'
import type { MenuItem } from '@/types'

interface MenuTreeProps {
  nodes: MenuItem[]
  searchTerm: string
  statusFilter: 'all' | 'active' | 'inactive'
  onEdit: (item: MenuItem) => void
  onAddChild: (parentId: string) => void
  onDelete: (item: MenuItem) => void
}

export function MenuTree({
  nodes,
  searchTerm,
  statusFilter,
  onEdit,
  onAddChild,
  onDelete,
}: MenuTreeProps) {
  const { toast } = useToast()
  const reorder = useReorderMenuItems()

  const [tree, setTree] = React.useState(nodes)
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(nodes.map((n) => n.id)),
  )
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<{
    id: string | null
    position: DropPosition
  } | null>(null)

  // Re-sync whenever the query result changes. Drag-and-drop writes
  // optimistically into local state, but an edit through the dialog, a delete,
  // or another admin's change all arrive as a new `nodes` prop and have to
  // land here too.
  React.useEffect(() => {
    setTree(nodes)
    setExpanded((prev) => {
      const next = new Set(prev)
      nodes.forEach((n) => next.add(n.id))
      return next
    })
  }, [nodes])

  const visible = React.useMemo(
    () => computeVisibility(tree, searchTerm, statusFilter),
    [tree, searchTerm, statusFilter],
  )
  const filtering = !!searchTerm.trim() || statusFilter !== 'all'

  // The dragged node plus its whole subtree. Dropping on any of them would
  // nest an item inside its own descendant — computed once per drag so
  // hovering shows "not allowed" rather than the API rejecting it afterwards.
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
    if (!result) return // a no-op move, or one that would create a cycle

    const previous = tree
    setTree(result.tree) // optimistic — the drop should feel instant

    try {
      await reorder.mutateAsync(result.items)
    } catch (err) {
      setTree(previous)
      toast(err instanceof Error ? err.message : 'Could not save the new order.', 'error')
    }
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <ListTree className="h-7 w-7 text-ink-3 mb-3" aria-hidden />
        <h3 className="text-sm font-semibold text-ink">No items in this menu yet</h3>
        <p className="text-sm text-ink-3 mt-1 max-w-sm">
          Add the first item to start building the navigation. Until then the storefront falls
          back to a minimal Home / Contact nav for this location.
        </p>
      </div>
    )
  }

  // Filtered to nothing. Without this every row returns null and the panel is
  // a blank box with no explanation — indistinguishable from a menu that is
  // genuinely empty, which is a different problem with a different fix.
  if (visible.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        <h3 className="text-sm font-semibold text-ink">No items match</h3>
        <p className="text-sm text-ink-3 mt-1">
          {!searchTerm.trim()
            ? 'Nothing in this menu matches that status filter.'
            : statusFilter === 'all'
              ? 'Nothing in this menu matches that search.'
              : 'Nothing matches that search and status filter.'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-2">
      <ul>
        {tree.map((node) => (
          <MenuTreeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            visible={visible}
            filtering={filtering}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={onDelete}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            blockedIds={blockedIds}
            commitMove={commitMove}
          />
        ))}
      </ul>

      {/* The only way to promote a nested item back to the top level, or to
          drop it past the last root row. */}
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

interface RowProps {
  node: MenuItem
  depth: number
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  visible: Set<string>
  filtering: boolean
  onEdit: (item: MenuItem) => void
  onAddChild: (parentId: string) => void
  onDelete: (item: MenuItem) => void
  draggingId: string | null
  setDraggingId: (id: string | null) => void
  dropTarget: { id: string | null; position: DropPosition } | null
  setDropTarget: (v: { id: string | null; position: DropPosition } | null) => void
  blockedIds: Set<string>
  commitMove: (targetId: string | null, position: DropPosition) => void
}

function MenuTreeRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  visible,
  filtering,
  onEdit,
  onAddChild,
  onDelete,
  draggingId,
  setDraggingId,
  dropTarget,
  setDropTarget,
  blockedIds,
  commitMove,
}: RowProps) {
  if (!visible.has(node.id)) return null

  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = filtering ? true : expanded.has(node.id)
  const isDragging = draggingId === node.id
  const isDropTarget = dropTarget?.id === node.id
  const inactive = node.isActive === false
  const schedule = scheduleState(node)

  function handleDragOver(e: React.DragEvent) {
    // Not calling `preventDefault()` is what makes the browser show a no-drop
    // cursor — `blockedIds` is the dragged node plus every descendant.
    if (!draggingId || blockedIds.has(node.id)) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
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
          (isDragging ? 'opacity-40 ' : '') +
          (isDropTarget && dropTarget?.position === 'inside' ? 'bg-green-tint border-green ' : '') +
          (isDropTarget && dropTarget?.position === 'before' ? 'border-t-2 border-t-green ' : '') +
          (isDropTarget && dropTarget?.position === 'after' ? 'border-b-2 border-b-green ' : '') +
          'hover:bg-paper'
        }
      >
        <GripVertical
          className="h-3.5 w-3.5 text-ink-3 opacity-0 group-hover:opacity-100 cursor-grab shrink-0"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className="shrink-0 text-ink-3 disabled:opacity-0"
          disabled={!hasChildren}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="block h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(node)}
              className={
                'truncate text-sm font-semibold hover:text-green ' +
                (inactive ? 'text-ink-3 line-through' : 'text-ink')
              }
            >
              {node.title.en}
            </button>

            {node.linkType === 'heading' && <Badge className="bg-paper text-ink-3">Heading</Badge>}
            {node.isMegaMenu && (
              <Badge className="bg-paper text-ink-3">
                <LayoutGrid className="h-3 w-3 me-1 inline" aria-hidden />
                Mega
              </Badge>
            )}
            {node.linkType === 'external' && (
              <ExternalLink className="h-3 w-3 text-ink-3" aria-label="External link" />
            )}

            {/* Status and schedule are shown separately: "switched off" and
                "not published yet" are different answers to "why isn't this
                showing", and staff need to know which one applies. */}
            {inactive && (
              <Badge className="bg-paper text-ink-3">
                <EyeOff className="h-3 w-3 me-1 inline" aria-hidden />
                Off
              </Badge>
            )}
            {schedule === 'scheduled' && (
              <Badge className="bg-paper text-ink-3">
                <Clock className="h-3 w-3 me-1 inline" aria-hidden />
                Scheduled
              </Badge>
            )}
            {schedule === 'expired' && (
              <Badge className="bg-paper text-ink-3">
                <Clock className="h-3 w-3 me-1 inline" aria-hidden />
                Expired
              </Badge>
            )}

            {node.visibility !== 'everyone' && (
              <Badge className="bg-paper text-ink-3">{node.visibility}</Badge>
            )}
            {node.device === 'desktop' && (
              <Monitor className="h-3 w-3 text-ink-3" aria-label="Desktop only" />
            )}
            {node.device === 'mobile' && (
              <Smartphone className="h-3 w-3 text-ink-3" aria-label="Mobile only" />
            )}
          </div>

          <p className="truncate text-xs text-ink-3 mt-0.5">{describeTarget(node)}</p>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 shrink-0">
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="p-1.5 rounded text-ink-3 hover:bg-green-tint hover:text-green"
            aria-label={`Add an item under ${node.title.en}`}
            title="Add child item"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="p-1.5 rounded text-ink-3 hover:bg-green-tint hover:text-green"
            aria-label={`Edit ${node.title.en}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="p-1.5 rounded text-ink-3 hover:bg-red-50 hover:text-alert"
            aria-label={`Delete ${node.title.en}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <MenuTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              visible={visible}
              filtering={filtering}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
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
