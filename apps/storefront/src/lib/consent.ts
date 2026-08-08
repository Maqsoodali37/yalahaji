/**
 * Visitor consent storage.
 *
 * The single source of truth for whether the cookie banner has been answered
 * and for how long that answer stands. Deliberately free of any gtag /
 * dataLayer knowledge so it can be read from anywhere — the banner, the
 * inline <head> snippet, and (via the cookie) the server — without dragging
 * the analytics module in. `lib/analytics.ts` is what joins a stored decision
 * to a Consent Mode update.
 *
 * Persistence is written twice, to a first-party cookie *and* to
 * localStorage:
 *
 *   - The cookie is the durable copy. It is the only one a server render or a
 *     non-JS context can see, and it is what survives a visitor who has
 *     localStorage blocked (Safari private browsing throws on access rather
 *     than returning null).
 *   - localStorage is the fallback copy, used when cookies are unavailable and
 *     as a migration source for decisions recorded by earlier builds, which
 *     stored a bare "granted" / "denied" string under the same key.
 *
 * Either copy alone is enough to keep the banner down; a decision is only
 * re-requested when both are gone, the record has expired, or the policy
 * version has been bumped.
 */

/** What the visitor actually decided about analytics/ads storage. */
export type ConsentChoice = 'granted' | 'denied'

/**
 * What is stored. `dismissed` is not a decision — storage stays denied — it
 * only records that the banner was closed without answering, so it can stay
 * closed for a while instead of reappearing on every page load.
 */
export type ConsentState = ConsentChoice | 'dismissed'

/**
 * Bump when the cookie policy materially changes. Every stored record from an
 * older version is treated as absent, so the whole audience is asked again —
 * which is the consent-refresh mechanism regulators expect, and the reason
 * this is a constant rather than a hardcoded literal at the comparison site.
 */
export const CONSENT_VERSION = 1

/** localStorage key. Unchanged from the first release so old values migrate. */
export const CONSENT_STORAGE_KEY = 'yh-consent-v1'

/** Cookie name. Underscored because some proxies mangle hyphens in cookies. */
export const CONSENT_COOKIE_NAME = 'yh_consent'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How long an explicit Accept / Decline stands before the visitor is asked
 * again. Twelve months is the ceiling most EU DPAs treat as reasonable.
 */
export const CONSENT_DECISION_TTL_DAYS = 365

/**
 * How long a bare dismissal (the ✕) stands. Much shorter than a real
 * decision: nothing was consented to, so the banner has to come back — just
 * not on the next page view.
 */
export const CONSENT_DISMISSAL_TTL_DAYS = 30

/** Serialised shape. Keys are short because this rides in a cookie. */
interface ConsentRecord {
  /** Policy version the record was written against. */
  v: number
  /** The stored state. */
  s: ConsentState
  /** Unix ms the record was written. */
  t: number
}

function ttlMsFor(state: ConsentState): number {
  return (
    (state === 'dismissed'
      ? CONSENT_DISMISSAL_TTL_DAYS
      : CONSENT_DECISION_TTL_DAYS) * DAY_MS
  )
}

function isConsentState(value: unknown): value is ConsentState {
  return value === 'granted' || value === 'denied' || value === 'dismissed'
}

/**
 * Parses either the current JSON record or the legacy bare-string value.
 *
 * Returns null for anything unrecognised, expired, or written against a
 * superseded policy version — all of which mean "ask again".
 */
function parseRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null

  // Legacy format: the choice on its own, with no version and no timestamp.
  // Honour it once so existing visitors are not re-prompted, and treat it as
  // written now — the real timestamp was never recorded.
  if (raw === 'granted' || raw === 'denied') {
    return { v: CONSENT_VERSION, s: raw, t: Date.now() }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Partial<ConsentRecord>

  if (record.v !== CONSENT_VERSION) return null
  if (!isConsentState(record.s)) return null
  if (typeof record.t !== 'number' || !Number.isFinite(record.t)) return null
  if (Date.now() - record.t >= ttlMsFor(record.s)) return null

  return { v: record.v, s: record.s, t: record.t }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length))
      } catch {
        return null
      }
    }
  }
  return null
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  // Lax rather than Strict: the banner must stay down when the visitor arrives
  // from a search result or an email link, which is a cross-site navigation.
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ]
  if (typeof location !== 'undefined' && location.protocol === 'https:') {
    attributes.push('Secure')
  }
  document.cookie = attributes.join('; ')
}

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Safari private mode throws rather than returning null.
    return null
  }
}

/** The live record, or null when the visitor needs to be asked. */
export function readConsentRecord(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  return (
    parseRecord(readCookie(CONSENT_COOKIE_NAME)) ??
    parseRecord(readLocalStorage(CONSENT_STORAGE_KEY))
  )
}

/**
 * The stored decision, or null when none was made.
 *
 * A dismissal is not a decision, so it reads as null here — storage stays
 * denied. Use {@link hasAnsweredConsent} to decide whether to show the banner.
 */
export function readStoredConsent(): ConsentChoice | null {
  const record = readConsentRecord()
  return record && record.s !== 'dismissed' ? record.s : null
}

/**
 * Whether the banner can stay hidden — true for an explicit choice *and* for
 * an unexpired dismissal.
 */
export function hasAnsweredConsent(): boolean {
  return readConsentRecord() !== null
}

/** Writes the record to both stores. Failures are non-fatal by design. */
export function persistConsent(state: ConsentState): void {
  const record: ConsentRecord = { v: CONSENT_VERSION, s: state, t: Date.now() }
  const serialised = JSON.stringify(record)

  writeCookie(
    CONSENT_COOKIE_NAME,
    serialised,
    Math.floor(ttlMsFor(state) / 1000),
  )

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialised)
  } catch {
    // Storage unavailable — the cookie above still carries the record, and if
    // that failed too the banner reappears, which is the safe failure mode.
  }
}

/**
 * The ES5 source of the same read, for the inline <head> snippet.
 *
 * That snippet has to run before any bundle is parsed, so it cannot import
 * from this module — but it must agree with it exactly, or a returning
 * visitor who accepted gets a denied first hit. Generating it from the same
 * constants is what keeps the two in step when the version or TTLs change.
 *
 * Exposes one global, `__yhConsent`, evaluating to 'granted' | 'denied'.
 */
export function consentReaderSnippet(): string {
  return `
var __yhConsent = (function () {
  var VERSION = ${CONSENT_VERSION};
  var DECISION_TTL = ${CONSENT_DECISION_TTL_DAYS * DAY_MS};
  var DISMISS_TTL = ${CONSENT_DISMISSAL_TTL_DAYS * DAY_MS};
  function parse(raw) {
    if (!raw) return null;
    if (raw === 'granted' || raw === 'denied') return raw;
    var r;
    try { r = JSON.parse(raw); } catch (e) { return null; }
    if (!r || r.v !== VERSION || typeof r.t !== 'number') return null;
    var ttl = r.s === 'dismissed' ? DISMISS_TTL : DECISION_TTL;
    if (Date.now() - r.t >= ttl) return null;
    return r.s === 'granted' ? 'granted' : 'denied';
  }
  var fromCookie = null;
  try {
    var parts = document.cookie.split('; ');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(${JSON.stringify(`${CONSENT_COOKIE_NAME}=`)}) === 0) {
        fromCookie = decodeURIComponent(parts[i].slice(${CONSENT_COOKIE_NAME.length + 1}));
        break;
      }
    }
  } catch (e) {}
  var value = parse(fromCookie);
  if (value) return value;
  try { value = parse(window.localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})); } catch (e) {}
  return value === 'granted' ? 'granted' : 'denied';
})();
`.trim()
}
