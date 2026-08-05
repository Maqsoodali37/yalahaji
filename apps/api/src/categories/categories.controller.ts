import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get category tree' })
  findAll() { return this.categoriesService.findAll() }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findOne(@Param('slug') slug: string) { return this.categoriesService.findBySlug(slug) }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  create(@Body() dto: CreateCategoryDto) { return this.categoriesService.create(dto) }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.categoriesService.update(id, dto) }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  remove(@Param('id') id: string) { return this.categoriesService.remove(id) }
}
