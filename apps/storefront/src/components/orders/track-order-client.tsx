'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { Search, PackageSearch, AlertCircle, Loader2, Truck } from 'lucide-react'
import { trackOrder, ApiError, type TrackedOrder } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { validate, hasErrors, required, orderNumber, type FieldErrors } from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'
import { SafeImage } from '@/components/ui/safe-image'
import type { OrderStatus } from '@/types'

interface TrackValues {
  number: string
}

const trackRules = {
  number: [required('Enter your order number.'), orderNumber()],
}

/**
 * Timeline order. The API returns newest-first for its own screens; a customer
 * reading a delivery progress list expects it to run forwards.
 */
const STATUS_SEQUENCE: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

export function TrackOrderClient() {
  const locale = useLocale()
  const t = useTranslations('track')
  const tStatus = useTranslations('account.orderStatus')

  const [number, setNumber] = useState('')
  const [errors, setErrors] = useState<FieldErrors<TrackValues>>({})
  const [submitted, setSubmitted] = useState(false)

  const lookup = useMutation<TrackedOrder, unknown, string>({
    mutationFn: (value) => trackOrder(value),
  })

  const revalidate = (next: string) => {
    if (submitted) setErrors(validate({ number: next }, trackRules))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const found = validate({ number }, trackRules)
    setErrors(found)
    if (hasErrors(found)) return

    lookup.mutate(number)
  }

  /**
   * A 404 here means "no order with that number", which for a customer is
   * almost always a typo rather than a missing order — so the message points
   * back at their confirmation instead of implying the order is gone. 429 is
   * called out separately because "try again" is bad advice when the reason
   * is that they already tried too often.
   */
  const errorMessage = (() => {
    const e = lookup.error
    if (!e) return null
    if (e instanceof ApiError) {
      if (e.status === 404) return t('notFound')
      if (e.status === 429) return t('rateLimited')
      if (e.status === 400) return t('notFound')
      if (e.status === 0) return e.message
    }
    return t('genericError')
  })()

  const order = lookup.data

  return (
    <div className="container-max py-10 max-w-2xl">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-4">
          <PackageSearch className="w-7 h-7 text-green" />
        </div>
        <h1 className="serif text-3xl text-ink mb-2">{t('title')}</h1>
        <p className="text-stone text-sm">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="bg-white border border-line rounded-md p-5 mb-6">
        <FormField label={t('label')} error={errors.number} hint={t('hint')} required>
          {(field) => (
            <input
              {...field}
              name="orderNumber"
              className={inputClass(errors.number, 'uppercase tracking-wide')}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value)
                revalidate(e.target.value)
              }}
              placeholder={t('placeholder')}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          )}
        </FormField>

        <button type="submit" className="btn-primary w-full mt-2" disabled={lookup.isPending}>
          {lookup.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('searching')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              {t('submit')}
            </span>
          )}
        </button>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="bg-white border border-alert/30 rounded-md p-5 mb-6 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-alert shrink-0 mt-0.5" />
          <p className="text-sm text-ink">{errorMessage}</p>
        </div>
      )}

      {order && <TrackResult order={order} tStatus={tStatus} t={t} />}

      <p className="text-center text-sm text-stone mt-8">
        <Link href={`/${locale}/login`} className="text-green font-semibold hover:underline">
          {t('signInLink')}
        </Link>{' '}
        {t('signInPrompt')}
      </p>
    </div>
  )
}

