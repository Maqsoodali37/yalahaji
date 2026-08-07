'use client'

import { X } from 'lucide-react'
import { useAuditLog } from '@/hooks/use-settings'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/panel'
import { formatDateTime } from '@/lib/utils'

const ACTION_LABEL: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

const ACTION_CLASS: Record<string, string> = {
  create: 'bg-green-light text-[#137A4C]',
  update: 'bg-blue-50 text-[#1D6FA5]',
  delete: 'bg-red-50 text-alert',
}

/**
 * Change history for one entity. `entityId` narrows to a single row; omit it
 * to show every change of `entityType` across the store.
 */
export function AuditLogPanel({
  entityType,
  entityId,
  title,
  onClose,
}: {
  entityType: string
  entityId?: string
  title: string
  onClose: () => void
}) {
  const { data, isLoading, isError, error, refetch } = useAuditLog(entityType, entityId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
          <div>
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            <p className="text-xs text-ink-3 mt-0.5">Most recent changes first.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : isError ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load history.'}
              onRetry={() => void refetch()}
            />
          ) : data && data.items.length > 0 ? (
            <ul className="divide-y divide-line/70">
              {data.items.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className={ACTION_CLASS[entry.action] ?? 'bg-paper text-ink-3'}>
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </Badge>
                      <span className="font-mono text-xs text-ink">{entry.entityId}</span>
                    </div>
                    <span className="text-xs text-ink-3">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-ink-3 mt-1">
                    {entry.actorName} <span className="text-ink-3/70">({entry.actorRole})</span>
                    {entry.ipAddress && <span className="text-ink-3/70"> · {entry.ipAddress}</span>}
                  </p>
                  {entry.action === 'update' && (
                    <ChangeDiff before={entry.before} after={entry.after} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No changes recorded yet" description="Edits to this section will appear here." />
          )}
        </div>
      </div>
    </div>
  )
}

/** Best-effort single-value diff — settings rows are flat, so this covers the common case without a full JSON diff. */
function ChangeDiff({ before, after }: { before: unknown; after: unknown }) {
  const b = before as { value?: string } | null
  const a = after as { value?: string } | null
  if (!b || !a || b.value === a.value) return null

  return (
    <p className="text-xs mt-1 font-mono">
      <span className="text-alert line-through">{b.value}</span>{' '}
      <span className="text-ink-3">→</span>{' '}
      <span className="text-green">{a.value}</span>
    </p>
  )
}
