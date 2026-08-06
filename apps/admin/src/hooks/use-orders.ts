'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery, API_URL } from '@/lib/api'
import type {
  Order,
  OrderStats,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ShippingMethod,
  Paginated,
} from '@/types'

export interface OrderFilters {
  status?: OrderStatus | ''
  search?: string
  paymentStatus?: PaymentStatus | ''
  paymentMethod?: PaymentMethod | ''
  shippingMethod?: ShippingMethod | ''
  dateFrom?: string
  dateTo?: string
  /** Paisas — the caller converts the staff-entered rupee figure. */
  minTotal?: number
  maxTotal?: number
  city?: string
  province?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  stats: (days: number) => ['orders', 'stats', days] as const,
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => api.get<Paginated<Order>>(`/orders/admin${buildQuery({ ...filters })}`),
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => api.get<Order>(`/orders/admin/${id}`),
    enabled: !!id,
  })
}

export function useOrderStats(days = 30) {
  return useQuery({
    queryKey: orderKeys.stats(days),
    queryFn: () => api.get<OrderStats>(`/orders/admin/stats?days=${days}`),
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      api.patch(`/orders/${id}/status`, { status, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useSetTracking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, trackingNumber }: { id: string; trackingNumber: string }) =>
      api.patch(`/orders/${id}/tracking`, { trackingNumber }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useSetPaymentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paymentStatus,
      note,
    }: {
      id: string
      paymentStatus: PaymentStatus
      note?: string
    }) => api.patch(`/orders/${id}/payment-status`, { paymentStatus, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export interface BulkStatusResult {
  requested: number
  updated: number
  skipped: number
  notFound: number
}

export function useBulkStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, status, note }: { ids: string[]; status: OrderStatus; note?: string }) =>
      api.post<BulkStatusResult>(`/orders/admin/bulk-status`, { ids, status, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

/**
 * Download the current filtered view as CSV. The endpoint streams a file, so
 * this goes through `fetch` directly rather than the JSON client — pagination
 * params are dropped so the export covers the whole filtered set (server-capped).
 */
export async function exportOrdersCsv(filters: OrderFilters): Promise<void> {
  const query = buildQuery({ ...filters, page: undefined, limit: undefined })
  const res = await fetch(`${API_URL}/orders/admin/export${query}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Could not export orders.')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
