'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type { Paginated, ReturnRequest, ReturnStatus } from '@/types'

export interface ReturnFilters {
  status?: ReturnStatus | ''
  page?: number
  limit?: number
}

export const returnKeys = {
  all: ['returns'] as const,
  list: (filters: ReturnFilters) => ['returns', 'list', filters] as const,
}

export function useReturns(filters: ReturnFilters) {
  return useQuery({
    queryKey: returnKeys.list(filters),
    queryFn: () => api.get<Paginated<ReturnRequest>>(`/returns/admin${buildQuery({ ...filters })}`),
  })
}

export function useUpdateReturnStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ReturnStatus; note?: string }) =>
      api.patch(`/returns/admin/${id}/status`, { status, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: returnKeys.all })
    },
  })
}
