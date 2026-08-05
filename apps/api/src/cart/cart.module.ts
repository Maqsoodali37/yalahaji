import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { CartService } from './cart.service'
import { CartController } from './cart.controller'
import { GuestSessionService } from './guest-session.service'

@Module({
  // PassportModule so OptionalJwtAuthGuard / JwtAuthGuard can resolve the
  // 'jwt' strategy registered by AuthModule.
  imports: [PassportModule],
  providers: [CartService, GuestSessionService],
  controllers: [CartController],
  exports: [GuestSessionService],
})
export class CartModule {}
