import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { BlogCategory } from '@prisma/client'

/**
 * `page` and `limit` were previously read as raw strings and passed through
 * `+page`, so `?page=abc` became `NaN` and reached Prisma's `skip`. Parsing
 * and bounding them here turns that into a 400 naming the field.
 */
export class BlogQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Capped so a single request cannot ask for the whole table.
  @Max(50)
  limit?: number = 12

  @ApiPropertyOptional({ enum: BlogCategory })
  @IsOptional()
  @IsEnum(BlogCategory, { message: 'Unknown blog category' })
  category?: BlogCategory
}
