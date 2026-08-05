import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateKitCategoryDto {
  @ApiProperty({ example: 'ihram' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  // Slugs appear in URLs and are compared exactly, so the format is enforced
  // rather than left to whoever types it into the admin form.
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers and hyphens',
  })
  slug: string

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) nameEn: string
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) nameUr: string
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) nameAr: string

  @ApiPropertyOptional({ description: 'Emoji or short icon token' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string

  @ApiPropertyOptional({ description: 'Kit cannot be completed without this step' })
  @IsOptional()
  @IsBoolean()
  required?: boolean

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean

  @ApiProperty({
    type: [String],
    description: 'Catalogue categories this step draws products from',
  })
  @IsArray()
  // A step with no source categories can never offer a product, and would be
  // filtered straight back out of the public listing.
  @ArrayMinSize(1, { message: 'Select at least one catalogue category' })
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  categoryIds: string[]
}
