import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  NotFoundException,
  ParseEnumPipe,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam } from '@nestjs/swagger'
import { MenuLocation } from '@prisma/client'
import { MenusService } from './menus.service'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuditActor } from '../audit-log/audit-log.service'
import type { MenuPayload } from './menu-types'

interface AdminPrincipal {
  id: string
  name: string
  role: string
}

function actorFrom(user: AdminPrincipal, req: FastifyRequest): AuditActor {
  return { id: user.id, name: user.name, role: user.role, ip: req.ip }
}

/** What `OptionalJwtAuthGuard` leaves on the request for a signed-in customer. */
interface CustomerPrincipal {
  id: string
}

@ApiTags('menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  // ─── Public reads ──────────────────────────────────────────────────────────
  //
  // All four carry OptionalJwtAuthGuard rather than no guard at all. The
  // audience a menu is filtered for has to come from a verified token —
  // an `?audience=wholesale` parameter would put staff-only navigation one
  // query string away from public. With no token the guard passes the request
  // through untouched and the guest menu is served, which is also what a
  // search-engine crawler and every cached server render get.
  //
  // Static paths are declared before `:id/items`. Nest matches in declaration
  // order, so `@Get(':id/items')` above `@Get('location/:location')` would
  // swallow it — the trap PROJECT_SPEC.md records.

  @Get('header')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Header navigation, filtered for the caller' })
  header(@CurrentUser() user?: CustomerPrincipal) {
    return this.read(MenuLocation.header, user)
  }

  @Get('footer')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Footer navigation, filtered for the caller' })
  footer(@CurrentUser() user?: CustomerPrincipal) {
    return this.read(MenuLocation.footer, user)
  }

  @Get('mobile')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Mobile drawer navigation, filtered for the caller' })
  mobile(@CurrentUser() user?: CustomerPrincipal) {
    return this.read(MenuLocation.mobile, user)
  }

  @Get('location/:location')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiParam({ name: 'location', enum: MenuLocation })
  @ApiOperation({ summary: 'Any menu by location (header, footer, mobile, sidebar, mega)' })
  byLocation(
    // ParseEnumPipe, not a bare string: without it an unknown location reaches
    // Prisma as an invalid enum value and comes back as a raw 500 instead of
    // the 400 the caller can act on.
    @Param('location', new ParseEnumPipe(MenuLocation)) location: MenuLocation,
    @CurrentUser() user?: CustomerPrincipal,
  ) {
    return this.read(location, user)
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: every menu, every status, with item counts' })
  findAllAdmin() {
    return this.menusService.findAllAdmin()
  }

  @Get('admin/:id/tree')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Admin: full item tree, ignoring status, schedule and audience, and carrying the status/schedule fields the public payload withholds',
  })
  adminTree(@Param('id') id: string) {
    return this.menusService.findAdminTree(id)
  }

  @Post('admin/items')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: add a menu item' })
  createItem(
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.createItem(dto, actorFrom(user, req))
  }

  @Post('admin/reorder')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: persist a drag-and-drop move or reorder' })
  reorder(
    @Body() dto: ReorderMenuItemsDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.reorderItems(dto, actorFrom(user, req))
  }

  @Post('admin/publish')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Admin: purge every menu cache and ask the storefront to do the same',
  })
  async publishAll() {
    await this.menusService.publishAll()
    return { published: true }
  }

  @Patch('admin/items/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: edit a menu item' })
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.updateItem(id, dto, actorFrom(user, req))
  }

  @Delete('admin/items/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: delete a menu item and its whole subtree' })
  removeItem(
    @Param('id') id: string,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.removeItem(id, actorFrom(user, req))
  }

  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: create the menu for a location' })
  createMenu(
    @Body() dto: CreateMenuDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.createMenu(dto, actorFrom(user, req))
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  updateMenu(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.updateMenu(id, dto, actorFrom(user, req))
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_MANAGE)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: delete a menu and, by cascade, all its items' })
  removeMenu(
    @Param('id') id: string,
    @CurrentUser() user: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.menusService.removeMenu(id, actorFrom(user, req))
  }

  /**
   * Items of a menu addressed by id. Declared last so the two-segment static
   * routes above are matched first.
   */
  @Get(':id/items')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Items of one menu by id, filtered for the caller' })
  async items(@Param('id') id: string, @CurrentUser() user?: CustomerPrincipal) {
    const audience = await this.menusService.resolveAudience(user?.id)
    return this.menusService.findItemsByMenuId(id, audience)
  }

  private async read(
    location: MenuLocation,
    user: CustomerPrincipal | undefined,
  ): Promise<MenuPayload> {
    const audience = await this.menusService.resolveAudience(user?.id)
    const menu = await this.menusService.findByLocation(location, audience)

    // A 404 rather than an empty payload. The storefront distinguishes
    // "there is no menu configured here" from "the API is unreachable" and
    // falls back differently for each — collapsing both into `{ items: [] }`
    // would hide an outage behind a header that just looks empty.
    if (!menu) throw new NotFoundException(`No active menu is configured for '${location}'.`)
    return menu
  }
}
