import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { ArrowRight, Package, ShieldCheck, Truck, MessageCircle } from 'lucide-react'
import { PolicyPage, PolicySection, PolicyList } from '@/components/layout/policy-page'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Yala Haji supplies Hajj & Umrah essentials across Pakistan — curated kits, ihram, modest wear and prayer accessories, with cash on delivery and 7-day returns.',
}

const stats = [
  { value: '10,000+', label: 'Pilgrims served' },
  { value: '4.8/5', label: 'Average rating' },
  { value: '3 tiers', label: 'Economy to Premium' },
  { value: '7 days', label: 'Easy returns' },
]

const values = [
  {
    icon: Package,
    title: 'Everything in one box',
    desc: 'Our kits are assembled so nothing is forgotten — ihram, prayer mat, tasbeeh, attar and travel essentials, packed and ready.',
  },
  {
    icon: ShieldCheck,
    title: 'Ihram-compliant by default',
    desc: 'Toiletries in our kits are scent-free and our attars are alcohol-free, so what you buy is permissible to use in ihram.',
  },
  {
    icon: Truck,
    title: 'Check first, then pay',
    desc: 'Cash on delivery across Pakistan. Open the parcel, check the contents, and only then hand over payment.',
  },
  {
    icon: MessageCircle,
    title: 'Guidance, not just products',
    desc: 'First-time pilgrims message us constantly about what to pack. We answer on WhatsApp before, during and after your journey.',
  },
]

export default async function AboutPage() {
  const locale = await getLocale()

  return (
    <PolicyPage
      eyebrow="Who we are"
      title="About Yala Haji"
      intro="We supply the practical things pilgrims need for Hajj and Umrah — assembled by people who have made the journey themselves."
      locale={locale}
    >
      <PolicySection heading="Why we started">
        <p>
          Preparing for Hajj or Umrah in Pakistan usually means a scattered
          shopping trip — ihram from one shop, a prayer mat from another, attar
          from a third, and constant second-guessing about whether a product is
          actually permissible to use in ihram.
        </p>
        <p>
          Yala Haji exists to remove that friction. We put together complete,
          checked kits so a first-time pilgrim can order once and travel
          confident that nothing essential was missed.
        </p>
      </PolicySection>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line rounded-md overflow-hidden my-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5 text-center">
            <div className="serif text-2xl text-ink mb-1">{s.value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <PolicySection heading="What we stand for">
        <div className="grid sm:grid-cols-2 gap-5 pt-1">
          {values.map((v) => (
            <div key={v.title} className="flex gap-3.5">
              <span className="flex-shrink-0 w-10 h-10 rounded-sm bg-green-tint text-green flex items-center justify-center">
                <v.icon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-ink text-sm mb-1">{v.title}</h3>
                <p className="text-sm text-ink-2 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PolicySection>

      <PolicySection heading="How we choose what to sell">
        <p>
          Every product is reviewed against three questions before it reaches the
          catalogue:
        </p>
        <PolicyList
          items={[
            <>
              <strong className="text-ink">Is it permissible?</strong> Anything
              intended for use in ihram must be scent-free or alcohol-free as
              applicable.
            </>,
            <>
              <strong className="text-ink">Does it survive the trip?</strong>{' '}
              Fabrics and bags are chosen for heat, crowds and long days on foot
              — not for how they look in a photo.
            </>,
            <>
              <strong className="text-ink">Is the price honest?</strong> We offer
              Economy, Standard and Premium tiers so pilgrims can choose by
              budget rather than being pushed to one option.
            </>,
          ]}
        />
      </PolicySection>

      <PolicySection heading="Where to find us">
        <p>
          We ship nationwide across Pakistan from our base in Karachi. Our team
          is reachable on WhatsApp for packing questions, order tracking and
          post-return support.
        </p>
        <div className="bg-paper border border-line rounded-sm p-4 text-sm">
          <p className="font-semibold text-ink mb-1">Yala Haji</p>
          <p>Shop 5, Islam Market, Karachi, Pakistan</p>
          <p className="mt-2">
            WhatsApp:{' '}
            <a href="https://wa.me/923111234567" className="text-green font-semibold hover:underline">
              +92 311 1234567
            </a>
          </p>
          <p>
            Phone:{' '}
            <a href="tel:+923229876543" className="text-green font-semibold hover:underline">
              +92 322 9876543
            </a>
          </p>
        </div>
      </PolicySection>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link href={`/${locale}/shop/kits`} className="btn-primary">
          Browse Hajj &amp; Umrah kits <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href={`/${locale}/kit-builder`} className="btn-outline">
          Build your own kit
        </Link>
      </div>
    </PolicyPage>
  )
}
