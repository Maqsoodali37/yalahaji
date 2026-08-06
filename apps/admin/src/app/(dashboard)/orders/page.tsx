'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, ChevronRight, Download, ArrowUp, ArrowDown, X } from 'lucide-react'
import {
  useOrders,
  useBulkStatus,
  exportOrdersCsv,
  type OrderFilters,
} from '@/hooks/use-orders'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Panel, PageHeader, Badge, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  formatPrice,
  relativeTime,
  statusClasses,
  paymentStatusClasses,
  titleCase,
  rupeesToPaisas,
} from '@/lib/utils'
import type { OrderStatus, PaymentStatus, PaymentMethod, ShippingMethod } from '@/types'

const LIMIT = 20

type SortField = 'total' | 'createdAt'

export default function OrdersPage() {
  const { toast } = useToast()

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minRupees, setMinRupees] = useState('')
  const [maxRupees, setMaxRupees] = useState('')

  // Sorting + paging + selection
  const [sort, setSort] = useState<SortField | ''>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('')
  const [exporting, setExporting] = useState(false)

  const debounced = useDebouncedValue(search)

  // Any filter change resets to page one and clears a stale selection — the
  // ids in `selected` belong to the page that was showing when they were ticked.
  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [
    debounced, status, paymentStatus, paymentMethod, shippingMethod,
    dateFrom, dateTo, minRupees, maxRupees, sort, order,
  ])

  const filters: OrderFilters = {
    search: debounced || undefined,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    paymentMethod: paymentMethod || undefined,
    shippingMethod: shippingMethod || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    minTotal: minRupees ? rupeesToPaisas(Number(minRupees)) : undefined,
    maxTotal: maxRupees ? rupeesToPaisas(Number(maxRupees)) : undefined,
    sort: sort || undefined,
    order: sort ? order : undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading, isError, error, refetch } = useOrders(filters)
  const bulk = useBulkStatus()

  const rows = data?.items ?? []
  const allSelected = rows.length > 0 && rows.every((o) => selected.has(o.id))
  const hasFilters =
    !!debounced || !!status || !!paymentStatus || !!paymentMethod || !!shippingMethod ||
    !!dateFrom || !!dateTo || !!minRupees || !!maxRupees

  function toggleSort(field: SortField) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder('desc')
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (rows.every((o) => prev.has(o.id))) {
        const next = new Set(prev)
        rows.forEach((o) => next.delete(o.id))
        return next
      }
      const next = new Set(prev)
      rows.forEach((o) => next.add(o.id))
      return next
    })
  }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return
    try {
      const res = await bulk.mutateAsync({ ids: [...selected], status: bulkStatus })
      const parts = [`${res.updated} updated`]
      if (res.skipped) parts.push(`${res.skipped} skipped (not a legal move)`)
      if (res.notFound) parts.push(`${res.notFound} not found`)
      toast(parts.join(' · '))
      setSelected(new Set())
      setBulkStatus('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk update failed.', 'error')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportOrdersCsv(filters)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track, filter and progress customer orders."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        {/* ─── Filters ───────────────────────────────────── */}
        <div className="p-4 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none"
                aria-hidden
              />
              <Input
                className="pl-9"
                placeholder="Search order #, tracking, name, email or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search orders"
              />
            </div>

            <Select
              className="w-auto min-w-[150px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>

            <Select
              className="w-auto min-w-[150px]"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus | '')}
              aria-label="Filter by payment status"
            >
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-auto min-w-[150px]"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}
              aria-label="Filter by payment method"
            >
              <option value="">Any method</option>
              {PAYMENT_METHODS.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>

            <Select
              className="w-auto min-w-[150px]"
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value as ShippingMethod | '')}
              aria-label="Filter by shipping method"
            >
              <option value="">Any shipping</option>
              {SHIPPING_METHODS.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>

            <label className="flex items-center gap-1.5 text-xs text-ink-3">
              From
              <Input
                type="date"
                className="w-auto"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="From date"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-3">
              To
              <Input
                type="date"
                className="w-auto"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="To date"
              />
            </label>

            <label className="flex items-center gap-1.5 text-xs text-ink-3">
              ₨ min
              <Input
                type="number"
                inputMode="numeric"
                className="w-24"
                value={minRupees}
                onChange={(e) => setMinRupees(e.target.value)}
                aria-label="Minimum total in rupees"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-3">
              ₨ max
              <Input
                type="number"
                inputMode="numeric"
                className="w-24"
                value={maxRupees}
                onChange={(e) => setMaxRupees(e.target.value)}
                aria-label="Maximum total in rupees"
              />
            </label>
          </div>
        </div>

        {/* ─── Bulk action bar ───────────────────────────── */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-paper border-b border-line">
            <span className="text-sm font-medium text-ink-2">{selected.size} selected</span>
            <Select
              className="w-auto min-w-[160px]"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus | '')}
              aria-label="Bulk status"
            >
              <option value="">Set status to…</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
            <Button size="sm" onClick={applyBulk} disabled={!bulkStatus} loading={bulk.isPending}>
              Apply
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {/* ─── Table ─────────────────────────────────────── */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load orders.'}
            onRetry={() => void refetch()}
          />
        ) : rows.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">
                      <SortButton label="Total" active={sort === 'total'} order={order} onClick={() => toggleSort('total')} />
                    </th>
                    <th>
                      <SortButton label="Placed" active={sort === 'createdAt'} order={order} onClick={() => toggleSort('createdAt')} />
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={selected.has(o.id) ? 'bg-green-tint/40' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleRow(o.id)}
                          aria-label={`Select order ${o.number}`}
                        />
                      </td>
                      <td>
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-semibold text-green hover:underline font-mono text-xs"
                        >
                          {o.number}
                        </Link>
                      </td>
                      <td>
                        <p className="text-ink font-medium">{o.user?.name ?? 'Guest'}</p>
                        <p className="text-[11px] text-ink-3">
                          {o.user?.phone ?? o.guestPhone ?? '—'}
                        </p>
                      </td>
                      <td className="tabular-nums text-ink-2">{o.items.length}</td>
                      <td>
                        <Badge className={statusClasses(o.status)}>{titleCase(o.status)}</Badge>
                      </td>
                      <td>
                        <Badge className={paymentStatusClasses(o.paymentStatus)}>
                          {titleCase(o.paymentStatus)}
                        </Badge>
                        <p className="text-[11px] text-ink-3 mt-0.5">{titleCase(o.paymentMethod)}</p>
                      </td>
                      <td className="text-right font-semibold tabular-nums">{formatPrice(o.total)}</td>
                      <td className="text-ink-3 text-xs whitespace-nowrap">
                        {relativeTime(o.createdAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/orders/${o.id}`}
                          className="text-ink-3 hover:text-green inline-block"
                          aria-label={`Open order ${o.number}`}
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
              page={data!.meta.page}
              totalPages={data!.meta.totalPages}
              total={data!.meta.total}
              limit={data!.meta.limit}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title={hasFilters ? 'No matching orders' : 'No orders yet'}
            description={
              hasFilters
                ? 'Try a different search term or adjust the filters.'
                : 'Orders will show up here once customers start checking out.'
            }
          />
        )}
      </Panel>
    </>
  )
}

function SortButton({
  label,
  active,
  order,
  onClick,
}: {
  label: string
  active: boolean
  order: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : 'text-ink-3'}`}
    >
      {label}
      {active &&
        (order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  )
}
