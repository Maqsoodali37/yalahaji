import type { AppRole } from './roles.decorator'

/** Name of the httpOnly cookie carrying the admin session JWT. */
export const ADMIN_COOKIE = 'yh_admin_session'

/**
 * Audience claim stamped on admin tokens. Customer tokens are signed with a
 * different secret AND lack this claim, so they can never satisfy the admin
 * strategy — and vice versa.
 */
export const ADMIN_TOKEN_AUDIENCE = 'yalahaji:admin'

/** Roles permitted to authenticate against the admin panel at all. */
export const ADMIN_LOGIN_ROLES: AppRole[] = ['admin', 'manager', 'support', 'fulfillment']

/** Failed attempts before an account is temporarily locked. */
export const MAX_FAILED_ATTEMPTS = 5

/** How long an account stays locked after exceeding the limit. */
export const LOCKOUT_MINUTES = 15
