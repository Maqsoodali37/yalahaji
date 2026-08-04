import { IsString, IsOptional, IsEmail, MinLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2)
  name: string

  @ApiProperty() @Matches(/^\+92[0-9]{10}$/, { message: 'Phone must be a valid Pakistani number (+92XXXXXXXXXX)' })
  phone: string

  @ApiProperty({ required: false }) @IsOptional() @IsEmail()
  email?: string

  @ApiProperty() @IsString() @MinLength(8)
  password: string
}
