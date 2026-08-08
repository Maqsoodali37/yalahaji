'use client'

import { use } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle, Clock, Package, Truck, Home, ChevronRight, XCircle, MapPin,
} from 'lucide-react'
import { fetchMyOrder } from '@/lib/api'
import { formatPrice, cn } from '@/lib/utils'
import { formatAddressLines } from '@/lib/address'
import { ProductImage } from '@/components/ui/product-image'
import {
  FULFILMENT_STEPS,
  PAYMENT_STATUS_CLASS,
  SHIPPING_METHOD_LABEL,
  fulfilmentState,
  isTerminalStatus,
  paymentLabel,
} from '@/lib/order-status'
import type { Order, OrderStatus } from '@/types'

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

/**
 * The moment each stage was reached, keyed by status.
 *
 * Reads `timestamp`, not `createdAt`: `adaptOrder` normalises the wire
 * timeline into the storefront's own shape and fills in the stages ahead as
 * incomplete, so an entry existing does not mean it has happened — only a
 * `timestamp` does.
 */
function reachedAt(order: Order): Map<OrderStatus, string> {
  return new Map(
    order.timeline
      .filter((t) => Boolean(t.timestamp))
      .map((t) => [t.status, t.timestamp as string]),
  )
}

function ProgressTrack({ order }: { order: Order }) {
  const locale = useLocale()
  const reached = reachedAt(order)
  const currentIdx = FULFILMENT_STEPS.indexOf(order.status)

  return (
    <div className="relative">
      <div className="flex items-start justify-between relative">
        {/* Logical inset so the connector runs the right way in Urdu/Arabic. */}
        <div className="absolute top-5 start-0 end-0 h-0.5 bg-line" />
        <div
          className="absolute top-5 start-0 h-0.5 bg-green transition-all"
          style={{
            width: `${Math.max(0, currentIdx / (FULFILMENT_STEPS.length - 1)) * 100}%`,
          }}
        />

        {FULFILMENT_STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s]
          const done = i <= currentIdx
          const at = reached.get(s)
          return (
            <div key={s} className="flex flex-col items-center z-10 flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  done ? 'border-green bg-green text-white' : 'border-line bg-white text-stone',
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p
                className="text-[10px] font-medium mt-1.5 text-center leading-tight max-w-[64px]"
                style={{ color: done ? 'var(--green)' : 'var(--stone)' }}
              >
                {STEP_LABELS[s]}
              </p>
              {/* Only for stages actually recorded — projecting a date onto a
                  step that has not happened would read as a promise. */}
              {at && (
                <p className="text-[9px] text-stone mt-0.5 text-center leading-tight">
                  {new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A cancelled or refunded order gets its real history rather than a progress
 * track. Projecting the remaining steps onto an order that is not going
 * anywhere would show a half-full bar toward a delivery that will never come.
 */
function TerminalTimeline({ order }: { order: Order }) {
  const locale = useLocale()
  const tStatus = useTranslations('account.orderStatus')

  return (
    <ol className="space-y-3">
      {order.timeline.map((entry, i) => (
        <li key={`${entry.status}-${i}`} className="flex gap-3">
          <div className="mt-0.5">
            {isTerminalStatus(entry.status) ? (
              <XCircle className="w-4 h-4 text-alert" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{tStatus(entry.status)}</p>
            {entry.timestamp && (
              <p className="text-xs text-stone">
                {new Date(entry.timestamp).toLocaleString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = useLocale()
  const tStatus = useTranslations('account.orderStatus')
  // The route segment carries the order NUMBER (YH-2026-1001-K7QX9M) — that is
  // the identifier the customer sees and the one /orders/:number is keyed on.
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

  const isCod = order.paymentMethod === 'cod'
  const fulfilment = fulfilmentState(order.status)
  const addressLines = formatAddressLines(order.shippingAddress)
  const goodsTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 text-sm text-stone">
        <Link href={`/${locale}/account/orders`} className="hover:text-green">
          My Orders
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium">{order.number}</span>
      </nav>

      {/* ── Order information ──────────────────────────────────────── */}
      <div className="bg-white border border-line rounded-md p-6">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="font-bold text-ink text-xl">{order.number}</h2>
            <p className="text-sm text-stone mt-0.5">
              Placed{' '}
              {new Date(order.createdAt).toLocaleString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={cn(
                  'text-[11px] font-semibold px-1.5 py-0.5 rounded-sm',
                  PAYMENT_STATUS_CLASS[order.paymentStatus],
                )}
              >
                {paymentLabel(order.paymentStatus, isCod)}
              </span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-paper border border-line text-stone">
                {fulfilment.label}
              </span>
            </div>
          </div>
          <p className="font-bold text-green text-xl">{formatPrice(order.total)}</p>
        </div>

        {isTerminalStatus(order.status) ? (
          <TerminalTimeline order={order} />
        ) : (
          <ProgressTrack order={order} />
        )}
      </div>

      {/* ── Shipping information ───────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-md p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green" />
            Delivery Address
          </h3>
          {/*
            Read from the order's own frozen copy of the address, not from the
            customer's saved one. Editing a saved address must not change where
            a delivered parcel is recorded as having gone.
          */}
          {order.shippingAddress.fullName ? (
            <>
              <p className="font-semibold text-ink">{order.shippingAddress.fullName}</p>
              <p className="text-sm text-stone">{order.shippingAddress.phone}</p>
              {order.shippingAddress.email && (
                <p className="text-sm text-stone">{order.shippingAddress.email}</p>
              )}
              {addressLines.map((line) => (
                <p key={line} className="text-sm text-stone">
                  {line}
                </p>
              ))}
            </>
          ) : (
            <p className="text-sm text-stone">No delivery address recorded on this order.</p>
          )}
        </div>

        <div className="bg-white border border-line rounded-md p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-stone" />
            Billing Address
          </h3>
          {/*
            Stated rather than repeated. Cash on delivery is the only payment
            method, so checkout collects one address and the order carries one
            snapshot — printing the same six lines twice under two headings
            would imply the customer had chosen them separately.
          */}
          <p className="text-sm text-stone">Same as the delivery address.</p>
          <p className="text-xs text-stone mt-2">
            Paid in cash on delivery, so no separate billing address was needed.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-md p-5">
          <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-green" />
            Shipment
          </h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Method</dt>
              <dd className="text-ink text-end">
                {SHIPPING_METHOD_LABEL[order.shippingMethod] ?? order.shippingMethod}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Status</dt>
              <dd className="text-ink text-end">{tStatus(order.status)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Payment</dt>
              <dd className="text-ink text-end capitalize">
                {order.paymentMethod.replace('_', ' ')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Tracking</dt>
              <dd className="text-end">
                {/* No invented placeholder. A courier reference the shop does
                    not have yet is stated as absent rather than dashed out in
                    a way that looks like a value. */}
                {order.trackingNumber ? (
                  <code className="text-ink select-all">{order.trackingNumber}</code>
                ) : (
                  <span className="text-stone">Not assigned yet</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Ordered items ──────────────────────────────────────────── */}
      <div className="bg-white border border-line rounded-md p-5">
        <h3 className="font-bold text-ink mb-4">
          Items ({order.items.reduce((n, i) => n + i.quantity, 0)})
        </h3>
        <div className="divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-14 h-14 flex-shrink-0 rounded-sm overflow-hidden bg-green-tint">
                <ProductImage src={item.image} alt={item.name} />
              </div>
              <div className="flex-1 min-w-0">
                {/* Links to the product where the order line recorded a slug.
                    An older line, or one whose product has since been removed,
                    renders as plain text rather than a link to a 404. */}
                {item.slug ? (
                  <Link
                    href={`/${locale}/products/${item.slug}`}
                    className="font-semibold text-ink hover:text-green transition-colors"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <p className="font-semibold text-ink">{item.name}</p>
                )}
                <p className="text-xs text-stone mt-0.5">
                  {[item.tier, item.size, item.color, item.scent].filter(Boolean).join(' · ')}
                </p>
                {item.sku && (
                  <p className="text-xs text-stone">
                    SKU <code className="select-all">{item.sku}</code>
                  </p>
                )}
                <p className="text-xs text-stone mt-0.5">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
                {item.hasGiftWrap && (
                  <p className="text-xs text-green mt-0.5">Gift wrapped</p>
                )}
              </div>
              <p className="font-bold text-ink flex-shrink-0">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Order summary ──────────────────────────────────────────── */}
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
            {/*
              The COD surcharge rides on shippingCost, so this line is the two
              combined. Splitting them here would need a column the order does
              not carry, and inventing the split is worse than one honest line.
            */}
            <span>{order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-stone">Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-line pt-2">
            <span>Grand Total</span>
            <span className="text-green">{formatPrice(order.total)}</span>
          </div>
          {/*
            Shown only when the recomputed line total disagrees with the stored
            subtotal — which happens when a line was edited after the fact. It
            is a nudge to contact support, not a calculation the customer has
            to reconcile themselves.
          */}
          {Math.abs(goodsTotal - order.subtotal) > 0.01 && (
            <p className="text-xs text-stone pt-1">
              This order was adjusted after it was placed. Contact us if the total
              does not look right.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
