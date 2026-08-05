import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { KitCategoriesService } from './kit-categories.service'
import { CreateKitCategoryDto } from './dto/create-kit-category.dto'
import { UpdateKitCategoryDto } from './dto/update-kit-category.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('kit-categories')
@Controller('kit-categories')
export class KitCategoriesController {
  constructor(private readonly kitCategoriesService: KitCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Kit builder steps with their selectable products' })
  findAll() {
    return this.kitCategoriesService.findAll()
  }

  /**
   * Declared before `:id` — Nest matches in declaration order, so a later
   * static path would be captured by the parameterised route.
   */
  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: all steps, including inactive and empty ones' })
  findAllAdmin() {
    return this.kitCategoriesService.findAll(true)
  }

  @Get(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: a single step with its linked categories' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.kitCategoriesService.findOne(id)
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  create(@Body() dto: CreateKitCategoryDto) {
    return this.kitCategoriesService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateKitCategoryDto) {
    return this.kitCategoriesService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.kitCategoriesService.remove(id)
  }
}
