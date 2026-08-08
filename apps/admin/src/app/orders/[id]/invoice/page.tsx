'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { AuthGate } from '@/components/layout/auth-gate'
import { useOrder } from '@/hooks/use-orders'
import { api } from '@/lib/api'
import { DEFAULT_COUNTRY } from '@/lib/address'
import { formatPrice, formatDate, titleCase } from '@/lib/utils'

/**
 * `store_name` / `store_email` / `store_phone` via `GET /settings/public`,
 * not the admin `/settings/admin` listing `useSettings` reads elsewhere.
 * Two reasons: `/settings/admin` is restricted to `admin`/`manager`
 * (PROJECT_SPEC.md — support and fulfilment have no reason to *edit* shop
 * config), and printing an invoice is squarely a fulfilment/support task, so
 * gating the letterhead on an admin-only read would 403 the exact staff who
 * need this page. And these three keys are the same `is_public` rows the
 * storefront's own header/footer read — the public feed is the correct
 * source for customer-facing company identity, not a side effect of using
 * the admin listing because it happened to be already wired up.
 */
function usePublicStoreSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.get<Record<string, unknown>>('/settings/public'),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * The printable invoice — a standalone route, deliberately outside the
 * `(dashboard)` route group so it renders with none of the sidebar, topbar or
 * dashboard chrome (see that layout's `Shell`). `AuthGate` is applied
 * directly here rather than inherited, so the page is still staff-only
 * without dragging in navigation nothing here needs.
 *
 * Opened in a new tab from the order detail page's Print button, so printing
 * (or "Save as PDF") from here never captures anything but the invoice
 * itself — no admin buttons, no filters, no sidebar in the printout.
 */
export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <InvoiceScreen id={id} />
    </AuthGate>
  )
}

