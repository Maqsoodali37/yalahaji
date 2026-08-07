import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuditLogService } from './audit-log.service'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@ApiTags('audit-log')
@Controller('audit-logs')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
@ApiCookieAuth()
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: audit trail, optionally narrowed to one entity' })
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.auditLog.findAll({ entityType, entityId, page: +page || 1, limit: +limit || 20 })
  }
}
