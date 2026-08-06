import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cats = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { children: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })
    return cats
  }

  /**
   * `isActive` is part of the lookup, not a field the caller filters on
   * afterwards — a disabled category must read as absent, exactly like
   * `products.findBySlug`. Without it the storefront rendered a category
   * staff had switched off, with its products still buyable.
   */
  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        children: { where: { isActive: true }, orderBy: { order: 'asc' } },
        parent: true,
      },
    })
    if (!cat) throw new NotFoundException(`Category ${slug} not found.`)
    return cat
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Slug already in use.')
    return this.prisma.category.create({ data: dto as Prisma.CategoryUncheckedCreateInput })
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } })
    if (!cat) throw new NotFoundException('Category not found.')
    return this.prisma.category.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } })
    if (!cat) throw new NotFoundException('Category not found.')
    return this.prisma.category.delete({ where: { id } })
  }
}
