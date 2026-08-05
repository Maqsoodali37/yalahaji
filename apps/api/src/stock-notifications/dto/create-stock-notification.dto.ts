import { IsEmail, IsUUID, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStockNotificationDto {
  @ApiProperty() @IsUUID() productId: string
  @ApiProperty() @IsEmail() @MaxLength(255) email: string
}
