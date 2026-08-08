import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateMenuDto } from './create-menu.dto'

/**
 * `location` is omitted — it is UNIQUE, so changing it either collides with
 * the menu already at the destination or silently empties the location this
 * menu was serving. Both are worse than "create the other menu and delete
 * this one".
 */
export class UpdateMenuDto extends PartialType(
  OmitType(CreateMenuDto, ['location'] as const),
) {}
