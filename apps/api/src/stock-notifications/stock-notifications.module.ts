import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { StockNotificationsService } from './stock-notifications.service'
import { StockNotificationsController } from './stock-notifications.controller'

@Module({
  imports: [PassportModule],
  providers: [StockNotificationsService],
  controllers: [StockNotificationsController],
})
export class StockNotificationsModule {}
