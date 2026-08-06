import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

/**
 * Folders callers may upload into.
 *
 * An allowlist rather than a sanitiser: the value arrives from a multipart
 * form field and is concatenated straight into the object key, so `../` or an
 * absolute-looking path would let a caller write outside the intended prefix
 * — including over the bucket policy's read-only assumptions.
 */
export const MEDIA_FOLDERS = ['products', 'categories', 'blog', 'banners'] as const
export type MediaFolder = (typeof MEDIA_FOLDERS)[number]

/**
 * Accepted upload types. Everything is re-encoded to WebP by sharp, so this
 * list is about refusing non-images early rather than about what we store —
 * an SVG in particular is a script-execution vector and sharp will happily
 * rasterise one.
 */
export const ALLOWED_UPLOAD_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

/** Mirrors the `fileSize` limit registered on @fastify/multipart in main.ts. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

@Injectable()
export class MediaService {
  private readonly minio: Minio.Client
  private readonly bucket: string

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'yalahaji'
    this.minio = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port: parseInt(this.config.get<string>('MINIO_PORT') ?? '9000', 10),
      useSSL: (this.config.get<string>('MINIO_USE_SSL') ?? 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
    })
  }

  private get publicBase(): string {
    return (
      this.config.get<string>('MINIO_PUBLIC_URL') ??
      `http://localhost:9000/${this.bucket}`
    )
  }

  /** Narrows an untrusted folder field to a known prefix. */
  resolveFolder(value: unknown): MediaFolder {
    if (value === undefined || value === null || value === '') return 'products'
    if (!MEDIA_FOLDERS.includes(value as MediaFolder)) {
      throw new BadRequestException(
        `folder must be one of: ${MEDIA_FOLDERS.join(', ')}`,
      )
    }
    return value as MediaFolder
  }

  async upload(buffer: Buffer, folder: MediaFolder = 'products'): Promise<string> {
    if (buffer.length === 0) {
      throw new BadRequestException('The uploaded file is empty.')
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `Image must be ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`,
      )
    }

    await this.ensureBucket()

    const key = `${folder}/${randomUUID()}.webp`

    let optimised: Buffer
    try {
      optimised = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    } catch {
      // sharp throws on anything it cannot decode. The declared MIME type came
      // from the browser and is not evidence of what the bytes actually are,
      // so this is the check that decides whether a file is really an image.
      throw new BadRequestException('That file could not be read as an image.')
    }

    await this.minio.putObject(this.bucket, key, optimised, optimised.length, {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000',
    })

    return `${this.publicBase}/${key}`
  }

  async delete(url: string) {
    // Only ever delete objects we know we wrote. Without the prefix check a
    // caller could pass any string and have it treated as a bucket key, and
    // `replace` would silently leave a foreign URL intact to be deleted whole.
    const prefix = `${this.publicBase}/`
    if (typeof url !== 'string' || !url.startsWith(prefix)) {
      throw new BadRequestException('Not a media URL managed by this store.')
    }

    const key = url.slice(prefix.length)
    const folder = key.split('/')[0]
    if (!key || key.includes('..') || !MEDIA_FOLDERS.includes(folder as MediaFolder)) {
      throw new BadRequestException('Not a media URL managed by this store.')
    }

    await this.minio.removeObject(this.bucket, key)
    return { deleted: key }
  }

  async ensureBucket() {
    const exists = await this.minio.bucketExists(this.bucket)
    if (!exists) {
      await this.minio.makeBucket(this.bucket, 'us-east-1')
      await this.minio.setBucketPolicy(
        this.bucket,
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      )
    }
  }
}
