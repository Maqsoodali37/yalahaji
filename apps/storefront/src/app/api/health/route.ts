import { NextResponse } from 'next/server'

/**
 * Container healthcheck target.
 *
 * Docker must not probe `/` for liveness. That route streams server-rendered
 * HTML, and `wget --spider` — the probe compose used to run — reads the
 * response headers and then drops the connection without consuming the body.
 * Tearing down a half-written stream trips a race inside Node's web-streams
 * implementation, where shutdown clears the transform algorithm while a queued
 * write is still in flight:
 *
 *   TypeError: controller[kState].transformAlgorithm is not a function
 *
 * That is nodejs/node#62036, not a fault in this app, but it logged a fresh
 * error every 30 seconds for the lifetime of the container and buried real
 * ones. See docker-compose.yml.
 *
 * This handler returns a small fixed body instead: nothing to stream, nothing
 * to abort. `force-dynamic` keeps it out of the build-time cache so a passing
 * check means the running server actually served it.
 *
 * Excluded from the locale rewrite by the `api` branch of the middleware
 * matcher, so it answers on /api/health with no locale prefix.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok', uptime: Math.round(process.uptime()) })
}
