import { IsString, IsInt, Min, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * `@Body() body: { code: string; subtotal: number }` was an inline type
 * literal, not a class — TypeScript erases it, so ValidationPipe had nothing
 * to validate against and let anything through. A missing or non-numeric
 * `subtotal` then reached `subtotal * coupon.value / 100` as NaN, and a
 * negative one would satisfy any minimum-order check.
 */
export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code: string

  @ApiProperty({ description: 'Order subtotal in paisas' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotal: number
}
