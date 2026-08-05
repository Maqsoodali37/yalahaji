import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth/permission/not-found failures.
          if (error instanceof ApiError) {
            if ([401, 403, 404].includes(error.status)) return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}
