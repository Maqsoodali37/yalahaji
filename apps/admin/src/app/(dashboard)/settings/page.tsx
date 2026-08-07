'use client'

import { useMemo, useState } from 'react'
import { Settings as SettingsIcon, Plus, History } from 'lucide-react'
import {
  useSettings,
  useCreateSetting,
  useUpdateSetting,
  useDeleteSetting,
} from '@/hooks/use-settings'
import { RequireRole } from '@/components/layout/auth-gate'
import { Panel, PanelHeader, PageHeader, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { SettingRow } from '@/components/settings/setting-row'
import { AddSettingDialog } from '@/components/settings/add-setting-dialog'
import { AuditLogPanel } from '@/components/settings/audit-log-panel'
import { titleCase } from '@/lib/utils'
import type { Setting, SettingInput } from '@/types'

const MANAGE_ROLES = ['admin', 'manager'] as const

export default function SettingsPage() {
  return (
    <RequireRole roles={[...MANAGE_ROLES]}>
      <StoreSettings />
    </RequireRole>
  )
}

function StoreSettings() {
  const { toast } = useToast()
  const { data, isLoading, isError, error, refetch } = useSettings()
  const createSetting = useCreateSetting()
  const updateSetting = useUpdateSetting()
  const deleteSetting = useDeleteSetting()

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [historyEntity, setHistoryEntity] = useState<{ key?: string; title: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Setting | null>(null)

  const categories = useMemo(() => {
    const set = new Set((data ?? []).map((s) => s.category))
    return Array.from(set).sort()
  }, [data])

  const visible = useMemo(
    () => (activeCategory === 'all' ? data ?? [] : (data ?? []).filter((s) => s.category === activeCategory)),
    [data, activeCategory],
  )

  async function handleCreate(input: SettingInput) {
    try {
      await createSetting.mutateAsync(input)
      toast('Configuration created.')
      setAddOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create configuration.', 'error')
    }
  }

  async function handleSave(key: string, value: string, isPublic: boolean) {
    try {
      await updateSetting.mutateAsync({ key, value, isPublic })
      toast('Configuration updated.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the change.', 'error')
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      await deleteSetting.mutateAsync(pendingDelete.key)
      toast('Configuration deleted.')
      setPendingDelete(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete the configuration.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Store Settings"
        description="Configuration read by the API and storefront at runtime — an edit here takes effect immediately, with no deploy."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryEntity({ title: 'All configuration changes' })}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add setting
            </Button>
          </div>
        }
      />

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <CategoryPill
            label="All"
            count={data?.length ?? 0}
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c}
              label={titleCase(c)}
              count={(data ?? []).filter((s) => s.category === c).length}
              active={activeCategory === c}
              onClick={() => setActiveCategory(c)}
            />
          ))}
        </div>
      )}

      <Panel className="overflow-hidden">
        <PanelHeader
          title={activeCategory === 'all' ? 'All configuration' : titleCase(activeCategory)}
          description="Grouped by section. Values take effect on save — no redeploy required."
        />

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load settings.'}
            onRetry={() => void refetch()}
          />
        ) : visible.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Visibility</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    saving={updateSetting.isPending}
                    onSave={(value, isPublic) => void handleSave(setting.key, value, isPublic)}
                    onDelete={() => setPendingDelete(setting)}
                    onViewHistory={() => setHistoryEntity({ key: setting.key, title: setting.key })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<SettingsIcon className="h-7 w-7" />}
            title="No configuration in this section"
            description="Add one to get started."
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                Add setting
              </Button>
            }
          />
        )}
      </Panel>

      <AddSettingDialog
        open={addOpen}
        categories={categories}
        saving={createSetting.isPending}
        onCreate={handleCreate}
        onClose={() => setAddOpen(false)}
      />

      {historyEntity && (
        <AuditLogPanel
          entityType="Setting"
          entityId={historyEntity.key}
          title={historyEntity.key ? `History — ${historyEntity.key}` : historyEntity.title}
          onClose={() => setHistoryEntity(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.key}"?`}
        description="Any code reading this key falls back to its hardcoded default. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteSetting.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

function CategoryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-green text-white border-green'
          : 'bg-white text-ink-2 border-line hover:bg-paper'
      }`}
    >
      {label}
      <span className={active ? 'text-white/80' : 'text-ink-3'}>{count}</span>
    </button>
  )
}
