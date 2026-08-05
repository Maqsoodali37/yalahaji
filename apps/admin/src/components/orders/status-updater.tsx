'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, Textarea, FormField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useUpdateOrderStatus } from '@/hooks/use-orders'
import { nextStatuses, titleCase } from '@/lib/utils'
import type { OrderStatus } from '@/types'

export function StatusUpdater({
  orderId,
  current,
}: {
  orderId: string
  current: OrderStatus
}) {
  const { toast } = useToast()
  const update = useUpdateOrderStatus()

  const options = nextStatuses(current)
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [note, setNote] = useState('')

  if (options.length === 0) {
    return (
      <div className="flex items-start gap-2 text-sm text-ink-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <p>
          This order is <strong className="text-ink-2">{titleCase(current)}</strong> and
          can&apos;t be progressed further.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!status) return
    try {
      await update.mutateAsync({ id: orderId, status, note: note.trim() || undefined })
      toast(`Order moved to ${titleCase(status)}.`)
      setStatus('')
      setNote('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update status.', 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <FormField label="Move to" htmlFor="next-status">
        <Select
          id="next-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
        >
          <option value="">Select a status…</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Note" htmlFor="status-note" hint="Added to the order timeline">
        <Textarea
          id="status-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Handed to courier, tracking to follow…"
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={!status} loading={update.isPending}>
        Update status
      </Button>
    </form>
  )
}
