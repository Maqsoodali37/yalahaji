import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { MenuLocation } from '@prisma/client'

/**
 * Tells the storefront to drop its cached copy of a menu.
 *
 * Two caches sit in front of a menu and dropping only one is not enough. The
 * API's Redis entry is this process's; Next.js keeps its own `fetch` cache in
 * the storefront container, keyed by tag, and nothing in Redis can reach it.
 * Without this call an admin's published change takes effect at whichever TTL
 * expires last — which reads, from the admin panel, as the save having done
 * nothing.
 *
 * **Never throws.** A storefront that is down, restarting or misconfigured is
 * not a reason to fail the admin's save: the write already succeeded, and the
 * change will still appear when the TTL lapses. The error log is the signal
 * that it will be late.
 */
@Injectable()
export class StorefrontRevalidationService {
  private readonly logger = new Logger(StorefrontRevalidationService.name)

  constructor(private readonly config: ConfigService) {}

  async revalidateMenus(location: MenuLocation): Promise<void> {
    const base = this.config.get<string>('INTERNAL_STOREFRONT_URL')
      || this.config.get<string>('STOREFRONT_URL')
    const secret = this.config.get<string>('MENU_REVALIDATE_SECRET')

    // Not configured is a normal state in development and in a deployment
    // that has not opted into instant publishing — debug, not a warning that
    // fires on every save.
    if (!base || !secret) {
      this.logger.debug(
        'STOREFRONT_URL or MENU_REVALIDATE_SECRET not set — skipping storefront revalidation.',
      )
      return
    }

    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/revalidate-menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // A header rather than a query parameter: a secret in a URL ends up
          // in access logs, browser history and Referer headers, which is the
          // same reasoning that made order tracking a POST.
          'x-menu-revalidate-secret': secret,
        },
        body: JSON.stringify({ location }),
        // Bounded, for the same reason apiFetch bounds its own calls: a
        // storefront that accepts the connection and never replies would
        // otherwise hang the admin's save request until the platform kills it.
        signal: AbortSignal.timeout(5_000),
      })

      if (!res.ok) {
        this.logger.error(
          `Storefront revalidation for '${location}' returned ${res.status} — the change will be late by up to the cache TTL.`,
        )
      }
    } catch (e) {
      this.logger.error(
        `Storefront revalidation for '${location}' failed (${(e as Error).message}) — the change will be late by up to the cache TTL.`,
      )
    }
  }
}
