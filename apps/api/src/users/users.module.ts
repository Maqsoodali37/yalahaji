import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  // AuthModule provides AdminSessionService so deactivating a user can
  // immediately revoke their admin sessions.
  imports: [AuthModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
