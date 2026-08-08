import { Module } from '@nestjs/common'
import { MenusService } from './menus.service'
import { MenusController } from './menus.controller'
import { StorefrontRevalidationService } from './storefront-revalidation.service'
import { AuditLogModule } from '../audit-log/audit-log.module'

@Module({
  imports: [AuditLogModule],
  providers: [MenusService, StorefrontRevalidationService],
  controllers: [MenusController],
  exports: [MenusService],
})
export class MenusModule {}
