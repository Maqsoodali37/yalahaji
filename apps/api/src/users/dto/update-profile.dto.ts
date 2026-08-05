import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { MAX_NAME } from '../../common/validation'

export class UpdateProfileDto {
  /**
   * `@IsOptional()` skips the remaining rules only when the key is absent or
   * null — a supplied `""` still runs them. `@MinLength(2)` is therefore what
   * stops a customer blanking their own name and turning into an unnamed row
   * on every order they have ever placed.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(MAX_NAME)
  name?: string

  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string
}
