import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string
  @ApiProperty() @IsString() fullName: string
  @ApiProperty() @IsString() phone: string
  @ApiProperty() @IsString() addressLine1: string
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string
  @ApiProperty() @IsString() city: string
  @ApiProperty() @IsString() province: string
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean
}
