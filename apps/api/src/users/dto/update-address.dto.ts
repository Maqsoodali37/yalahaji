import { PartialType } from '@nestjs/swagger'
import { CreateAddressDto } from './create-address.dto'

/**
 * `Partial<CreateAddressDto>` is a *type-level* construct — it is erased at
 * compile time, so the metadata `ValidationPipe` reads is never emitted and
 * the pipe skips the body entirely. With `whitelist` inactive on that body, a
 * caller could send `userId` and move their address onto another account.
 *
 * `PartialType()` builds a real class with the parent's decorators copied and
 * each property marked optional, so validation and whitelisting both apply.
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
