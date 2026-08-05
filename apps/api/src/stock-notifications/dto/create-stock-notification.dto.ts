import { IsString, IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStockNotificationDto {
  @ApiProperty() @IsString() productId: string
  @ApiProperty() @IsEmail() email: string
}
