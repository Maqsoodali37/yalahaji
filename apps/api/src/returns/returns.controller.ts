import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { ReturnStatus } from '@prisma/client'
import { ReturnsService } from './returns.service'
import { CreateReturnDto } from './dto/create-return.dto'
import { UpdateReturnStatusDto } from './dto/update-return-status.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_ORDERS } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  /**
   * Orders the caller can still open a return against. Declared before `:id`
   * so the static path is not captured by the parameterised route.
   */
  @Get('eligible-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delivered orders still inside the return window' })
  eligibleOrders(@CurrentUser() user: { id: string }) {
    return this.returnsService.findEligibleOrders(user.id)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My return requests' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.returnsService.findMine(user.id)
  }

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: return queue' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: ReturnStatus,
  ) {
    return this.returnsService.findAll(+page || 1, +limit || 20, status)
  }

  @Patch('admin/:id/status')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: approve / reject / receive / refund a return' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReturnStatusDto) {
    return this.returnsService.updateStatus(id, dto.status, dto.note)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a return for a delivered order' })
  create(@Body() dto: CreateReturnDto, @CurrentUser() user: { id: string }) {
    return this.returnsService.create(dto, user.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'One of my return requests' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    return this.returnsService.findOneForUser(id, user.id)
  }
}
