import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Tier } from '@prisma/client'

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

class MediaDto {
  @IsString() url: string
  @IsOptional() @IsString() alt?: string
  @IsOptional() @IsBoolean() isPrimary?: boolean
  @IsOptional() @IsInt() order?: number
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
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string
  @ApiPropertyOptional() @IsOptional() @IsString() metaDesc?: string
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) badges?: string[]
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @ApiPropertyOptional({ type: [VariantDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VariantDto) variants?: VariantDto[]
  @ApiPropertyOptional({ type: [MediaDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MediaDto) images?: MediaDto[]
  @ApiPropertyOptional({ type: [SizeGuideDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SizeGuideDto) sizeGuide?: SizeGuideDto[]
}
