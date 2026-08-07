'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, buildQuery } from '@/lib/api'
import type { AuditLogEntry, Paginated, Setting, SettingInput } from '@/types'

export const settingsKeys = {
  all: ['settings'] as const,
  list: (category?: string) => ['settings', 'list', category ?? 'all'] as const,
}

export const auditLogKeys = {
  list: (entityType: string, entityId?: string, page = 1) =>
    ['audit-log', entityType, entityId ?? 'all', page] as const,
}

/** Admin listing — every configuration row, optionally narrowed to one category. */
export function useSettings(category?: string) {
  return useQuery({
    queryKey: settingsKeys.list(category),
    queryFn: () => api.get<Setting[]>(`/settings/admin${buildQuery({ category })}`),
  })
}

export function useCreateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingInput) => api.post<Setting>('/settings', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, ...input }: Partial<SettingInput> & { key: string }) =>
      api.patch<Setting>(`/settings/${encodeURIComponent(key)}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useDeleteSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => api.delete<Setting>(`/settings/${encodeURIComponent(key)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

/** Change history for one entity type, optionally narrowed to a single row. */
export function useAuditLog(entityType: string, entityId?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: auditLogKeys.list(entityType, entityId, page),
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>(
        `/audit-logs${buildQuery({ entityType, entityId, page, limit })}`,
      ),
  })
}
