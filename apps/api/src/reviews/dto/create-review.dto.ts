import { IsString, IsInt, Min, Max, IsOptional, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateReviewDto {
  @ApiProperty() @IsString() productId: string
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number
  @ApiProperty() @IsString() title: string
  @ApiProperty() @IsString() body: string
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string
}
