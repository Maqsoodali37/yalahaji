import { PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CreateProductDto } from './create-product.dto'

/**
 * Everything on CreateProductDto is optional here, plus `isActive` so the
 * admin dashboard can archive/restore a product from the edit form.
 *
 * `variants` are synced by SKU (upsert + prune); `images` and `sizeGuide`
 * are replaced wholesale when provided.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}
