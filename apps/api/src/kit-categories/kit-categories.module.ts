import { Module } from '@nestjs/common'
import { KitCategoriesService } from './kit-categories.service'
import { KitCategoriesController } from './kit-categories.controller'

@Module({
  providers: [KitCategoriesService],
  controllers: [KitCategoriesController],
  exports: [KitCategoriesService],
})
export class KitCategoriesModule {}