/** Look up one setting's value by key, falling back when it is unset — never a hardcoded value pretending to be configured. */
function settingValue(settings: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const value = settings?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function InvoiceScreen({ id }: { id: string }) {
  const { data: order, isLoading, isError } = useOrder(id)
  // store_name / store_email / store_phone — the only company-identity
  // settings that exist today (see TASKS.md, "General store information": a
  // business address and a logo slot are not built yet). No address or logo
  // line is invented in their place.
  const settings = usePublicStoreSettings()

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-ink-3">
        Loading invoice…
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <p className="text-sm font-semibold text-ink">Could not load this order.</p>
          <Link href="/orders" className="text-sm text-green hover:underline mt-2 inline-block">
            Back to orders
          </Link>
        </div>
      </div>
    )
  }

  const storeName = settingValue(settings.data, 'store_name', 'Yala Haji')
  const storeEmail = settingValue(settings.data, 'store_email', '')
  const storePhone = settingValue(settings.data, 'store_phone', '')

  // Same snapshot-first rule as the order detail page: the order's own
  // `shipping*` columns are what actually shipped, never the live `address`
  // relation — see PROJECT_SPEC.md, "An order's delivery address is a
  // snapshot, not a link".
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
    <div className="invoice-page min-h-screen bg-[#f4f4f2] print:bg-white">
      {/* Screen-only toolbar — never printed, never part of a "Save as PDF" capture. */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-8">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-green"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md bg-green px-3.5 py-2 text-xs font-semibold text-white hover:bg-green/90"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save as PDF
        </button>
      </div>

      {/* The A4 sheet. Sizing and margins are set by the `@page` rule in
          globals.css scoped to `.invoice-sheet` — width here mirrors that for
          an accurate on-screen preview of what will print. */}
      <div className="invoice-sheet mx-auto my-6 max-w-[210mm] bg-white p-10 text-[#111] shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* ── Letterhead ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b-2 border-[#111] pb-5">
          <div>
            <p className="serif text-2xl font-semibold tracking-tight">{storeName}</p>
            <div className="mt-1 space-y-0.5 text-[11px] text-[#555]">
              {storeEmail && <p>{storeEmail}</p>}
              {storePhone && <p>{storePhone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide">Invoice</p>
            <p className="mt-1 font-mono text-sm">{order.number}</p>
            <p className="mt-0.5 text-[11px] text-[#555]">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        {/* ── Status + parties ───────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-6 text-[11px]">
          <div>
            <span className="rounded-full border border-[#111] px-2.5 py-0.5 font-semibold uppercase tracking-wide">
              {titleCase(order.status)}
            </span>
            <span className="ms-2 rounded-full border border-[#111] px-2.5 py-0.5 font-semibold uppercase tracking-wide">
              Payment: {titleCase(order.paymentStatus)}
            </span>
          </div>
          <div className="text-right text-[#555]">
            <p>Payment method: {titleCase(order.paymentMethod)}</p>
            <p>Shipping method: {titleCase(order.shippingMethod)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#888]">Billed to</p>
            <div className="mt-1.5 text-[12.5px] leading-relaxed">
              <p className="font-semibold">{customerName}</p>
              {customerPhone && <p>{customerPhone}</p>}
              {customerEmail && <p>{customerEmail}</p>}
              {!order.userId && <p className="text-[#888]">Guest checkout</p>}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#888]">
              Shipping address
            </p>
            {shipTo ? (
              <address className="mt-1.5 text-[12.5px] not-italic leading-relaxed">
                {shipTo.fullName && (
                  <>
                    <span className="font-semibold">{shipTo.fullName}</span>
                    {shipTo.label && <span className="text-[#888]"> · {shipTo.label}</span>}
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
                {shipTo.country && shipTo.country !== DEFAULT_COUNTRY && (
                  <>
                    <br />
                    {shipTo.country}
                  </>
                )}
              </address>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-[#888]">No address on file.</p>
            )}
            {/* Billing is not collected — Cash on Delivery is the only enabled
                payment method (see PROJECT_SPEC.md, "Billing addresses are out
                of scope while the shop is COD-only"). Stating so here rather
                than printing a second, identical address block under its own
                heading. */}
            <p className="mt-1 text-[10px] text-[#888]">Billing address: same as shipping address.</p>
          </div>
        </div>

        {/* ── Line items ─────────────────────────────────────────────── */}
        <table className="mt-8 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-y border-[#111] text-[10px] uppercase tracking-wide">
              <th className="py-2 text-start font-bold">Product</th>
              <th className="py-2 text-start font-bold">Variant</th>
              <th className="py-2 text-end font-bold">Unit price</th>
              <th className="py-2 text-end font-bold">Qty</th>
              <th className="py-2 text-end font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-[#ddd]">
                <td className="py-2.5 pe-3 font-medium">{item.product?.nameEn ?? item.name ?? '—'}</td>
                <td className="py-2.5 pe-3 text-[#555]">
                  {[
                    item.variant?.tier ?? item.tier,
                    item.variant?.size ?? item.size,
                    item.variant?.color ?? item.color,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
                <td className="py-2.5 text-end tabular-nums">{formatPrice(item.price)}</td>
                <td className="py-2.5 text-end tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-end font-semibold tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals ─────────────────────────────────────────────────── */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-[280px] space-y-1.5 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-[#555]">Subtotal</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-[#555]">
                  Discount{order.coupon ? ` (${order.coupon.code})` : ''}
                </span>
                <span className="tabular-nums">−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#555]">Shipping / courier charges</span>
              <span className="tabular-nums">{formatPrice(order.shippingCost)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-[#555]">Tax</span>
                <span className="tabular-nums">{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-[#111] pt-2 text-[14px] font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="mt-6 border-t border-[#ddd] pt-3 text-[11px]">
            <p className="font-bold uppercase tracking-wide text-[#888]">Customer note</p>
            <p className="mt-1 text-[#333]">{order.notes}</p>
          </div>
        )}

        {order.trackingNumber && (
          <p className="mt-3 text-[11px] text-[#555]">
            Courier tracking number: <span className="font-mono">{order.trackingNumber}</span>
          </p>
        )}

        <p className="mt-10 text-center text-[10.5px] text-[#888]">
          Thank you for your order — {storeName}
        </p>
      </div>
    </div>
  )
}
