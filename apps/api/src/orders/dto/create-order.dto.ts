import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsEnum,
  IsIn,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentMethod, ShippingMethod } from '@prisma/client'
import {
  PAKISTANI_PHONE_REGEX,
  PAKISTANI_PHONE_MESSAGE,
  POSTAL_CODE_REGEX,
  POSTAL_CODE_MESSAGE,
  MAX_NAME,
  MAX_CITY,
  MAX_ADDRESS_LINE,
  MAX_LABEL,
  MAX_GIFT_MESSAGE,
  MAX_ORDER_NOTES,
  MAX_COUPON_CODE,
  MAX_ORDER_ITEMS,
  MAX_ITEM_QUANTITY,
} from '../../common/validation'
import { ENABLED_PAYMENT_METHODS } from '../../common/payment-methods'

class OrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() variantId: string

  @ApiProperty()
  @IsInt()
  @Min(1)
  // Without a ceiling one line could reserve an item's entire stock.
  @Max(MAX_ITEM_QUANTITY)
  quantity: number

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasGiftWrap?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_GIFT_MESSAGE)
  giftMessage?: string
}

/**
 * Inline delivery address for guest checkout.
 *
 * A guest has no account to hang a saved address off, and
 * `/users/me/addresses` is behind the customer guard — so without this there
 * was no way to satisfy the required `addressId` and guest checkout could
 * never complete, despite `guestEmail`/`guestPhone` existing for exactly that
 * flow.
 *
 * Every required field carries `@IsNotEmpty()` alongside `@IsString()`.
 * `@IsString()` on its own accepts `""`, which is how orders with a blank
 * recipient and no phone number were reaching the database — undeliverable,
 * and with no way to contact the buyer about it.
 */
export class OrderAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LABEL)
  label?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A recipient name is required' })
  @MinLength(2)
  @MaxLength(MAX_NAME)
  fullName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A phone number is required for delivery' })
  @Matches(PAKISTANI_PHONE_REGEX, { message: PAKISTANI_PHONE_MESSAGE })
  phone: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A street address is required' })
  @MinLength(5)
  @MaxLength(MAX_ADDRESS_LINE)
  addressLine1: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ADDRESS_LINE)
  addressLine2?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A city is required' })
  @MinLength(2)
  @MaxLength(MAX_CITY)
  city: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A province is required' })
  @MaxLength(MAX_CITY)
  province: string

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(POSTAL_CODE_REGEX, { message: POSTAL_CODE_MESSAGE })
  postalCode?: string
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  // An order with no lines has no meaning, and the service would happily
  // compute a zero total for one rather than rejecting it.
  @ArrayMinSize(1, { message: 'An order must contain at least one item' })
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  /** Either `addressId` (saved address) or `address` (guest) must be present. */
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() addressId?: string

  @ApiPropertyOptional({ type: OrderAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressDto)
  address?: OrderAddressDto

  /**
   * Validated against the enabled subset, not the whole enum. Disabling the
   * gateway-backed options in the checkout UI alone would still leave them
   * accepted by a hand-rolled request, producing an order nobody can collect
   * payment for.
   */
  @ApiProperty({ enum: ENABLED_PAYMENT_METHODS })
  @IsIn(ENABLED_PAYMENT_METHODS, {
    message: `paymentMethod must be one of: ${ENABLED_PAYMENT_METHODS.join(', ')}`,
  })
  paymentMethod: PaymentMethod

  @ApiPropertyOptional({ enum: ShippingMethod })
  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_COUPON_CODE)
  couponCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ORDER_NOTES)
  notes?: string

  // Guest checkout
  @ApiPropertyOptional() @IsOptional() @IsEmail() guestEmail?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(PAKISTANI_PHONE_REGEX, { message: PAKISTANI_PHONE_MESSAGE })
  guestPhone?: string
}
