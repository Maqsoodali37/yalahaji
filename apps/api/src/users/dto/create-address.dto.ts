import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  PAKISTANI_PHONE_REGEX,
  PAKISTANI_PHONE_MESSAGE,
  POSTAL_CODE_REGEX,
  POSTAL_CODE_MESSAGE,
  MAX_NAME,
  MAX_CITY,
  MAX_ADDRESS_LINE,
  MAX_LABEL,
} from '../../common/validation'

/**
 * Mirrors `OrderAddressDto`. The two describe the same thing — one saved to a
 * profile, one attached to a single order — so a rule that held in one and not
 * the other would let a customer save an address that then fails at checkout,
 * or the reverse.
 */
export class CreateAddressDto {
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

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean
}
