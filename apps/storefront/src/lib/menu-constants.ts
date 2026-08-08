/**
 * Shared menu constants — the storefront half of a deliberate mirror.
 *
 * `apps/api/src/menus/menu-constants.ts` holds the same values. This copy
 * catches a bad value before a round trip and re-checks anything reaching a
 * component; that copy is what protects the database. **Change one, change
 * both** — the rule PROJECT_SPEC.md records for `lib/validation.ts` and
 * `common/validation.ts`, for the same reason: a storefront rule looser than
 * the API's produces a rejection nobody was warned about, and a storefront
 * rule tighter than the API's silently hides valid data.
 *
 * `menu-constants.test.ts` pins the regex to its exact source string, so
 * changing one side without the other fails a test rather than diverging
 * quietly.
 */

/** Matches the API's `url` cap. */
export const MAX_MENU_URL = 2048

/**
 * An internal path must start with exactly one `/`, followed by no
 * whitespace.
 *
 * Both exclusions are load-bearing:
 *
 *   `//evil.example`  — reads as a path, passes `startsWith('/')`, and the
 *                       browser resolves it as a protocol-relative URL to
 *                       another host. This is the open redirect `safeNextPath`
 *                       already closed on the `?next=` parameter.
 *   `/\evil.example`  — URL parsing for a special scheme normalises `\` to
 *                       `/`, so this resolves *identically* to the line above
 *                       while sailing past a `(?!\/)` lookahead.
 *
 * The API validates this on write. The adapter re-checks it because the
 * adapter is the boundary components trust, and a row can predate a check.
 */
export const INTERNAL_PATH_REGEX = /^\/(?![/\\])[^\s]*$/

/** Matches the API's nesting cap. A cycle guard, not a design limit. */
export const MAX_MENU_DEPTH = 10
