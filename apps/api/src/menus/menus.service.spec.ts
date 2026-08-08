import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import { MenusService } from './menus.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { StorefrontRevalidationService } from './storefront-revalidation.service'

const ACTOR = { id: 'staff-1', name: 'Ayesha', role: 'admin', ip: '203.0.113.4' }

const MENU = {
  id: 'menu-1',
  location: 'header',
  name: 'Main header navigation',
  isActive: true,
  cacheTtl: 300,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

/** A menu item row with everything defaulted, so a test names only what it is about. */
function item(over: Partial<Record<string, unknown>> & { id: string }) {
  return {
    menuId: 'menu-1',
    parentId: null,
    titleEn: 'Item',
    titleUr: null,
    titleAr: null,
    linkType: 'custom',
    targetSlug: null,
    url: '/x',
    icon: null,
    image: null,
    badgeEn: null,
    badgeUr: null,
    badgeAr: null,
    order: 0,
    isActive: true,
    visibility: 'everyone',
    device: 'all',
    publishFrom: null,
    publishUntil: null,
    isMegaMenu: false,
    megaLayout: null,
    megaColumns: 4,
    megaConfig: null,
    relAttribute: null,
    noFollow: false,
    openInNewTab: false,
    titleAttrEn: null,
    titleAttrUr: null,
    titleAttrAr: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  }
}

describe('MenusService', () => {
  let service: MenusService

  const prisma = {
    menu: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    menuItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  }

  const cache = {
    get: jest.fn<Promise<unknown>, [string]>(),
    set: jest.fn<Promise<void>, [string, unknown, number?]>(),
    del: jest.fn<Promise<void>, [string]>(),
  }

  const auditLog = { record: jest.fn<Promise<void>, [unknown]>() }
  const revalidation = { revalidateMenus: jest.fn<Promise<void>, [string]>() }

  /** Wires `findUnique({ include: { items } })` to return one menu + these rows. */
  function withItems(rows: ReturnType<typeof item>[]) {
    prisma.menu.findUnique.mockResolvedValue({ ...MENU, items: rows })
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(undefined)
    auditLog.record.mockResolvedValue(undefined)
    revalidation.revalidateMenus.mockResolvedValue(undefined)

    const moduleRef = await Test.createTestingModule({
      providers: [
        MenusService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: AuditLogService, useValue: auditLog },
        { provide: StorefrontRevalidationService, useValue: revalidation },
      ],
    }).compile()

    service = moduleRef.get(MenusService)
  })

  // ── Visibility ────────────────────────────────────────────────────────────

  describe('audience filtering', () => {
    // Prevents: a "Wholesale pricing" link rendering for retail customers and
    // for logged-out visitors, which is the failure that makes the whole
    // visibility feature worse than not having it.
    it('shows a wholesale item only to wholesale customers', async () => {
      withItems([item({ id: 'a', visibility: 'wholesale', titleEn: 'Wholesale' })])

      const forWholesale = await service.findByLocation('header' as never, 'wholesale')
      expect(forWholesale?.items).toHaveLength(1)

      cache.get.mockResolvedValue(undefined)
      const forRetail = await service.findByLocation('header' as never, 'retail')
      expect(forRetail?.items).toHaveLength(0)

      cache.get.mockResolvedValue(undefined)
      const forGuest = await service.findByLocation('header' as never, 'guest')
      expect(forGuest?.items).toHaveLength(0)
    })

    // Prevents: "Sign in" still showing to someone who is already signed in,
    // and "My orders" showing to someone who cannot open it.
    it('treats both customer groups as customers for a `customer` item', async () => {
      withItems([item({ id: 'a', visibility: 'customer' })])

      for (const audience of ['retail', 'wholesale'] as const) {
        cache.get.mockResolvedValue(undefined)
        const menu = await service.findByLocation('header' as never, audience)
        expect(menu?.items).toHaveLength(1)
      }

      cache.get.mockResolvedValue(undefined)
      const guest = await service.findByLocation('header' as never, 'guest')
      expect(guest?.items).toHaveLength(0)
    })

    // Prevents: an unknown enum value added by a later migration defaulting to
    // visible. Hiding is the safe direction — a missing link is a missing
    // link, a leaked one is a leak.
    it('hides an item whose visibility the code does not recognise', async () => {
      withItems([item({ id: 'a', visibility: 'partner_portal' })])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items).toHaveLength(0)
    })
  })

  // ── Scheduling ────────────────────────────────────────────────────────────

  describe('publish window', () => {
    const NOW = new Date('2026-06-15T12:00:00Z')

    // Prevents: a Ramadan banner link going live a day early because someone
    // filtered on the publish date only at write time.
    it('hides an item before publishFrom and after publishUntil', async () => {
      withItems([
        item({ id: 'early', publishFrom: new Date('2026-07-01T00:00:00Z') }),
        item({ id: 'expired', publishUntil: new Date('2026-06-01T00:00:00Z') }),
        item({ id: 'live', publishFrom: new Date('2026-06-01T00:00:00Z'), publishUntil: new Date('2026-07-01T00:00:00Z') }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest', NOW)
      expect(menu?.items.map((i) => i.id)).toEqual(['live'])
    })

    // Prevents: an item scheduled to stop at exactly this instant lingering
    // for one more request.
    it('treats publishUntil as exclusive', async () => {
      withItems([item({ id: 'a', publishUntil: NOW })])

      const menu = await service.findByLocation('header' as never, 'guest', NOW)
      expect(menu?.items).toHaveLength(0)
    })

    // Prevents: the whole scheduling feature silently doing nothing once
    // Redis is in play. A cached payload comes back with dates as ISO
    // strings, and `'2026-07-01T…' > Date` is always false.
    it('rehydrates dates that came back from the cache as strings', async () => {
      cache.get.mockResolvedValue({
        menu: { ...MENU, updatedAt: MENU.updatedAt.toISOString() },
        rows: [
          { ...item({ id: 'early' }), publishFrom: '2026-07-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
      })

      const menu = await service.findByLocation('header' as never, 'guest', NOW)
      expect(menu?.items).toHaveLength(0)
    })
  })

  // ── Tree ──────────────────────────────────────────────────────────────────

  describe('tree assembly', () => {
    // Prevents: the truncation that hit `CategoriesService.findAll` when it
    // nested two `include`s deep — a fourth level vanished with no error.
    it('nests to any depth', async () => {
      withItems([
        item({ id: 'l1' }),
        item({ id: 'l2', parentId: 'l1' }),
        item({ id: 'l3', parentId: 'l2' }),
        item({ id: 'l4', parentId: 'l3' }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items[0].children[0].children[0].children[0].id).toBe('l4')
    })

    // Prevents: hiding a "Wholesale" parent and having its six children
    // promoted straight into the top-level nav — the opposite of what the
    // admin asked for.
    it('drops children whose parent was filtered out', async () => {
      withItems([
        item({ id: 'parent', visibility: 'wholesale' }),
        item({ id: 'child', parentId: 'parent', visibility: 'everyone' }),
      ])

      const menu = await service.findByLocation('header' as never, 'retail')
      expect(menu?.items).toHaveLength(0)
    })

    it('orders siblings by `order`, not by insertion', async () => {
      withItems([
        item({ id: 'third', order: 3 }),
        item({ id: 'first', order: 1 }),
        item({ id: 'second', order: 2 }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items.map((i) => i.id)).toEqual(['first', 'second', 'third'])
    })

    // Prevents: a parent/child pair pointing at each other recursing forever
    // inside a page render.
    it('does not loop on a cycle in the data', async () => {
      withItems([
        item({ id: 'a', parentId: 'b' }),
        item({ id: 'b', parentId: 'a' }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest')
      // Neither is reachable from the root, so the menu is empty rather than
      // the process being dead.
      expect(menu?.items).toEqual([])
    })
  })

  // ── Mega config ───────────────────────────────────────────────────────────

  describe('megaConfig normalisation', () => {
    // Prevents: a malformed JSON blob reaching a component, which reads a
    // field off `undefined` and crashes the server render — reported to the
    // browser as "a client-side exception has occurred", not as bad data.
    it('returns a fully-populated shape for junk input', async () => {
      withItems([item({ id: 'a', isMegaMenu: true, megaConfig: 'not an object' })])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items[0].megaConfig).toEqual({
        featuredCategorySlugs: [],
        featuredProductSlugs: [],
        banner: null,
        blocks: [],
      })
    })

    // Prevents: an empty box the width of a column where a banner should be.
    it('drops a banner with no image', async () => {
      withItems([
        item({ id: 'a', isMegaMenu: true, megaConfig: { banner: { heading: { en: 'Sale' } } } }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items[0].megaConfig?.banner).toBeNull()
    })

    it('keeps a well-formed banner and drops non-string slugs', async () => {
      withItems([
        item({
          id: 'a',
          isMegaMenu: true,
          megaConfig: {
            featuredProductSlugs: ['ihram-premium', 42, null, 'attar-oud'],
            banner: { image: '/b.webp', href: '/shop/sale', heading: { en: 'Sale', ur: 'سیل' } },
          },
        }),
      ])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items[0].megaConfig?.featuredProductSlugs).toEqual(['ihram-premium', 'attar-oud'])
      expect(menu?.items[0].megaConfig?.banner?.heading).toEqual({ en: 'Sale', ur: 'سیل', ar: null })
    })

    // A non-mega item carries no panel config, whatever is in the column.
    it('returns null megaConfig when the item is not a mega menu', async () => {
      withItems([item({ id: 'a', isMegaMenu: false, megaConfig: { featuredProductSlugs: ['x'] } })])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items[0].megaConfig).toBeNull()
    })
  })

  // ── Link validation ───────────────────────────────────────────────────────

  describe('link targets', () => {
    beforeEach(() => {
      prisma.menu.findUnique.mockResolvedValue(MENU)
      prisma.menuItem.create.mockImplementation(({ data }: { data: unknown }) => data)
    })

    // Prevents: `/shop/undefined` in the header — an anchor that 404s and
    // that the admin form gives no sign of.
    it('refuses a category link with no slug', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'Ihram', linkType: 'category' as never },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    // Prevents: an open redirect out of the header. `//evil.example` reads as
    // a path, passes `startsWith('/')`, and the browser resolves it to
    // another host — the same hole `safeNextPath` closed on `?next=`.
    it('refuses a protocol-relative URL disguised as an internal path', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'Deals', linkType: 'custom' as never, url: '//evil.example/deals' },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('refuses a javascript: URL', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'X', linkType: 'custom' as never, url: 'javascript:alert(1)' },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('accepts an internal path with a query string', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'Sale', linkType: 'custom' as never, url: '/shop?filter=sale' },
          ACTOR,
        ),
      ).resolves.toBeDefined()
    })

    // Prevents: an external item saved with a bare hostname, which the
    // browser resolves relative to the storefront.
    it('requires a protocol on an external link', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'Blog', linkType: 'external' as never, url: 'example.com' },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    // A heading is a label. Requiring a target would force staff to invent one.
    it('accepts a heading with no target at all', async () => {
      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'Support', linkType: 'heading' as never },
          ACTOR,
        ),
      ).resolves.toBeDefined()
    })

    // Prevents: a window that closes before it opens, which hides the item
    // forever with nothing to say why.
    it('refuses a publish window that ends before it starts', async () => {
      await expect(
        service.createItem(
          {
            menuId: 'menu-1',
            titleEn: 'Eid',
            linkType: 'custom' as never,
            url: '/shop',
            publishFrom: '2026-07-01T00:00:00Z',
            publishUntil: '2026-06-01T00:00:00Z',
          },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  // ── Hierarchy guards ──────────────────────────────────────────────────────

  describe('hierarchy', () => {
    // Prevents: a row that exists and renders nowhere, because
    // `findByLocation` only ever returns one menu's items.
    it('refuses to nest an item under one from another menu', async () => {
      prisma.menu.findUnique.mockResolvedValue(MENU)
      prisma.menuItem.findUnique.mockResolvedValue({ id: 'other', menuId: 'menu-2' })

      await expect(
        service.createItem(
          { menuId: 'menu-1', titleEn: 'X', linkType: 'custom' as never, url: '/x', parentId: 'other' },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    // Prevents: the infinite loop the tree builder's cycle guard exists to
    // survive — better to refuse the move than to rely on the guard.
    it('refuses a move that nests an item inside its own child', async () => {
      prisma.menuItem.findUnique.mockImplementation(({ where, include }: never) => {
        const w = where as { id: string }
        if (include) return { ...item({ id: w.id }), menu: MENU }
        if (w.id === 'child') return { id: 'child', menuId: 'menu-1', parentId: 'parent' }
        if (w.id === 'parent') return { id: 'parent', menuId: 'menu-1', parentId: null }
        return null
      })
      prisma.menuItem.findUnique.mockResolvedValueOnce({
        ...item({ id: 'parent', parentId: null }),
        menu: MENU,
      })

      await expect(
        service.updateItem('parent', { parentId: 'child' }, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  // ── Cache and publishing ──────────────────────────────────────────────────

  describe('publishing', () => {
    // Prevents: an admin saving a menu, seeing no change on the storefront,
    // and saving it again.
    it('drops the API cache and asks the storefront to drop its own', async () => {
      prisma.menu.findUnique.mockResolvedValue(MENU)
      prisma.menu.update.mockResolvedValue({ ...MENU, name: 'Renamed' })

      await service.updateMenu('menu-1', { name: 'Renamed' }, ACTOR)

      expect(cache.del).toHaveBeenCalledWith('menu:rows:header')
      expect(revalidation.revalidateMenus).toHaveBeenCalledWith('header')
    })

    // Prevents: "two active header menus", a state with no correct resolution
    // for `GET /menus/location/:location`.
    it('refuses a second menu at the same location', async () => {
      prisma.menu.findUnique.mockResolvedValue(MENU)

      await expect(
        service.createMenu({ location: 'header' as never, name: 'Another' }, ACTOR),
      ).rejects.toBeInstanceOf(ConflictException)
    })

    // Prevents: a Redis blip turning into a blank header. A cache is an
    // optimisation; a failed read must cost a round trip to MySQL, not a 500.
    it('serves the menu from the database when the cache read throws', async () => {
      cache.get.mockRejectedValue(new Error('redis down'))
      withItems([item({ id: 'a' })])

      const menu = await service.findByLocation('header' as never, 'guest')
      expect(menu?.items).toHaveLength(1)
    })
  })

  // ── Reordering ────────────────────────────────────────────────────────────

  describe('reorderItems', () => {
    /** Wires findMany/findUnique to a flat set of persisted rows. */
    function persisted(rows: Array<{ id: string; parentId: string | null }>) {
      prisma.menuItem.findMany.mockResolvedValue(
        rows.map((r) => ({ id: r.id, menuId: 'menu-1', parentId: r.parentId })),
      )
      prisma.menuItem.findUnique.mockImplementation(({ where }: never) => {
        const w = where as { id: string }
        const row = rows.find((r) => r.id === w.id)
        return row ? { id: row.id, menuId: 'menu-1', parentId: row.parentId } : null
      })
      prisma.menu.findUnique.mockResolvedValue(MENU)
      prisma.$transaction.mockResolvedValue([])
    }

    // Prevents: a 500 from `findUnique({ where: { id: undefined } })`.
    // `@ArrayMinSize(1)` covers the HTTP path only, and this service is exported.
    it('does nothing for an empty batch', async () => {
      await expect(service.reorderItems({ items: [] }, ACTOR)).resolves.toEqual({ updated: 0 })
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    // Prevents the bug the merged-parent map exists for: checking each move
    // against the PERSISTED tree passes a swap — `a` moves under `b` while `b`
    // is still at the root, and `b` moves under `a` while `a` is still at the
    // root — and then writes a two-item cycle neither check saw.
    it('rejects a batch whose moves only form a cycle together', async () => {
      persisted([
        { id: 'a', parentId: null },
        { id: 'b', parentId: null },
      ])

      await expect(
        service.reorderItems(
          {
            items: [
              { id: 'a', parentId: 'b', order: 0 },
              { id: 'b', parentId: 'a', order: 0 },
            ],
          },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    // Prevents: a client reordering one sibling group by sending `{id, order}`
    // and silently flattening that whole group into the top-level nav. The DTO
    // documents omitted and null as different instructions; `?? null` made them
    // the same one.
    it('leaves the parent untouched when parentId is omitted', async () => {
      persisted([{ id: 'child', parentId: 'parent' }, { id: 'parent', parentId: null }])

      await service.reorderItems({ items: [{ id: 'child', order: 3 }] }, ACTOR)

      const [updates] = prisma.$transaction.mock.calls[0] as [unknown[]]
      expect(updates).toHaveLength(1)
      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: 'child' },
        data: { parentId: 'parent', order: 3 },
      })
    })

    it('moves to the top level when parentId is explicitly null', async () => {
      persisted([{ id: 'child', parentId: 'parent' }, { id: 'parent', parentId: null }])

      await service.reorderItems({ items: [{ id: 'child', parentId: null, order: 0 }] }, ACTOR)

      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: 'child' },
        data: { parentId: null, order: 0 },
      })
    })

    // Prevents: a reorder filed as a `MenuItem` carrying a menu id — invisible
    // when someone opens the history of any item it actually moved.
    it('files the audit entry against the menu', async () => {
      persisted([{ id: 'a', parentId: null }])

      await service.reorderItems({ items: [{ id: 'a', order: 0 }] }, ACTOR)

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Menu', entityId: 'menu-1' }),
      )
    })

    it('refuses a batch spanning two menus', async () => {
      prisma.menuItem.findMany.mockResolvedValue([
        { id: 'a', menuId: 'menu-1', parentId: null },
        { id: 'b', menuId: 'menu-2', parentId: null },
      ])

      await expect(
        service.reorderItems(
          { items: [{ id: 'a', order: 0 }, { id: 'b', order: 1 }] },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  // ── Negative caching ──────────────────────────────────────────────────────

  describe('caching an absent menu', () => {
    // Prevents: "no menu configured at this location" costing a database round
    // trip on every page view, forever. The storefront layout asks for the
    // sidebar on every render and nothing seeds one.
    it('caches the absence and serves the second read from it', async () => {
      prisma.menu.findUnique.mockResolvedValue(null)

      await expect(service.findByLocation('sidebar' as never)).resolves.toBeNull()
      expect(cache.set).toHaveBeenCalledWith('menu:rows:sidebar', { absent: true }, 30_000)

      // Second request: the sentinel is in the cache, so Prisma is not touched.
      prisma.menu.findUnique.mockClear()
      cache.get.mockResolvedValue({ absent: true })
      await expect(service.findByLocation('sidebar' as never)).resolves.toBeNull()
      expect(prisma.menu.findUnique).not.toHaveBeenCalled()
    })

    // Prevents the fix being a silent no-op: `cache-manager-redis-store`
    // refuses to store `null` (it throws, and cacheSet swallows it), so the
    // absence marker has to be a real object.
    it('stores an object, never null', async () => {
      prisma.menu.findUnique.mockResolvedValue(null)
      await service.findByLocation('sidebar' as never)

      const [, value] = cache.set.mock.calls[0]
      expect(value).not.toBeNull()
      expect(typeof value).toBe('object')
    })
  })

  // ── Audience resolution ───────────────────────────────────────────────────

  describe('resolveAudience', () => {
    it('is guest with no user id', async () => {
      await expect(service.resolveAudience(undefined)).resolves.toBe('guest')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('reads the group from the database, not from the token', async () => {
      prisma.user.findUnique.mockResolvedValue({ customerGroup: 'wholesale', isActive: true })
      await expect(service.resolveAudience('u1')).resolves.toBe('wholesale')
    })

    // Prevents: navigation being the place someone discovers their account is
    // disabled. The guarded routes behind these links already refuse.
    it('is guest for a deactivated account', async () => {
      prisma.user.findUnique.mockResolvedValue({ customerGroup: 'wholesale', isActive: false })
      await expect(service.resolveAudience('u1')).resolves.toBe('guest')
    })

    it('falls back to guest when the lookup fails', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'))
      await expect(service.resolveAudience('u1')).resolves.toBe('guest')
    })
  })

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns null for a location with no menu, and for a disabled one', async () => {
    prisma.menu.findUnique.mockResolvedValue(null)
    await expect(service.findByLocation('sidebar' as never)).resolves.toBeNull()

    cache.get.mockResolvedValue(undefined)
    prisma.menu.findUnique.mockResolvedValue({ ...MENU, isActive: false, items: [] })
    await expect(service.findByLocation('header' as never)).resolves.toBeNull()
  })

  it('404s asking for the items of a menu that does not exist', async () => {
    prisma.menu.findUnique.mockResolvedValue(null)
    await expect(service.findItemsByMenuId('nope')).rejects.toBeInstanceOf(NotFoundException)
  })
})
