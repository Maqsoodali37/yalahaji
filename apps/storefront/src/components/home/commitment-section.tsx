import { SafeImage } from '@/components/ui/safe-image'

const leftFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 22s8-4.5 8-11.8V5l-8-3-8 3v5.2C4 17.5 12 22 12 22z" />
      </svg>
    ),
    title: 'Ihram-ready sets',
    desc: 'Pre-assembled kits with everything required for Ihram — nothing missing, nothing extra.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    title: 'Curated by pilgrims',
    desc: 'Every item selected by people who\'ve made the journey — practical, proven and trusted.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Modest & comfortable',
    desc: 'Breathable fabrics and modest cuts designed for long hours of worship and movement.',
  },
]

const rightFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="7" width="20" height="15" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    title: 'Travel-sized options',
    desc: 'Compact packaging that fits airline carry-on limits — no checked-bag stress at the airport.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2z" /><path d="M8 12h8M12 8v8" />
      </svg>
    ),
    title: 'Scent-free formulas',
    desc: 'Soaps, lotions and sprays free of fragrance — fully compliant with Ihram restrictions.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    title: 'Bundle savings',
    desc: 'Save more when you buy complete kits — the more complete your prep, the more you save.',
  },
]

export function CommitmentSection() {
  return (
    <section className="section-pad">
      <div className="container-max">
        <div className="bg-paper border border-line rounded-lg px-8 py-12 md:px-14 md:py-16">

          {/* Header */}
          <div className="text-center mb-12">
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-3">
              Crafted for the conscious pilgrim
            </span>
            <h2 className="serif text-[34px] md:text-[40px] tracking-tight text-ink leading-tight">
              Your journey, our <em className="not-italic text-gold-deep">commitment</em>
            </h2>
          </div>

          {/* 3-column ring layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_1fr] gap-8 lg:gap-12 items-center">

            {/* Left features */}
            <div className="flex flex-col gap-7">
              {leftFeatures.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-sm border border-line bg-white flex items-center justify-center text-ink-2">
                    {f.icon}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-ink mb-1">{f.title}</h4>
                    <p className="text-sm text-ink-2 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Center image */}
            <div className="flex flex-col items-center gap-4 order-first lg:order-none">
              <div className="w-44 h-44 rounded-full border-2 border-line bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <SafeImage
                  src="/assets/umrah-kit.png"
                  alt="Umrah Kit"
                  className="w-[85%] h-[85%] object-contain"
                />
              </div>
              <p className="text-[10.5px] font-bold tracking-[.1em] uppercase text-stone text-center">
                Trusted by pilgrims<br />across Pakistan
              </p>
            </div>

            {/* Right features */}
            <div className="flex flex-col gap-7">
              {rightFeatures.map((f) => (
                <div key={f.title} className="flex items-start gap-4 lg:flex-row-reverse lg:text-right">
                  <span className="flex-shrink-0 w-10 h-10 rounded-sm border border-line bg-white flex items-center justify-center text-ink-2">
                    {f.icon}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-ink mb-1">{f.title}</h4>
                    <p className="text-sm text-ink-2 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
