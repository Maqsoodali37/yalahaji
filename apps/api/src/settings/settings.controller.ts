import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SettingsService } from './settings.service'

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Storefront settings (shipping thresholds, currency)' })
  findPublic() {
    return this.settingsService.findPublic()
  }
}
