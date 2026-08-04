import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SearchService } from './search.service'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Full-text product search via MeiliSearch' })
  search(
    @Query('q') q = '',
    @Query('filter') filter?: string,
    @Query('sort') sort?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const sortArr = sort ? sort.split(',') : undefined
    return this.searchService.search(q, filter, sortArr, +page, +limit)
  }
}
