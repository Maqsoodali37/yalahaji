'use client'

import { use } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle, Clock, Package, Truck, Home, ChevronRight,
} from 'lucide-react'
import { fetchMyOrder } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const TIMELINE_STEPS: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered',
]

const STEP_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  packed: Package,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: Home,
}

const STEP_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale()
  // The route segment carries the order NUMBER (YH-2026-1001) — that is the
  // identifier the customer sees and the one /orders/:number is keyed on.
  const { id: orderNumber } = use(params)

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['my-order', orderNumber],
    queryFn: () => fetchMyOrder(orderNumber),
  })

  if (isLoading) {
    return (
      <div className="bg-white border border-line rounded-md p-6 animate-pulse space-y-3">
        <div className="h-5 w-40 bg-line rounded-sm" />
        <div className="h-3 w-56 bg-line rounded-sm" />
        <div className="h-24 w-full bg-line/60 rounded-sm" />
      </div>
    )
  }

  // A wrong number and someone else's order are indistinguishable here by
  // design — the API scopes the lookup to the signed-in customer and 404s
  // rather than revealing that an order exists.
  if (isError || !order) {
    return (
      <div className="bg-white border border-line rounded-md p-12 text-center">
        <Package className="w-12 h-12 text-stone mx-auto mb-4" />
        <p className="font-semibold text-ink mb-1">Order not found</p>
        <p className="text-sm text-stone mb-4">
          We couldn&apos;t find an order with that number on your account.
        </p>
        <Link href={`/${locale}/account/orders`} className="btn-primary">
          Back to My Orders
        </Link>
      </div>
    )
  }

  const currentIdx = TIMELINE_STEPS.indexOf(order.status)

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-stone">
        <Link href={`/${locale}/account/orders`} className="hover:text-green">My Orders</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink font-medium">{order.number}</span>
      </nav>

      <div className="bg-white border border-line rounded-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-ink text-xl">{order.number}</h2>
            <p className="text-sm text-stone mt-0.5">
              Placed {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <p className="font-bold text-green text-xl">{formatPrice(order.total)}</p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="flex items-start justify-between relative">
            {/* connector line */}
            <div className="absolute top-5 start-0 end-0 h-0.5 bg-line" />
            <div
              className="absolute top-5 start-0 h-0.5 bg-green transition-all"
              style={{ width: `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />

            {TIMELINE_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s]
              const done = i <= currentIdx
              return (
                <div key={s} className="flex flex-col items-center z-10 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      done
                        ? 'border-green bg-green text-white'
                        : 'border-line bg-white text-stone'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-medium mt-1.5 text-center leading-tight max-w-[60px]"
                    style={{ color: done ? 'var(--green)' : 'var(--stone)' }}>
                    {STEP_LABELS[s]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-line rounded-md p-5">
        <h3 className="font-bold text-ink mb-4">Items</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-14 h-14 bg-green-tint rounded-sm flex items-center justify-center text-2xl flex-shrink-0">
                🕋
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{item.name}</p>
                <p className="text-xs text-stone">Qty {item.quantity} · {item.tier}</p>
              </div>
              <p className="font-bold text-ink">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping + Totals */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-md p-5">
          <h3 className="font-bold text-ink mb-3">Delivery Address</h3>
          <p className="font-semibold text-ink">{order.shippingAddress.fullName}</p>
          <p className="text-sm text-stone">{order.shippingAddress.phone}</p>
          <p className="text-sm text-stone">{order.shippingAddress.addressLine1}</p>
          <p className="text-sm text-stone">{order.shippingAddress.city}, {order.shippingAddress.province}</p>
        </div>

        <div className="bg-white border border-line rounded-md p-5">
          <h3 className="font-bold text-ink mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-alert">
                <span>Discount</span>
                <span>−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone">Shipping</span>
              <span>{order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-line pt-2">
              <span>Total</span>
              <span className="text-green">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