function TrackResult({
  order,
  t,
  tStatus,
}: {
  order: TrackedOrder
  t: ReturnType<typeof useTranslations>
  tStatus: ReturnType<typeof useTranslations>
}) {
  const locale = useLocale()

  // Cancelled and refunded are not points on the delivery path, so the
  // progress rail is hidden for them rather than shown stalled at "pending",
  // which would read as though the order were still coming.
  const isOnDeliveryPath = STATUS_SEQUENCE.includes(order.status)
  const reachedIndex = STATUS_SEQUENCE.indexOf(order.status)

  /**
   * When each status was reached, from the timeline the API already returns.
   *
   * The timeline arrives newest-first, so overwriting on each pass leaves the
   * *oldest* entry per status in the map. That is the one wanted: if an order
   * is re-marked `shipped` after a failed delivery attempt, the customer wants
   * the date it first shipped, not the correction.
   */
  const reachedAt = new Map<string, string>()
  for (const entry of order.timeline) {
    reachedAt.set(entry.status, entry.createdAt)
  }

  const formatStamp = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  const placed = new Date(order.createdAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white border border-line rounded-md overflow-hidden">
      <div className="p-5 border-b border-line">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-ink text-lg">{order.number}</p>
            <p className="text-xs text-stone mt-0.5">{t('placed', { date: placed })}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-tint text-green">
            {tStatus(order.status)}
          </span>
        </div>

        {order.trackingNumber && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-stone shrink-0" />
            <span className="text-stone">{t('courierTracking')}:</span>
            <span className="font-semibold text-ink">{order.trackingNumber}</span>
          </div>
        )}
      </div>

      {isOnDeliveryPath ? (
        <div className="p-5 border-b border-line">
          <h2 className="font-semibold text-ink text-sm mb-4">{t('progress')}</h2>
          <ol className="space-y-3">
            {STATUS_SEQUENCE.map((status, i) => {
              const reached = i <= reachedIndex
              const stamp = reachedAt.get(status)

              return (
                <li key={status} className="flex items-baseline gap-3">
                  <span
                    aria-hidden
                    className={`w-2.5 h-2.5 rounded-full shrink-0 translate-y-1 ${
                      reached ? 'bg-green' : 'bg-line'
                    }`}
                  />
                  <span
                    className={`text-sm shrink-0 ${
                      reached ? 'text-ink font-medium' : 'text-stone'
                    }`}
                  >
                    {tStatus(status)}
                  </span>

                  {/*
                    A dotted leader rather than a fixed label column: the status
                    names differ enough in length across en, ur and ar that any
                    fixed width either truncates or leaves a gap in one of them.
                  */}
                  <span aria-hidden className="flex-1 border-b border-dotted border-line" />

                  {stamp ? (
                    <time dateTime={stamp} className="text-xs text-stone shrink-0 tabular-nums">
                      {formatStamp(stamp)}
                    </time>
                  ) : (
                    /*
                      A step that has not happened has no date, and inventing a
                      projected one would be a promise the shop has not made.
                      The dash is marked decorative so a screen reader reads
                      "Processing" and moves on rather than "Processing dash".
                    */
                    <span aria-hidden className="text-xs text-stone shrink-0">
                      —
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ) : (
        /*
          Cancelled and refunded orders have no delivery path to draw, but they
          do have a history the customer may need — particularly the date a
          refund was recorded. Showing the raw timeline beats showing nothing.
        */
        order.timeline.length > 0 && (
          <div className="p-5 border-b border-line">
            <h2 className="font-semibold text-ink text-sm mb-4">{t('progress')}</h2>
            <ol className="space-y-3">
              {order.timeline.map((entry, i) => (
                <li key={`${entry.status}-${i}`} className="flex items-baseline gap-3">
                  <span
                    aria-hidden
                    className="w-2.5 h-2.5 rounded-full shrink-0 translate-y-1 bg-stone/40"
                  />
                  <span className="text-sm text-ink font-medium shrink-0">
                    {tStatus(entry.status)}
                  </span>
                  <span aria-hidden className="flex-1 border-b border-dotted border-line" />
                  <time
                    dateTime={entry.createdAt}
                    className="text-xs text-stone shrink-0 tabular-nums"
                  >
                    {formatStamp(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </div>
        )
      )}

      <div className="p-5">
        <h2 className="font-semibold text-ink text-sm mb-3">{t('items')}</h2>
        <ul className="space-y-3">
          {order.items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm overflow-hidden bg-paper shrink-0">
                <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{item.name}</p>
                <p className="text-xs text-stone">{t('itemQty', { count: item.quantity })}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
          <span className="text-sm text-stone">{t('total')}</span>
          <span className="font-bold text-ink">{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  )
}
