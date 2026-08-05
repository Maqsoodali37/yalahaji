import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import type { FastifyRequest } from 'fastify'
// Side-effect import: augments FastifyRequest with the `cookies` property.
import '@fastify/cookie'
import { PrismaService } from '../prisma/prisma.service'
import { AdminSessionService } from './admin-session.service'
import { ADMIN_COOKIE, ADMIN_LOGIN_ROLES, ADMIN_TOKEN_AUDIENCE } from './admin-auth.constants'
import type { AppRole } from './roles.decorator'

interface AdminJwtPayload {
  sub: string
  phone: string
  role: string
  /** Session id, so the token can be revoked server-side. */
  sid: string
}

/**
 * Reads the admin JWT from an httpOnly cookie only — never from an
 * Authorization header. That keeps the admin surface free of bearer tokens
 * that could leak through logs, referrers or client-side storage.
 */
function fromAdminCookie(req: FastifyRequest): string | null {
  const cookies = (req as FastifyRequest & { cookies?: Record<string, string> }).cookies
  return cookies?.[ADMIN_COOKIE] ?? null
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessions: AdminSessionService,
  ) {
    super({
      jwtFromRequest: fromAdminCookie,
      ignoreExpiration: false,
      algorithms: ['HS256'],
      audience: ADMIN_TOKEN_AUDIENCE,
      secretOrKey: config.get<string>(
        'ADMIN_JWT_SECRET',
        'change-me-admin-secret-in-production',
      ),
      passReqToCallback: true,
    })
  }

  async validate(req: FastifyRequest, payload: AdminJwtPayload) {
    const token = fromAdminCookie(req)
    if (!token) throw new UnauthorizedException('Admin session required.')

    // The session row is the revocation point: signing out, or an admin
    // disabling the account, invalidates the token immediately.
    const session = await this.sessions.findValid(payload.sid, token)
    if (!session) throw new UnauthorizedException('Session expired or revoked.')

    // Re-read the user each request so role changes and deactivations take
    // effect without waiting for the token to expire.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    })

    if (!user || !user.isActive) {
      await this.sessions.revoke(payload.sid)
      throw new UnauthorizedException('Account is no longer active.')
    }

    if (!ADMIN_LOGIN_ROLES.includes(user.role as AppRole)) {
      await this.sessions.revoke(payload.sid)
      throw new UnauthorizedException('Account no longer has dashboard access.')
    }

    return {
      id: user.id,
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      sessionId: payload.sid,
    }
  }
}
