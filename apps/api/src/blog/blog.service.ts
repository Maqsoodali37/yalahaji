import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { UpdateBlogPostDto } from './dto/update-blog-post.dto'
import { Prisma, BlogCategory } from '@prisma/client'

/**
 * Display labels for the `BlogCategory` enum.
 *
 * The storefront previously carried its own hardcoded copy of this list, which
 * named four of the six categories — so posts filed under `hajj_guide` or
 * `travel_tips` were reachable only by direct URL, with no filter chip to
 * click. Deriving the list from the enum means adding a category to the schema
 * is enough to surface it.
 */
const CATEGORY_LABELS: Record<BlogCategory, string> = {
  hajj_guide: 'Hajj Guide',
  umrah_guide: 'Umrah Guide',
  packing: 'Packing',
  dua: 'Duas',
  travel_tips: 'Travel Tips',
  product_guides: 'Product Guides',
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Categories that actually have published posts, with their counts.
   *
   * Empty categories are omitted: a filter chip that leads to "no posts in
   * this category yet" is a dead end the reader had no way to predict.
   */
  async findCategories(publishedOnly = true) {
    const grouped = await this.prisma.blogPost.groupBy({
      by: ['category'],
      where: publishedOnly ? { published: true } : {},
      _count: { _all: true },
    })

    return grouped
      .map((row) => ({
        slug: row.category,
        label: CATEGORY_LABELS[row.category] ?? row.category,
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }

  async findAll(published = true, page = 1, limit = 12, category?: BlogCategory) {
    const where: Prisma.BlogPostWhereInput = {
      ...(published ? { published: true } : {}),
      ...(category ? { category } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        select: {
          id: true, slug: true,
          titleEn: true, titleUr: true, titleAr: true,
          excerptEn: true, excerptUr: true, excerptAr: true,
          coverImage: true, category: true, author: true, authorAvatar: true,
          readingTime: true, featured: true, published: true, publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ])
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  /**
   * `includeUnpublished` is opt-in and only ever passed by the staff-guarded
   * preview route. The public route must not surface drafts: the listing
   * already filtered on `published`, so an unfiltered lookup here let anyone
   * who guessed or scraped a slug read unreleased posts.
   *
   * A draft returns 404 rather than 403 so the endpoint cannot be used to
   * confirm that a given slug exists.
   */
  async findBySlug(slug: string, includeUnpublished = false) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } })
    if (!post) throw new NotFoundException('Post not found.')
    if (!post.published && !includeUnpublished) throw new NotFoundException('Post not found.')
    return post
  }

  async create(dto: CreateBlogPostDto) {
    return this.prisma.blogPost.create({
      data: {
        ...dto,
        publishedAt: dto.published ? new Date() : null,
      } as Prisma.BlogPostUncheckedCreateInput,
    })
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } })
    if (!post) throw new NotFoundException('Post not found.')

    const data: Prisma.BlogPostUncheckedUpdateInput = { ...dto }
    if (dto.published && !post.published) data.publishedAt = new Date()

    return this.prisma.blogPost.update({ where: { id }, data })
  }

  async remove(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } })
    if (!post) throw new NotFoundException('Post not found.')
    return this.prisma.blogPost.delete({ where: { id } })
  }
}
