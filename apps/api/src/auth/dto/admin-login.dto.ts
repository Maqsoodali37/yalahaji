import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AdminLoginDto {
  @ApiProperty({ description: 'Staff phone number or email' })
  @IsString()
  identifier: string

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string
}
