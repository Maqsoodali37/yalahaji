import { Injectable, Logger } from '@nestjs/common'
import { AuditLog, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/** Snapshot of who performed the action, captured at write time. */
export interface AuditActor {
  id: string
  name: string
  role: string
  /** Caller's IP, when the mutation happened over HTTP. */
  ip?: string | null
}

export interface RecordAuditEntryInput {
  actor: AuditActor
  action: 'create' | 'update' | 'delete'
  /** Free text, e.g. 'Setting'. Not an enum — see the model comment. */
  entityType: string
  entityId: string
  /** Omit for `create`. */
  before?: unknown
  /** Omit for `delete`. */
  after?: unknown
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes one entry. Deliberately swallows its own failure rather than
   * throwing: a mutation that succeeded but could not be logged is still a
   * mutation that succeeded, and failing the customer-visible request because
   * the audit trail had a hiccup would be a worse outcome than a gap in the
   * trail — which is what the error log is for.
   */
  async record(input: RecordAuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actor.id,
          actorName: input.actor.name,
          actorRole: input.actor.role,
          ipAddress: input.actor.ip ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          before: this.toJson(input.before),
          after: this.toJson(input.after),
        },
      })
    } catch (e) {
      this.logger.error(
        `Failed to record audit log for ${input.entityType}:${input.entityId} (${input.action}): ${(e as Error).message}`,
      )
    }
  }

  /** Admin listing, most recent first, optionally narrowed to one entity. */
  async findAll(params: {
    entityType?: string
    entityId?: string
    page?: number
    limit?: number
  }): Promise<{ items: AuditLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = params.page && params.page > 0 ? params.page : 1
    const limit = params.limit && params.limit > 0 && params.limit <= 100 ? params.limit : 20

    const where: Prisma.AuditLogWhereInput = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
  }

  /** `undefined` means "not applicable" (e.g. `before` on a create) — stored as SQL NULL, not the JSON literal `null`. */
  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
  }
}
