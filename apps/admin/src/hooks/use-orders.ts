'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type { Order, OrderStats, OrderStatus, Paginated } from '@/types'

export interface OrderFilters {
  status?: OrderStatus | ''
  search?: string
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
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string
      status: OrderStatus
      note?: string
    }) => api.patch(`/orders/${id}/status`, { status, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}
