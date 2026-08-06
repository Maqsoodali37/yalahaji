import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateTrackingDto {
  @ApiProperty({ description: 'Courier tracking number to record on the order' })
  @IsString()
  // `@IsString()` alone accepts "" — a blank tracking number is not an
  // assignment, it is a clear, which has its own affordance in the UI.
  @IsNotEmpty({ message: 'A tracking number is required' })
  @MaxLength(80)
  trackingNumber: string
}
