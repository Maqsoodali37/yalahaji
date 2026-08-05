'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SafeImage } from '@/components/ui/safe-image'

const slides = [
  {
    id: 1,
    bgClass: 'bg-gradient-to-r from-gold-tint via-paper to-paper',
    badge: 'Hajj Season 2025',
    badgeDot: true,
    title: 'Your Journey,',
    titleAccent: 'Our Care.',
    subtitle: 'Premium Hajj & Umrah essentials — trusted by thousands of pilgrims across Pakistan.',
    cta: 'Shop Kits',
    ctaHref: '/shop/kits',
    ctaSecondary: 'Build Your Kit',
    ctaSecondaryHref: '/kit-builder',
    price: 'PKR 2,499',
    priceOld: 'PKR 3,200',
    priceLabel: 'Starting from',
    imageSrc: '/assets/umrah-kit.png',
    imageAlt: 'Ihram Kit',
  },
  {
    id: 2,
    bgClass: 'bg-gradient-to-r from-green-tint via-paper to-paper',
    badge: 'New Arrivals',
    badgeDot: false,
    title: 'Premium Oud',
    titleAccent: 'Attar Collection',
    subtitle: 'Alcohol-free, halal-certified fragrances from the holy cities. Ihram-safe & long-lasting.',
    cta: 'Shop Fragrances',
    ctaHref: '/shop/fragrances',
    ctaSecondary: 'View All Attars',
    ctaSecondaryHref: '/shop/fragrances',
    price: 'PKR 899',
    priceOld: '',
    priceLabel: 'Starting from',
    imageSrc: '/assets/fragrances.png',
    imageAlt: 'Oud Attar',
  },
  {
    id: 3,
    bgClass: 'bg-gradient-to-r from-green-light via-paper to-paper',
    badge: 'Umrah Season',
    badgeDot: true,
    title: 'Build Your',
    titleAccent: 'Perfect Kit',
    subtitle: 'Customise every item — Economy, Standard or Premium tier. Fully tailored for your journey.',
    cta: 'Start Building',
    ctaHref: '/kit-builder',
    ctaSecondary: 'See Examples',
    ctaSecondaryHref: '/shop/kits',
    price: 'PKR 1,999',
    priceOld: '',
    priceLabel: 'Kits from',
    imageSrc: '/assets/umrah-kit.png',
    imageAlt: 'Umrah Kit',
  },
]

export function HeroCarousel() {
  const locale = useLocale()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    []
  )
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next, paused])

  // Touch swipe (mobile — arrows are hidden there)
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 45) (delta < 0 ? next : prev)()
    touchStartX.current = null
  }

  return (
    <section className="pt-4 sm:pt-6 pb-0" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="container-max">
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative rounded-lg border border-line overflow-hidden bg-paper min-h-[500px] sm:min-h-[440px] lg:min-h-[400px]"
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={cn(
                'absolute inset-0 grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] items-center gap-4 lg:gap-5 px-5 sm:px-8 lg:px-14 pt-8 pb-16 sm:pb-14 lg:py-11 transition-opacity duration-500 overflow-y-auto',
                slide.bgClass,
                i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              )}
            >
              {/* Left — text */}
              <div className="order-2 lg:order-1">
                {/* Chip badge */}
                <span className="inline-flex items-center gap-2 bg-white border border-line rounded-full px-3 sm:px-3.5 py-1 sm:py-1.5 text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wide shadow-sm mb-3 sm:mb-5">
                  {slide.badgeDot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
                  )}
                  {slide.badge}
                </span>

                <h1 className="serif text-[30px] sm:text-[40px] lg:text-[52px] leading-[1.1] lg:leading-[1.04] tracking-tight text-ink mb-3 lg:mb-4">
                  {slide.title}{' '}
                  <br className="hidden sm:block" />
                  <em className="not-italic text-gold-deep">{slide.titleAccent}</em>
                </h1>

                <p className="text-[13.5px] sm:text-[15px] text-ink-2 max-w-md mb-5 lg:mb-7 leading-relaxed">
                  {slide.subtitle}
                </p>

                <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
                  <Link
                    href={`/${locale}${slide.ctaHref}`}
                    className="inline-flex items-center gap-2 bg-ink text-white text-sm sm:text-base font-bold px-5 sm:px-7 py-3 sm:py-3.5 rounded-lg hover:bg-gold-deep transition-all duration-200 hover:-translate-y-0.5 shadow-md"
                  >
                    {slide.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/${locale}${slide.ctaSecondaryHref}`}
                    className="inline-flex items-center gap-2 border border-line bg-white text-ink text-sm sm:text-base font-semibold px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg hover:border-green-mid hover:text-green-mid transition-colors"
                  >
                    {slide.ctaSecondary}
                  </Link>

                  {/* Price tag */}
                  <div className="flex flex-col gap-0.5 lg:ms-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-stone uppercase tracking-wider">
                      {slide.priceLabel}
                    </span>
                    <span className="text-[18px] sm:text-[22px] font-extrabold text-ink tracking-tight leading-none">
                      {slide.priceOld && (
                        <s className="text-sm font-medium text-stone me-2">{slide.priceOld}</s>
                      )}
                      {slide.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right — product image */}
              <div className="order-1 lg:order-2 flex items-center justify-center h-full">
                <div className="relative w-[150px] h-[150px] sm:w-[210px] sm:h-[210px] lg:w-[300px] lg:h-[300px] flex items-center justify-center">
                  {/* Soft halo behind the product */}
                  <div className="absolute inset-0 rounded-full bg-white/70 blur-[2px]" />
                  <SafeImage
                    src={slide.imageSrc}
                    alt={slide.imageAlt}
                    className="relative w-[86%] h-[86%] object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Arrow controls — desktop only; mobile uses swipe + dots */}
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="hidden lg:flex absolute start-4 top-1/2 -translate-y-1/2 z-20 w-[42px] h-[42px] rounded-full bg-white shadow-md items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="hidden lg:flex absolute end-4 top-1/2 -translate-y-1/2 z-20 w-[42px] h-[42px] rounded-full bg-white shadow-md items-center justify-center text-ink hover:bg-ink hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 inset-x-0 lg:inset-x-auto lg:start-14 flex justify-center lg:justify-start gap-1.5 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'rounded h-[7px] transition-all duration-300',
                  i === current
                    ? 'bg-gold w-6'
                    : 'bg-ink/20 hover:bg-ink/40 w-[7px]'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
