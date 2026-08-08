import type { MenuItem, ReorderMenuItem } from '@/types'

/**
 * Pure tree helpers for the menu builder.
 *
 * Deliberately mirrors `components/categories/category-tree.tsx` rather than
 * inventing a second set: the two screens solve the same problem — a
 * self-referencing tree with drag-and-drop reorder against an endpoint that
 * takes a flat sibling payload — and the reorder contract on the API side is
 * the same shape. Split into its own module so it can be unit tested without
 * mounting a component.
 */

export type DropPosition = 'before' | 'after' | 'inside'

function collectDescendants(node: MenuItem, into: Set<string>) {
  into.add(node.id)
  for (const child of node.children ?? []) collectDescendants(child, into)
}

/** Every id in the subtree rooted at `id`, including `id` itself. */
export function descendantIds(tree: MenuItem[], id: string): Set<string> {
  const result = new Set<string>()
  function walk(nodes: MenuItem[]): boolean {
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

export function findParentId(
  tree: MenuItem[],
  id: string,
  current: string | null = null,
): string | null | undefined {
  for (const node of tree) {
    if (node.id === id) return current
    const found = findParentId(node.children ?? [], id, node.id)
    if (found !== undefined) return found
  }
  return undefined
}

export function findSiblings(tree: MenuItem[], parentId: string | null): MenuItem[] {
  if (parentId === null) return tree
  function walk(nodes: MenuItem[]): MenuItem[] | null {
    for (const node of nodes) {
      if (node.id === parentId) return node.children ?? []
      const found = walk(node.children ?? [])
      if (found) return found
    }
    return null
  }
  return walk(tree) ?? []
}

function removeNode(tree: MenuItem[], id: string): { tree: MenuItem[]; removed: MenuItem | null } {
  let removed: MenuItem | null = null
  function walk(nodes: MenuItem[]): MenuItem[] {
    const kept: MenuItem[] = []
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

function insertNode(
  tree: MenuItem[],
  node: MenuItem,
  parentId: string | null,
  index: number,
): MenuItem[] {
  if (parentId === null) {
    const next = [...tree]
    next.splice(index, 0, node)
    return next
  }
  function walk(nodes: MenuItem[]): MenuItem[] {
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

/**
 * The new tree plus the reorder payload for every sibling group the move
 * touches.
 *
 * Both groups are sent, not just the moved row: the source parent's remaining
 * children and the destination parent's children each need renumbering, or
 * `order` stops being a dense 0..n-1 sequence and the next drop lands in the
 * wrong slot.
 *
 * **Every entry carries an explicit `parentId`.** The API distinguishes an
 * omitted `parentId` ("leave the parent alone") from `null` ("move to the top
 * level"), so a payload that omitted it would silently leave reparented rows
 * where they were while renumbering them — a move that looks like it worked
 * and then reverts on refresh.
 */
export function computeMove(
  tree: MenuItem[],
  draggedId: string,
  targetId: string | null,
  position: DropPosition,
): { tree: MenuItem[]; items: ReorderMenuItem[] } | null {
  if (targetId === draggedId) return null
  // Dropping into your own subtree would nest an item inside itself. The API
  // refuses this too, but catching it here is what lets the row show a
  // no-drop cursor rather than accepting the drop and rolling back.
  if (targetId && descendantIds(tree, draggedId).has(targetId)) return null

  const oldParentId = findParentId(tree, draggedId) ?? null
  const { tree: withoutDragged, removed } = removeNode(tree, draggedId)
  if (!removed) return null

  let newParentId: string | null
  let insertIndex: number

  if (targetId === null) {
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

  const newTree = insertNode(
    withoutDragged,
    { ...removed, parentId: newParentId },
    newParentId,
    insertIndex,
  )

  const items: ReorderMenuItem[] = []
  const groups = new Set([oldParentId, newParentId])
  for (const groupParentId of groups) {
    findSiblings(newTree, groupParentId).forEach((node, index) => {
      items.push({ id: node.id, parentId: groupParentId, order: index })
    })
  }

  return { tree: newTree, items }
}

/**
 * Which nodes pass the search and status filters, keeping a matching node's
 * ancestors visible so a deep hit is not orphaned off the top of the tree.
 */
export function computeVisibility(
  nodes: MenuItem[],
  searchTerm: string,
  statusFilter: 'all' | 'active' | 'inactive',
): Set<string> {
  const term = searchTerm.trim().toLowerCase()
  const visible = new Set<string>()

  function ownMatch(node: MenuItem): boolean {
    // `isActive` is only on the admin payload; treat a missing one as active
    // rather than hiding every row if the endpoint ever changes shape.
    const active = node.isActive !== false
    if (statusFilter === 'active' && !active) return false
    if (statusFilter === 'inactive' && active) return false
    if (!term) return true
    return (
      node.title.en.toLowerCase().includes(term) ||
      (node.targetSlug?.toLowerCase().includes(term) ?? false) ||
      (node.url?.toLowerCase().includes(term) ?? false)
    )
  }

  function walk(node: MenuItem): boolean {
    const childMatches = (node.children ?? []).map(walk)
    const isVisible = ownMatch(node) || childMatches.some(Boolean)
    if (isVisible) visible.add(node.id)
    return isVisible
  }

  nodes.forEach(walk)
  return visible
}

/** Human-readable destination for a row, so staff can see where a link goes without opening it. */
export function describeTarget(item: MenuItem): string {
  switch (item.linkType) {
    case 'heading':
      return 'Heading — no link'
    // Both render the stored href as-is; the external/internal distinction is
    // already carried by the icon beside the label.
    case 'external':
    case 'custom':
      return item.url ?? '—'
    default:
      return item.targetSlug ? `${item.linkType.replace('_', ' ')} · ${item.targetSlug}` : '—'
  }
}

/**
 * Whether the item is renderable to a customer *right now*.
 *
 * Distinct from `isActive`: an item can be switched on and still invisible
 * because its publish window has not opened or has already closed. The tree
 * shows the two separately, because "why isn't this showing" has two different
 * answers and staff need to know which one applies.
 */
export function scheduleState(
  item: MenuItem,
  now: Date = new Date(),
): 'live' | 'scheduled' | 'expired' | 'none' {
  const { publishFrom: from, publishUntil: until } = item
  if (!from && !until) return 'none'
  if (from && new Date(from) > now) return 'scheduled'
  if (until && new Date(until) <= now) return 'expired'
  return 'live'
}
