import { testimonials } from '@/data/testimonials'
import { Star } from 'lucide-react'

export function TestimonialsSection() {
  return (
    // Approved design: light paper background, NOT dark green
    <section className="section-pad">
      <div className="container-max">
        {/* Section header */}
        <div className="flex items-end justify-between mb-[30px] gap-5">
          <div>
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
              Customer Reviews
            </span>
            <h2 className="serif text-[34px] tracking-tight text-ink">
              What Our Customers Say
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-gold text-gold" />
            ))}
            <span className="text-stone text-sm ms-1">4.8 · 900+ reviews</span>
          </div>
        </div>

        {/* Review cards — matches approved .revs layout */}
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.slice(0, 3).map((t) => (
            <div
              key={t.id}
              className="bg-paper border border-line rounded-md p-[26px]"
            >
              {/* Stars */}
              <span className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-[13px] h-[13px] fill-gold text-gold" />
                ))}
              </span>

              {/* Quote — serif, matches approved */}
              <q className="serif text-[18px] leading-[1.45] text-ink block mb-[18px] not-italic">
                {t.text}
              </q>

              {/* Author */}
              <div className="flex items-center gap-2.5">
                <div className="w-[38px] h-[38px] rounded-full bg-gold-tint text-gold-deep flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                  {t.author[0]}
                </div>
                <div>
                  <strong className="text-[13px] text-ink block font-semibold">{t.author}</strong>
                  <small className="text-[11.5px] text-stone flex items-center gap-1">
                    ✓ Verified · {t.location}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-stone text-xs">
          {['Verified Reviews', '10,000+ Happy Customers', 'Serving Since 2018'].map((item, i) => (
            <div key={item} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-4 bg-line" />}
              <span className="flex items-center gap-1.5">
                <span className="text-green font-bold">✓</span> {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
