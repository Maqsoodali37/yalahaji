import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'

/**
 * Populates `req.user` when a valid bearer token is present, and lets the
 * request through untouched when it is not.
 *
 * This exists for the routes that legitimately serve both customers and
 * guests — the cart and order placement. Those routes previously read
 * `req.user?.id` with no guard attached at all, which meant Passport never
 * ran and `req.user` was *always* undefined: every authenticated order was
 * silently recorded as a guest order.
 *
 * An invalid or expired token is treated as "no token" rather than as an
 * error, so a stale token in a long-lived browser tab degrades to guest
 * behaviour instead of hard-failing checkout.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Always continue; handleRequest below decides what `req.user` becomes.
    const result = super.canActivate(context)
    if (result instanceof Promise) return result.catch(() => true)
    if (result instanceof Observable) return result
    return true
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser | undefined {
    return user || undefined
  }
}
