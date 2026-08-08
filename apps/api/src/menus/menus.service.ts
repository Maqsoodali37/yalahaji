import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import {
  Menu,
  MenuItem,
  MenuLocation,
  MenuLinkType,
  MenuVisibility,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditActor, AuditLogService } from '../audit-log/audit-log.service'
import { StorefrontRevalidationService } from './storefront-revalidation.service'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import type { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto'
import {
  MAX_MENU_DEPTH,
  MAX_MENU_URL,
  INTERNAL_PATH_REGEX,
  INTERNAL_PATH_MESSAGE,
  DEFAULT_MENU_TTL_SECONDS,
} from './menu-constants'
import type {
  AdminMenuItemNode,
  MenuAudience,
  MenuItemNode,
  MenuPayload,
  MenuText,
  MegaBanner,
  MegaBlock,
  MegaConfig,
} from './menu-types'

const AUDIT_ENTITY_MENU = 'Menu'
const AUDIT_ENTITY_ITEM = 'MenuItem'

/** One cache key per location, holding the UNFILTERED rows. See `findByLocation`. */
const cacheKey = (location: MenuLocation) => `menu:rows:${location}`

const ALL_LOCATIONS: MenuLocation[] = [
  MenuLocation.header,
  MenuLocation.footer,
  MenuLocation.mobile,
  MenuLocation.sidebar,
  MenuLocation.mega,
]

/** Link types whose href is built from `targetSlug` rather than `url`. */
const SLUG_ROUTED: MenuLinkType[] = [
  MenuLinkType.category,
  MenuLinkType.product,
  MenuLinkType.cms_page,
  MenuLinkType.brand,
  MenuLinkType.collection,
]

/** A menu and its rows, with real `Date` objects — what the service works with. */
interface LoadedMenu {
  menu: Menu
  rows: MenuItem[]
}

/**
 * The same thing after a round trip through the cache.
 *
 * Typed separately rather than reusing `LoadedMenu` because it is genuinely a
 * different shape: `cache.set` serialises to JSON, so every `Date` comes back
 * as an ISO string. Pretending otherwise is what makes `publishFrom > now`
 * compare a string to a Date — which TypeScript allows, and which is quietly
 * always false. The whole scheduling feature would do nothing the moment
 * Redis was reachable, and pass every test written against an empty cache.
 */
type Serialised<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K]
}

interface CachedMenu {
  menu: Serialised<Menu>
  rows: Serialised<MenuItem>[]
}

/**
 * Cached "there is no menu here".
 *
 * A sentinel object rather than a cached `null`, because `null` is not a
 * cacheable value: `cache-manager-redis-store` rejects it outright
 * (`isCacheable` defaults to `v !== undefined && v !== null` and throws), and
 * `cacheSet` swallows the throw — so caching the absence would appear to work,
 * do nothing on Redis, and only ever function on the in-memory fallback, i.e.
 * only while Redis is down. Which is exactly backwards.
 */
const ABSENT = { absent: true } as const
type CacheEntry = CachedMenu | typeof ABSENT

