import { Module, Global, Logger } from '@nestjs/common'
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { redisStore } from 'cache-manager-redis-store'

/**
 * Application cache, Redis-backed when reachable.
 *
 * Redis and `cache-manager` were both already dependencies and in
 * docker-compose, but nothing ever registered a cache module — so the
 * container ran for nothing.
 *
 * **Falls back to in-memory rather than failing to boot.** A cache is an
 * optimisation; an API that refuses to start because Redis is down turns a
 * degraded dependency into a full outage. The fallback is per-instance, so
 * with multiple API replicas an invalidation on one will not reach the others
 * — hence the warning, which is the signal to go fix Redis.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('CacheModule')
        const host = config.get<string>('REDIS_HOST')
        const port = config.get<number>('REDIS_PORT', 6379)

        if (!host) {
          logger.warn('REDIS_HOST not set — using in-memory cache.')
          return { ttl: 60_000, max: 500 }
        }

        try {
          const store = await redisStore({
            socket: {
              host,
              port: Number(port),
              // Without a bounded timeout a wrong host hangs application
              // bootstrap instead of falling through to the branch below.
              connectTimeout: 3_000,
            },
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            ttl: 60_000,
          })

          logger.log(`Cache backed by Redis at ${host}:${port}`)
          return { store: store as unknown as string, ttl: 60_000 }
        } catch (e) {
          logger.warn(
            `Redis unavailable (${(e as Error).message}) — falling back to in-memory cache. ` +
              'Invalidation will not propagate between API instances until this is fixed.',
          )
          return { ttl: 60_000, max: 500 }
        }
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}
