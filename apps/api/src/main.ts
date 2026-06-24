import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const app = await NestFactory.create(AppModule, {
    cors: allowedOrigins.length > 0 ? { origin: allowedOrigins, credentials: true } : true,
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
}

void bootstrap()
