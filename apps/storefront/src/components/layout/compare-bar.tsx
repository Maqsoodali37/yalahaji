'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { X, BarChart2 } from 'lucide-react'
import { useCompareStore } from '@/store/compare'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/lib/api'
import { ProductImage } from '@/components/ui/product-image'

export function CompareBar() {
  const locale = useLocale()
  const { ids, remove, clear, count } = useCompareStore()
  const n = count()

  if (n === 0) return null

  const { data } = useQuery({
    queryKey: ['compare-products'],
    queryFn: () => fetchProducts({ limit: 100 }),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  })
  const products = (data?.items ?? []).filter((p) => ids.includes(p.id))

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-lg">
      <div className="container-max py-3">
        <div className="flex items-center gap-4">
          {/* Label */}
          <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-ink shrink-0">
            <BarChart2 className="w-4 h-4 text-green" />
            Compare ({n}/4)
          </div>

          {/* Product chips */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
            {products.map((product) => product && (
              <div
                key={product.id}
                className="flex items-center gap-2 border border-line rounded-sm px-2 py-1 bg-paper shrink-0"
              >
                <div className="w-8 h-8 bg-green-tint rounded-sm overflow-hidden shrink-0">
                  <ProductImage
                    src={product.images[0]?.url}
                    alt={product.name.en}
                    fallback="🕋"
                  />
                </div>
                <p className="text-xs font-medium text-ink max-w-[100px] truncate">
                  {product.name.en}
                </p>
                <button
                  onClick={() => remove(product.id)}
                  className="text-stone hover:text-alert transition-colors shrink-0"
                  aria-label={`Remove ${product.name.en} from compare`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - n) }).map((_, i) => (
              <div
                key={i}
                className="w-32 h-10 border border-dashed border-line rounded-sm shrink-0 flex items-center justify-center"
              >
                <p className="text-[10px] text-stone">+ Add product</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clear}
              className="text-xs text-stone hover:text-alert transition-colors font-medium hidden sm:block"
            >
              Clear all
            </button>
            <Link
              href={`/${locale}/compare`}
              className={`btn-primary text-sm py-2 px-4 ${n < 2 ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <BarChart2 className="w-4 h-4" />
              Compare Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
