import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MAX_RETURN_REASON } from '../../common/validation'

export class CreateReturnDto {
  @ApiProperty() @IsUUID() orderId: string

  @ApiProperty({ description: 'Why the customer is returning the order' })
  @IsString()
  @IsNotEmpty({ message: 'A reason is required' })
  @MinLength(3)
  @MaxLength(MAX_RETURN_REASON)
  reason: string

  @ApiPropertyOptional({ description: 'Free-text detail from the customer' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_RETURN_REASON)
  note?: string

  @ApiPropertyOptional({ type: [String], description: 'Photos of the issue' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[]
}
