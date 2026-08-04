import { Controller, Get, Post, Delete, Body, Param, Request, Headers } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { CartService } from './cart.service'

class UpsertCartDto {
  variantId: string
  quantity: number
  hasGiftWrap?: boolean
  giftMessage?: string
}

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private resolve(req: any, headers: Record<string, string>) {
    return { userId: req.user?.id, sessionId: headers['x-session-id'] }
  }

  @Get()
  @ApiOperation({ summary: 'Get cart' })
  get(@Request() req: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(req, headers)
    return this.cartService.getCart(userId, sessionId)
  }

  @Post()
  @ApiOperation({ summary: 'Add/update cart item' })
  upsert(@Body() dto: UpsertCartDto, @Request() req: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(req, headers)
    return this.cartService.upsert(dto.variantId, dto.quantity, dto.hasGiftWrap, dto.giftMessage, userId, sessionId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove cart item' })
  remove(@Param('id') id: string, @Request() req: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(req, headers)
    return this.cartService.remove(id, userId, sessionId)
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  clear(@Request() req: any, @Headers() headers: Record<string, string>) {
    const { userId, sessionId } = this.resolve(req, headers)
    return this.cartService.clear(userId, sessionId)
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart after login' })
  merge(@Request() req: any, @Headers() headers: Record<string, string>) {
    const sessionId = headers['x-session-id']
    const userId = req.user?.id
    if (!sessionId || !userId) return { merged: 0 }
    return this.cartService.merge(sessionId, userId)
  }
}
