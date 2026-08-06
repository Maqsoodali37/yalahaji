import {
  Controller,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { ApiTags, ApiCookieAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger'
import { MediaService, MAX_UPLOAD_BYTES } from './media.service'
import { DeleteMediaDto } from './dto/delete-media.dto'
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles, STAFF_MANAGE } from '../auth/roles.decorator'

const TOO_LARGE_MESSAGE = `Image must be ${Math.floor(
  MAX_UPLOAD_BYTES / 1024 / 1024,
)} MB or smaller.`

@ApiTags('media')
@Controller('media')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(...STAFF_MANAGE)
@ApiCookieAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (multipart/form-data, field name: file)' })
  async upload(@Req() req: any) {
    // Requires @fastify/multipart registered in main.ts
    const data = await req.file()
    if (!data) throw new BadRequestException('No file uploaded.')

    // A cheap first pass only. `File.type` comes from the filename extension,
    // so this catches an honestly-named .pdf but not a HEIC renamed to .jpeg —
    // sharp is what actually decides, and it explains itself when it refuses.
    if (!this.mediaService.allowedMime.includes(data.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type. Accepted: ${this.mediaService.allowedLabel}.`,
      )
    }

    // Rejected rather than sanitised — see MEDIA_FOLDERS.
    const folder = this.mediaService.resolveFolder(data.fields?.folder?.value)

    let buffer: Buffer
    try {
      buffer = await data.toBuffer()
    } catch (err: any) {
      // @fastify/multipart aborts the stream once `limits.fileSize` is passed.
      // Unhandled, that surfaces as a 500, which reads to staff as "the server
      // is broken" rather than "your photo is too big".
      if (err?.code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new PayloadTooLargeException(TOO_LARGE_MESSAGE)
      }
      throw err
    }

    // Belt and braces: depending on the `throwFileSizeLimit` setting the
    // stream may be truncated silently instead of throwing, and a half-read
    // JPEG would otherwise be stored as a corrupt product image.
    if (data.file?.truncated) {
      throw new PayloadTooLargeException(TOO_LARGE_MESSAGE)
    }

    const url = await this.mediaService.upload(buffer, folder)
    return { url }
  }

  @Delete()
  @ApiOperation({ summary: 'Delete an uploaded image by URL' })
  async delete(@Body() dto: DeleteMediaDto) {
    return this.mediaService.delete(dto.url)
  }
}
