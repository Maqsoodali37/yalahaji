import { NextResponse } from 'next/server'

/**
 * Container healthcheck target. Mirrors the storefront's.
 *
 * Docker must not probe `/` for liveness: that route streams server-rendered
 * HTML, and `wget --spider` drops the connection once headers arrive. Aborting
 * a half-written stream trips a race in Node's web-streams implementation
 * (nodejs/node#62036) that surfaces as
 *
 *   TypeError: controller[kState].transformAlgorithm is not a function
 *
 * once per probe interval, forever. A fixed JSON body has nothing to stream
 * and nothing to abort.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok', uptime: Math.round(process.uptime()) })
}
