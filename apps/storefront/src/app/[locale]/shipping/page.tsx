import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import {
  PolicyPage,
  PolicySection,
  PolicyList,
  PolicyNote,
} from '@/components/layout/policy-page'
import { formatPrice } from '@/lib/utils'
import { fetchSettings } from '@/lib/api'

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description:
    'Delivery times, shipping charges and cash-on-delivery terms for Yala Haji orders across Pakistan.',
}

export default async function ShippingPage() {
  const locale = await getLocale()

  // A shipping policy quoting a threshold the checkout does not use is the
  // worst version of this bug — it is the page a customer is sent to when they
  // query the charge. `fetchSettings` is revalidated every 60s, so this is a
  // cached read, not a round trip per visit.
  const settings = await fetchSettings()
  const threshold = formatPrice(settings.freeShippingThreshold)
  const standard = formatPrice(settings.standardShippingCost)
  const express = formatPrice(settings.expressShippingCost)

  return (
    <PolicyPage
      eyebrow="Support"
      title="Shipping Policy"
      intro="How and when your order reaches you, what it costs, and how cash on delivery works."
      updated="2026-08-05"
      locale={locale}
    >
      <PolicySection heading="Delivery charges">
        <div className="border border-line rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper border-b border-line">
                <th className="text-start font-semibold text-ink px-4 py-3">Order value</th>
                <th className="text-start font-semibold text-ink px-4 py-3">Shipping</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="px-4 py-3">{threshold} and above</td>
                <td className="px-4 py-3">
                  <span className="font-bold text-green">Free</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Below {threshold}</td>
                <td className="px-4 py-3 font-semibold text-ink">{standard}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The free-shipping threshold is calculated on your order subtotal after
          any discount or coupon has been applied.
        </p>
      </PolicySection>

      <PolicySection heading="Delivery time">
        <p>
          We offer <strong className="text-ink">Standard Delivery</strong> on all
          orders, which arrives in <strong className="text-ink">3–5 business
          days</strong> once dispatched.
        </p>
        <PolicyList
          items={[
            'Orders placed before 3:00 PM on a business day are usually dispatched the same day.',
            'Orders placed after 3:00 PM, or on Sunday or a public holiday, are dispatched the next business day.',
            'Remote and interior areas may take 1–2 additional days beyond the standard window.',
          ]}
        />
        <PolicyNote>
          <strong className="text-ink">Travelling soon?</strong> If your
          departure date is close, message us on WhatsApp before ordering and we
          will confirm whether your order can reach you in time.
        </PolicyNote>
      </PolicySection>

      <PolicySection heading="Cash on Delivery — check before you pay">
        <p>
          Cash on Delivery is available nationwide. You are entitled to open the
          parcel and inspect the contents in front of the courier before making
          payment.
        </p>
        <PolicyList
          items={[
            'Confirm the items match your order before handing over cash.',
            'If something is wrong or damaged, you may refuse the parcel at no cost.',
            'Please keep the exact amount ready — couriers often cannot provide change.',
          ]}
        />
      </PolicySection>

      <PolicySection heading="Order tracking">
        <p>
          Once your parcel is dispatched you will receive a tracking number by
          WhatsApp on the number provided at checkout. You can also view live
          status under <strong className="text-ink">Account → My Orders</strong>.
        </p>
      </PolicySection>

      <PolicySection heading="Failed and returned deliveries">
        <p>
          Couriers attempt delivery up to three times. If all attempts fail, or
          the number provided is unreachable, the parcel is returned to us.
        </p>
        <PolicyList
          items={[
            'Prepaid orders are refunded in full, minus the original shipping charge if one was paid.',
            'Repeated refusal of cash-on-delivery orders may result in future orders requiring advance payment.',
            'Please make sure your address and phone number are correct before placing an order.',
          ]}
        />
      </PolicySection>

      <PolicySection heading="Areas we deliver to">
        <p>
          We ship to all major cities and towns across Pakistan, including
          Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar,
          Quetta and Hyderabad, as well as smaller localities served by our
          courier partners.
        </p>
        <p>
          We do not currently ship internationally. If you need delivery to an
          address outside Pakistan, contact us on WhatsApp and we will advise
          whether a special arrangement is possible.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}
