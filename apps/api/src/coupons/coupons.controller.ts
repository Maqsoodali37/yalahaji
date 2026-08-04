import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CouponsService } from './coupons.service'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  validate(@Body() body: { code: string; subtotal: number }) {
    return this.couponsService.validate(body.code, body.subtotal)
  }

  @Get()
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list coupons' })
  findAll() { return this.couponsService.findAll() }

  @Post()
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  create(@Body() dto: CreateCouponDto) { return this.couponsService.create(dto) }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) { return this.couponsService.update(id, dto) }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.couponsService.remove(id) }
}
