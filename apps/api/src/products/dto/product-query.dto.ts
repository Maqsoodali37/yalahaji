import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class ProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string
  @ApiPropertyOptional({ isArray: true }) @IsOptional() @IsArray() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) tier?: string[]
  @ApiPropertyOptional({ isArray: true }) @IsOptional() @IsArray() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) size?: string[]
  @ApiPropertyOptional({ isArray: true }) @IsOptional() @IsArray() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) color?: string[]
  @ApiPropertyOptional({ isArray: true }) @IsOptional() @IsArray() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) scent?: string[]
  @ApiPropertyOptional({ isArray: true }) @IsOptional() @IsArray() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) badges?: string[]
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) rating?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() inStock?: boolean
  @ApiPropertyOptional({ enum: ['popularity', 'newest', 'price_asc', 'price_desc', 'rating'] }) @IsOptional() @IsString() sort?: string
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number
}
