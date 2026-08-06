import { Module } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { SettingsModule } from '../settings/settings.module'

@Module({
  // Order totals are computed from shop configuration (shipping thresholds,
  // COD fee, minimum order, tax), so this needs the settings service rather
  // than reading the table directly.
  imports: [SettingsModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
