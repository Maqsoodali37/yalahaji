import { IsString, IsOptional, IsBoolean, IsEnum, IsInt } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { BlogCategory } from '@prisma/client'

export class CreateBlogPostDto {
  @ApiProperty() @IsString() slug: string
  @ApiProperty() @IsString() titleEn: string
  @ApiProperty() @IsString() titleUr: string
  @ApiProperty() @IsString() titleAr: string
  @ApiProperty() @IsString() excerptEn: string
  @ApiProperty() @IsString() excerptUr: string
  @ApiProperty() @IsString() excerptAr: string
  @ApiProperty() @IsString() bodyEn: string
  @ApiProperty() @IsString() bodyUr: string
  @ApiProperty() @IsString() bodyAr: string
  @ApiProperty({ enum: BlogCategory }) @IsEnum(BlogCategory) category: BlogCategory
  @ApiProperty() @IsString() author: string
  @ApiPropertyOptional() @IsOptional() @IsString() authorAvatar?: string
  @ApiPropertyOptional() @IsOptional() @IsString() coverImage?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() readingTime?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string
  @ApiPropertyOptional() @IsOptional() @IsString() metaDesc?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() published?: boolean
}
