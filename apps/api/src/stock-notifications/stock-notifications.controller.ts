import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { StockNotificationsService } from './stock-notifications.service'
import { CreateStockNotificationDto } from './dto/create-stock-notification.dto'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('stock-notifications')
@Controller('stock-notifications')
export class StockNotificationsController {
  constructor(private readonly service: StockNotificationsService) {}

  /**
   * Anonymous callers are allowed — a shopper shouldn't need an account to be
   * told when something is back. Throttled tightly because it accepts an
   * arbitrary email and would otherwise be usable to send mail on demand.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Notify me when this product is back in stock' })
  create(@Body() dto: CreateStockNotificationDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.id)
  }
}
