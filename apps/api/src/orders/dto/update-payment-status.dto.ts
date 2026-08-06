import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentStatus } from '@prisma/client'

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus

  @ApiPropertyOptional({ description: 'Optional note added to the order timeline' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
