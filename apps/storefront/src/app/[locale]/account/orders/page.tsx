'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight } from 'lucide-react'
import { fetchMyOrders } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-stone/10 text-stone',
}

export default function OrdersPage() {
  const locale = useLocale()

  // Client-side rather than server-rendered: the customer token lives in
  // localStorage, which a server component cannot read. Account pages have no
  // SEO value, so nothing is lost.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => fetchMyOrders(),
  })
  const orders = data?.items ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-ink text-xl">My Orders</h2>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-line rounded-md p-5 animate-pulse">
            <div className="h-4 w-32 bg-line rounded-sm mb-3" />
            <div className="h-3 w-24 bg-line rounded-sm" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-ink text-xl">My Orders</h2>
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <Package className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Could not load your orders</p>
          <p className="text-sm text-stone">Please refresh the page to try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">My Orders</h2>
      {orders.length === 0 ? (
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <Package className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">No orders yet</p>
          <p className="text-sm text-stone mb-4">Start your Hajj & Umrah journey today.</p>
          <Link href={`/${locale}/shop`} className="btn-primary">
            Shop Now
          </Link>
        </div>
      ) : (
        orders.map((order) => (
          <Link
            key={order.id}
            href={`/${locale}/account/orders/${order.number}`}
            className="block bg-white border border-line rounded-md p-5 hover:border-green/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-ink">{order.number}</p>
                <p className="text-xs text-stone mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-sm',
                    STATUS_CLASS[order.status]
                  )}
                >
                  {STATUS_LABEL[order.status]}
                </span>
                <ChevronRight className="w-4 h-4 text-stone" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
              <p className="font-bold text-green">{formatPrice(order.total)}</p>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
