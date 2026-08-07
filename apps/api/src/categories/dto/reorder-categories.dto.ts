import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsString, IsOptional, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

/**
 * One row's new position after a drag-and-drop move.
 *
 * `parentId: null` means "moved to root" — distinct from omitting the field,
 * which would leave the existing parent untouched. The tree UI always sends
 * every sibling in whichever group(s) changed (the old parent's remaining
 * children and the new parent's children), not just the row that was dragged,
 * so `order` stays a dense 0..n-1 sequence on both sides of the move.
 */
class ReorderItemDto {
  @ApiProperty() @IsString() id: string
  @ApiProperty({ nullable: true, type: String }) @IsOptional() @IsString() parentId?: string | null
  @ApiProperty() @IsInt() @Min(0) order: number
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Nothing to reorder' })
  // A single drag gesture touches at most one or two sibling groups; a much
  // larger batch is more likely a client bug replaying the whole tree.
  @ArrayMaxSize(500, { message: 'Too many rows in one reorder request' })
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[]
}
