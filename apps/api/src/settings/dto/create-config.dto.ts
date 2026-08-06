import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ConfigValueType } from '@prisma/client'

export class CreateConfigDto {
  @ApiProperty({ example: 'free_shipping_threshold' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  // snake_case is enforced rather than suggested: these keys are read by name
  // across two frontends, and `freeShipping` vs `free_shipping` is a silent
  // miss that falls through to a default instead of erroring.
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Key must be lowercase snake_case, e.g. free_shipping_threshold',
  })
  key: string

  @ApiProperty({
    description: 'Always sent as a string; `valueType` says how to read it.',
    example: '299900',
  })
  @IsString()
  @MaxLength(5000)
  value: string

  @ApiProperty({ enum: ConfigValueType })
  @IsEnum(ConfigValueType, { message: 'valueType must be string, number, boolean or json' })
  valueType: ConfigValueType

  @ApiPropertyOptional({ example: 'shipping', default: 'general' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9_-]*$/, { message: 'Category must be lowercase' })
  category?: string

  @ApiPropertyOptional({ description: 'Shown to staff in the admin panel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional({
    default: false,
    description:
      'Exposed by GET /settings/public. Defaults to false so a new key is private until deliberately published.',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean
}
