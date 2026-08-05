import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppRole, ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles() on the route — nothing to enforce here.
    if (!required || required.length === 0) return true

    const user = context.switchToHttp().getRequest().user as { role?: string } | undefined

    if (!user?.role) {
      throw new ForbiddenException('Authentication required')
    }

    if (!required.includes(user.role as AppRole)) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${required.join(', ')}`,
      )
    }

    return true
  }
}
