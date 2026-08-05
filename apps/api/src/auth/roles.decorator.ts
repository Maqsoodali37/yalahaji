import { SetMetadata } from '@nestjs/common'

export type AppRole = 'customer' | 'admin' | 'manager' | 'support' | 'fulfillment'

export const ROLES_KEY = 'roles'

/**
 * Restrict a route to one or more roles.
 * Must be combined with JwtAuthGuard + RolesGuard, e.g.
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'manager')
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles)

/** Roles allowed to manage catalogue, pricing and content. */
export const STAFF_MANAGE: AppRole[] = ['admin', 'manager']

/** Roles allowed to view and progress orders. */
export const STAFF_ORDERS: AppRole[] = ['admin', 'manager', 'fulfillment', 'support']
