import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { DatabaseService } from '../../database/database.service'
import { verifyPassword } from '../../database/password'

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
  constructor(private readonly databaseService: DatabaseService) {}

  async login(email: string, password: string): Promise<AuthSession> {
    if (!email || !password) {
      throw new BadRequestException('Email y password son obligatorios')
    }

    const user = await this.databaseService.getUserByEmail(email)

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const accessToken = await this.databaseService.createSession(user.id)

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
    }
  }

  async getUserFromAccessToken(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException('Sesión no encontrada')
    }

    const user = await this.databaseService.getUserBySessionToken(accessToken)

    if (!user) {
      throw new UnauthorizedException('Sesión no válida o caducada')
    }

    return user
  }
}
