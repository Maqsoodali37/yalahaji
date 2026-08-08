import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MenuLocation } from '@prisma/client'

export class CreateMenuDto {
  @ApiProperty({ enum: MenuLocation })
  @IsEnum(MenuLocation)
  location: MenuLocation

  @ApiProperty({ description: 'Staff-facing label. Never rendered to customers.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean

  // Lower bound of 30s rather than 0: a TTL of zero turns every page render
  // into a database round trip for a list that changes a few times a year.
  // Upper bound of a day so a forgotten menu still self-heals.
  @ApiPropertyOptional({ minimum: 30, maximum: 86_400 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(30) @Max(86_400) cacheTtl?: number
}
