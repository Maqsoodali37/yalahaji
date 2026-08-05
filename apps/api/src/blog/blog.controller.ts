import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { BlogService } from './blog.service'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { UpdateBlogPostDto } from './dto/update-blog-post.dto'
import { BlogQueryDto } from './dto/blog-query.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List published posts' })
  findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(true, query.page, query.limit, query.category)
  }

  /**
   * Declared before `:slug` — Nest matches routes in declaration order, so a
   * later static path would be swallowed by the parameterised one and
   * `/blog/categories` would be looked up as a post slug.
   */
  @Get('categories')
  @ApiOperation({ summary: 'Categories that have published posts, with counts' })
  findCategories() {
    return this.blogService.findCategories()
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: list all posts' })
  findAllAdmin(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(false, query.page, query.limit, query.category)
  }

  @Get('admin/categories')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: categories including those with only drafts' })
  findCategoriesAdmin() {
    return this.blogService.findCategories(false)
  }

  @Get('admin/preview/:slug')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: preview a post by slug, published or not' })
  previewOne(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug, true)
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published post by slug' })
  findOne(@Param('slug') slug: string) { return this.blogService.findBySlug(slug) }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  remove(@Param('id') id: string) { return this.blogService.remove(id) }
}
