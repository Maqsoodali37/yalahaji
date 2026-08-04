import { IsString, IsOptional, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateCategoryDto {
  @ApiProperty() @IsString() slug: string
  @ApiProperty() @IsString() nameEn: string
  @ApiProperty() @IsString() nameUr: string
  @ApiProperty() @IsString() nameAr: string
  @ApiPropertyOptional() @IsOptional() @IsString() descEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() descUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() descAr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string
  @ApiPropertyOptional() @IsOptional() @IsString() metaDesc?: string
}
