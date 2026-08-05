import { Controller, Get, Patch, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_ORDERS } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('users')
@Controller('users')
// NOTE: guards are applied per-method — /users/me* are customer routes
// (bearer token) while the admin routes require the admin session cookie.

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.id)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto)
  }

  // Addresses
  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getAddresses(@CurrentUser() user: any) {
    return this.usersService.getAddresses(user.id)
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.id, dto)
  }

  @Patch('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateAddress(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.usersService.updateAddress(id, user.id, dto)
  }

  @Delete('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.deleteAddress(id, user.id)
  }

  // Wishlist
  @Get('me/wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getWishlist(@CurrentUser() user: any) {
    return this.usersService.getWishlist(user.id)
  }

  @Post('me/wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  addToWishlist(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.usersService.addToWishlist(user.id, productId)
  }

  @Delete('me/wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  removeFromWishlist(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.usersService.removeFromWishlist(user.id, productId)
  }

  // Admin
  @Get()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ORDERS)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: list all users' })
  findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.findAll(+page, +limit)
  }

  @Patch(':id/toggle-active')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: toggle user active status' })
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id)
  }
}
