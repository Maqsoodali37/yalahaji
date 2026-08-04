import { Controller, Post, Delete, Body, Req, UseGuards, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger'
import { MediaService } from './media.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (multipart/form-data, field name: file)' })
  async upload(@Req() req: any) {
    // Requires @fastify/multipart registered in main.ts
    const data = await req.file()
    if (!data) throw new BadRequestException('No file uploaded.')

    const buffer = await data.toBuffer()
    const folder = (data.fields?.folder?.value as string) ?? 'products'

    const url = await this.mediaService.upload(buffer, folder)
    return { url }
  }

  @Delete()
  @ApiOperation({ summary: 'Delete an uploaded image by URL' })
  async delete(@Body('url') url: string) {
    return this.mediaService.delete(url)
  }
}
