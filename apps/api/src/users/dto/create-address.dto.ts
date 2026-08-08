import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AddressLabel } from '@prisma/client'
import {
  PAKISTANI_PHONE_REGEX,
  PAKISTANI_PHONE_MESSAGE,
  POSTAL_CODE_REGEX,
  POSTAL_CODE_MESSAGE,
  MAX_NAME,
  MAX_CITY,
  MAX_ADDRESS_LINE,
  MAX_LABEL,
  MAX_AREA,
  MAX_EMAIL,
  MAX_COUNTRY,
  SUPPORTED_COUNTRIES,
} from '../../common/validation'

/**
 * Mirrors `OrderAddressDto`. The two describe the same thing — one saved to a
 * profile, one attached to a single order — so a rule that held in one and not
 * the other would let a customer save an address that then fails at checkout,
 * or the reverse.
 */
export class CreateAddressDto {
  /**
   * Free-text display name. Meaningful mainly when `labelType` is `other` —
   * the enum is what code groups on, this is what a human reads.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_LABEL)
  label?: string

  @ApiPropertyOptional({ enum: AddressLabel })
  @IsOptional()
  @IsEnum(AddressLabel)
  labelType?: AddressLabel

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

  /**
   * `string | null`, not just `string | undefined`: a PATCH distinguishes an
   * omitted key ("leave alone") from an explicit `null` ("clear it"). The
   * storefront edit form sends `null` for a field the customer emptied — if
   * this type only allowed `undefined`, that still validates today (class
   * validator's `@IsOptional` skips null the same as undefined), but the
   * annotation would be lying about a value this property genuinely receives.
   * Mirrors the same fix already made for `MenuItemInput`.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ADDRESS_LINE)
  addressLine2?: string | null

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

  @ApiPropertyOptional({ description: 'Named locality, e.g. "DHA Phase 5"' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_AREA)
  area?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(POSTAL_CODE_REGEX, { message: POSTAL_CODE_MESSAGE })
  postalCode?: string | null

  /**
   * Optional and per-address, not per-account. Whoever receives the parcel at
   * the office is not necessarily the account holder, and a delivery
   * notification should reach the recipient.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(MAX_EMAIL)
  email?: string | null

  /**
   * Defaults to Pakistan rather than being required. Every province in the
   * storefront's PROVINCES list is Pakistani, so a required country field is
   * one more tap for an answer the shop already knows.
   */
  @ApiPropertyOptional({ enum: SUPPORTED_COUNTRIES })
  @IsOptional()
  @IsIn(SUPPORTED_COUNTRIES, { message: 'We do not ship to that country yet' })
  @MaxLength(MAX_COUNTRY)
  country?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefaultShipping?: boolean

  /**
   * Accepted and stored, but nothing reads it yet: cash on delivery is the
   * only enabled payment method, so no surface collects a billing address.
   */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefaultBilling?: boolean
}
