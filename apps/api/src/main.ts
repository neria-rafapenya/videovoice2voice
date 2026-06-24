import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

type RequestLike = {
  method: string
  originalUrl: string
  headers: {
    origin?: string
  }
}

type ResponseLike = unknown
type NextLike = () => void

async function bootstrap() {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const app = await NestFactory.create(AppModule)
  app.use((req: RequestLike, _res: ResponseLike, next: NextLike) => {
    if (req.method === 'OPTIONS' || req.method === 'POST') {
      console.log(`Request ${req.method} ${req.originalUrl} origin=${req.headers.origin ?? 'none'}`)
    }
    next()
  })
  app.enableCors({
    origin: true,
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
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
    `Boot config: PORT=${process.env.PORT ?? 'unset'} CORS origins=${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'allow all (no CORS_ORIGINS set)'}`,
  )
  await app.listen(port, '0.0.0.0')
  console.log(`API running on 0.0.0.0:${port}/api`)
}

void bootstrap()
