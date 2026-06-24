import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

type CorsRequest = {
  method: string
  headers: {
    origin?: string
    'access-control-request-headers'?: string
  }
}

type CorsResponse = {
  header(name: string, value: string): void
  sendStatus(status: number): void
}

type CorsNextFunction = () => void

async function bootstrap() {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const app = await NestFactory.create(AppModule)
  app.use((req: CorsRequest, res: CorsResponse, next: CorsNextFunction) => {
    const origin = req.headers.origin
    const isAllowed =
      allowedOrigins.length === 0 || (origin ? allowedOrigins.includes(origin) : false)

    if (origin && isAllowed) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Vary', 'Origin')
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
      res.header(
        'Access-Control-Allow-Headers',
        req.headers['access-control-request-headers'] ?? 'Content-Type, Authorization',
      )
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }

    next()
  })
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
