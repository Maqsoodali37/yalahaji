import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrderStatus } from '@prisma/client'

export class BulkStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one order' })
  // A ceiling keeps a single request from trying to move the whole table in
  // one transaction.
  @ArrayMaxSize(200, { message: 'A bulk action is limited to 200 orders at a time' })
  @IsString({ each: true })
  ids: string[]

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
