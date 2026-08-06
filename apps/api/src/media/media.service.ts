import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
// Namespace import, matching Minio above and NOT `import sharp from 'sharp'`.
//
// sharp declares `export = sharp`, and this project sets
// `allowSyntheticDefaultImports` WITHOUT `esModuleInterop` — a types-only flag
// with no runtime helper behind it. A default import therefore compiles to
// `sharp_1.default`, which is `undefined` at runtime, so every call threw
// "sharp_1.default is not a function" and no upload ever succeeded.
import * as sharp from 'sharp'
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
 * Types we are willing to accept. Everything is re-encoded to WebP, so this is
 * about refusing non-images early rather than about what we store — an SVG in
 * particular is a script-execution vector and sharp will happily rasterise one.
 *
 * These three are present in every libvips build; not worth probing for.
 */
const UNIVERSAL_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * A 2×2 AVIF, used to ask libvips whether it can really decode one.
 *
 * `sharp.format` cannot answer this. Both AVIF and HEIC load through the
 * single `heif` entry, which reports `input: true` whenever libheif is present
 * — but AVIF needs an AV1 codec and HEIC needs HEVC, and builds routinely ship
 * one without the other. On the build this was written against, `heif` claims
 * input support, AVIF decodes, and HEIC cannot even be encoded.
 *
 * Trusting the table would advertise HEIC and reject every HEIC uploaded, and
 * the person would be looking at a photo that opens fine on their own machine.
 * Decoding a known-good sample is the only answer that cannot be wrong.
 */
const AVIF_PROBE = Buffer.from(
  'AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAFQAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4EgAgAAAAAUaXNwZQAAAAAAAAACAAAAAgAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAAB1tZGF0EgAKBzgANhAQ0GkyCB+QAABAAK/u',
  'base64',
)

/** Mirrors the `fileSize` limit registered on @fastify/multipart in main.ts. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Render a MIME list as something to show a person: "JPEG, PNG, WebP". */
function labelFor(mimes: readonly string[]): string {
  const pretty: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
  }
  return mimes.map((m) => pretty[m] ?? m.replace('image/', '').toUpperCase()).join(', ')
}

/**
 * Identify a file by its leading bytes.
 *
 * A browser sets `File.type` from the filename extension, not the contents, so
 * a HEIC straight off an iPhone that someone renamed to `.jpeg` arrives
 * claiming `image/jpeg`. When sharp then refuses it, "that file could not be
 * read as an image" is true but useless — the file looks fine in Preview. This
 * exists so the error can say what the file actually is.
 */
export function sniffImageFormat(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase()
  const ascii = buffer.subarray(0, 12).toString('latin1')

  if (hex.startsWith('ffd8ff')) return 'JPEG'
  if (hex.startsWith('89504e470d0a1a0a')) return 'PNG'
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'GIF'
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'WebP'
  if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a')) return 'TIFF'
  if (ascii.startsWith('BM')) return 'BMP'
  if (ascii.startsWith('%PDF')) return 'PDF'
  if (ascii.trimStart().startsWith('<svg') || ascii.startsWith('<?xml')) return 'SVG'

  // ISO base media container: `ftyp` at offset 4, brand at 8.
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12)
    if (brand.startsWith('avi')) return 'AVIF'
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'HEIC'
    return 'MP4/ISO-BMFF video'
  }

  return null
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name)
  private readonly minio: Minio.Client
  private readonly bucket: string

  /**
   * Settled in onModuleInit, before the first request is served.
   *
   * Deliberately not a module-level constant: deciding it needs an async
   * decode, and a top-level `await` or a floating promise would leave the list
   * briefly wrong — which is the exact class of bug this probe exists to stop.
   *
   * HEIC is absent even where it decodes. It is the format most often
   * mislabelled — iPhones produce it, and renaming one to `.jpeg` changes only
   * the name — so accepting it on the containers whose libvips has HEVC and
   * refusing it on those without would make the same upload succeed or fail
   * depending on which replica answered. Asking for a JPEG export is kinder
   * than that lottery.
   */
  private acceptedMime: string[] = [...UNIVERSAL_UPLOAD_MIME]

  async onModuleInit() {
    try {
      await sharp(AVIF_PROBE).metadata()
      this.acceptedMime = [...UNIVERSAL_UPLOAD_MIME, 'image/avif']
    } catch {
      // No AV1 decoder in this libvips build; AVIF simply is not offered.
      this.logger.log('AVIF decoding unavailable in this build — not offering it.')
    }
  }

  /** MIME types this instance will accept, proven by decode rather than assumed. */
  get allowedMime(): readonly string[] {
    return this.acceptedMime
  }

  /** The same list, for error messages and the admin hint. */
  get allowedLabel(): string {
    return labelFor(this.acceptedMime)
  }

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

  /**
   * Turn a decode failure into something the person can act on.
   *
   * The three cases differ in what the fix is: convert the file, re-export it,
   * or pick a different one. A single generic message makes all three look
   * like the same unexplained rejection.
   */
  private describeDecodeFailure(actual: string | null): string {
    if (!actual) {
      return 'That file could not be read as an image. It may be corrupt or incompletely downloaded — try opening it and re-exporting as JPEG or PNG.'
    }

    const supported = this.acceptedMime.some(
      (mime) => mime.replace('image/', '').toUpperCase() === actual.toUpperCase(),
    )

    if (!supported) {
      const article = /^[AEIOU]/i.test(actual) ? 'an' : 'a'
      return `This file is ${article} ${actual}, whatever its name says, and this server cannot read ${actual}. Convert it and upload again. Accepted: ${this.allowedLabel}.`
    }

    // Right format, still unreadable — truncation or genuine corruption.
    return `This ${actual} file is damaged and could not be read. Try opening it and re-exporting it.`
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
    } catch (err) {
      // sharp is the real gate: the declared MIME type came from the browser
      // and is not evidence of what the bytes are. But "could not be read as
      // an image" on its own is a dead end for whoever hit it, so identify the
      // file and keep sharp's own reason in the log.
      const actual = sniffImageFormat(buffer)
      this.logger.warn(
        `Rejected upload: sniffed=${actual ?? 'unrecognised'} bytes=${buffer.length} sharp="${
          err instanceof Error ? err.message : String(err)
        }"`,
      )
      throw new BadRequestException(this.describeDecodeFailure(actual))
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
