import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductQueryDto } from './dto/product-query.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query)
  }

  @Get('admin/list')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: list products including inactive' })
  findAllAdmin(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.productsService.findAllAdmin({
      search, category, status, page: +page, limit: +limit,
    })
  }

  @Get('admin/stats')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: catalogue + stock counts' })
  adminStats() {
    return this.productsService.adminStats()
  }

  @Get('admin/low-stock')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: variants at or below low-stock threshold' })
  lowStock(@Query('limit') limit = '20') {
    return this.productsService.findLowStock(+limit)
  }

  @Get('admin/id/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: get product by id (active or not)' })
  findByIdAdmin(@Param('id') id: string) {
    return this.productsService.findById(id)
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug)
  }

  @Get(':id/related')
  findRelated(@Param('id') id: string) {
    return this.productsService.findRelated(id)
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  remove(@Param('id') id: string) {
    return this.productsService.remove(id)
  }
}
