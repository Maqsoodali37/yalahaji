import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReturnStatus } from '@prisma/client'

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus })
  @IsEnum(ReturnStatus)
  status: ReturnStatus

  @ApiPropertyOptional({ description: 'Optional moderation note (e.g. reason for rejection)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
