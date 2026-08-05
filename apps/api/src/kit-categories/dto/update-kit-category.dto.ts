import { PartialType } from '@nestjs/swagger'
import { CreateKitCategoryDto } from './create-kit-category.dto'

/**
 * `PartialType()` rather than `Partial<>`: the TypeScript utility is erased at
 * compile time, leaving `ValidationPipe` with no metadata to read. With
 * `whitelist` inactive on that body every property would pass through
 * unchecked — the same trap documented on `UpdateAddressDto`.
 */
export class UpdateKitCategoryDto extends PartialType(CreateKitCategoryDto) {}
