import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { CouponsService } from './coupons.service'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { UpdateCouponDto } from './dto/update-coupon.dto'
import { ValidateCouponDto } from './dto/validate-coupon.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto.code, dto.subtotal)
  }

  @Get()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: list coupons' })
  findAll() { return this.couponsService.findAll() }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  create(@Body() dto: CreateCouponDto) { return this.couponsService.create(dto) }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) { return this.couponsService.update(id, dto) }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  remove(@Param('id') id: string) { return this.couponsService.remove(id) }
}
