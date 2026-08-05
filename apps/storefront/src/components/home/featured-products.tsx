import Link from 'next/link'
import { useLocale } from 'next-intl'
import { fetchFeaturedProducts } from '@/lib/api'
import { ProductCard } from '@/components/shop/product-card'

export async function FeaturedProducts() {
  const locale = useLocale()
  const products = await fetchFeaturedProducts()

  return (
    <section className="section-pad bg-paper">
      <div className="container-max">
        {/* Section header — matches approved .blk-head */}
        <div className="flex items-end justify-between mb-[30px] gap-5">
          <div>
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
              Most Loved
            </span>
            <h2 className="serif text-[34px] tracking-tight text-ink">Featured Products</h2>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 text-[13px] font-bold text-ink px-[18px] py-2.5 border border-line rounded-lg hover:bg-ink hover:text-white hover:border-ink transition-all duration-200"
          >
            View All →
          </Link>
        </div>

        {/* Filter pills — matches approved .pills / .pill */}
        <div className="flex gap-2 mb-[26px] overflow-x-auto no-scrollbar pb-1">
          {['All', 'Kits', 'Ihram', 'Fragrances', 'Prayer', 'Bestsellers'].map((pill, i) => (
            <button
              key={pill}
              className={`flex-shrink-0 px-[17px] py-2 text-[12.5px] font-semibold rounded-full border transition-colors whitespace-nowrap ${
                i === 0
                  ? 'bg-ink border-ink text-white shadow-sm'
                  : 'bg-white border-line text-ink-2 hover:border-stone hover:text-ink'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href={`/${locale}/shop`} className="btn-outline">
            View All Products →
          </Link>
        </div>
      </div>
    </section>
  )
}
