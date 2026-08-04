import Link from 'next/link'
import { useLocale } from 'next-intl'

const MEGA_DATA: Record<string, { title: string; href: string; desc: string }[][]> = {
  ihram: [
    [
      { title: "Men's Ihram", href: '/shop/ihram-men', desc: 'Economy, Standard & Premium' },
      { title: "Women's Ihram", href: '/shop/ihram-women', desc: 'Loose fit & breathable' },
      { title: 'Ihram Belts', href: '/shop/ihram?filter=belt', desc: 'Secure & comfortable' },
    ],
    [
      { title: 'Economy Ihram', href: '/shop/ihram?tier=economy', desc: 'Budget-friendly options' },
      { title: 'Standard Ihram', href: '/shop/ihram?tier=standard', desc: 'Pure cotton quality' },
      { title: 'Premium Ihram', href: '/shop/ihram?tier=premium', desc: 'Egyptian cotton luxury' },
    ],
  ],
}

interface Props {
  category: string
}

export function MegaMenu({ category }: Props) {
  const locale = useLocale()
  const data = MEGA_DATA[category]
  if (!data) return null

  return (
    <div className="absolute top-full left-0 z-50 w-[480px] bg-white border border-line rounded-md shadow-lg p-5 grid grid-cols-2 gap-4 animate-fade-in">
      {data.map((col, ci) => (
        <div key={ci} className="space-y-1">
          {col.map((item) => (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              className="block px-3 py-2 rounded-sm hover:bg-green-tint group"
            >
              <p className="text-sm font-semibold text-ink group-hover:text-green transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-stone mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
