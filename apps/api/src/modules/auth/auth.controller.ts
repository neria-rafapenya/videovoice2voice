import { Body, Controller, Get, Headers, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.getUserFromAccessToken(extractAccessToken(authorization))
  }
}

function extractAccessToken(authorization?: string) {
  if (!authorization) {
    return ''
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}
