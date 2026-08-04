import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import {
  PolicyPage,
  PolicySection,
  PolicyList,
  PolicyNote,
} from '@/components/layout/policy-page'
import { FREE_SHIPPING_THRESHOLD, formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms governing your use of the Yala Haji website and any order you place with us.',
}

export default async function TermsPage() {
  const locale = await getLocale()
  const threshold = formatPrice(FREE_SHIPPING_THRESHOLD)

  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="These terms govern your use of this website and any order you place with Yala Haji."
      updated="2026-08-05"
      locale={locale}
    >
      <PolicySection heading="1. Acceptance of these terms">
        <p>
          By browsing this website, creating an account or placing an order you
          agree to these Terms &amp; Conditions. If you do not agree with them,
          please do not use the site.
        </p>
        <p>
          We may update these terms from time to time. The version published on
          this page at the moment you place an order is the version that applies
          to that order.
        </p>
      </PolicySection>

      <PolicySection heading="2. Who we are">
        <p>
          &ldquo;Yala Haji&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; and
          &ldquo;our&rdquo; refer to the business trading as Yala Haji, operating
          from Shop 5, Islam Market, Karachi, Pakistan. You can reach us on
          WhatsApp at{' '}
          <a href="https://wa.me/923111234567" className="text-green font-semibold hover:underline">
            +92 311 1234567
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="3. Eligibility">
        <p>
          You must be at least 18 years old, or using the site under the
          supervision of a parent or guardian, to place an order. By ordering you
          confirm that the information you provide is accurate and complete.
        </p>
      </PolicySection>

      <PolicySection heading="4. Products and descriptions">
        <PolicyList
          items={[
            'We describe every product as accurately as we can, but photographs are illustrative and colours may vary slightly between screens and dyeing batches.',
            'Fabric weights, embroidery detail and packaging may differ marginally between production runs.',
            'Products are offered in Economy, Standard and Premium tiers. The tier shown on the product page determines the materials and inclusions you receive.',
            'All items are subject to availability. If an item becomes unavailable after you order, we will contact you to arrange a substitution, partial fulfilment or refund.',
          ]}
        />
        <PolicyNote>
          Where a product is described as suitable for use in ihram, that
          statement refers to the product being scent-free or alcohol-free as
          applicable. It is not religious advice. Rulings on ihram vary between
          schools of thought, and you remain responsible for confirming
          permissibility with a qualified scholar.
        </PolicyNote>
      </PolicySection>

      <PolicySection heading="5. Pricing and payment">
        <PolicyList
          items={[
            'All prices are listed in Pakistani Rupees (₨) and are inclusive of applicable taxes unless stated otherwise.',
            <>
              Shipping is free on orders of {threshold} and above; a flat charge
              of ₨299 applies below that amount.
            </>,
            'We accept JazzCash, Easypaisa, bank transfer and Cash on Delivery.',
            'We reserve the right to correct pricing errors. If a product was listed at an incorrect price, we will contact you before dispatch and you may confirm at the corrected price or cancel for a full refund.',
            'Promotional codes cannot be combined unless expressly stated, and may be withdrawn at any time.',
          ]}
        />
      </PolicySection>

      <PolicySection heading="6. Orders and acceptance">
        <p>
          Your order is an offer to buy. A contract is formed only when we
          dispatch the goods and confirm dispatch to you. We may decline or
          cancel an order where stock is unavailable, the delivery address is
          outside our service area, payment cannot be verified, or we reasonably
          suspect fraudulent or abusive activity.
        </p>
      </PolicySection>

      <PolicySection heading="7. Delivery">
        <p>
          Delivery timeframes are estimates, not guarantees. We are not liable
          for delays caused by couriers, weather, strikes, public holidays or
          other circumstances outside our reasonable control. Full details are in
          our{' '}
          <Link href={`/${locale}/shipping`} className="text-green font-semibold hover:underline">
            Shipping Policy
          </Link>
          .
        </p>
        <p>
          Risk in the goods passes to you on delivery. For cash-on-delivery
          orders, you may inspect the parcel before paying.
        </p>
      </PolicySection>

      <PolicySection heading="8. Returns and refunds">
        <p>
          Returns are governed by our{' '}
          <Link href={`/${locale}/returns`} className="text-green font-semibold hover:underline">
            Return Policy
          </Link>
          , which forms part of these terms. In summary: 7 days from delivery,
          items unused and in original packaging, with exclusions for hygiene and
          consumable products.
        </p>
      </PolicySection>

      <PolicySection heading="9. Your account">
        <p>
          You are responsible for keeping your account credentials secure and for
          all activity that occurs under your account. Tell us immediately if you
          believe your account has been accessed without your permission. We may
          suspend or close an account that is used in breach of these terms.
        </p>
      </PolicySection>

      <PolicySection heading="10. Acceptable use">
        <p>You agree not to:</p>
        <PolicyList
          items={[
            'Use the site for any unlawful purpose or in breach of any applicable regulation.',
            'Attempt to gain unauthorised access to any part of the site, its servers or connected systems.',
            'Scrape, copy or republish our product imagery, descriptions or catalogue data for commercial use.',
            'Submit false orders, or place orders with no intention of accepting delivery.',
          ]}
        />
      </PolicySection>

      <PolicySection heading="11. Intellectual property">
        <p>
          The Yala Haji name, logo, site design, photography and written content
          are our property or licensed to us, and are protected by applicable
          intellectual-property law. You may not reproduce them without our prior
          written permission.
        </p>
      </PolicySection>

      <PolicySection heading="12. Third-party content and links">
        <p>
          Guides and articles published on this site are provided for general
          information. Any external links are offered for convenience and we are
          not responsible for the content or practices of third-party sites.
        </p>
      </PolicySection>

      <PolicySection heading="13. Limitation of liability">
        <p>
          To the fullest extent permitted by law, our total liability arising
          from any order is limited to the amount you paid for that order. We are
          not liable for indirect or consequential losses, including missed
          travel, missed pilgrimage dates, or loss of opportunity.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be
          excluded, including liability for death or personal injury caused by
          negligence, or for fraud.
        </p>
      </PolicySection>

      <PolicySection heading="14. Governing law">
        <p>
          These terms are governed by the laws of the Islamic Republic of
          Pakistan. Any dispute arising from them is subject to the exclusive
          jurisdiction of the courts of Karachi, Sindh.
        </p>
      </PolicySection>

      <PolicySection heading="15. Contact">
        <p>
          Questions about these terms can be sent to us on WhatsApp at{' '}
          <a href="https://wa.me/923111234567" className="text-green font-semibold hover:underline">
            +92 311 1234567
          </a>{' '}
          or by phone at{' '}
          <a href="tel:+923229876543" className="text-green font-semibold hover:underline">
            +92 322 9876543
          </a>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  )
}
