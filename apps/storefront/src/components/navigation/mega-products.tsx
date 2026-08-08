'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { fetchProductBySlug } from '@/lib/api'
import { getDefaultVariant, formatPrice } from '@/lib/utils'
import { ProductImage } from '@/components/ui/product-image'
import type { Locale, Product } from '@/types'

/**
 * The featured-products strip in a `columns_with_products` mega panel.
 *
 * **This is the lazy-loading half of the menu system.** The panel only mounts
 * while an item is open, so the catalogue reads happen on first hover rather
 * than on every page load — putting six product lookups into the layout's
 * server render would make every page in the site pay for a panel most
 * visitors never open.
 *
 * The strip is additive: while it loads, and if it fails outright, the rest
 * of the panel is already rendered and usable. A mega menu must not depend on
 * the catalogue being reachable.
 */
export function MegaProducts({ slugs }: { slugs: string[] }) {
  const locale = useLocale() as Locale

  // Capped at six. The API allows up to 24 slugs in `megaConfig`, but each is
  // its own request, and a strip wider than six is scrolling inside a
  // dropdown.
  const wanted = slugs.slice(0, 6)

  const { data, isPending } = useQuery({
    queryKey: ['mega-products', wanted],
    enabled: wanted.length > 0,
    // Catalogue data, not menu data — matches the 5-minute revalidate the
    // other public product reads use.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Product[]> => {
      const results = await Promise.all(
        wanted.map((slug) => fetchProductBySlug(slug).catch(() => null)),
      )
      // A slug that no longer resolves is dropped rather than rendered as a
      // gap — staff renaming a product should not leave a hole in the menu.
      return results.filter((p): p is Product => p !== null)
    },
  })

  if (wanted.length === 0) return null

  if (isPending) {
    return (
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
        {wanted.slice(0, 3).map((slug) => (
          <div key={slug} className="animate-pulse">
            <div className="aspect-square bg-paper rounded-sm" />
            <div className="h-3 bg-paper rounded-sm mt-2 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.length) return null

  return (
    <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
      {data.map((product) => {
        const variant = getDefaultVariant(product.variants)
        return (
          <Link
            key={product.id}
            href={`/${locale}/products/${product.slug}`}
            className="group block"
          >
            <ProductImage
              src={product.images[0]?.url}
              alt={product.images[0]?.alt ?? product.name[locale] ?? product.name.en}
              className="w-full aspect-square object-cover rounded-sm"
            />
            <p className="text-[13px] font-semibold text-ink mt-2 line-clamp-2 group-hover:text-green transition-colors">
              {product.name[locale] || product.name.en}
            </p>
            {variant && (
              <p className="text-[13px] text-green font-bold mt-0.5">
                {formatPrice(variant.price)}
              </p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
