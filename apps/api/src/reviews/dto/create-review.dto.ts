import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsUUID,
  IsUrl,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { MAX_REVIEW_TITLE, MAX_REVIEW_BODY } from '../../common/validation'

export class CreateReviewDto {
  // `@IsUUID()` rather than a bare string: the service looks this up, and a
  // malformed id should be a 400 naming the field, not a failed query.
  @ApiProperty() @IsUUID() productId: string

  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'A review title is required' })
  @MinLength(3)
  @MaxLength(MAX_REVIEW_TITLE)
  title: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Please write a few words about the product' })
  @MinLength(10, { message: 'Review must be at least 10 characters' })
  @MaxLength(MAX_REVIEW_BODY)
  body: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'Video must be a valid URL' })
  videoUrl?: string
}
