import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, IsBoolean, IsEnum, IsEmail } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentMethod, ShippingMethod } from '@prisma/client'

class OrderItemDto {
  @ApiProperty() @IsString() variantId: string
  @ApiProperty() @IsInt() @Min(1) quantity: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasGiftWrap?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() giftMessage?: string
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @ApiProperty() @IsString() addressId: string

  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod
  @ApiPropertyOptional({ enum: ShippingMethod }) @IsOptional() @IsEnum(ShippingMethod) shippingMethod?: ShippingMethod

  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string

  // Guest checkout
  @ApiPropertyOptional() @IsOptional() @IsEmail() guestEmail?: string
  @ApiPropertyOptional() @IsOptional() @IsString() guestPhone?: string
}
