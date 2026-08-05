import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import {
  PAKISTANI_PHONE_REGEX,
  PAKISTANI_PHONE_MESSAGE,
  MAX_NAME,
} from '../../common/validation'

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(MAX_NAME)
  name: string

  @ApiProperty() @IsString() @Matches(PAKISTANI_PHONE_REGEX, { message: PAKISTANI_PHONE_MESSAGE })
  phone: string

  @ApiProperty({ required: false }) @IsOptional() @IsEmail()
  email?: string

  @ApiProperty() @IsString() @MinLength(8)
  password: string
}
