import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'
import { AdminAuthService } from './admin-auth.service'
import { AdminAuthController } from './admin-auth.controller'
import { AdminJwtStrategy } from './admin-jwt.strategy'
import { AdminSessionService } from './admin-session.service'
import { LoginAttemptService } from './login-attempt.service'

@Module({
  imports: [
    PassportModule,
    // Customer tokens. Admin tokens are signed per-call with ADMIN_JWT_SECRET
    // inside AdminAuthService, so the two secrets never mix.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    AdminAuthService,
    AdminJwtStrategy,
    AdminSessionService,
    LoginAttemptService,
  ],
  controllers: [AuthController, AdminAuthController],
  exports: [AuthService, AdminSessionService],
})
export class AuthModule {}
