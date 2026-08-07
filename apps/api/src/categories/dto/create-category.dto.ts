import { IsString, IsOptional, IsInt, IsBoolean, IsNotEmpty, Min, MaxLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { SLUG_REGEX, SLUG_MESSAGE, MAX_SEO_TITLE, MAX_SEO_DESC } from '../../common/validation'

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
  slug: string

  // English name is the only one the storefront and search cannot fall back
  // from, so it is the one field this DTO actually requires — Urdu/Arabic are
  // filled by the admin form from the English value when left blank, the same
  // pattern ProductForm already uses.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nameEn: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nameUr: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nameAr: string

  @ApiPropertyOptional() @IsOptional() @IsString() descEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() descUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() descAr?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) image?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) bannerImage?: string

  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number

  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleAr?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescAr?: string
}
