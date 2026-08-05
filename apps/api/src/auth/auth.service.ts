import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginAttemptService } from './login-attempt.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly attempts: LoginAttemptService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
    })
    if (existing) throw new ConflictException('Phone or email already registered.')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: { name: dto.name, phone: dto.phone, email: dto.email, passwordHash },
    })

    return this.signToken(user.id, user.phone, user.role)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
        isActive: true,
      },
    })

    const invalid = () => new UnauthorizedException('Invalid credentials.')

    if (!user || !user.passwordHash) {
      await this.attempts.equaliseTiming(dto.password)
      throw invalid()
    }

    // Staff and customers share one password hash, so the lockout MUST be
    // enforced here too. Without it, an attacker brute-forces a staff
    // password through this endpoint and then presents it once to the
    // admin login, never tripping the admin lockout.
    if (this.attempts.isLocked(user)) {
      await this.attempts.equaliseTiming(dto.password)
      throw invalid()
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      await this.attempts.registerFailure(user.id, user.failedLoginAttempts)
      throw invalid()
    }

    await this.attempts.registerSuccess(user.id)
    return this.signToken(user.id, user.phone, user.role)
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, loyaltyPoints: true, avatar: true, createdAt: true,
        addresses: true,
      },
    })
  }

  private signToken(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role }
    const token = this.jwt.sign(payload)
    return { access_token: token, token_type: 'Bearer' }
  }
}
