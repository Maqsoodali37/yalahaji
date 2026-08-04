import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

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

  async upload(buffer: Buffer, folder = 'products'): Promise<string> {
    await this.ensureBucket()

    const key = `${folder}/${randomUUID()}.webp`

    const optimised = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    await this.minio.putObject(this.bucket, key, optimised, optimised.length, {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000',
    })

    return `${this.publicBase}/${key}`
  }

  async delete(url: string) {
    const key = url.replace(`${this.publicBase}/`, '')
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
