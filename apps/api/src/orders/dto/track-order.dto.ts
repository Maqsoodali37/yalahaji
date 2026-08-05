import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class TrackOrderDto {
  @ApiProperty({
    description: 'The email or phone number the order was placed with.',
    example: 'buyer@example.com',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contact: string
}
