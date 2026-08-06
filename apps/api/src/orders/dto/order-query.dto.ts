import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus, PaymentStatus, PaymentMethod, ShippingMethod } from '@prisma/client'

/**
 * Query parameters for the admin order listing and CSV export.
 *
 * A class with decorators, not an inline type literal: the global
 * ValidationPipe runs `whitelist`/`forbidNonWhitelisted`, so an unknown query
 * key is rejected rather than silently ignored, and every value is bounded.
 *
 * Money bounds (`minTotal`/`maxTotal`) are in **paisas**, matching the wire —
 * the admin converts the staff-entered rupee figure at its edge.
 */
export class OrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120) search?: string

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod

  @ApiPropertyOptional({ enum: ShippingMethod })
  @IsOptional() @IsEnum(ShippingMethod) shippingMethod?: ShippingMethod

  @ApiPropertyOptional({ description: 'ISO date; inclusive lower bound' })
  @IsOptional() @IsDateString() dateFrom?: string

  @ApiPropertyOptional({ description: 'ISO date; inclusive upper bound (whole day)' })
  @IsOptional() @IsDateString() dateTo?: string

  @ApiPropertyOptional({ description: 'Minimum total in paisas' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minTotal?: number

  @ApiPropertyOptional({ description: 'Maximum total in paisas' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxTotal?: number

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60) city?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60) province?: string

  @ApiPropertyOptional({ enum: ['createdAt', 'total', 'number', 'status'] })
  @IsOptional() @IsIn(['createdAt', 'total', 'number', 'status']) sort?: string

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsIn(['asc', 'desc']) order?: string
}
