'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type {
  CatalogueStats,
  LowStockVariant,
  Paginated,
  Product,
  ProductInput,
  ProductVariant,
} from '@/types'

export interface ProductFilters {
  search?: string
  category?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
}

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  stats: ['products', 'stats'] as const,
  lowStock: ['products', 'low-stock'] as const,
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () =>
      api.get<Paginated<Product>>(`/products/admin/list${buildQuery({ ...filters })}`),
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => api.get<Product>(`/products/admin/id/${id}`),
    enabled: !!id,
  })
}

export function useCatalogueStats() {
  return useQuery({
    queryKey: productKeys.stats,
    queryFn: () => api.get<CatalogueStats>('/products/admin/stats'),
  })
}

export function useLowStock(limit = 20) {
  return useQuery({
    queryKey: [...productKeys.lowStock, limit],
    queryFn: () => api.get<LowStockVariant[]>(`/products/admin/low-stock?limit=${limit}`),
  })
}

// `useCategories` moved to `@/hooks/use-categories` now that categories are a
// full admin feature — that file also holds the admin tree, create/update/
// delete, reorder and bulk-action hooks, and this one shouldn't duplicate any
// of it.

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductInput) => api.post<Product>('/products', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) =>
      api.patch<Product>(`/products/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

/** Soft-delete — the API sets isActive=false rather than removing the row. */
export function useArchiveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<Product>(`/products/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

// ─── Variants ─────────────────────────────────────────────────

export function useUpdateVariantStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) =>
      api.patch<ProductVariant>(`/variants/${id}/stock`, { stock }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useUpdateVariantPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      price,
      compareAtPrice,
    }: {
      id: string
      price: number
      compareAtPrice?: number
    }) => api.patch<ProductVariant>(`/variants/${id}/price`, { price, compareAtPrice }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}

export function useDeleteVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/variants/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
