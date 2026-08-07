import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export const CATEGORY_BULK_ACTIONS = ['enable', 'disable', 'delete'] as const
export type CategoryBulkAction = (typeof CATEGORY_BULK_ACTIONS)[number]

export class BulkCategoryActionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one category' })
  @ArrayMaxSize(200, { message: 'A bulk action is limited to 200 categories at a time' })
  @IsString({ each: true })
  ids: string[]

  @ApiProperty({ enum: CATEGORY_BULK_ACTIONS })
  @IsIn(CATEGORY_BULK_ACTIONS)
  action: CategoryBulkAction
}
