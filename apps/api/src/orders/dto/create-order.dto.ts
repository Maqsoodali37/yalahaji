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

/**
 * Inline delivery address for guest checkout.
 *
 * A guest has no account to hang a saved address off, and
 * `/users/me/addresses` is behind the customer guard — so without this there
 * was no way to satisfy the required `addressId` and guest checkout could
 * never complete, despite `guestEmail`/`guestPhone` existing for exactly that
 * flow.
 */
export class OrderAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string
  @ApiProperty() @IsString() fullName: string
  @ApiProperty() @IsString() phone: string
  @ApiProperty() @IsString() addressLine1: string
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string
  @ApiProperty() @IsString() city: string
  @ApiProperty() @IsString() province: string
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[]

  /** Either `addressId` (saved address) or `address` (guest) must be present. */
  @ApiPropertyOptional() @IsOptional() @IsString() addressId?: string

  @ApiPropertyOptional({ type: OrderAddressDto })
  @IsOptional() @ValidateNested() @Type(() => OrderAddressDto)
  address?: OrderAddressDto

  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod
  @ApiPropertyOptional({ enum: ShippingMethod }) @IsOptional() @IsEnum(ShippingMethod) shippingMethod?: ShippingMethod

  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string

  // Guest checkout
  @ApiPropertyOptional() @IsOptional() @IsEmail() guestEmail?: string
  @ApiPropertyOptional() @IsOptional() @IsString() guestPhone?: string
}
