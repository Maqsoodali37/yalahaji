import { PartialType } from '@nestjs/swagger'
import { CreateCategoryDto } from './create-category.dto'

/** See UpdateAddressDto — `Partial<T>` is erased at compile time, so
 *  ValidationPipe skips the body entirely. PartialType() emits a real class. */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
