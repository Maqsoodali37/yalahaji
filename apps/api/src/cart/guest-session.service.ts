import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Mints and verifies guest cart session identifiers.
 *
 * A guest cart has to be keyed on something the client sends, but the client
 * must not be able to *choose* that value — otherwise anyone can read or
 * mutate anyone else's cart just by guessing an id, which is exactly what the
 * previous `x-session-id` handling allowed.
 *
 * The id is therefore `<random>.<hmac>`: 32 bytes of CSPRNG entropy plus a
 * signature the server alone can produce. An attacker can neither forge a
 * signature for an id of their choosing nor guess a valid random half, so the
 * only ids that verify are ones this server issued.
 *
 * Deliberately stateless — no table, no migration, no cleanup job. The
 * tradeoff is that an issued id cannot be individually revoked, which is
 * acceptable for a cart: it holds no PII and is cleared on checkout.
 */
@Injectable()
export class GuestSessionService {
  private readonly key: Buffer

  constructor(config: ConfigService) {
    // Prefer a dedicated secret; otherwise derive one from JWT_SECRET so this
    // works without an env change. Derivation (rather than reuse) keeps the
    // signing key distinct from the token-signing key.
    const explicit = config.get<string>('GUEST_SESSION_SECRET')
    this.key = explicit
      ? Buffer.from(explicit, 'utf8')
      : createHmac('sha256', config.get<string>('JWT_SECRET', 'change-me-in-production'))
          .update('yalahaji:guest-session:v1')
          .digest()
  }

  /** Issue a fresh, signed guest session id. */
  issue(): string {
    const raw = randomBytes(32).toString('base64url')
    return `${raw}.${this.sign(raw)}`
  }

  /**
   * Return the session id if it carries a valid signature, otherwise null.
   * Callers must treat null as "no session" — never as "trust it anyway".
   */
  verify(sessionId?: string | null): string | null {
    if (!sessionId) return null

    const separator = sessionId.lastIndexOf('.')
    if (separator <= 0) return null

    const raw = sessionId.slice(0, separator)
    const provided = sessionId.slice(separator + 1)
    const expected = this.sign(raw)

    const a = Buffer.from(provided, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null

    return sessionId
  }

  private sign(raw: string): string {
    return createHmac('sha256', this.key).update(raw).digest('base64url')
  }
}
