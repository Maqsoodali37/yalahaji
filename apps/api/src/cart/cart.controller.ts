import {
  Controller, Get, Post, Delete, Body, Param, Headers,
  UseGuards, UnauthorizedException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger'
import { CartService } from './cart.service'
import { GuestSessionService } from './guest-session.service'
import { UpsertCartDto } from './dto/upsert-cart.dto'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'

const SESSION_HEADER = 'x-session-id'

@ApiTags('cart')
@Controller('cart')
@ApiHeader({
  name: SESSION_HEADER,
  required: false,
  description: 'Signed guest session id from POST /cart/session. Ignored when authenticated.',
})
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly guestSessions: GuestSessionService,
  ) {}

  /**
   * Resolve the cart owner.
   *
   * An authenticated user always wins — a caller cannot pass someone else's
   * session header to reach a guest cart while logged in. For guests, the
   * header is honoured only if it carries a valid server signature, so a
   * caller cannot invent or enumerate session ids the way they could when
   * this method trusted the raw header.
   */
  private resolve(user: any, headers: Record<string, string>) {
    if (user?.id) return { userId: user.id as string, sessionId: undefined }

    const sessionId = this.guestSessions.verify(headers[SESSION_HEADER])
    if (!sessionId) {
      throw new UnauthorizedException(
        'Sign in, or call POST /cart/session for a guest session id.',
      )
    }
    return { userId: undefined, sessionId }
  }

  @Post('session')
  @ApiOperation({ summary: 'Issue a signed guest session id' })
  issueSession() {
    return { sessionId: this.guestSessions.issue() }
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart' })
  get(@CurrentUser() user: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(user, headers)
    return this.cartService.getCart(userId, sessionId)
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add/update cart item' })
  upsert(
    @Body() dto: UpsertCartDto,
    @CurrentUser() user: any,
    @Headers() headers: Record<string, string>,
  ) {
    const { userId, sessionId } = this.resolve(user, headers)
    return this.cartService.upsert(
      dto.variantId, dto.quantity, dto.hasGiftWrap, dto.giftMessage, userId, sessionId,
    )
  }

  @Delete()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cart' })
  clear(@CurrentUser() user: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(user, headers)
    return this.cartService.clear(userId, sessionId)
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove cart item' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Headers() headers: Record<string, string>,
  ) {
    const { userId, sessionId } = this.resolve(user, headers)
    return this.cartService.remove(id, userId, sessionId)
  }

  /**
   * Requires a real token: merging writes items into a user's cart, so it must
   * never run on an unauthenticated guess at a user id.
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Merge guest cart into user cart after login' })
  merge(@CurrentUser() user: any, @Headers() headers: Record<string, string>) {
    const sessionId = this.guestSessions.verify(headers[SESSION_HEADER])
    if (!sessionId) return { merged: 0 }
    return this.cartService.merge(sessionId, user.id)
  }
}
