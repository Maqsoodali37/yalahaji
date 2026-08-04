import { Module } from '@nestjs/common'
import { VariantsService } from './variants.service'
import { VariantsController } from './variants.controller'

@Module({
  providers: [VariantsService],
  controllers: [VariantsController],
})
export class VariantsModule {}
