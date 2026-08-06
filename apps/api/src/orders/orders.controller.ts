import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { OrderStatus } from '@prisma/client'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { TrackOrderDto } from './dto/track-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_ORDERS } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Guests and signed-in customers both post here. The optional guard is what
   * makes `user` real: with no guard at all Passport never ran, so `req.user`
   * was always undefined and every authenticated order was filed as a guest
   * order with no `userId`.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Place an order (auth or guest)' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.create(dto, user?.id)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My orders' })
  findMyOrders(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.ordersService.findAll(user.id, +page, +limit)
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: all orders' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAll(undefined, +page, +limit, { status, search })
  }

  @Get('admin/stats')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: revenue and order KPIs' })
  adminStats(@Query('days') days = '30') {
    return this.ordersService.adminStats(+days)
  }

  @Get('admin/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: get order by id' })
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findByIdAdmin(id)
  }

  /**
   * POST rather than GET so the order number — which is now the credential —
   * stays out of URLs, access logs, browser history and Referer headers.
   *
   * Rate-limited hard because this is the one order endpoint an anonymous
   * caller can reach and the random token is all that protects it. Six
   * Base32 characters is ~1.07e9 combinations, so 5/minute puts a blind
   * search out of reach; the limit exists to keep it that way.
   */
  @Post('track')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Track an order by its full order number' })
  track(@Body() dto: TrackOrderDto) {
    return this.ordersService.trackByNumber(dto.number)
  }

  @Get(':number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my order by number' })
  findOne(@Param('number') number: string, @CurrentUser() user: any) {
    return this.ordersService.findByNumber(number, user.id)
  }

  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto)
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my order' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.cancel(id, user.id)
  }
}
