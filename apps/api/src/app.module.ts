import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AppCacheModule } from './cache/cache.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProductsModule } from './products/products.module'
import { CategoriesModule } from './categories/categories.module'
import { KitCategoriesModule } from './kit-categories/kit-categories.module'
import { VariantsModule } from './variants/variants.module'
import { OrdersModule } from './orders/orders.module'
import { ReturnsModule } from './returns/returns.module'
import { CartModule } from './cart/cart.module'
import { ReviewsModule } from './reviews/reviews.module'
import { CouponsModule } from './coupons/coupons.module'
import { BlogModule } from './blog/blog.module'
import { MediaModule } from './media/media.module'
import { SearchModule } from './search/search.module'
import { SettingsModule } from './settings/settings.module'
import { StockNotificationsModule } from './stock-notifications/stock-notifications.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60_000,
          limit: config.get<number>('THROTTLE_LIMIT', 120),
        },
      ],
    }),

    // Core
    PrismaModule,
    AppCacheModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    KitCategoriesModule,
    VariantsModule,
    OrdersModule,
    ReturnsModule,
    CartModule,
    ReviewsModule,
    CouponsModule,
    BlogModule,
    MediaModule,
    SearchModule,
    SettingsModule,
    StockNotificationsModule,
    HealthModule,
  ],
  providers: [
    // ThrottlerModule.forRoot() only supplies configuration — without this
    // the @Throttle decorators and the global limit do nothing at all.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
