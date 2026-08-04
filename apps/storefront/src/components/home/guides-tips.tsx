import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight, Shield, Plus, Briefcase, Gift } from 'lucide-react'

const guides = [
  {
    icon: Shield,
    iconBg: 'bg-gold-tint',
    iconColor: 'text-gold-deep',
    readTime: '5 min read',
    badgeBg: 'bg-gold-tint text-gold-deep',
    title: 'What to Pack for Umrah',
    desc: 'The complete men\'s & women\'s checklist — nothing missing, nothing extra.',
    href: '/blog/what-to-pack-for-umrah',
  },
  {
    icon: Plus,
    iconBg: 'bg-green-tint',
    iconColor: 'text-green-mid',
    readTime: '8 min read',
    badgeBg: 'bg-green-tint text-green-mid',
    title: 'Ihram Rules & Restrictions',
    desc: 'What\'s permitted and what to avoid — a clear guide for men and women.',
    href: '/blog/ihram-rules-restrictions',
  },
  {
    icon: Briefcase,
    iconBg: 'bg-stone/10',
    iconColor: 'text-stone',
    readTime: '4 min read',
    badgeBg: 'bg-stone/10 text-stone',
    title: 'Travel-Sized Toiletries Guide',
    desc: 'Scent-free, airline-compliant essentials that meet Ihram requirements.',
    href: '/blog/travel-toiletries-ihram',
  },
  {
    icon: Gift,
    iconBg: 'bg-gold-tint',
    iconColor: 'text-gold-deep',
    readTime: '6 min read',
    badgeBg: 'bg-gold-tint text-gold-deep',
    title: 'Choosing the Right Tabaruk Gifts',
    desc: 'Meaningful keepsakes from the holy lands — what to buy and why.',
    href: '/blog/tabaruk-gifts-guide',
  },
]

export function GuidesTips() {
  const locale = useLocale()
  return (
    <section className="section-pad">
      <div className="container-max">
        {/* Section header */}
        <div className="flex items-end justify-between mb-[30px] gap-5">
          <div>
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
              Learn before you go
            </span>
            <h2 className="serif text-[34px] tracking-tight text-ink">
              Guides &amp; Tips
            </h2>
            <p className="text-sm text-ink-2 mt-1.5">
              Practical advice from pilgrims who've made the journey.
            </p>
          </div>
          <Link
            href={`/${locale}/blog`}
            className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 text-[13px] font-bold text-ink px-[18px] py-2.5 border border-line rounded-lg hover:bg-ink hover:text-white hover:border-ink transition-all duration-200"
          >
            All guides <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4-column guide cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
          {guides.map((g) => (
            <Link
              key={g.title}
              href={`/${locale}${g.href}`}
              className="group relative bg-white border border-line rounded-md p-6 overflow-hidden transition-all duration-250 hover:-translate-y-1 hover:shadow-md hover:border-gold"
            >
              {/* Read time badge */}
              <span className={`absolute top-3.5 right-3.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${g.badgeBg}`}>
                {g.readTime}
              </span>

              {/* Icon */}
              <span className={`w-11 h-11 rounded-full ${g.iconBg} ${g.iconColor} flex items-center justify-center mb-4`}>
                <g.icon className="w-5 h-5" />
              </span>

              <h3 className="text-[15px] font-bold text-ink mb-2 leading-tight pr-16">
                {g.title}
              </h3>
              <p className="text-xs text-stone leading-relaxed">{g.desc}</p>

              <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-gold-deep group-hover:gap-2 transition-all">
                Read guide <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
