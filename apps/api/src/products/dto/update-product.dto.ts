import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateProductDto } from './create-product.dto'

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['slug', 'sku', 'variants', 'images', 'sizeGuide'] as const),
) {}
