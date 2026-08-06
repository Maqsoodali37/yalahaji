import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MAX_MEDIA_URL } from '../../common/validation'

/**
 * A class, not an inline `@Body('url') url: string`.
 *
 * The global ValidationPipe only runs against decorated classes — an inline
 * parameter type is erased at compile time, so the previous signature reached
 * `removeObject` with whatever the caller sent, including `undefined`.
 */
export class DeleteMediaDto {
  @ApiProperty({ description: 'Full public URL of the object to remove.' })
  @IsString()
  @IsNotEmpty({ message: 'url is required.' })
  @MaxLength(MAX_MEDIA_URL)
  url: string
}
