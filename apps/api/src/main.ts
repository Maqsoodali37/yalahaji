import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

/**
 * Refuse to start in production with placeholder secrets, and refuse to let
 * the admin and customer secrets be the same value — sharing them would undo
 * the separation between the two trust domains.
 */
function assertSecrets() {
  const jwt = process.env.JWT_SECRET
  const adminJwt = process.env.ADMIN_JWT_SECRET
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    if (!jwt || jwt.includes('change-me')) {
      throw new Error('JWT_SECRET must be set to a real value in production.')
    }
    if (!adminJwt || adminJwt.includes('CHANGE-ME') || adminJwt.includes('change-me')) {
      throw new Error('ADMIN_JWT_SECRET must be set to a real value in production.')
    }
  }

  if (jwt && adminJwt && jwt === adminJwt) {
    throw new Error(
      'ADMIN_JWT_SECRET must differ from JWT_SECRET — reusing it would let a ' +
        'customer token authenticate against admin routes.',
    )
  }
}

async function bootstrap() {
  assertSecrets()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  // Multipart uploads (media module)
  await app.register(require('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  })

  // Cookies — carries the httpOnly admin session. Signing is not needed: the
  // value is a JWT that is already signed and server-side revocable.
  await app.register(require('@fastify/cookie'))

  // Global prefix & versioning
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // CORS — strict allowlist. `credentials: true` is what lets the admin
  // cookie travel, so the origin list must never become a wildcard.
  app.enableCors({
    origin: [
      process.env.STOREFRONT_URL ?? 'http://localhost:3000',
      process.env.ADMIN_URL ?? 'http://localhost:3001',
    ],
    credentials: true,
  })

  // Swagger — enabled unless explicitly disabled
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Yala Haji API')
      .setDescription('Hajj & Umrah e-commerce REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('yh_admin_session')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = process.env.PORT ?? 4000
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 Yala Haji API running on http://0.0.0.0:${port}/api/v1`)
}

bootstrap()
