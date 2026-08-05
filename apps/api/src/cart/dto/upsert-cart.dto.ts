import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * The previous inline version of this class carried no decorators at all.
 * Under the global `ValidationPipe({ whitelist, forbidNonWhitelisted })` a
 * class with no decorated properties whitelists to `{}` and then trips
 * `forbidNonWhitelisted` on every field — so `POST /cart` returned 400 for
 * every request that had ever been made to it.
 */
export class UpsertCartDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantId: string

  @ApiProperty({ minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasGiftWrap?: boolean

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  giftMessage?: string
}
