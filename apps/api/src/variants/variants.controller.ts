import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { VariantsService } from './variants.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('variants')
@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.variantsService.findByProduct(productId)
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  updateStock(@Param('id') id: string, @Body('stock') stock: number) {
    return this.variantsService.updateStock(id, stock)
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  updatePrice(
    @Param('id') id: string,
    @Body('price') price: number,
    @Body('compareAtPrice') compareAtPrice?: number,
  ) {
    return this.variantsService.updatePrice(id, price, compareAtPrice)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id)
  }
}
