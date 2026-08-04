import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(published = true, page = 1, limit = 12) {
    const where = published ? { published: true } : {}
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

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } })
    if (!post) throw new NotFoundException('Post not found.')
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

  async update(id: string, dto: Partial<CreateBlogPostDto>) {
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
