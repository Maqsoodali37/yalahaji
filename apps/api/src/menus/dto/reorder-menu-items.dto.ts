import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * One row's new position after a drag-and-drop move, mirroring
 * `ReorderCategoriesDto`.
 *
 * `parentId: null` means "moved to the top level" — distinct from omitting
 * the field, which leaves the existing parent untouched.
 */
class ReorderMenuItemDto {
  // `@IsString()` alone accepts `""`, which reaches the service and comes
  // back as `Unknown menu item id(s): ` — a message naming nothing.
  @ApiProperty() @IsString() @IsNotEmpty() id: string
  // `@IsOptional()` only skips null/undefined, so without `@IsNotEmpty()` an
  // empty string passes, is falsy enough to skip every parent check, and then
  // lands in `menu_items.parent_id` as a foreign key to nothing — a raw
  // Prisma P2003 500 rather than a 400 the caller can act on.
  @ApiProperty({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parentId?: string | null
  @ApiProperty() @IsInt() @Min(0) order: number
}

export class ReorderMenuItemsDto {
  @ApiProperty({ type: [ReorderMenuItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Nothing to reorder' })
  @ArrayMaxSize(500, { message: 'Too many rows in one reorder request' })
  @ValidateNested({ each: true })
  @Type(() => ReorderMenuItemDto)
  items: ReorderMenuItemDto[]
}
