import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Server-side registry of admin sessions, giving us revocation that a bare
 * JWT can't provide. Only a SHA-256 of each token is persisted.
 */
@Injectable()
export class AdminSessionService {
  constructor(private readonly prisma: PrismaService) {}

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * Returns the session only if it matches the presented token, is unrevoked
   * and unexpired. Comparing the hash stops a valid-but-different session id
   * from being paired with someone else's token.
   */
  async findValid(sessionId: string, token: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) return null
    if (session.revokedAt) return null
    if (session.expiresAt < new Date()) return null
    if (session.tokenHash !== AdminSessionService.hash(token)) return null
    return session
  }

  async revoke(sessionId: string) {
    await this.prisma.session
      .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
      .catch(() => undefined)
  }

  /** Sign out every device for a user — used when deactivating an account. */
  async revokeAllForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  /** Housekeeping: drop rows that can no longer authenticate anything. */
  async pruneExpired() {
    const { count } = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    return count
  }
}
