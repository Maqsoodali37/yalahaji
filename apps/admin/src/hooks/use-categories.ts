'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BulkCategoryResult, Category, CategoryInput, ReorderCategoryItem } from '@/types'

export const categoryKeys = {
  all: ['categories'] as const,
  tree: ['categories', 'tree'] as const,
  adminTree: ['categories', 'admin-tree'] as const,
}

/**
 * Public tree — active categories only. This is what the product form's
 * category picker has always used; the categories admin screen uses
 * `useAdminCategoryTree` instead, which also needs disabled rows and product
 * counts.
 */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.tree,
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 5 * 60_000,
  })
}

/** Every status, with a product count per node. Powers the categories screen. */
export function useAdminCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.adminTree,
    queryFn: () => api.get<Category[]>('/categories/admin/tree'),
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  // Both trees can change from any mutation below (a new child affects the
  // parent's row, a rename affects the picker) — there is no cheaper
  // invalidation that stays correct, and the category count involved is
  // small enough that refetching both is not worth optimising away.
  void qc.invalidateQueries({ queryKey: categoryKeys.all })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => api.post<Category>('/categories', input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      api.patch<Category>(`/categories/${id}`, input),
    onSuccess: () => invalidateAll(qc),
  })
}

/** Soft delete — the API refuses with a 409 while children or products are still attached. */
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<Category>(`/categories/${id}`),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ReorderCategoryItem[]) =>
      api.post<{ updated: number }>('/categories/admin/reorder', { items }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useBulkCategoryAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'enable' | 'disable' | 'delete' }) =>
      api.post<BulkCategoryResult>('/categories/admin/bulk', { ids, action }),
    onSuccess: () => invalidateAll(qc),
  })
}
