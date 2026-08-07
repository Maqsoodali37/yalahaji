import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { CreateConfigDto } from './dto/create-config.dto'
import { UpdateConfigDto } from './dto/update-config.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuditActor } from '../audit-log/audit-log.service'

/** The shape `CurrentUser` resolves to for an admin-guarded route. */
interface AdminPrincipal {
  id: string
  name: string
  role: string
}

function actorFrom(user: AdminPrincipal, req: FastifyRequest): AuditActor {
  return { id: user.id, name: user.name, role: user.role, ip: req.ip }
}

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * The only unauthenticated route here. Returns just the rows flagged
   * `is_public`, as a flat `{ key: parsedValue }` map for the storefront to
   * read on boot.
   */
  @Get('public')
  @ApiOperation({ summary: 'Public shop configuration for the storefront' })
  findPublic() {
    return this.settingsService.findPublic()
  }

  /**
   * Writes are restricted to admin and manager rather than the wider
   * STAFF_MANAGE set used elsewhere — these rows decide what customers are
   * charged, and support and fulfilment have no reason to change them.
   *
   * Declared before `:key` so the static path is not captured by the
   * parameterised route.
   */
  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: all configuration, optionally by category' })
  findAll(@Query('category') category?: string) {
    return this.settingsService.findAll(category)
  }

  @Get(':key')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: one configuration by key' })
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key)
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: create a configuration' })
  create(@Body() dto: CreateConfigDto, @CurrentUser() user: AdminPrincipal, @Req() req: FastifyRequest) {
    return this.settingsService.create(dto, actorFrom(user, req))
  }

  @Patch(':key')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: update a configuration' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.settingsService.update(key, dto, actorFrom(user, req))
  }

  /**
   * Admin only. Deleting a key the code reads falls back to a hardcoded
   * default rather than erroring, so the shop keeps running while quietly
   * charging something nobody chose — a narrower blast radius is warranted
   * than for an edit.
   */
  @Delete(':key')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: delete a configuration' })
  remove(@Param('key') key: string, @CurrentUser() user: AdminPrincipal, @Req() req: FastifyRequest) {
    return this.settingsService.remove(key, actorFrom(user, req))
  }
}
