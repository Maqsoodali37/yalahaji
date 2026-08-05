import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Admin-only authentication. Backed by the `admin-jwt` strategy, which accepts
 * ONLY the httpOnly admin cookie signed with ADMIN_JWT_SECRET. A customer
 * bearer token cannot satisfy this guard: wrong secret, wrong audience, wrong
 * transport.
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {}
