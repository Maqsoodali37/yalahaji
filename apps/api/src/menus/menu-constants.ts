/**
 * Shared menu constants.
 *
 * Mirrored in `apps/storefront/src/lib/menu-constants.ts` — the storefront
 * copy catches a bad value before a round trip, this copy is what protects
 * the database. **Change one, change both**, per the mirroring rule in
 * PROJECT_SPEC.md. `menu-constants.spec.ts` here and `menu-constants.test.ts`
 * on the storefront side each pin the regex to the same literal, so editing
 * either side alone fails a build rather than diverging quietly.
 */

/**
 * The `url` column is TEXT, but an href longer than this is a mistake rather
 * than a requirement — campaign parameters aside, nothing legitimate reaches
 * it, and an unbounded free-text field is an unbounded row.
 */
export const MAX_MENU_URL = 2048

/**
 * An internal path must start with a single `/`.
 *
 * `//evil.example` is the case this exists for: it looks like a path, passes
 * a naive `startsWith('/')`, and the browser resolves it as a
 * protocol-relative URL to another host. The storefront already learned this
 * with `safeNextPath` and the `?next=` open redirect; a staff-editable link
 * field is the same hole with a slower fuse.
 *
 * **The backslash is not decoration.** URL parsing for a special scheme
 * normalises `\` to `/`, so `/\evil.example` is resolved by every browser
 * exactly as `//evil.example` is — it passes a `(?!\/)` lookahead and leaves
 * the site anyway. `safeNextPath` already rejects it explicitly; this is the
 * same rule.
 */
export const INTERNAL_PATH_REGEX = /^\/(?![/\\])[^\s]*$/

export const INTERNAL_PATH_MESSAGE =
  'A custom link must be an internal path starting with a single "/" (use the External type for another site).'

/**
 * Cap on how deep a menu may nest.
 *
 * The storefront renders unlimited depth and the schema imposes no limit, so
 * this is not a rendering constraint — it is a guard against a cycle or a
 * pathological tree turning a nav render into a stack overflow. 10 is far
 * past any navigation a person would design.
 */
export const MAX_MENU_DEPTH = 10

/** How long a menu payload is cached when the menu row carries no TTL of its own. */
export const DEFAULT_MENU_TTL_SECONDS = 300
