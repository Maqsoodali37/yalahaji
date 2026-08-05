import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiCookieAuth, ApiOperation } from '@nestjs/swagger'
import { ReviewsService } from './reviews.service'
import { CreateReviewDto } from './dto/create-review.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  findByProduct(
    @Param('productId') productId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.reviewsService.findByProduct(productId, +page, +limit)
  }

  @Post()
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(dto, user.id)
  }

  @Patch(':id/approve')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: approve review' })
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id)
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard) @Roles(...STAFF_MANAGE) @ApiCookieAuth()
  @ApiOperation({ summary: 'Admin: delete review' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id)
  }
}
