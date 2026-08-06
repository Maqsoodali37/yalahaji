'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Undo2 } from 'lucide-react'
import { useReturns, useUpdateReturnStatus, type ReturnFilters } from '@/hooks/use-returns'
import { Panel, PageHeader, Badge, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import {
  RETURN_STATUSES,
  nextReturnStatuses,
  returnStatusClasses,
  formatPrice,
  relativeTime,
  titleCase,
} from '@/lib/utils'
import type { ReturnRequest, ReturnStatus } from '@/types'

const LIMIT = 20

export default function ReturnsPage() {
  const [status, setStatus] = useState<ReturnStatus | ''>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [status])

  const filters: ReturnFilters = { status: status || undefined, page, limit: LIMIT }
  const { data, isLoading, isError, error, refetch } = useReturns(filters)

  return (
    <>
      <PageHeader title="Returns" description="Review and moderate customer return requests." />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          <Select
            className="w-auto min-w-[170px]"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReturnStatus | '')}
            aria-label="Filter by return status"
          >
            <option value="">All statuses</option>
            {RETURN_STATUSES.map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load returns.'}
            onRetry={() => void refetch()}
          />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Reason</th>
                    <th className="text-right">Order total</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Moderate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <ReturnRow key={r.id} request={r} />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={data.meta.limit}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={<Undo2 className="h-7 w-7" />}
            title={status ? 'No matching returns' : 'No return requests'}
            description={
              status
                ? 'Try a different status filter.'
                : 'Approved return requests from customers will appear here.'
            }
          />
        )}
      </Panel>
    </>
  )
}

function ReturnRow({ request }: { request: ReturnRequest }) {
  const { toast } = useToast()
  const update = useUpdateReturnStatus()
  const [next, setNext] = useState<ReturnStatus | ''>('')

  const options = nextReturnStatuses(request.status) as ReturnStatus[]

  async function apply() {
    if (!next) return
    try {
      await update.mutateAsync({ id: request.id, status: next })
      toast(`Return moved to ${titleCase(next)}.`)
      setNext('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update return.', 'error')
    }
  }

  return (
    <tr>
      <td>
        <Link
          href={`/orders/${request.order.id}`}
          className="font-semibold text-green hover:underline font-mono text-xs"
        >
          {request.order.number}
        </Link>
      </td>
      <td className="max-w-[280px]">
        <p className="text-ink-2 text-sm truncate" title={request.reason}>
          {request.reason}
        </p>
      </td>
      <td className="text-right tabular-nums">{formatPrice(request.order.total)}</td>
      <td>
        <Badge className={returnStatusClasses(request.status)}>{titleCase(request.status)}</Badge>
      </td>
      <td className="text-ink-3 text-xs whitespace-nowrap">{relativeTime(request.createdAt)}</td>
      <td>
        {options.length === 0 ? (
          <span className="text-xs text-ink-3">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              className="w-auto min-w-[130px]"
              value={next}
              onChange={(e) => setNext(e.target.value as ReturnStatus)}
              aria-label={`Move return for ${request.order.number}`}
            >
              <option value="">Move to…</option>
              {options.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
            <Button size="sm" variant="outline" onClick={apply} disabled={!next} loading={update.isPending}>
              Apply
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
