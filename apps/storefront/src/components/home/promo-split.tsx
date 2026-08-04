import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { SafeImage } from '@/components/ui/safe-image'

export function PromoSplit() {
  const locale = useLocale()

  return (
    <section className="section-pad">
      <div className="container-max">
        {/* Split banners — matches approved .sb.g (gold-tint) and .sb.v (green-tint) */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Kit Builder — gold tint (approved .sb.g) */}
          <div className="rounded-md border p-8 flex items-center justify-between gap-5 min-h-[180px] bg-gold-tint border-[#F0D580]">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 bg-white border border-line rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide shadow-sm mb-3">
                New Feature
              </span>
              <h3 className="serif text-[27px] leading-[1.15] text-ink mb-2">
                Build Your Own<br />Umrah Kit
              </h3>
              <p className="text-[13px] text-ink-2 mb-4 max-w-xs">
                Pick every item — Economy, Standard, or Premium. Fully customised, ready to ship.
              </p>
              <Link
                href={`/${locale}/kit-builder`}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink hover:text-gold-deep hover:gap-2.5 transition-all"
              >
                Start Building <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex-shrink-0 w-[150px] h-[150px] flex items-center justify-center">
              <SafeImage
                src="/assets/umrah-kit.png"
                alt="Umrah Kit"
                loading="lazy"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* Oud Attar — green tint (approved .sb.v) */}
          <div className="rounded-md border p-8 flex items-center justify-between gap-5 min-h-[180px] bg-green-tint border-[#A3D9BB]">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 bg-white border border-line rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wide shadow-sm mb-3">
                Alcohol-Free
              </span>
              <h3 className="serif text-[27px] leading-[1.15] text-ink mb-2">
                Premium Oud<br />Attar Collection
              </h3>
              <p className="text-[13px] text-ink-2 mb-4 max-w-xs">
                Halal-certified, ihram-safe attars from Assam and Hindi oud. Long-lasting fragrance.
              </p>
              <Link
                href={`/${locale}/shop/fragrances`}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink hover:text-gold-deep hover:gap-2.5 transition-all"
              >
                Shop Attars <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex-shrink-0 w-[150px] h-[150px] flex items-center justify-center">
              <SafeImage
                src="/assets/fragrances.png"
                alt="Oud Attar Collection"
                loading="lazy"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>

        {/* Hajj Gift banner */}
        <div className="mt-5 rounded-md bg-gold-tint border border-gold/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🎁</span>
            <div>
              <p className="font-bold text-ink">Send a Hajj Gift</p>
              <p className="text-sm text-ink-2">
                Beautiful premium kits — perfect for gifting. Free gift wrapping available.
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/shop/kits?filter=premium`}
            className="inline-flex items-center gap-2 bg-ink text-white font-bold px-5 py-2.5 rounded-lg hover:bg-gold-deep transition-colors whitespace-nowrap flex-shrink-0"
          >
            Shop Premium Kits <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
