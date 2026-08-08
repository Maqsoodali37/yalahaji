'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Menu, MenuInput, MenuItem, MenuItemInput, MenuItemRow, ReorderMenuItem } from '@/types'

export const menuKeys = {
  all: ['menus'] as const,
  list: ['menus', 'list'] as const,
  tree: (menuId: string) => ['menus', 'tree', menuId] as const,
}

/** Every menu, every status, with an item count. */
export function useMenus() {
  return useQuery({
    queryKey: menuKeys.list,
    queryFn: () => api.get<Menu[]>('/menus/admin'),
  })
}

/**
 * The full item tree for one menu — every status, schedule and audience.
 *
 * Deliberately not the public `/menus/location/:location` read: that one
 * filters, so an item staff have switched off or scheduled for next month
 * would simply not appear on the screen built to edit it.
 */
export function useMenuTree(menuId: string | undefined) {
  return useQuery({
    queryKey: menuKeys.tree(menuId ?? 'none'),
    queryFn: () => api.get<MenuItem[]>(`/menus/admin/${menuId}/tree`),
    enabled: !!menuId,
  })
}

/**
 * One invalidation for every mutation.
 *
 * Any write can change any tree — a reparent moves a row between two of them,
 * and a delete cascades to a whole subtree — and the row counts involved are
 * small enough that a narrower invalidation would be optimising away a
 * refetch nobody notices, at the cost of a stale screen somebody does.
 */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: menuKeys.all })
}

export function useCreateMenu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MenuInput) => api.post<Menu>('/menus', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateMenu() {
  const qc = useQueryClient()
  return useMutation({
    // `location` is excluded: `UpdateMenuDto` omits it, and with
    // `forbidNonWhitelisted` on the API sending it is a 400 rather than a
    // no-op. Encoding that in the type stops it being discovered at runtime.
    mutationFn: ({ id, input }: { id: string; input: Omit<Partial<MenuInput>, 'location'> }) =>
      api.patch<Menu>(`/menus/${id}`, input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateMenuItem() {
  const qc = useQueryClient()
  return useMutation({
    // `MenuItemRow`, not `MenuItem` — these endpoints return the flat Prisma
    // row, not a nested tree node.
    mutationFn: (input: MenuItemInput) => api.post<MenuItemRow>('/menus/admin/items', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateMenuItem() {
  const qc = useQueryClient()
  return useMutation({
    // `menuId` excluded for the same reason `location` is above — moving an
    // item between menus would have to re-parent its whole subtree, so
    // `UpdateMenuItemDto` refuses it outright.
    mutationFn: ({ id, input }: { id: string; input: Omit<Partial<MenuItemInput>, 'menuId'> }) =>
      api.patch<MenuItemRow>(`/menus/admin/items/${id}`, input),
    onSuccess: () => invalidateAll(qc),
  })
}

/** Deletes the item AND its whole subtree — the API cascades on `parent_id`. */
export function useDeleteMenuItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: number }>(`/menus/admin/items/${id}`),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useReorderMenuItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ReorderMenuItem[]) =>
      api.post<{ updated: number }>('/menus/admin/reorder', { items }),
    onSuccess: () => invalidateAll(qc),
  })
}

/**
 * Purges every menu cache — the API's Redis entries and, via the webhook, the
 * storefront's Next fetch cache.
 *
 * Every write already publishes. This exists for the case where the
 * storefront revalidation call failed — it never throws, by design, because a
 * write that succeeded should not be reported as a failure — and nobody wants
 * to wait out the TTL.
 */
export function usePublishMenus() {
  const qc = useQueryClient()
  return useMutation({
    // An explicit `{}` body. `apiFetch` always sets `Content-Type:
    // application/json`, and Fastify's JSON parser rejects an empty body under
    // that header with a 400 — a bodyless POST would fail for a reason that
    // has nothing to do with the endpoint.
    mutationFn: () => api.post<{ published: boolean }>('/menus/admin/publish', {}),
    onSuccess: () => invalidateAll(qc),
  })
}