function isAbsent(entry: CacheEntry): entry is typeof ABSENT {
  return (entry as { absent?: boolean }).absent === true
}

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly auditLog: AuditLogService,
    private readonly revalidation: StorefrontRevalidationService,
  ) {}

  // ── Reading ───────────────────────────────────────────────────────────────

  /**
   * Resolve the audience for a request from the authenticated principal.
   *
   * A database lookup rather than a claim on the JWT: a staff member moving a
   * customer to the wholesale group should take effect on their next page
   * load, not at their next login — a token issued this morning would
   * otherwise still say `retail` all day. It is one primary-key read on a
   * route that is already hitting the cache for everything else.
   */
  async resolveAudience(userId: string | undefined | null): Promise<MenuAudience> {
    if (!userId) return 'guest'

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { customerGroup: true, isActive: true },
      })
      // A token for a deactivated account gets the guest menu rather than an
      // error: navigation is not the right place to discover a disabled
      // account, and the guarded routes behind these links already refuse.
      if (!user || !user.isActive) return 'guest'
      return user.customerGroup === 'wholesale' ? 'wholesale' : 'retail'
    } catch (e) {
      this.logger.warn(
        `Could not resolve customer group for ${userId} (${(e as Error).message}) — serving the guest menu.`,
      )
      return 'guest'
    }
  }

  /**
   * A whole menu, filtered for this audience and this instant.
   *
   * **The cache holds unfiltered rows, and filtering happens per request.**
   * The obvious alternative — caching the finished payload per
   * (location, audience) — makes `publishUntil` inexact by up to the TTL: an
   * item scheduled to stop at 23:59 keeps rendering until the entry expires.
   * Filtering an already-loaded array is microseconds, so paying it per
   * request buys exact scheduling and keeps one key per location instead of
   * one per location per audience.
   */
  async findByLocation(
    location: MenuLocation,
    audience: MenuAudience = 'guest',
    now: Date = new Date(),
  ): Promise<MenuPayload | null> {
    const cached = await this.loadRows(location)
    if (!cached || !cached.menu.isActive) return null

    const visible = cached.rows.filter((row) => this.isVisible(row, audience, now))

    return {
      id: cached.menu.id,
      location: cached.menu.location,
      name: cached.menu.name,
      cacheTtl: cached.menu.cacheTtl || DEFAULT_MENU_TTL_SECONDS,
      updatedAt: this.latestChange(cached).toISOString(),
      items: this.buildTree(visible),
    }
  }

  /**
   * Items of one menu by id, same filtering as `findByLocation`.
   *
   * Exists because the admin panel and any second consumer address a menu by
   * id, while the storefront addresses it by location — and a caller with an
   * id should not have to look the location up first.
   */
  async findItemsByMenuId(
    menuId: string,
    audience: MenuAudience = 'guest',
    now: Date = new Date(),
  ): Promise<MenuItemNode[]> {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } })
    if (!menu) throw new NotFoundException('Menu not found.')

    const payload = await this.findByLocation(menu.location, audience, now)
    // A disabled menu reads as absent here too. Returning `[]` where
    // `GET /menus/location/:location` returns 404 would give two public
    // routes two different answers for one state.
    if (!payload) throw new NotFoundException('Menu not found.')
    return payload.items
  }

  /** Admin listing — every menu, every status, with an item count. */
  async findAllAdmin() {
    const rows = await this.prisma.menu.findMany({
      orderBy: { location: 'asc' },
      include: { _count: { select: { items: true } } },
    })
    return rows.map(({ _count, ...menu }) => ({ ...menu, itemCount: _count.items }))
  }

  /**
   * Admin tree — every item regardless of status, schedule or audience.
   *
   * Deliberately a separate method from `findByLocation` rather than an
   * `includeHidden` flag on it, matching the `/categories` vs
   * `/categories/admin/tree` split: the public route carries no guard, so a
   * flag would let anyone read the items staff have deliberately hidden or
   * not yet published.
   */
  async findAdminTree(menuId: string): Promise<AdminMenuItemNode[]> {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } })
    if (!menu) throw new NotFoundException('Menu not found.')

    const rows = await this.prisma.menuItem.findMany({
      where: { menuId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    })
    return this.buildTree(rows, true) as AdminMenuItemNode[]
  }

  // ── Writing: menus ────────────────────────────────────────────────────────

  async createMenu(dto: CreateMenuDto, actor: AuditActor): Promise<Menu> {
    const existing = await this.prisma.menu.findUnique({ where: { location: dto.location } })
    if (existing) {
      throw new ConflictException(
        `A menu already exists at '${dto.location}'. Edit that one rather than adding a second — the storefront reads exactly one menu per location.`,
      )
    }

    const created = await this.prisma.menu.create({
      data: {
        location: dto.location,
        name: dto.name,
        isActive: dto.isActive ?? true,
        cacheTtl: dto.cacheTtl ?? DEFAULT_MENU_TTL_SECONDS,
      },
    })

    await this.publish(created.location)
    await this.auditLog.record({
      actor,
      action: 'create',
      entityType: AUDIT_ENTITY_MENU,
      entityId: created.id,
      after: created,
    })
    return created
  }

  async updateMenu(id: string, dto: UpdateMenuDto, actor: AuditActor): Promise<Menu> {
    const existing = await this.prisma.menu.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Menu not found.')

    const updated = await this.prisma.menu.update({ where: { id }, data: dto })

    await this.publish(existing.location)
    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: AUDIT_ENTITY_MENU,
      entityId: id,
      before: existing,
      after: updated,
    })
    return updated
  }

  /**
   * A real delete, not a soft one — unlike `CategoriesService.remove`.
   *
   * The reasoning that makes a category a soft delete (orders and products
   * still reference it, so the row has to survive) does not apply here:
   * nothing references a menu, and the `isActive` flag already covers "switch
   * it off but keep it". A menu staff deliberately delete should actually go,
   * and its items go with it via ON DELETE CASCADE.
   */
  async removeMenu(id: string, actor: AuditActor): Promise<Menu> {
    const existing = await this.prisma.menu.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    })
    if (!existing) throw new NotFoundException('Menu not found.')

    const { _count, ...menu } = existing
    const deleted = await this.prisma.menu.delete({ where: { id } })

    await this.publish(menu.location)
    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: AUDIT_ENTITY_MENU,
      entityId: id,
      before: { ...menu, itemCount: _count.items },
    })
    return deleted
  }

  // ── Writing: items ────────────────────────────────────────────────────────

  async createItem(dto: CreateMenuItemDto, actor: AuditActor): Promise<MenuItem> {
    const menu = await this.prisma.menu.findUnique({ where: { id: dto.menuId } })
    if (!menu) throw new BadRequestException('Unknown menu id.')

    this.assertLinkTarget(dto.linkType, dto.targetSlug, dto.url)
    this.assertSchedule(dto.publishFrom, dto.publishUntil)

    if (dto.parentId) await this.assertParentUsable(dto.parentId, dto.menuId)

    const data = this.toItemData(dto) as Prisma.MenuItemUncheckedCreateInput

    // Append, don't prepend. `order` defaults to 0 in the schema, so a caller
    // that omits it puts every new item *before* the existing siblings — and
    // several new items all tie at 0, leaving MySQL to break the tie by
    // physical row order, which with uuid ids is effectively arbitrary. The
    // admin form has no order field precisely because ordering is a drag, so
    // the sensible default has to live here.
    if (dto.order === undefined) {
      const last = await this.prisma.menuItem.findFirst({
        where: { menuId: dto.menuId, parentId: dto.parentId ?? null },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      data.order = last ? last.order + 1 : 0
    }

    const created = await this.prisma.menuItem.create({ data })

    await this.publish(menu.location)
    await this.auditLog.record({
      actor,
      action: 'create',
      entityType: AUDIT_ENTITY_ITEM,
      entityId: created.id,
      after: created,
    })
    return created
  }

  async updateItem(id: string, dto: UpdateMenuItemDto, actor: AuditActor): Promise<MenuItem> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { menu: true },
    })
    if (!existing) throw new NotFoundException('Menu item not found.')

    // Validate against the effective values, not just the ones being sent —
    // switching `linkType` to `external` without also sending a `url` has to
    // fail here, or it saves an item whose href is `null`.
    const linkType = dto.linkType ?? existing.linkType
    const targetSlug = dto.targetSlug !== undefined ? dto.targetSlug : existing.targetSlug
    const url = dto.url !== undefined ? dto.url : existing.url
    this.assertLinkTarget(linkType, targetSlug, url)

    this.assertSchedule(
      dto.publishFrom !== undefined ? dto.publishFrom : existing.publishFrom?.toISOString(),
      dto.publishUntil !== undefined ? dto.publishUntil : existing.publishUntil?.toISOString(),
    )

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId) {
        await this.assertParentUsable(dto.parentId, existing.menuId)
        await this.assertNotCircular(id, dto.parentId)
      }
    }

    const { menu, ...before } = existing
    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: this.toItemData(dto) as Prisma.MenuItemUncheckedUpdateInput,
    })

    await this.publish(menu.location)
    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: AUDIT_ENTITY_ITEM,
      entityId: id,
      before,
      after: updated,
    })
    return updated
  }

  /**
   * Deleting an item deletes its subtree, via ON DELETE CASCADE on
   * `parent_id`.
   *
   * The alternative — SET NULL — would silently promote every orphaned child
   * to a top-level nav entry, so removing an "Ihram" dropdown would leave its
   * six children scattered across the header. RESTRICT would refuse with a
   * raw foreign-key 500. The count is returned so the caller can say how many
   * rows actually went.
   */
  async removeItem(id: string, actor: AuditActor): Promise<{ deleted: number }> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { menu: true },
    })
    if (!existing) throw new NotFoundException('Menu item not found.')

    const descendants = await this.collectDescendantIds(id)
    const { menu, ...before } = existing

    await this.prisma.menuItem.delete({ where: { id } })

    await this.publish(menu.location)
    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: AUDIT_ENTITY_ITEM,
      entityId: id,
      before: { ...before, cascadedChildIds: descendants },
    })
    return { deleted: descendants.length + 1 }
  }

  /**
   * Persists a drag-and-drop move or reorder, mirroring
   * `CategoriesService.reorder`.
   *
   * Every proposed parent is validated for existence, same-menu membership
   * and circularity *before* anything is written, so a rejected move never
   * leaves half the tree renumbered.
   */
  async reorderItems(dto: ReorderMenuItemsDto, actor: AuditActor): Promise<{ updated: number }> {
    const items = dto.items
    // `@ArrayMinSize(1)` covers the HTTP path only, and this service is
    // exported. Without the guard an empty batch leaves `menuId` undefined
    // below and Prisma throws a validation error as a raw 500.
    if (items.length === 0) return { updated: 0 }

    const ids = items.map((i) => i.id)

    const existing = await this.prisma.menuItem.findMany({
      where: { id: { in: ids } },
      // `parentId` is selected because an entry that omits it must keep the
      // parent it already has — see the write below.
      select: { id: true, menuId: true, parentId: true },
    })
    const known = new Map(existing.map((r) => [r.id, r]))

    const missing = ids.filter((i) => !known.has(i))
    if (missing.length) throw new BadRequestException(`Unknown menu item id(s): ${missing.join(', ')}`)

    // A reorder spanning two menus is a client bug, and applying it would
    // move items between menus without re-parenting their children.
    const menuIds = new Set([...known.values()].map((r) => r.menuId))
    if (menuIds.size > 1) {
      throw new BadRequestException('All items in a reorder must belong to the same menu.')
    }
    const menuId = [...menuIds][0]

    // Circularity has to be checked against the tree the batch WOULD create,
    // not the one on disk. Checking each move against the persisted parents
    // passes a swap — `a` moves under `b` while `b` is still at the root, and
    // `b` moves under `a` while `a` is still at the root — and then writes a
    // two-item cycle that neither check saw. The proposed parents are
    // overlaid on the persisted ones first, and the walk runs on the merge.
    const proposed = new Map<string, string | null>()
    for (const item of items) {
      // `undefined` and `null` are different instructions and the DTO says so:
      // omitting the field leaves the existing parent alone, sending `null`
      // moves the row to the top level. Collapsing them with `?? null` meant a
      // client reordering a sibling group by sending only `{id, order}`
      // flattened that whole group into the top-level nav.
      proposed.set(
        item.id,
        item.parentId !== undefined ? item.parentId : known.get(item.id)?.parentId ?? null,
      )
    }

    for (const item of items) {
      const parentId = proposed.get(item.id)
      if (!parentId) continue
      if (parentId === item.id) {
        throw new BadRequestException('A menu item cannot be its own parent.')
      }
      // Skip the round trip when the parent is already in the batch — its menu
      // is known, and `assertParentUsable` would only re-read what we have.
      const inBatch = known.get(parentId)
      if (inBatch) {
        if (inBatch.menuId !== menuId) {
          throw new BadRequestException(
            'A menu item cannot be nested under an item from another menu.',
          )
        }
      } else {
        await this.assertParentUsable(parentId, menuId)
      }
      await this.assertNotCircular(item.id, parentId, proposed)
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.menuItem.update({
          where: { id: item.id },
          // `proposed` already resolved omitted-vs-null, and the cycle walk
          // ran against exactly this map — so the check and the write cannot
          // disagree about what the tree is about to become.
          data: { parentId: proposed.get(item.id) ?? null, order: item.order },
        }),
      ),
    )

    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } })
    if (menu) await this.publish(menu.location)

    // Filed against the MENU, not against MenuItem. `AuditLogService.findAll`
    // filters on the (entityType, entityId) pair, so an entry typed
    // `MenuItem` carrying a menu id is invisible when someone opens the
    // history of any item the reorder actually moved, and shows up as a
    // phantom item whose id belongs to a menu.
    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: AUDIT_ENTITY_MENU,
      entityId: menuId,
      after: { action: 'reorder', items },
    })

    return { updated: items.length }
  }

  /**
   * Drops the API cache for a location and asks the storefront to drop its
   * own, so an admin's change is live rather than live-in-five-minutes.
   *
   * Public because the admin panel also exposes an explicit "Publish" button:
   * the automatic call on every write covers the normal case, and the button
   * covers the one where the storefront's revalidation call failed (it never
   * throws) and nobody wants to wait out the TTL.
   */
  async publish(location: MenuLocation): Promise<void> {
    await this.cacheDel(cacheKey(location))
    await this.revalidation.revalidateMenus(location)
  }

  async publishAll(): Promise<void> {
    await Promise.all(ALL_LOCATIONS.map((l) => this.publish(l)))
  }

  // ── Internals: filtering ──────────────────────────────────────────────────

  /**
   * Active, in its publish window, and meant for this audience.
   *
   * Note what is NOT filtered here: `device`. The viewport is a client-side
   * fact — a server render has no idea whether the browser that will receive
   * it is 375px or 1920px wide, and the whole payload is cached and shared
   * across both. Filtering it here would mean either a wrong answer or two
   * separate renders, so `device` ships in the payload and the storefront
   * applies it at the point where the answer is actually known.
   */
  private isVisible(row: MenuItem, audience: MenuAudience, now: Date): boolean {
    if (!row.isActive) return false
    if (row.publishFrom && row.publishFrom > now) return false
    if (row.publishUntil && row.publishUntil <= now) return false

    switch (row.visibility) {
      case MenuVisibility.everyone:
        return true
      case MenuVisibility.guest:
        return audience === 'guest'
      case MenuVisibility.customer:
        return audience !== 'guest'
      case MenuVisibility.retail:
        return audience === 'retail'
      case MenuVisibility.wholesale:
        return audience === 'wholesale'
      default:
        // An enum value the code does not know about is a schema change that
        // skipped this switch. Hiding is the safe direction: a link that
        // should have shown is a missing link; a link that should not have
        // is a leak.
        return false
    }
  }

  /**
   * Nests flat rows into a tree of any depth, dropping items whose parent is
   * not itself visible.
   *
   * The dropping matters: filtering is per row, so hiding a "Wholesale"
   * parent while its children stay `everyone` would otherwise re-attach those
   * children to the root and print them straight into the top-level nav — the
   * opposite of what the admin asked for. Only rows whose whole ancestor
   * chain survived are kept.
   */
  private buildTree(rows: MenuItem[], admin = false): MenuItemNode[] {
    const byParent = new Map<string | null, MenuItem[]>()
    for (const row of rows) {
      const list = byParent.get(row.parentId) ?? []
      list.push(row)
      byParent.set(row.parentId, list)
    }
    for (const list of byParent.values()) list.sort((a, b) => a.order - b.order)

    const seen = new Set<string>()

    const attach = (parentId: string | null, depth: number): MenuItemNode[] => {
      // Depth cap and `seen` are both cycle guards, not design limits. A
      // parent/child pair pointing at each other — reachable through bad data
      // or a bug in a future admin screen — recurses until the process dies,
      // and it would do so inside a page render.
      if (depth > MAX_MENU_DEPTH) {
        this.logger.warn(`Menu nesting exceeded ${MAX_MENU_DEPTH} levels — truncating.`)
        return []
      }

      return (byParent.get(parentId) ?? [])
        .filter((row) => {
          if (seen.has(row.id)) {
            this.logger.error(`Menu item ${row.id} reached twice — the tree has a cycle.`)
            return false
          }
          seen.add(row.id)
          return true
        })
        .map((row) => this.toNode(row, attach(row.id, depth + 1), admin))
    }

    return attach(null, 0)
  }

  /**
   * `admin` adds the fields the public payload deliberately withholds — status,
   * schedule, parent and target id. Without them the admin screen cannot show
   * an unpublished item at all, let alone round-trip one through its form.
   */
  private toNode(row: MenuItem, children: MenuItemNode[], admin = false): MenuItemNode {
    const node: MenuItemNode = {
      id: row.id,
      title: { en: row.titleEn, ur: row.titleUr, ar: row.titleAr },
      linkType: row.linkType,
      targetSlug: row.targetSlug,
      url: row.url,
      icon: row.icon,
      image: row.image,
      badge: row.badgeEn ? { en: row.badgeEn, ur: row.badgeUr, ar: row.badgeAr } : null,
      order: row.order,
      device: row.device,
      visibility: row.visibility,
      isMegaMenu: row.isMegaMenu,
      megaLayout: row.megaLayout,
      megaColumns: row.megaColumns,
      // On the admin tree the panel config is returned even when the mega flag
      // is off, so toggling the flag in the form does not appear to wipe the
      // configuration the row still holds.
      megaConfig: row.isMegaMenu || admin ? this.normaliseMegaConfig(row.megaConfig) : null,
      relAttribute: row.relAttribute,
      noFollow: row.noFollow,
      openInNewTab: row.openInNewTab,
      titleAttr: row.titleAttrEn
        ? { en: row.titleAttrEn, ur: row.titleAttrUr, ar: row.titleAttrAr }
        : null,
      children,
    }

    if (!admin) return node

    // Built as a second, explicitly typed object rather than spread into the
    // literal above: TypeScript's excess-property check fires on a fresh
    // literal carrying keys the declared return type does not have, and
    // silencing it with a cast is how a field ends up misspelled and simply
    // absent from the payload.
    const adminNode: AdminMenuItemNode = {
      ...node,
      parentId: row.parentId,
      isActive: row.isActive,
      targetId: row.targetId,
      // ISO strings so the admin form can round-trip them through a date
      // input; the column is a DateTime and JSON has no date type.
      publishFrom: row.publishFrom?.toISOString() ?? null,
      publishUntil: row.publishUntil?.toISOString() ?? null,
      children: children as AdminMenuItemNode[],
    }
    return adminNode
  }

  // ── Internals: mega config ────────────────────────────────────────────────

  /**
   * Coerces whatever is in the `megaConfig` JSON column into the shape the
   * storefront is typed against.
   *
   * Nothing constrains what an admin saves there — it is a Json column
   * precisely so a new layout is not a migration — so this is the boundary
   * that stops a malformed object reaching a component and crashing the
   * server render as "a client-side exception has occurred". Unknown input
   * becomes an empty list or null, never `undefined`.
   */
  private normaliseMegaConfig(raw: Prisma.JsonValue | null): MegaConfig {
    const empty: MegaConfig = {
      featuredCategorySlugs: [],
      featuredProductSlugs: [],
      banner: null,
      blocks: [],
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty

    const obj = raw as Record<string, unknown>
    return {
      featuredCategorySlugs: this.stringList(obj.featuredCategorySlugs),
      featuredProductSlugs: this.stringList(obj.featuredProductSlugs),
      banner: this.normaliseBanner(obj.banner),
      blocks: this.normaliseBlocks(obj.blocks),
    }
  }

  private stringList(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    // Capped: a mega panel listing 200 products is a paste accident, and each
    // slug becomes a catalogue lookup on the storefront.
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(0, 24)
  }

  private normaliseText(value: unknown): MenuText | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const obj = value as Record<string, unknown>
    const en = typeof obj.en === 'string' ? obj.en : null
    if (!en) return null
    return {
      en,
      ur: typeof obj.ur === 'string' ? obj.ur : null,
      ar: typeof obj.ar === 'string' ? obj.ar : null,
    }
  }

  private normaliseBanner(value: unknown): MegaBanner | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const obj = value as Record<string, unknown>
    // No image means no banner. A banner block with a heading and no picture
    // renders as an empty box the width of a column.
    if (typeof obj.image !== 'string' || !obj.image) return null
    return {
      image: obj.image,
      href: typeof obj.href === 'string' && obj.href ? obj.href : null,
      heading: this.normaliseText(obj.heading),
      subheading: this.normaliseText(obj.subheading),
    }
  }

  private normaliseBlocks(value: unknown): MegaBlock[] {
    if (!Array.isArray(value)) return []

    return value
      .map((entry): MegaBlock | null => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
        const obj = entry as Record<string, unknown>
        const type = obj.type
        if (type !== 'text' && type !== 'image' && type !== 'links') return null

        const links = Array.isArray(obj.links)
          ? obj.links
              .map((l) => {
                if (!l || typeof l !== 'object') return null
                const lo = l as Record<string, unknown>
                const label = this.normaliseText(lo.label)
                const href = typeof lo.href === 'string' ? lo.href : null
                return label && href ? { label, href } : null
              })
              .filter((l): l is { label: MenuText; href: string } => l !== null)
              .slice(0, 24)
          : []

        return {
          type,
          heading: this.normaliseText(obj.heading),
          body: this.normaliseText(obj.body),
          image: typeof obj.image === 'string' && obj.image ? obj.image : null,
          links,
        }
      })
      .filter((b): b is MegaBlock => b !== null)
      .slice(0, 8)
  }

  // ── Internals: validation ─────────────────────────────────────────────────

  /**
   * The cross-field rule the DTO cannot express.
   *
   * Two `@ValidateIf`s on one property are ANDed by class-validator, so the
   * decorator form of this check would never run — the same class of silent
   * no-op as an inline type literal or `Partial<>`. Doing it here means both
   * create and update go through one implementation that can be unit tested.
   */
  private assertLinkTarget(
    linkType: MenuLinkType,
    targetSlug: string | null | undefined,
    url: string | null | undefined,
  ): void {
    // A heading has no destination at all — that is the whole point of it.
    if (linkType === MenuLinkType.heading) return

    if (SLUG_ROUTED.includes(linkType)) {
      if (!targetSlug) {
        throw new BadRequestException(`A ${linkType} link needs a target slug.`)
      }
      return
    }

    if (!url) {
      throw new BadRequestException(
        linkType === MenuLinkType.external
          ? 'An external link needs a URL.'
          : 'A custom link needs an internal path.',
      )
    }

    if (url.length > MAX_MENU_URL) {
      throw new BadRequestException(`A link may not exceed ${MAX_MENU_URL} characters.`)
    }

    if (linkType === MenuLinkType.custom) {
      // `//evil.example` is why this is a regex and not `startsWith('/')`: it
      // reads as a path, and the browser resolves it as a protocol-relative
      // URL to another host. The storefront already fixed exactly this on the
      // `?next=` parameter; a staff-editable link field is the same hole.
      if (!INTERNAL_PATH_REGEX.test(url)) {
        throw new BadRequestException(INTERNAL_PATH_MESSAGE)
      }
      return
    }

    if (!/^https?:\/\/[^\s]+$/i.test(url)) {
      throw new BadRequestException('An external link must be a full http(s) URL.')
    }
  }

  /** A window that closes before it opens hides the item forever, silently. */
  private assertSchedule(from?: string | null, until?: string | null): void {
    if (!from || !until) return
    if (new Date(from) >= new Date(until)) {
      throw new BadRequestException('"Publish from" must be earlier than "Publish until".')
    }
  }

  private async assertParentUsable(parentId: string, menuId: string): Promise<void> {
    const parent = await this.prisma.menuItem.findUnique({
      where: { id: parentId },
      select: { id: true, menuId: true },
    })
    if (!parent) throw new BadRequestException('Unknown parent menu item.')
    // Cross-menu nesting would put a footer item inside a header dropdown,
    // and `findByLocation` would never return it — the row would exist and
    // render nowhere.
    if (parent.menuId !== menuId) {
      throw new BadRequestException('A menu item cannot be nested under an item from another menu.')
    }
  }

  /**
   * Walks up from the proposed parent toward the root. If the walk reaches
   * `id`, the move nests an item inside its own descendant.
   *
   * Nothing in the schema prevents that, and the resulting loop recurses
   * forever the next time a tree is built from it — inside a page render.
   */
  private async assertNotCircular(
    id: string,
    newParentId: string,
    /** Moves in the same batch, overlaid on the persisted parents. See `reorderItems`. */
    proposed?: Map<string, string | null>,
  ): Promise<void> {
    if (newParentId === id) {
      throw new BadRequestException('A menu item cannot be its own parent.')
    }

    let cursor: string | null = newParentId
    const seen = new Set<string>()
    while (cursor) {
      if (cursor === id) {
        throw new BadRequestException('Cannot move an item under one of its own children.')
      }
      if (seen.has(cursor)) break // defensive: pre-existing bad data, don't walk forever
      seen.add(cursor)

      if (proposed?.has(cursor)) {
        cursor = proposed.get(cursor) ?? null
        continue
      }

      const parent: { parentId: string | null } | null = await this.prisma.menuItem.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      })
      cursor = parent?.parentId ?? null
    }
  }

  /** Ids that ON DELETE CASCADE will take with this one — for the audit entry. */
  private async collectDescendantIds(rootId: string): Promise<string[]> {
    // A Set, not an array: with cyclic data the same id is reachable twice
    // and would inflate the count the caller reports as "rows deleted".
    // Seeded with the root so cyclic data pointing back at it cannot re-add it
    // as its own descendant — the double-count the Set exists to prevent.
    const found = new Set<string>([rootId])
    let frontier = [rootId]

    for (let depth = 0; depth < MAX_MENU_DEPTH && frontier.length; depth++) {
      const children = await this.prisma.menuItem.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      })
      frontier = children.map((c) => c.id).filter((id) => !found.has(id))
      for (const id of frontier) found.add(id)
    }

    // A non-empty frontier at the cap does NOT mean anything was truncated —
    // a subtree exactly `MAX_MENU_DEPTH` deep leaves its last level sitting
    // there with no children. Warning on that alone cried wolf on a count that
    // was exact. One cheap probe answers it properly, and only ever runs for a
    // tree at the cap, which is already vanishingly rare.
    if (frontier.length) {
      const deeper = await this.prisma.menuItem.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
        take: 1,
      })
      if (deeper.length) {
        // The delete itself is still correct — the database cascades however
        // deep it goes. Only the reported count and the audit entry are short.
        this.logger.warn(
          `Menu item ${rootId} has descendants deeper than ${MAX_MENU_DEPTH} levels — the reported delete count is a lower bound.`,
        )
      }
    }

    return [...found].filter((id) => id !== rootId)
  }

  // ── Internals: persistence helpers ────────────────────────────────────────

  /**
   * DTO → Prisma data.
   *
   * `publishFrom` / `publishUntil` arrive as ISO strings — `@IsDateString()`
   * validates text and `enableImplicitConversion` does not turn one into a
   * `Date` — so they are converted here. `undefined` and `null` mean different
   * things and both have to survive: omitting the field leaves the existing
   * schedule alone, sending `null` clears it.
   */
  private toItemData(dto: CreateMenuItemDto | UpdateMenuItemDto): Record<string, unknown> {
    const { publishFrom, publishUntil, megaConfig, ...rest } = dto as Partial<CreateMenuItemDto>
    return {
      ...rest,
      ...(publishFrom !== undefined
        ? { publishFrom: publishFrom ? new Date(publishFrom) : null }
        : {}),
      ...(publishUntil !== undefined
        ? { publishUntil: publishUntil ? new Date(publishUntil) : null }
        : {}),
      ...(megaConfig !== undefined
        ? { megaConfig: (megaConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue }
        : {}),
    }
  }

  private async loadRows(location: MenuLocation): Promise<LoadedMenu | null> {
    const cached = await this.cacheGet<CacheEntry>(cacheKey(location))
    if (cached) return isAbsent(cached) ? null : this.rehydrate(cached)

    const menu = await this.prisma.menu.findUnique({
      where: { location },
      include: { items: { orderBy: [{ parentId: 'asc' }, { order: 'asc' }] } },
    })

    if (!menu) {
      // Cache the absence too. `sidebar` has no seeded menu and the storefront
      // layout asks for it on every render — without this, "no menu
      // configured" is a database round trip per page view, forever. Short,
      // because creating one should take effect quickly.
      await this.cacheSet(cacheKey(location), ABSENT, 30_000)
      return null
    }

    const { items, ...meta } = menu
    const loaded: LoadedMenu = { menu: meta, rows: items }

    await this.cacheSet(cacheKey(location), loaded, (meta.cacheTtl || DEFAULT_MENU_TTL_SECONDS) * 1000)
    return loaded
  }

  /** ISO strings back into `Date`s. See the `Serialised` comment for why. */
  private rehydrate(cached: CachedMenu): LoadedMenu {
    const date = (v: string | Date): Date => (v instanceof Date ? v : new Date(v))
    const maybe = (v: string | Date | null): Date | null => (v === null ? null : date(v))

    return {
      menu: {
        ...cached.menu,
        createdAt: date(cached.menu.createdAt),
        updatedAt: date(cached.menu.updatedAt),
      },
      rows: cached.rows.map((row) => ({
        ...row,
        publishFrom: maybe(row.publishFrom),
        publishUntil: maybe(row.publishUntil),
        createdAt: date(row.createdAt),
        updatedAt: date(row.updatedAt),
      })),
    }
  }

  private latestChange(loaded: LoadedMenu): Date {
    let latest = loaded.menu.updatedAt
    for (const row of loaded.rows) {
      if (row.updatedAt > latest) latest = row.updatedAt
    }
    return latest
  }

  // Cache access is wrapped because it must never be why a request fails — a
  // Redis blip should cost a round trip to MySQL, not a blank header.

  private async cacheGet<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key)
    } catch (e) {
      this.logger.warn(`Cache read failed for '${key}': ${(e as Error).message}`)
      return undefined
    }
  }

  private async cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlMs)
    } catch (e) {
      this.logger.warn(`Cache write failed for '${key}': ${(e as Error).message}`)
    }
  }

  private async cacheDel(key: string): Promise<void> {
    try {
      await this.cache.del(key)
    } catch (e) {
      // Error, not warning: a failed invalidation means an admin's published
      // change is invisible until the TTL expires, with nothing to tell them.
      this.logger.error(`Cache invalidation failed for '${key}': ${(e as Error).message}`)
    }
  }
}
