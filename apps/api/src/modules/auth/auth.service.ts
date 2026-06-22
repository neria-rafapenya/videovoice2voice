import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

type AuthUser = {
  id: string
  email: string
}

type AuthSession = {
  accessToken: string
  user: AuthUser
}

@Injectable()
export class AuthService {
  private readonly demoEmail = process.env.DEMO_USER_EMAIL ?? 'demo@app.com'
  private readonly demoPassword = process.env.DEMO_USER_PASSWORD ?? 'demo-demo-demo'

  login(email: string, password: string): AuthSession {
    if (!email || !password) {
      throw new BadRequestException('Email y password son obligatorios')
    }

    if (email !== this.demoEmail || password !== this.demoPassword) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    return {
      accessToken: randomUUID(),
      user: {
        id: 'user_demo_1',
        email: this.demoEmail,
      },
    }
  }
}
