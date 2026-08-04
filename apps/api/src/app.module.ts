import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProductsModule } from './products/products.module'
import { CategoriesModule } from './categories/categories.module'
import { VariantsModule } from './variants/variants.module'
import { OrdersModule } from './orders/orders.module'
import { CartModule } from './cart/cart.module'
import { ReviewsModule } from './reviews/reviews.module'
import { CouponsModule } from './coupons/coupons.module'
import { BlogModule } from './blog/blog.module'
import { MediaModule } from './media/media.module'
import { SearchModule } from './search/search.module'
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

    // Feature modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    VariantsModule,
    OrdersModule,
    CartModule,
    ReviewsModule,
    CouponsModule,
    BlogModule,
    MediaModule,
    SearchModule,
    HealthModule,
  ],
})
export class AppModule {}
