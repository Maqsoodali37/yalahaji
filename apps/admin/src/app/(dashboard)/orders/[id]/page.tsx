'use client'

import { use, useState } from 'react'
import { DEFAULT_COUNTRY } from '@/lib/address'
import Link from 'next/link'
import { ArrowLeft, MapPin, User, Printer, Truck, CreditCard } from 'lucide-react'
import { useOrder, useSetTracking, useSetPaymentStatus } from '@/hooks/use-orders'
import { StatusUpdater } from '@/components/orders/status-updater'
import { Panel, PanelHeader, PageHeader, Badge, ErrorState, Skeleton } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input, Select, FormField } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import {
  formatPrice,
  formatDateTime,
  statusClasses,
  paymentStatusClasses,
  titleCase,
  PAYMENT_STATUSES,
} from '@/lib/utils'
import type { PaymentStatus } from '@/types'

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: order, isLoading, isError, error, refetch } = useOrder(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Order not found.'}
        onRetry={() => void refetch()}
      />
    )
  }

  /**
   * The address this order actually shipped to.
   *
   * Read from the order's own frozen `shipping*` columns, never through
   * `order.address` — that relation points at a row the customer can still
   * edit or delete, so rendering it showed staff where the customer lives
   * *now* rather than where the parcel went. For a delivery dispute those are
   * exactly the two things that must not be confused.
   *
   * The `order.address` fallback covers only orders served by an API instance
   * that predates the snapshot columns, i.e. mid-rolling-deploy. It is last so
   * it can never win over a real snapshot.
   */
  const shipTo = order.shippingFullName
    ? {
        label: order.shippingLabel,
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
        email: order.shippingEmail,
        addressLine1: order.shippingAddressLine1,
        addressLine2: order.shippingAddressLine2,
        area: order.shippingArea,
        city: order.shippingCity,
        province: order.shippingProvince,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode,
      }
    : order.address ?? null

  const customerName = order.user?.name ?? shipTo?.fullName ?? 'Guest'
  const customerPhone = order.user?.phone ?? order.guestPhone ?? shipTo?.phone
  const customerEmail = order.user?.email ?? order.guestEmail ?? shipTo?.email

  return (
    <>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-green mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </Link>

      <PageHeader
        title={order.number}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Badge className={statusClasses(order.status)}>{titleCase(order.status)}</Badge>
            <Badge className={paymentStatusClasses(order.paymentStatus)}>
              {titleCase(order.paymentStatus)}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Main column ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Panel className="overflow-hidden">
            <PanelHeader title={`Items (${order.items.length})`} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Variant</th>
                    <th className="text-right">Unit price</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-ink">
                        {item.product?.nameEn ?? item.name ?? '—'}
                      </td>
                      <td className="text-ink-2">
                        <span className="font-mono text-[11px]">{item.variant?.sku ?? '—'}</span>
                        <p className="text-[11px] text-ink-3">
                          {[
                            item.variant?.tier ?? item.tier,
                            item.variant?.size ?? item.size,
                            item.variant?.color ?? item.color,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="text-right tabular-nums">{formatPrice(item.price)}</td>
                      <td className="text-right tabular-nums">{item.quantity}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {/* No `total` column — a line total is unit price × quantity. */}
                        {formatPrice(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              <Row label="Shipping" value={formatPrice(order.shippingCost)} />
              {order.discount > 0 && (
                <Row
                  label={`Discount${order.coupon ? ` (${order.coupon.code})` : ''}`}
                  value={`−${formatPrice(order.discount)}`}
                  tone="green"
                />
              )}
              {order.tax > 0 && <Row label="Tax" value={formatPrice(order.tax)} />}
              <div className="flex justify-between pt-2 mt-2 border-t border-line">
                <span className="font-bold text-ink">Total</span>
                <span className="font-bold text-ink tabular-nums">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </Panel>

          {/* Timeline */}
          <Panel>
            <PanelHeader title="Timeline" />
            <div className="panel-pad">
              {order.timeline.length === 0 ? (
                <p className="text-sm text-ink-3">No status changes recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {order.timeline.map((entry, i) => (
                    <li key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`h-2 w-2 rounded-full mt-1.5 ${
                            i === 0 ? 'bg-green' : 'bg-line'
                          }`}
                        />
                        {i < order.timeline.length - 1 && (
                          <span className="w-px flex-1 bg-line mt-1" />
                        )}
                      </div>
                      <div className="pb-1">
                        <Badge className={statusClasses(entry.status)}>
                          {titleCase(entry.status)}
                        </Badge>
                        {entry.note && (
                          <p className="text-sm text-ink-2 mt-1.5">{entry.note}</p>
                        )}
                        <p className="text-[11px] text-ink-3 mt-1">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Panel>
        </div>

        {/* ─── Side column ───────────────────────────────── */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Update status" />
            <div className="panel-pad">
              <StatusUpdater orderId={order.id} current={order.status} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Payment" />
            <div className="panel-pad">
              <PaymentStatusControl orderId={order.id} current={order.paymentStatus} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Customer" />
            <div className="panel-pad space-y-3 text-sm">
              <div className="flex gap-2.5">
                <User className="h-4 w-4 text-ink-3 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium text-ink">{customerName}</p>
                  {customerPhone && <p className="text-ink-3">{customerPhone}</p>}
                  {customerEmail && <p className="text-ink-3 break-all">{customerEmail}</p>}
                  {!order.userId && (
                    <Badge className="bg-paper text-ink-3 mt-1">Guest checkout</Badge>
                  )}
                </div>
              </div>

              {shipTo && (
                <div className="flex gap-2.5 pt-3 border-t border-line">
                  <MapPin className="h-4 w-4 text-ink-3 shrink-0 mt-0.5" aria-hidden />
                  <address className="not-italic text-ink-2 leading-relaxed">
                    {shipTo.fullName && (
                      <>
                        <span className="text-ink font-medium">{shipTo.fullName}</span>
                        {shipTo.label && (
                          <span className="text-ink-3"> · {shipTo.label}</span>
                        )}
                        <br />
                      </>
                    )}
                    {shipTo.addressLine1}
                    {shipTo.addressLine2 && <>, {shipTo.addressLine2}</>}
                    <br />
                    {shipTo.area && <>{shipTo.area}, </>}
                    {shipTo.city}
                    {shipTo.province && <>, {shipTo.province}</>}
                    {shipTo.postalCode && <> {shipTo.postalCode}</>}
                    {/* Only when it is not the one every order has — a line
                        reading "Pakistan" under every Pakistani address is
                        noise until the shop ships abroad, at which point it
                        appears exactly where it matters. */}
                    {shipTo.country && shipTo.country !== DEFAULT_COUNTRY && (
                      <>
                        <br />
                        {shipTo.country}
                      </>
                    )}
                  </address>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Fulfilment" />
            <div className="panel-pad space-y-3 text-sm">
              <Row label="Payment method" value={titleCase(order.paymentMethod)} />
              <Row label="Shipping method" value={titleCase(order.shippingMethod)} />
              <div className="pt-3 border-t border-line">
                <TrackingEditor orderId={order.id} current={order.trackingNumber ?? ''} />
              </div>
              {order.notes && (
                <div className="pt-3 border-t border-line">
                  <p className="text-xs font-semibold text-ink-2 mb-1">Customer note</p>
                  <p className="text-ink-3">{order.notes}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'green'
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-3">{label}</span>
      <span
        className={`tabular-nums text-right ${
          tone === 'green' ? 'text-green font-medium' : 'text-ink-2'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/** Assign or update the courier tracking number. */
function TrackingEditor({ orderId, current }: { orderId: string; current: string }) {
  const { toast } = useToast()
  const setTracking = useSetTracking()
  const [value, setValue] = useState(current)

  async function save() {
    const trimmed = value.trim()
    if (!trimmed) {
      toast('Enter a tracking number first.', 'error')
      return
    }
    try {
      await setTracking.mutateAsync({ id: orderId, trackingNumber: trimmed })
      toast('Tracking number saved.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save tracking.', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Truck className="h-4 w-4 text-ink-3 shrink-0" aria-hidden />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Courier tracking number"
        aria-label="Tracking number"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={save}
        loading={setTracking.isPending}
        disabled={value.trim() === current.trim()}
      >
        Save
      </Button>
    </div>
  )
}

/** Move the payment status by hand — how a COD order becomes paid on collection. */
function PaymentStatusControl({ orderId, current }: { orderId: string; current: PaymentStatus }) {
  const { toast } = useToast()
  const setPayment = useSetPaymentStatus()
  const [next, setNext] = useState<PaymentStatus | ''>('')

  async function apply() {
    if (!next || next === current) return
    try {
      await setPayment.mutateAsync({ id: orderId, paymentStatus: next })
      toast(`Payment marked ${titleCase(next)}.`)
      setNext('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update payment.', 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <CreditCard className="h-4 w-4 text-ink-3 shrink-0" aria-hidden />
        <span className="text-ink-3">Current</span>
        <Badge className={paymentStatusClasses(current)}>{titleCase(current)}</Badge>
      </div>
      <FormField label="Change to" htmlFor="payment-status">
        <Select
          id="payment-status"
          value={next}
          onChange={(e) => setNext(e.target.value as PaymentStatus)}
        >
          <option value="">Select…</option>
          {PAYMENT_STATUSES.filter((s) => s !== current).map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </FormField>
      <Button
        className="w-full"
        size="sm"
        onClick={apply}
        disabled={!next}
        loading={setPayment.isPending}
      >
        Update payment
      </Button>
    </div>
  )
}
