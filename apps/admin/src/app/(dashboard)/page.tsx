'use client'

import Link from 'next/link'
import {
  ShoppingCart,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react'
import { useOrders, useOrderStats } from '@/hooks/use-orders'
import { useCatalogueStats, useLowStock } from '@/hooks/use-products'
import { useAuth, canManage } from '@/lib/auth'
import { StatCard } from '@/components/ui/stat-card'
import { Panel, PanelHeader, PageHeader, Badge, EmptyState, TableSkeleton } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import {
  formatPrice,
  formatPriceCompact,
  relativeTime,
  statusClasses,
  titleCase,
  stockLevel,
} from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const manage = canManage(user?.role)

  const stats = useOrderStats(30)
  const catalogue = useCatalogueStats()
  const lowStock = useLowStock(6)
  const recent = useOrders({ page: 1, limit: 8 })

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Here's how the store is doing over the last 30 days."
      />

      {/* ─── KPIs ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          label="Orders (30d)"
          value={stats.data?.recentOrders ?? 0}
          hint={`${stats.data?.totalOrders ?? 0} all time`}
          icon={ShoppingCart}
          loading={stats.isLoading}
        />
        <StatCard
          label="Revenue (30d)"
          value={formatPriceCompact(stats.data?.recentRevenue ?? 0)}
          hint={`${formatPriceCompact(stats.data?.totalRevenue ?? 0)} all time`}
          icon={Banknote}
          tone="success"
          loading={stats.isLoading}
        />
        <StatCard
          label="Average order value"
          value={formatPrice(stats.data?.averageOrderValue ?? 0)}
          hint="Excludes cancelled orders"
          icon={TrendingUp}
          loading={stats.isLoading}
        />
        {manage ? (
          <StatCard
            label="Low stock variants"
            value={catalogue.data?.lowStockCount ?? 0}
            hint={`${catalogue.data?.outOfStockCount ?? 0} out of stock`}
            icon={AlertTriangle}
            tone={
              (catalogue.data?.lowStockCount ?? 0) > 0 ? 'warn' : 'default'
            }
            loading={catalogue.isLoading}
          />
        ) : (
          <StatCard
            label="Pending orders"
            value={
              stats.data?.byStatus.find((s) => s.status === 'pending')?.count ?? 0
            }
            hint="Awaiting confirmation"
            icon={AlertTriangle}
            tone="warn"
            loading={stats.isLoading}
          />
        )}
        <StatCard
          label="Today's orders"
          value={stats.data?.todayOrders ?? 0}
          hint="Placed since midnight"
          icon={ShoppingCart}
          loading={stats.isLoading}
        />
        <StatCard
          label="Refund rate"
          value={`${((stats.data?.refundRate ?? 0) * 100).toFixed(1)}%`}
          hint={`${stats.data?.refundedOrders ?? 0} refunded all time`}
          icon={RefreshCcw}
          tone={(stats.data?.refundRate ?? 0) > 0.1 ? 'warn' : 'default'}
          loading={stats.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ─── Recent orders ─────────────────────────────── */}
        <Panel className="xl:col-span-2 overflow-hidden">
          <PanelHeader
            title="Recent orders"
            description="The latest activity across the store"
            action={
              <Link href="/orders">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />

          {recent.isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : recent.data && recent.data.items.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-semibold text-green hover:underline font-mono text-xs"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td className="text-ink-2">
                        {order.user?.name ?? order.guestPhone ?? 'Guest'}
                      </td>
                      <td>
                        <Badge className={statusClasses(order.status)}>
                          {titleCase(order.status)}
                        </Badge>
                      </td>
                      <td className="text-right font-semibold tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="text-ink-3 text-xs whitespace-nowrap">
                        {relativeTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<ShoppingCart className="h-7 w-7" />}
              title="No orders yet"
              description="Orders will appear here as soon as customers start checking out."
            />
          )}
        </Panel>

        {/* ─── Side column ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Status breakdown */}
          <Panel>
            <PanelHeader title="Orders by status" />
            <div className="p-5 space-y-2.5">
              {stats.isLoading ? (
                <TableSkeleton rows={4} cols={2} />
              ) : stats.data && stats.data.byStatus.length > 0 ? (
                stats.data.byStatus
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <Badge className={statusClasses(s.status)}>
                        {titleCase(s.status)}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums text-ink-2">
                        {s.count}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-ink-3">Nothing to show yet.</p>
              )}
            </div>
          </Panel>

          {/* Low stock */}
          {manage && (
            <Panel>
              <PanelHeader
                title="Needs restocking"
                action={
                  <Link href="/inventory">
                    <Button variant="ghost" size="sm">
                      All
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />
              <div className="p-5 space-y-3">
                {lowStock.isLoading ? (
                  <TableSkeleton rows={3} cols={2} />
                ) : lowStock.data && lowStock.data.length > 0 ? (
                  lowStock.data.map((v) => {
                    const level = stockLevel(v.stock, v.lowStockThreshold)
                    return (
                      <div key={v.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${v.productId}`}
                            className="text-sm font-medium text-ink hover:text-green truncate block"
                          >
                            {v.product.nameEn}
                          </Link>
                          <p className="text-[11px] text-ink-3 font-mono">{v.sku}</p>
                        </div>
                        <Badge className={level.cls}>{v.stock} left</Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center gap-2 text-sm text-ink-3">
                    <Package className="h-4 w-4" aria-hidden />
                    Stock levels look healthy.
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
