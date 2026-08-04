import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { getFeaturedCategories } from '@/data/categories'
import { SafeImage } from '@/components/ui/safe-image'

export function CategoryTiles() {
  const locale = useLocale()
  const categories = getFeaturedCategories()

  return (
    <section className="section-pad">
      <div className="container-max">
        {/* Section header — matches approved .blk-head */}
        <div className="flex items-end justify-between mb-[30px] gap-5">
          <div>
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
              Shop by Category
            </span>
            <h2 className="serif text-[34px] tracking-tight text-ink">
              Everything for Your Journey
            </h2>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 text-[13px] font-bold text-ink px-[18px] py-2.5 border border-line rounded-lg hover:bg-ink hover:text-white hover:border-ink transition-all duration-200"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4-column category grid — matches approved .cats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[18px]">
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/shop/${cat.slug}`}
              className="group relative bg-white border border-line rounded-md px-5 pb-[22px] pt-[26px] text-center overflow-hidden transition-all duration-250 hover:-translate-y-1 hover:shadow-md hover:border-gold"
            >
              {/* Count badge — top-right */}
              <span className="absolute top-3.5 right-3.5 bg-white border border-line text-[10.5px] font-bold text-ink-2 px-2.5 py-0.5 rounded-full">
                {cat.productCount}
              </span>

              {/* Category image — 142×142 centered */}
              <div className="w-[142px] h-[142px] mx-auto mb-3.5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <SafeImage
                  src={cat.image}
                  alt={cat.name.en}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>

              <h3 className="text-[15.5px] font-bold text-ink mb-1 leading-tight">
                {cat.name.en}
              </h3>
              <span className="text-xs text-stone">{cat.productCount} products</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
