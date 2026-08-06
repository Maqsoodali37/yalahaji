import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * `YH-<year>-<sequence>-<token>`, e.g. `YH-2026-1001-K7QX9M`.
 *
 * The token is Crockford Base32 (no `I`, `L`, `O` or `U`), which is why the
 * character class is not a plain `[A-Z0-9]` — accepting the excluded letters
 * would let a typo through to a lookup that can only ever miss.
 *
 * The sequence is `{4,}` rather than `{4}` so the pattern survives the year
 * order 10000 is placed.
 */
export const ORDER_NUMBER_REGEX = /^YH-\d{4}-\d{4,}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/

export const ORDER_NUMBER_MESSAGE =
  'Enter the full order number from your confirmation, e.g. YH-2026-1001-K7QX9M.'

export class TrackOrderDto {
  @ApiProperty({
    description: 'The full order number, including the code after the last dash.',
    example: 'YH-2026-1001-K7QX9M',
  })
  // Customers paste from WhatsApp and type in lower case. Normalising here
  // rather than in the service means the regex below judges the same string
  // the lookup will use, so " yh-2026-1001-k7qx9m " is accepted rather than
  // rejected as malformed.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(ORDER_NUMBER_REGEX, { message: ORDER_NUMBER_MESSAGE })
  number: string
}
