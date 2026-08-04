import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import {
  PolicyPage,
  PolicySection,
  PolicyList,
  PolicyNote,
} from '@/components/layout/policy-page'

export const metadata: Metadata = {
  title: 'Return Policy',
  description:
    '7-day returns on Yala Haji orders. What can be returned, what cannot, and how refunds are processed.',
}

const steps = [
  {
    n: 1,
    title: 'Message us within 7 days',
    desc: 'Send your order number and a photo of the item on WhatsApp, or raise a request under Account → Returns.',
  },
  {
    n: 2,
    title: 'We confirm eligibility',
    desc: 'Our team reviews the request and replies with a pickup or drop-off instruction, usually the same day.',
  },
  {
    n: 3,
    title: 'Send the item back',
    desc: 'Pack the item with its original packaging and tags. For faulty or wrong items, we arrange and pay for collection.',
  },
  {
    n: 4,
    title: 'Refund or exchange',
    desc: 'Once received and inspected, your refund or replacement is processed within 5–7 business days.',
  },
]

export default async function ReturnsPage() {
  const locale = await getLocale()

  return (
    <PolicyPage
      eyebrow="Support"
      title="Return Policy"
      intro="You have 7 days from delivery to return most items. Here is exactly how it works."
      updated="2026-08-05"
      locale={locale}
    >
      <PolicySection heading="The 7-day window">
        <p>
          Returns are accepted within{' '}
          <strong className="text-ink">7 days of delivery</strong>. To be
          eligible, the item must be unused, in its original condition, and
          returned with all original packaging, tags and any free gifts included
          in the order.
        </p>
      </PolicySection>

      <PolicySection heading="How to return an item">
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4 border border-line rounded-sm p-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green text-white text-xs font-bold flex items-center justify-center">
                {s.n}
              </span>
              <div>
                <h3 className="font-bold text-ink text-sm mb-1">{s.title}</h3>
                <p className="text-sm text-ink-2 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PolicySection>

      <PolicySection heading="What cannot be returned">
        <p>
          For reasons of hygiene, religious use and product safety, the following
          are not eligible for return unless they arrive faulty, damaged or
          incorrect:
        </p>
        <PolicyList
          items={[
            'Ihram cloth that has been worn, washed or removed from its sealed packaging.',
            'Attars, perfumes and oils once the seal is broken.',
            'Toiletries, soaps, lotions and other personal-care items once opened.',
            'Dates, Zam Zam water and any other consumable items.',
            'Undergarments, socks and hijab caps.',
            'Items marked Final Sale or Clearance on the product page.',
            'Custom-built kits where items were selected individually, unless an item is faulty.',
          ]}
        />
        <PolicyNote>
          <strong className="text-ink">Damaged or wrong item?</strong> None of
          the exclusions above apply. If we sent the wrong item or it arrived
          damaged, we cover return shipping and replace or refund it in full —
          just send us a photo within 48 hours of delivery.
        </PolicyNote>
      </PolicySection>

      <PolicySection heading="Return shipping costs">
        <PolicyList
          items={[
            <>
              <strong className="text-ink">We pay</strong> when the item is
              faulty, damaged in transit, or not what you ordered.
            </>,
            <>
              <strong className="text-ink">You pay</strong> when returning
              because of a change of mind, wrong size ordered, or no longer
              needed. This is typically ₨250–₨400 depending on your city.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Refunds">
        <p>
          Refunds are issued once the returned item has been received and
          inspected — normally within{' '}
          <strong className="text-ink">5–7 business days</strong>.
        </p>
        <PolicyList
          items={[
            'JazzCash and Easypaisa refunds are sent back to the same wallet number used at checkout.',
            'Bank transfer refunds are sent to an account you nominate, and may take an additional 2–3 business days to clear.',
            'Cash-on-delivery orders are refunded by mobile wallet or bank transfer, since no card was charged.',
            'Original shipping charges are refunded only where the return is our fault.',
          ]}
        />
      </PolicySection>

      <PolicySection heading="Exchanges">
        <p>
          Size and colour exchanges on abayas, thobes and ihram are handled as a
          return followed by a new order. Message us first — if the replacement
          is in stock we will reserve it while your return is in transit so you
          do not lose the item.
        </p>
      </PolicySection>

      <PolicySection heading="Cancelling an order">
        <p>
          Orders can be cancelled free of charge any time before dispatch. Once
          the parcel has been handed to the courier it must be processed as a
          return instead.
        </p>
      </PolicySection>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link href={`/${locale}/account/returns`} className="btn-primary">
          Start a return <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href={`/${locale}/shipping`} className="btn-outline">
          Read shipping policy
        </Link>
      </div>
    </PolicyPage>
  )
}
