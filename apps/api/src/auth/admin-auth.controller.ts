import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'
// Side-effect import: augments FastifyReply with setCookie/clearCookie.
import '@fastify/cookie'
import { ConfigService } from '@nestjs/config'
import { AdminAuthService } from './admin-auth.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard'
import { CurrentUser } from './current-user.decorator'
import { ADMIN_COOKIE } from './admin-auth.constants'

@ApiTags('admin-auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  // Far stricter than the global 120/min: 5 attempts per minute per IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Staff login — sets an httpOnly session cookie' })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.adminAuth.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    reply.setCookie(ADMIN_COOKIE, result.token, this.cookieOptions(result.expiresAt))

    // The token is deliberately NOT in the body — it lives only in the cookie.
    return { user: result.user, expiresAt: result.expiresAt }
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Current staff profile' })
  me(@CurrentUser() user: { id: string }) {
    return this.adminAuth.getProfile(user.id)
  }

  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke this session and clear the cookie' })
  async logout(
    @CurrentUser() user: { sessionId: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.adminAuth.logout(user.sessionId)
    reply.clearCookie(ADMIN_COOKIE, { path: '/' })
    return { success: true }
  }

  @Post('logout-all')
  @UseGuards(AdminJwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke every session for this account' })
  async logoutAll(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.adminAuth.logoutEverywhere(user.id)
    reply.clearCookie(ADMIN_COOKIE, { path: '/' })
    return { success: true }
  }

  private cookieOptions(expiresAt: Date) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production'
    return {
      httpOnly: true,
      // Admin and API sit on the same registrable domain, so `lax` still sends
      // the cookie on XHR while blocking cross-site form posts (CSRF).
      sameSite: 'lax' as const,
      secure: isProd,
      path: '/',
      expires: expiresAt,
      // Scope to the parent domain in production so admin.<domain> can talk
      // to api.<domain>; unset in dev where everything is on localhost.
      ...(isProd && this.config.get<string>('COOKIE_DOMAIN')
        ? { domain: this.config.get<string>('COOKIE_DOMAIN') }
        : {}),
    }
  }
}
