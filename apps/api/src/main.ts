import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  const port = Number(process.env.PORT ?? 3000)
  console.log(
    `CORS origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'allow all (no CORS_ORIGINS set)'}`,
  )
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
}

void bootstrap()
