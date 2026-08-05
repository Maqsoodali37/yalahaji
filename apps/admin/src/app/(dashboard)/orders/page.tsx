'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, ChevronRight } from 'lucide-react'
import { useOrders, type OrderFilters } from '@/hooks/use-orders'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Panel, PageHeader, Badge, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { Input, Select } from '@/components/ui/field'
import { Pagination } from '@/components/ui/pagination'
import {
  ORDER_STATUSES,
  formatPrice,
  relativeTime,
  statusClasses,
  paymentStatusClasses,
  titleCase,
} from '@/lib/utils'
import type { OrderStatus } from '@/types'

const LIMIT = 20

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)

  const debounced = useDebouncedValue(search)

  useEffect(() => {
    setPage(1)
  }, [debounced, status])

  const filters: OrderFilters = {
    search: debounced || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading, isError, error, refetch } = useOrders(filters)

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track, filter and progress customer orders."
      />

      <Panel className="overflow-hidden">
        {/* ─── Filters ───────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by order number, name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders"
            />
          </div>

          <Select
            className="w-auto min-w-[170px]"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>

        {/* ─── Table ─────────────────────────────────────── */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load orders.'}
            onRetry={() => void refetch()}
          />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                    <th>Placed</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-semibold text-green hover:underline font-mono text-xs"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td>
                        <p className="text-ink font-medium">
                          {order.user?.name ?? 'Guest'}
                        </p>
                        <p className="text-[11px] text-ink-3">
                          {order.user?.phone ?? order.guestPhone ?? '—'}
                        </p>
                      </td>
                      <td className="tabular-nums text-ink-2">{order.items.length}</td>
                      <td>
                        <Badge className={statusClasses(order.status)}>
                          {titleCase(order.status)}
                        </Badge>
                      </td>
                      <td>
                        <Badge className={paymentStatusClasses(order.paymentStatus)}>
                          {titleCase(order.paymentStatus)}
                        </Badge>
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          {titleCase(order.paymentMethod)}
                        </p>
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="text-ink-3 text-xs whitespace-nowrap">
                        {relativeTime(order.createdAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-ink-3 hover:text-green inline-block"
                          aria-label={`Open order ${order.number}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
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
            icon={<ShoppingCart className="h-7 w-7" />}
            title={debounced || status ? 'No matching orders' : 'No orders yet'}
            description={
              debounced || status
                ? 'Try a different search term or status filter.'
                : 'Orders will show up here once customers start checking out.'
            }
          />
        )}
      </Panel>
    </>
  )
}
