import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

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
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  create(@Body() dto: CreateCategoryDto) { return this.categoriesService.create(dto) }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) { return this.categoriesService.update(id, dto) }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.categoriesService.remove(id) }
}
