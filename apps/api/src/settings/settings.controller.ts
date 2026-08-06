import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { CreateConfigDto } from './dto/create-config.dto'
import { UpdateConfigDto } from './dto/update-config.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

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
  create(@Body() dto: CreateConfigDto) {
    return this.settingsService.create(dto)
  }

  @Patch(':key')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: update a configuration' })
  update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.settingsService.update(key, dto)
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
  remove(@Param('key') key: string) {
    return this.settingsService.remove(key)
  }
}
