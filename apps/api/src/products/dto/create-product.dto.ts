import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsInt, IsNotEmpty, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Tier } from '@prisma/client'
import {
  MAX_MEDIA_ALT, MAX_MEDIA_URL, MAX_SEO_TITLE, MAX_SEO_DESC, MAX_SEO_KEYWORDS,
} from '../../common/validation'

class VariantDto {
  @IsString() sku: string
  @IsEnum(Tier) tier: Tier
  @IsOptional() @IsString() size?: string
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsString() colorHex?: string
  @IsOptional() @IsString() scent?: string
  @IsInt() @Min(0) price: number
  @IsOptional() @IsInt() compareAtPrice?: number
  @IsInt() @Min(0) stock: number
  @IsOptional() @IsInt() lowStockThreshold?: number
}

/**
 * `@IsString()` alone accepts `""`, and an empty url reaches the storefront as
 * a product with a media row that renders the placeholder — indistinguishable
 * from a product nobody has photographed yet. `@IsNotEmpty()` is what makes
 * the field actually required.
 */
class MediaDto {
  @IsString() @IsNotEmpty({ message: 'Image url is required.' }) @MaxLength(MAX_MEDIA_URL) url: string
  @IsOptional() @IsString() @MaxLength(MAX_MEDIA_ALT) alt?: string
  @IsOptional() @IsBoolean() isPrimary?: boolean
  @IsOptional() @IsInt() @Min(0) order?: number
}

class SizeGuideDto {
  @IsString() label: string
  @IsOptional() @IsString() chest?: string
  @IsOptional() @IsString() length?: string
  @IsOptional() @IsString() waist?: string
  @IsOptional() @IsString() fit?: string
  @IsOptional() @IsString() fabric?: string
  @IsOptional() @IsInt() order?: number
}

export class CreateProductDto {
  @ApiProperty() @IsString() slug: string
  @ApiProperty() @IsString() sku: string
  @ApiProperty() @IsString() nameEn: string
  @ApiProperty() @IsString() nameUr: string
  @ApiProperty() @IsString() nameAr: string
  @ApiProperty() @IsString() descEn: string
  @ApiProperty() @IsString() descUr: string
  @ApiProperty() @IsString() descAr: string
  @ApiProperty() @IsString() shortDescEn: string
  @ApiProperty() @IsString() shortDescUr: string
  @ApiProperty() @IsString() shortDescAr: string
  @ApiProperty() @IsString() categoryId: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isKit?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasGiftWrap?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPreOrder?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean
  // Legacy single-language pair. The admin form no longer edits these directly
  // — it sends the English SEO values here so the columns stay in step — but
  // they remain accepted so an existing integration does not start 400ing.
  //
  // Every field below is `| null`, not just optional. A PATCH has to be able to
  // distinguish "leave this alone" (key absent) from "clear it" (key present,
  // null), and `JSON.stringify` drops `undefined` — so mapping a cleared input
  // to `undefined` makes the field set-once: staff can add an Urdu SEO title
  // and never remove it. `@IsOptional()` skips its siblings for null as well as
  // undefined, so no other decorator needs changing.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) metaTitle?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) metaDesc?: string | null

  // Per-locale SEO, same caps as the categories DTO. `@MaxLength` matters more
  // than usual here: seoTitle* is VARCHAR(191), so an unbounded string is a 500
  // from the driver rather than a validation error the person filling the form
  // can act on.
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleEn?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleUr?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_TITLE) seoTitleAr?: string | null

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescEn?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescUr?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_DESC) seoDescAr?: string | null

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_KEYWORDS) seoKeywordsEn?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_KEYWORDS) seoKeywordsUr?: string | null
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_SEO_KEYWORDS) seoKeywordsAr?: string | null
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) badges?: string[]
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @ApiPropertyOptional({ type: [VariantDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VariantDto) variants?: VariantDto[]
  @ApiPropertyOptional({ type: [MediaDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MediaDto) images?: MediaDto[]
  @ApiPropertyOptional({ type: [SizeGuideDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SizeGuideDto) sizeGuide?: SizeGuideDto[]
}
