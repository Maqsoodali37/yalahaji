'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Package, ChevronRight, RotateCcw, Truck } from 'lucide-react'
import { fetchMyOrders, ORDERS_PER_PAGE } from '@/lib/api'
import { formatPrice, cn } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { AccountQueryError } from '@/components/account/query-error'
import { Pagination } from '@/components/account/pagination'
import {
  ORDER_STATUS_CLASS,
  PAYMENT_STATUS_CLASS,
  SHIPPING_METHOD_LABEL,
  fulfilmentState,
  paymentLabel,
} from '@/lib/order-status'
import type { Order } from '@/types'

/** "Showing 1–10 of 125 orders" — computed from the response, not the request. */
function rangeLabel(page: number, limit: number, total: number): string {
  const first = (page - 1) * limit + 1
  const last = Math.min(page * limit, total)
  return `Showing ${first}–${last} of ${total} order${total === 1 ? '' : 's'}`
}

function OrderRow({ order }: { order: Order }) {
  const locale = useLocale()
  const router = useRouter()
  const tStatus = useTranslations('account.orderStatus')
  const addItem = useCartStore((s) => s.addItem)

  const fulfilment = fulfilmentState(order.status)
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const href = `/${locale}/account/orders/${encodeURIComponent(order.number)}`

  /**
   * Put every line back in the basket and go there.
   *
   * Deliberately routed to the cart rather than straight to checkout: prices
   * move, variants get discontinued and stock runs out between orders, so the
   * customer needs to see what actually landed before they pay for it. The
   * cart store syncs each line to the API in the background and surfaces its
   * own error if a variant no longer exists.
   */
  const reorder = () => {
    for (const item of order.items) {
      addItem(
        {
          productId: item.productId,
          variantId: item.variantId,
          slug: item.slug,
          name: item.name,
          image: item.image,
          tier: item.tier,
          size: item.size,
          color: item.color,
          colorHex: item.colorHex,
          scent: item.scent,
          // The live price, not the price paid. Reordering at a stale price
          // would quote a figure the API then refuses to honour, since it
          // recomputes every total from the database at checkout.
          price: item.price,
          hasGiftWrap: item.hasGiftWrap,
          giftMessage: item.giftMessage,
        },
        item.quantity,
      )
    }
    router.push(`/${locale}/cart`)
  }

  return (
    <div className="bg-white border border-line rounded-md p-5 hover:border-green/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <Link href={href} className="font-bold text-ink hover:text-green transition-colors">
            {order.number}
          </Link>
          <p className="text-xs text-stone mt-0.5">
            {new Date(order.createdAt).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-1 rounded-sm flex-shrink-0',
            ORDER_STATUS_CLASS[order.status],
          )}
        >
          {tStatus(order.status)}
        </span>
      </div>

      {/*
        Two badges, not one. For cash on delivery an order is `delivered` and
        still `unpaid` for as long as it takes the courier to remit the cash,
        so collapsing them told customers their delivered order was unpaid.
      */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className={cn(
            'text-[11px] font-semibold px-1.5 py-0.5 rounded-sm',
            PAYMENT_STATUS_CLASS[order.paymentStatus],
          )}
        >
          {paymentLabel(order.paymentStatus, order.paymentMethod === 'cod')}
        </span>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-paper border border-line text-stone">
          {fulfilment.label}
        </span>
        <span className="text-[11px] text-stone">
          {SHIPPING_METHOD_LABEL[order.shippingMethod] ?? order.shippingMethod}
        </span>
      </div>

      {order.trackingNumber && (
        <p className="flex items-center gap-1.5 text-xs text-stone mb-3">
          <Truck className="w-3.5 h-3.5 flex-shrink-0" />
          Tracking <code className="text-ink select-all">{order.trackingNumber}</code>
        </p>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-line pt-3">
        <p className="text-sm text-stone">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </p>
        <p className="font-bold text-green">{formatPrice(order.total)}</p>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        <Link href={href} className="btn-outline text-sm py-1.5 px-3">
          View Details
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
        {/*
          Hidden on cancelled and refunded orders. Those lines were never
          delivered, and offering "buy this again" against an order the shop
          could not fulfil is the wrong thing to put in front of someone.
        */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <button onClick={reorder} className="btn-outline text-sm py-1.5 px-3">
            <RotateCcw className="w-3.5 h-3.5" />
            Reorder
          </button>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const locale = useLocale()
  const t = useTranslations('account')
  const [page, setPage] = useState(1)

  // Client-side rather than server-rendered: the customer token lives in
  // localStorage, which a server component cannot read. Account pages have no
  // SEO value, so nothing is lost.
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => fetchMyOrders(page, ORDERS_PER_PAGE),
    // Keeps the previous page on screen while the next one loads, so paging
    // does not collapse the list to a skeleton and jump the scroll position.
    placeholderData: keepPreviousData,
  })

  const orders = data?.items ?? []

  const heading = <h2 className="font-bold text-ink text-xl">{t('orders')}</h2>

  if (isLoading) {
    return (
      <div className="space-y-4">
        {heading}
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
        {heading}
        <AccountQueryError
          error={error}
          onRetry={() => refetch()}
          title="Could not load your orders"
          what="orders"
        />
      </div>
    )
  }

  // Only an empty *first* page means the account has no orders. An empty later
  // page means someone deep-linked past the end — sending them back to page 1
  // is more useful than telling them they have never ordered anything.
  if (orders.length === 0 && page > 1) {
    return (
      <div className="space-y-4">
        {heading}
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <p className="font-semibold text-ink mb-1">Nothing on this page</p>
          <p className="text-sm text-stone mb-4">
            You have {data?.total ?? 0} orders in total.
          </p>
          <button onClick={() => setPage(1)} className="btn-primary">
            Back to the first page
          </button>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        {heading}
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-5">
            <Package className="w-9 h-9 text-green" />
          </div>
          <p className="font-semibold text-ink mb-1">{t('noOrders')}</p>
          <p className="text-sm text-stone mb-5">
            You haven&apos;t placed any orders yet.
          </p>
          <Link href={`/${locale}/shop`} className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        {heading}
        {data && (
          <p aria-live="polite" className="text-sm text-stone">
            {rangeLabel(data.page, data.limit, data.total)}
          </p>
        )}
      </div>

      <div className={cn('space-y-4', isPlaceholderData && 'opacity-60 transition-opacity')}>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onChange={setPage}
          label="Order history pages"
        />
      )}
    </div>
  )
}
