import type { Instrumentation } from 'next'

/**
 * Server-side error reporting hook.
 *
 * Next's default handler prints the error and its digest but not the request
 * that produced it, which makes a streaming failure like
 *
 *   Expected a suspended thenable. This is a bug in React.
 *   -> failed to pipe response
 *
 * effectively unattributable in `docker compose logs` — every occurrence looks
 * identical no matter which page threw it.
 *
 * `renderSource` is the field worth reading first when triaging one of those:
 *
 *   server-rendering          the HTML pass (Fizz). Suspense boundaries,
 *                             useSearchParams, anything that suspends while
 *                             streaming markup.
 *   react-server-components   the RSC pass (Flight). Server components, their
 *                             data fetching, and the serialised payload.
 *
 * The two run different renderers, so which one appears here decides where to
 * look and rules out roughly half the surface area.
 */
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const err = error as { message?: string; digest?: string }

  console.error(
    '[request-error]',
    JSON.stringify({
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      digest: err?.digest,
      message: err?.message,
    }),
  )
}
