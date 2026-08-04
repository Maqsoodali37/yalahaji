import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ description: 'Phone number or email' })
  @IsString()
  identifier: string

  @ApiProperty() @IsString() @MinLength(6)
  password: string
}
