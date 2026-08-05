import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { fetchFeaturedBlogPosts } from '@/lib/api'
import { Clock, ArrowRight } from 'lucide-react'
import { SafeImage } from '@/components/ui/safe-image'

// getLocale(), not useLocale() — a next-intl hook inside an `async` server
// component breaks the RSC render. See the note in featured-products.tsx.
export async function BlogPreview() {
  const locale = await getLocale()
  const posts = await fetchFeaturedBlogPosts()

  return (
    <section className="section-pad bg-paper">
      <div className="container-max">
        {/* Section header — matches approved .blk-head */}
        <div className="flex items-end justify-between mb-[30px] gap-5">
          <div>
            <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
              Guides & Tips
            </span>
            <h2 className="serif text-[34px] tracking-tight text-ink">
              Hajj & Umrah Guides
            </h2>
          </div>
          <Link
            href={`/${locale}/blog`}
            className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 text-[13px] font-bold text-ink px-[18px] py-2.5 border border-line rounded-lg hover:bg-ink hover:text-white hover:border-ink transition-all duration-200"
          >
            All Articles <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {posts.slice(0, 2).map((post, i) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="group card-base overflow-hidden flex flex-col md:flex-row"
            >
              {/* Cover image */}
              <div
                className={`flex-shrink-0 h-48 md:h-auto md:w-48 ${
                  i === 0 ? 'bg-green-tint' : 'bg-gold-tint'
                } flex items-center justify-center overflow-hidden`}
              >
                <SafeImage
                  src={
                    i === 0
                      ? '/assets/umrah-kit.png'
                      : '/assets/tabaruk.png'
                  }
                  alt={post.title.en}
                  loading="lazy"
                  className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex flex-col justify-between">
                <div>
                  <span className="inline-block bg-green-tint text-green text-[11px] font-semibold px-2 py-0.5 rounded-sm mb-2 capitalize">
                    {post.category.replace(/-/g, ' ')}
                  </span>
                  <h3 className="font-bold text-ink group-hover:text-green transition-colors leading-snug mb-2">
                    {post.title.en}
                  </h3>
                  <p className="text-sm text-stone leading-relaxed line-clamp-2">
                    {post.excerpt.en}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-stone">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readingTime} min read
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-green group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 text-center md:hidden">
          <Link href={`/${locale}/blog`} className="btn-outline">
            All Articles →
          </Link>
        </div>
      </div>
    </section>
  )
}
