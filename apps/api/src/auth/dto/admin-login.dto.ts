import { IsString, MinLength, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AdminLoginDto {
  @ApiProperty({ description: 'Staff phone number or email' })
  @IsString()
  @IsNotEmpty({ message: 'Enter your phone number or email' })
  @MaxLength(255)
  identifier: string

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string
}
