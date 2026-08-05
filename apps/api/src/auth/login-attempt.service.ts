import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS } from './admin-auth.constants'

/**
 * Shared brute-force accounting for BOTH login endpoints.
 *
 * This must be used by the customer login too: staff and customers share one
 * `users` row and one password hash, so protecting only the admin endpoint
 * would leave the exact same credential brute-forceable through the
 * storefront door.
 */
@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A real bcrypt hash of a random string, compared against when no user is
   * found so that the response takes the same ~70ms as a genuine check.
   *
   * It must be a VALID hash — an obviously malformed one causes bcrypt to
   * bail out in microseconds, which is itself the timing oracle we're
   * trying to close.
   */
  private static readonly DUMMY_HASH =
    '$2a$10$BIQTkQsz.9uhI6bvfBLqCeeETzIMdH02AoFxlafFR1llxtBqfhIea'

  /** Burn the same CPU as a real comparison, for identifiers that don't exist. */
  async equaliseTiming(password: string): Promise<void> {
    await bcrypt.compare(password, LoginAttemptService.DUMMY_HASH)
  }

  isLocked(user: { lockedUntil: Date | null }): boolean {
    return !!user.lockedUntil && user.lockedUntil > new Date()
  }

  /**
   * Records a failed attempt and locks the account once the limit is hit.
   * Call this for EVERY unsuccessful outcome — including "password was right
   * but the account isn't staff" — otherwise the difference between those
   * cases becomes a password-confirmation oracle.
   */
  async registerFailure(userId: string, currentAttempts: number): Promise<void> {
    const attempts = currentAttempts + 1
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        ...(shouldLock
          ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) }
          : {}),
      },
    })
  }

  /** Clear counters after a genuine sign-in. */
  async registerSuccess(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    })
  }
}
