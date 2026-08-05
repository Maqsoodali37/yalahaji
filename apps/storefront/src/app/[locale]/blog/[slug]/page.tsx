import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Clock, ChevronRight, BookOpen } from 'lucide-react'
import { fetchBlogPostBySlug, fetchBlogPostsByCategory } from '@/lib/api'

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale()
  const { slug } = await params
  const post = await fetchBlogPostBySlug(slug)
  if (!post) notFound()

  const related = (await fetchBlogPostsByCategory(post.category))
    .filter((p) => p.id !== post.id)
    .slice(0, 3)
  const body = post.body.en

  // Extract simple headings for TOC
  const headings = body
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => ({ text: line.replace('## ', ''), id: line.replace('## ', '').toLowerCase().replace(/\s+/g, '-') }))

  return (
    <div className="bg-paper min-h-screen">
      <div className="container-max py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-stone mb-6">
          <Link href={`/${locale}/blog`} className="hover:text-green">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-ink font-medium line-clamp-1">{post.title.en}</span>
        </nav>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Article */}
          <article className="lg:col-span-3">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-green uppercase tracking-wider bg-green-tint px-2 py-0.5 rounded-sm">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-stone">
                  <Clock className="w-3 h-3" />
                  {post.readingTime} min read
                </span>
              </div>
              <h1 className="serif text-3xl md:text-4xl text-ink leading-tight mb-4">
                {post.title.en}
              </h1>
              <p className="text-stone text-lg leading-relaxed">{post.excerpt.en}</p>
              <p className="text-xs text-stone mt-3">
                Published {new Date(post.publishedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                {post.author && ` · ${post.author}`}
              </p>
            </div>

            {/* Cover image */}
            <div className="aspect-video bg-green-tint rounded-md flex items-center justify-center text-8xl mb-8">
              {post.category === 'hajj-guide' || post.category === 'umrah-guide' || post.category === 'product-guides'
                ? '📖'
                : post.category === 'packing'
                ? '🧳'
                : '🌙'}
            </div>

            {/* Body */}
            <div className="prose prose-green max-w-none">
              {body.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  const text = line.replace('## ', '')
                  const id = text.toLowerCase().replace(/\s+/g, '-')
                  return <h2 key={i} id={id} className="serif text-2xl text-ink mt-10 mb-4 scroll-mt-24">{text}</h2>
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="font-bold text-ink text-lg mt-6 mb-2">{line.replace('### ', '')}</h3>
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="text-stone ml-4 mb-1">{line.replace('- ', '')}</li>
                }
                if (line.trim() === '') return <br key={i} />
                return <p key={i} className="text-stone leading-relaxed mb-3">{line}</p>
              })}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            {/* TOC */}
            {headings.length > 0 && (
              <div className="bg-white border border-line rounded-md p-4 sticky top-24">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-green" />
                  <p className="font-bold text-ink text-sm">Table of Contents</p>
                </div>
                <ul className="space-y-1.5">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-xs text-stone hover:text-green transition-colors leading-snug block"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related posts */}
            {related.length > 0 && (
              <div className="bg-white border border-line rounded-md p-4">
                <p className="font-bold text-ink text-sm mb-3">Related Articles</p>
                <div className="space-y-3">
                  {related.map((p) => (
                    <Link
                      key={p.id}
                      href={`/${locale}/blog/${p.slug}`}
                      className="flex gap-3 group"
                    >
                      <div className="w-14 h-14 bg-green-tint rounded-sm flex-shrink-0 flex items-center justify-center text-xl">
                        📖
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink group-hover:text-green transition-colors leading-snug line-clamp-2">
                          {p.title.en}
                        </p>
                        <p className="text-[10px] text-stone mt-0.5">{p.readingTime} min</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
