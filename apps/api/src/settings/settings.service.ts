import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { PrismaService } from '../prisma/prisma.service'
import { CreateConfigDto } from './dto/create-config.dto'
import { UpdateConfigDto } from './dto/update-config.dto'
import { ConfigValueType, Prisma, Setting } from '@prisma/client'
import { AuditActor, AuditLogService } from '../audit-log/audit-log.service'

const AUDIT_ENTITY_TYPE = 'Setting'

/** Parsed shape of a config row. */
export type ConfigValue = string | number | boolean | Record<string, unknown> | unknown[]

const CACHE_KEYS = {
  PUBLIC: 'config:public',
  ALL: 'config:all',
  one: (key: string) => `config:key:${key}`,
}

/**
 * Five minutes. Config is read on nearly every request and changes rarely, but
 * an admin editing a shipping fee should not wait long to see it. Writes
 * invalidate explicitly, so this TTL only matters as a backstop when
 * invalidation is missed — including when an in-memory fallback means it never
 * reached the other API instances.
 */
const TTL_MS = 5 * 60 * 1000

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly auditLog: AuditLogService,
  ) {}

  // ── Reading ───────────────────────────────────────────────────────────────

  /**
   * Every config flagged `isPublic`, parsed to its declared type.
   *
   * Driven by the column rather than the hardcoded allowlist this replaced, so
   * publishing a config to the storefront is an UPDATE, not a deploy.
   * `isPublic` defaults to false, so a key staff add stays private until
   * somebody deliberately publishes it — which is what stops an
   * innocently-named credential ending up in a public payload.
   */
  async findPublic(): Promise<Record<string, ConfigValue>> {
    const cached = await this.cacheGet<Record<string, ConfigValue>>(CACHE_KEYS.PUBLIC)
    if (cached) return cached

    const rows = await this.prisma.setting.findMany({
      where: { isPublic: true },
      orderBy: { key: 'asc' },
    })

    const result: Record<string, ConfigValue> = {}
    for (const row of rows) result[row.key] = this.parse(row)

    await this.cacheSet(CACHE_KEYS.PUBLIC, result)
    return result
  }

  /** Admin listing, optionally narrowed to one category. */
  async findAll(category?: string): Promise<Setting[]> {
    if (category) {
      // Not cached: a filtered view is an admin-panel convenience, and caching
      // per category multiplies the keys that a write has to invalidate.
      return this.prisma.setting.findMany({
        where: { category },
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      })
    }

    const cached = await this.cacheGet<Setting[]>(CACHE_KEYS.ALL)
    if (cached) return cached

    const rows = await this.prisma.setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    await this.cacheSet(CACHE_KEYS.ALL, rows)
    return rows
  }

  async findByKey(key: string): Promise<Setting> {
    const cached = await this.cacheGet<Setting>(CACHE_KEYS.one(key))
    if (cached) return cached

    const row = await this.prisma.setting.findUnique({ where: { key } })
    if (!row) throw new NotFoundException(`Configuration '${key}' not found.`)

    await this.cacheSet(CACHE_KEYS.one(key), row)
    return row
  }

  /**
   * Typed reads for internal callers, each with a fallback.
   *
   * The fallback is not decoration. A missing or corrupt
   * `free_shipping_threshold` coerced to 0 would make *all* shipping free,
   * silently — so callers pass the value the business would rather charge than
   * risk.
   */
  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.getRaw(key)
    if (raw === undefined) return fallback

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      this.logger.warn(`Config '${key}' is not a number ('${raw}') — using fallback ${fallback}.`)
      return fallback
    }
    return parsed
  }

  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.getRaw(key)
    if (raw === undefined) return fallback
    return raw === 'true' || raw === '1'
  }

  async getString(key: string, fallback: string): Promise<string> {
    const raw = await this.getRaw(key)
    return raw ?? fallback
  }

  // ── Writing ───────────────────────────────────────────────────────────────

  /**
   * `actor` is required, not optional — these rows decide what customers are
   * charged, so a write with nobody to attribute it to is a gap in the trail,
   * not a convenience. Every caller (currently just SettingsController) must
   * resolve one from the authenticated request.
   */
  async create(dto: CreateConfigDto, actor: AuditActor): Promise<Setting> {
    const existing = await this.prisma.setting.findUnique({ where: { key: dto.key } })
    if (existing) throw new ConflictException(`Configuration '${dto.key}' already exists.`)

    this.assertValueMatchesType(dto.value, dto.valueType)

    const created = await this.prisma.setting.create({
      data: {
        key: dto.key,
        value: dto.value,
        valueType: dto.valueType,
        category: dto.category ?? 'general',
        description: dto.description,
        isPublic: dto.isPublic ?? false,
      },
    })

    await this.invalidate(dto.key)
    await this.auditLog.record({
      actor,
      action: 'create',
      entityType: AUDIT_ENTITY_TYPE,
      entityId: created.key,
      after: created,
    })
    return created
  }

  async update(key: string, dto: UpdateConfigDto, actor: AuditActor): Promise<Setting> {
    const existing = await this.prisma.setting.findUnique({ where: { key } })
    if (!existing) throw new NotFoundException(`Configuration '${key}' not found.`)

    // Validate against the type being set, or the existing one when the caller
    // is only changing the value.
    const effectiveType = dto.valueType ?? existing.valueType
    if (dto.value !== undefined) this.assertValueMatchesType(dto.value, effectiveType)

    const updated = await this.prisma.setting.update({
      where: { key },
      data: {
        value: dto.value,
        valueType: dto.valueType,
        category: dto.category,
        description: dto.description,
        isPublic: dto.isPublic,
      } as Prisma.SettingUncheckedUpdateInput,
    })

    await this.invalidate(key)
    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: AUDIT_ENTITY_TYPE,
      entityId: key,
      before: existing,
      after: updated,
    })
    return updated
  }

  async remove(key: string, actor: AuditActor): Promise<Setting> {
    const existing = await this.prisma.setting.findUnique({ where: { key } })
    if (!existing) throw new NotFoundException(`Configuration '${key}' not found.`)

    const deleted = await this.prisma.setting.delete({ where: { key } })
    await this.invalidate(key)
    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: AUDIT_ENTITY_TYPE,
      entityId: key,
      before: existing,
    })
    return deleted
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async getRaw(key: string): Promise<string | undefined> {
    try {
      const row = await this.findByKey(key)
      return row.value
    } catch {
      // A missing key is a normal condition for a caller that supplied a
      // fallback, not an error worth propagating.
      return undefined
    }
  }

  /** Coerces the stored text according to the row's declared type. */
  private parse(row: Setting): ConfigValue {
    switch (row.valueType) {
      case ConfigValueType.number: {
        const n = Number(row.value)
        if (!Number.isFinite(n)) {
          this.logger.warn(`Config '${row.key}' is not a number ('${row.value}') — returning 0.`)
          return 0
        }
        return n
      }
      case ConfigValueType.boolean:
        return row.value === 'true' || row.value === '1'
      case ConfigValueType.json:
        try {
          return JSON.parse(row.value)
        } catch {
          // Handing back the raw string would give the storefront a type it
          // does not expect; an empty object is inert.
          this.logger.warn(`Config '${row.key}' is not valid JSON — returning {}.`)
          return {}
        }
      default:
        return row.value
    }
  }

  /**
   * Rejects a value that cannot be read as its declared type, so the problem
   * surfaces when an admin saves it rather than at the point some unrelated
   * checkout tries to use it.
   */
  private assertValueMatchesType(value: string, type: ConfigValueType): void {
    if (type === ConfigValueType.number && !Number.isFinite(Number(value))) {
      throw new BadRequestException(`Value '${value}' is not a valid number.`)
    }

    if (type === ConfigValueType.boolean && !['true', 'false', '1', '0'].includes(value)) {
      throw new BadRequestException(
        `Value '${value}' is not a valid boolean — use 'true' or 'false'.`,
      )
    }

    if (type === ConfigValueType.json) {
      try {
        JSON.parse(value)
      } catch {
        throw new BadRequestException('Value is not valid JSON.')
      }
    }
  }

  /**
   * Drops the aggregate caches as well as the single key. A write changes what
   * `findPublic()` and `findAll()` return, so leaving those cached would show
   * an admin their own change apparently having no effect.
   */
  private async invalidate(key: string): Promise<void> {
    await Promise.all([
      this.cacheDel(CACHE_KEYS.one(key)),
      this.cacheDel(CACHE_KEYS.PUBLIC),
      this.cacheDel(CACHE_KEYS.ALL),
    ])
  }

  // Cache access is wrapped because it must never be why a request fails — a
  // Redis blip should cost a round trip to MySQL, not a 500.

  private async cacheGet<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key)
    } catch (e) {
      this.logger.warn(`Cache read failed for '${key}': ${(e as Error).message}`)
      return undefined
    }
  }

  private async cacheSet(key: string, value: unknown): Promise<void> {
    try {
      await this.cache.set(key, value, TTL_MS)
    } catch (e) {
      this.logger.warn(`Cache write failed for '${key}': ${(e as Error).message}`)
    }
  }

  private async cacheDel(key: string): Promise<void> {
    try {
      await this.cache.del(key)
    } catch (e) {
      // Logged as an error, not a warning: a failed invalidation means stale
      // config is served until the TTL expires.
      this.logger.error(`Cache invalidation failed for '${key}': ${(e as Error).message}`)
    }
  }
}
