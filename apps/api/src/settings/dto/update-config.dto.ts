import { OmitType, PartialType } from '@nestjs/swagger'
import { CreateConfigDto } from './create-config.dto'

/**
 * `key` is omitted: it is the primary key and the identifier in the URL, so
 * accepting it in the body would offer a rename this endpoint does not
 * perform — the update would appear to succeed and change nothing.
 *
 * `PartialType()` rather than `Partial<>`, which TypeScript erases — leaving
 * `ValidationPipe` no metadata and letting every field through unchecked.
 */
export class UpdateConfigDto extends PartialType(OmitType(CreateConfigDto, ['key'] as const)) {}
