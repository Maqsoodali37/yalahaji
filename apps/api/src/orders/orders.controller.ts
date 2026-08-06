import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, Res } from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { OrdersService, OrderAdminFilters } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { TrackOrderDto } from './dto/track-order.dto'
import { OrderQueryDto } from './dto/order-query.dto'
import { UpdateTrackingDto } from './dto/update-tracking.dto'
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto'
import { BulkStatusDto } from './dto/bulk-status.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_ORDERS } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

/** Map validated query params to the service's filter shape (dates parsed). */
function toOrderFilters(q: OrderQueryDto): OrderAdminFilters {
  return {
    status: q.status,
    search: q.search,
    paymentStatus: q.paymentStatus,
    paymentMethod: q.paymentMethod,
    shippingMethod: q.shippingMethod,
    // A date-only bound is widened to the whole day so `dateTo = 6 Aug` also
    // matches an order placed at 6 Aug 18:00.
    dateFrom: q.dateFrom ? new Date(q.dateFrom) : undefined,
    dateTo: q.dateTo ? new Date(new Date(q.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
    minTotal: q.minTotal,
    maxTotal: q.maxTotal,
    city: q.city,
    province: q.province,
    sort: q.sort,
    order: q.order === 'asc' ? 'asc' : q.order === 'desc' ? 'desc' : undefined,
  }
}

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
  @ApiOperation({ summary: 'Admin: all orders (filter, sort, paginate)' })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(undefined, +(query.page ?? '1'), +(query.limit ?? '20'), toOrderFilters(query))
  }

  @Get('admin/stats')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: revenue and order KPIs' })
  adminStats(@Query('days') days = '30') {
    return this.ordersService.adminStats(+days)
  }

  /**
   * CSV of the current filtered view. Declared before `admin/:id` so the
   * static path is not swallowed by the parameterised route.
   */
  @Get('admin/export')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: export the current view as CSV' })
  async export(@Query() query: OrderQueryDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.ordersService.exportCsv(toOrderFilters(query))
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="orders.csv"',
    })
    return csv
  }

  @Post('admin/bulk-status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: apply one status to many orders' })
  bulkStatus(@Body() dto: BulkStatusDto) {
    return this.ordersService.bulkUpdateStatus(dto.ids, dto.status, dto.note)
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

  @Patch(':id/tracking')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: set the courier tracking number' })
  setTracking(@Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.ordersService.setTracking(id, dto.trackingNumber)
  }

  @Patch(':id/payment-status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: mark payment paid / unpaid / refunded' })
  setPaymentStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.ordersService.setPaymentStatus(id, dto.paymentStatus, dto.note)
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my order' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.cancel(id, user.id)
  }
}
