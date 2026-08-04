import { IsString, IsEnum, IsInt, IsOptional, IsBoolean, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import { CouponType } from '@prisma/client'

export class CreateCouponDto {
  @ApiProperty() @IsString() code: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiProperty({ enum: CouponType }) @IsEnum(CouponType) type: CouponType
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) value: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() minOrderAmt?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() maxDiscount?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() usageLimit?: number
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() perUserLimit?: number
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => new Date(value)) startsAt?: Date
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => new Date(value)) expiresAt?: Date
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}
