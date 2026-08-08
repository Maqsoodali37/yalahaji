import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MenuLinkType, MenuVisibility, MenuDevice, MegaMenuLayout } from '@prisma/client'
import { SLUG_REGEX, SLUG_MESSAGE } from '../../common/validation'
import { MAX_MENU_URL } from '../menu-constants'

/**
 * A class with decorators, not an inline type literal — the global
 * ValidationPipe has no metadata to work from otherwise and silently
 * validates nothing. `@IsString()` alone accepts `""`, so every required
 * string here also carries `@IsNotEmpty()`.
 */
export class CreateMenuItemDto {
  @ApiProperty({ description: 'Menu this item belongs to.' })
  @IsString()
  @IsNotEmpty()
  menuId: string

  // `@IsNotEmpty()` alongside `@IsOptional()`: the latter skips null and
  // undefined, so `""` would otherwise pass and reach `menu_items.parent_id`
  // as a foreign key to nothing.
  @ApiPropertyOptional({ description: 'Parent item. Omit or null for a top-level entry.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parentId?: string | null

  // English is the only title the storefront cannot fall back from; Urdu and
  // Arabic are optional and fall back to English at the adapter rather than
  // blocking staff from saving an item they have not had translated yet.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  titleEn: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) titleUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) titleAr?: string

  @ApiProperty({ enum: MenuLinkType })
  @IsEnum(MenuLinkType)
  linkType: MenuLinkType

  /**
   * Required for the five slug-routed link types. `ValidateIf` rather than a
   * blanket `@IsOptional()`: an item saved as `linkType: 'category'` with no
   * slug renders an anchor pointing at `/shop/undefined`, which is a 404 the
   * admin has no way to see from the form.
   */
  @ApiPropertyOptional({ description: 'Target slug. Required for category/product/cms_page/brand/collection.' })
  @ValidateIf((o: CreateMenuItemDto) =>
    o.linkType !== MenuLinkType.custom &&
    o.linkType !== MenuLinkType.external &&
    o.linkType !== MenuLinkType.heading,
  )
  @IsString()
  @IsNotEmpty({ message: 'A target slug is required for this link type.' })
  @MaxLength(191)
  @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
  targetSlug?: string

  @ApiPropertyOptional({ description: 'Advisory only — never used to build a href.' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  targetId?: string

  /**
   * Internal path for `custom`, absolute http(s) URL for `external`.
   *
   * The shape check is NOT a decorator pair here. Two `@ValidateIf`s on one
   * property are ANDed by class-validator, so
   * `linkType === custom` AND `linkType === external` is never true and the
   * field would go completely unvalidated — the exact silent-no-op this
   * codebase has already been bitten by twice. `assertLinkTarget()` in
   * menus.service.ts does the cross-field check instead, where it can be
   * tested and where both create and update go through it.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MENU_URL)
  url?: string

  @ApiPropertyOptional({ description: 'Lucide icon name, resolved against a storefront allowlist.' })
  @IsOptional() @IsString() @MaxLength(191) icon?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) image?: string

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) badgeEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) badgeUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) badgeAr?: string

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean

  @ApiPropertyOptional({ enum: MenuVisibility })
  @IsOptional() @IsEnum(MenuVisibility) visibility?: MenuVisibility

  @ApiPropertyOptional({ enum: MenuDevice })
  @IsOptional() @IsEnum(MenuDevice) device?: MenuDevice

  @ApiPropertyOptional({ description: 'ISO date. Item is hidden before this instant.' })
  @IsOptional() @IsDateString() publishFrom?: string

  @ApiPropertyOptional({ description: 'ISO date. Item is hidden from this instant.' })
  @IsOptional() @IsDateString() publishUntil?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMegaMenu?: boolean

  @ApiPropertyOptional({ enum: MegaMenuLayout })
  @IsOptional() @IsEnum(MegaMenuLayout) megaLayout?: MegaMenuLayout

  // Capped at 6: past that the panel is wider than the container on a 1280px
  // screen and the columns collapse to unreadable slivers.
  @ApiPropertyOptional({ minimum: 1, maximum: 6 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(6) megaColumns?: number

  @ApiPropertyOptional({ description: 'Featured products, banner and content blocks. Shape depends on megaLayout.' })
  @IsOptional() @IsObject() megaConfig?: Record<string, unknown>

  @ApiPropertyOptional({ description: "Extra rel tokens, e.g. 'sponsored'. nofollow/noopener are added by the API." })
  @IsOptional() @IsString() @MaxLength(191) relAttribute?: string

  @ApiPropertyOptional() @IsOptional() @IsBoolean() noFollow?: boolean
  @ApiPropertyOptional() @IsOptional() @IsBoolean() openInNewTab?: boolean

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) titleAttrEn?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) titleAttrUr?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) titleAttrAr?: string
}
