import { Controller, Get, Post, Patch, Param, Body, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { OrderStatus } from '@prisma/client'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_ORDERS } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order (auth or guest)' })
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    const userId = req.user?.id
    return this.ordersService.create(dto, userId)
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

  @Get('track/:number')
  @ApiOperation({ summary: 'Track order by number (public)' })
  track(@Param('number') number: string) {
    return this.ordersService.findByNumber(number)
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
