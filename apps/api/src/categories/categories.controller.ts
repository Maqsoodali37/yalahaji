import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReorderCategoriesDto } from './dto/reorder-categories.dto'
import { BulkCategoryActionDto } from './dto/bulk-category-action.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ─── Static paths first — Nest matches in declaration order, and `:slug`
  // below would otherwise need to be checked against every route added here. ───

  @Get('admin/tree')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: full category tree, every status, with product counts' })
  findAllAdmin() {
    return this.categoriesService.findAllAdmin()
  }

  @Post('admin/reorder')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: persist a drag-and-drop move or reorder' })
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto.items)
  }

  @Post('admin/bulk')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: enable, disable or delete many categories at once' })
  bulk(@Body() dto: BulkCategoryActionDto) {
    return this.categoriesService.bulkAction(dto.ids, dto.action)
  }

  @Get()
  @ApiOperation({ summary: 'Get category tree (active only)' })
  findAll() {
    return this.categoriesService.findAll()
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug)
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Soft delete — refuses if children or products are still attached' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id)
  }
}
