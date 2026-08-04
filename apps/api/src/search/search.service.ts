import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import MeiliSearch from 'meilisearch'

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly client: MeiliSearch
  private readonly INDEX = 'products'

  constructor(private readonly config: ConfigService) {
    this.client = new MeiliSearch({
      host: config.get('MEILISEARCH_URL', 'http://localhost:7700'),
      apiKey: config.get('MEILISEARCH_KEY', ''),
    })
  }

  async onModuleInit() {
    try {
      const index = this.client.index(this.INDEX)
      await index.updateSettings({
        searchableAttributes: ['nameEn', 'nameUr', 'nameAr', 'shortDescEn', 'tags'],
        filterableAttributes: ['categorySlug', 'tier', 'inStock', 'avgRating'],
        sortableAttributes: ['avgRating', 'soldCount', 'createdAt'],
        displayedAttributes: ['id', 'slug', 'nameEn', 'nameUr', 'nameAr', 'shortDescEn', 'image', 'price', 'compareAtPrice', 'avgRating', 'tier', 'inStock', 'categorySlug'],
      })
    } catch {
      // MeiliSearch may not be running in dev — non-fatal
    }
  }

  async indexProduct(product: Record<string, any>) {
    await this.client.index(this.INDEX).addDocuments([product])
  }

  async deleteProduct(id: string) {
    await this.client.index(this.INDEX).deleteDocument(id)
  }

  async search(q: string, filters?: string, sort?: string[], page = 1, limit = 20) {
    const result = await this.client.index(this.INDEX).search(q, {
      filter: filters,
      sort,
      limit,
      offset: (page - 1) * limit,
    })
    return result
  }
}
