import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { BlogService } from './blog.service'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List published posts' })
  findAll(@Query('page') page = '1', @Query('limit') limit = '12') {
    return this.blogService.findAll(true, +page, +limit)
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: list all posts' })
  findAllAdmin(@Query('page') page = '1', @Query('limit') limit = '12') {
    return this.blogService.findAll(false, +page, +limit)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) { return this.blogService.findBySlug(slug) }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateBlogPostDto>) {
    return this.blogService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  remove(@Param('id') id: string) { return this.blogService.remove(id) }
}
