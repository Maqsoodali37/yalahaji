import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-in-production'),
    })
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    // Controllers read `user.id`; `sub` is kept for backwards compatibility.
    return {
      id: payload.sub,
      sub: payload.sub,
      phone: payload.phone,
      role: payload.role,
    }
  }
}
