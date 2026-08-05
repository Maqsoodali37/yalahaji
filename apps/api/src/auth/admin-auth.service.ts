import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { AdminSessionService } from './admin-session.service'
import { LoginAttemptService } from './login-attempt.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { ADMIN_LOGIN_ROLES, ADMIN_TOKEN_AUDIENCE } from './admin-auth.constants'
import type { AppRole } from './roles.decorator'

export interface AdminLoginResult {
  token: string
  expiresAt: Date
  user: {
    id: string
    name: string
    email: string | null
    phone: string
    role: string
    avatar: string | null
  }
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: AdminSessionService,
    private readonly attempts: LoginAttemptService,
  ) {}

  /** Token lifetime, e.g. "8h". Kept short — admin sessions are revocable. */
  private get ttl(): string {
    return this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h')
  }

  private get secret(): string {
    return this.config.get<string>(
      'ADMIN_JWT_SECRET',
      'change-me-admin-secret-in-production',
    )
  }

  async login(
    dto: AdminLoginDto,
    context: { userAgent?: string; ip?: string },
  ): Promise<AdminLoginResult> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.identifier }, { email: dto.identifier }] },
    })

    // ── One error for every failure mode ──────────────────────────────
    // Same status, same message, same timing, whether the account is
    // missing, locked, disabled, non-staff, or the password is wrong.
    // Anything that distinguishes these becomes an enumeration oracle.
    const invalid = () => new UnauthorizedException('Invalid credentials.')

    if (!user || !user.passwordHash) {
      await this.attempts.equaliseTiming(dto.password)
      throw invalid()
    }

    // Locked accounts still pay the bcrypt cost so the lock isn't detectable
    // by response time, and get the same 401 so it isn't detectable by shape.
    if (this.attempts.isLocked(user)) {
      await this.attempts.equaliseTiming(dto.password)
      throw invalid()
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)

    if (!passwordValid) {
      await this.attempts.registerFailure(user.id, user.failedLoginAttempts)
      throw invalid()
    }

    // The password was correct, but this account may not be allowed in.
    // Count these as failures too — otherwise "correct password, wrong role"
    // is distinguishable from "wrong password" by whether a lockout ever
    // occurs, which confirms passwords for every customer account.
    if (!user.isActive || !ADMIN_LOGIN_ROLES.includes(user.role as AppRole)) {
      await this.attempts.registerFailure(user.id, user.failedLoginAttempts)
      throw invalid()
    }

    const session = await this.issueSession(user.id, user.phone, user.role, context)
    await this.attempts.registerSuccess(user.id)

    // Opportunistic housekeeping — cheap, and keeps the table from growing
    // without needing a scheduler.
    void this.sessions.pruneExpired().catch(() => undefined)

    return {
      ...session,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    }
  }

  async logout(sessionId: string) {
    await this.sessions.revoke(sessionId)
    return { success: true }
  }

  async logoutEverywhere(userId: string) {
    await this.sessions.revokeAllForUser(userId)
    return { success: true }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
  }

  /** Sign a token and persist its session row in one step. */
  private async issueSession(
    userId: string,
    phone: string,
    role: string,
    context: { userAgent?: string; ip?: string },
  ) {
    const expiresAt = new Date(Date.now() + this.ttlMs())

    // The session row is created first so its id can be embedded in the
    // token; the hash is filled in immediately after signing.
    const placeholder = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: `pending:${userId}:${Date.now()}:${Math.random()}`.slice(0, 64),
        expiresAt,
        userAgent: context.userAgent?.slice(0, 190),
        ip: context.ip?.slice(0, 190),
      },
    })

    try {
      const token = this.jwt.sign(
        { sub: userId, phone, role, sid: placeholder.id },
        {
          secret: this.secret,
          expiresIn: this.ttl,
          audience: ADMIN_TOKEN_AUDIENCE,
        },
      )

      await this.prisma.session.update({
        where: { id: placeholder.id },
        data: { tokenHash: AdminSessionService.hash(token) },
      })

      return { token, expiresAt }
    } catch (err) {
      // Don't leave an unusable placeholder row behind.
      await this.prisma.session
        .delete({ where: { id: placeholder.id } })
        .catch(() => undefined)
      throw err
    }
  }

  private ttlMs(): number {
    const match = /^(\d+)\s*([smhd])$/.exec(this.ttl.trim())
    if (!match) return 8 * 60 * 60 * 1000
    const value = Number(match[1])
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }
    return value * (multipliers[match[2]] ?? 3_600_000)
  }
}
