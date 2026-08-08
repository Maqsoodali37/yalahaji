import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateMenuItemDto } from './create-menu-item.dto'

/**
 * `PartialType()`, never `Partial<>` — the TypeScript utility is erased at
 * compile time, which leaves the ValidationPipe no metadata, stops
 * whitelisting applying, and lets every field through unchecked.
 *
 * `menuId` is omitted: moving an item between menus would have to re-parent
 * its whole subtree at the same time, and silently leaving children behind in
 * the old menu is the failure that would actually happen. Delete and recreate
 * instead.
 */
export class UpdateMenuItemDto extends PartialType(
  OmitType(CreateMenuItemDto, ['menuId'] as const),
) {}
