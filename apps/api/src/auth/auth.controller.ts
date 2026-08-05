import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CurrentUser } from './current-user.decorator'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  // Shares a password hash with staff accounts, so it needs a real limit too.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@CurrentUser() user: { sub: string }) {
    return this.authService.getMe(user.sub)
  }
}
