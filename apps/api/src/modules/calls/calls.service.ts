import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { DatabaseService } from '../../database/database.service'
import { LivekitService } from '../livekit/livekit.service'

@Injectable()
export class CallsService {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly databaseService: DatabaseService,
  ) {}

  async createCall(accessToken: string) {
    const user = await this.requireUser(accessToken)
    const call = await this.databaseService.createCall(user.id)

    return {
      callId: call.callId,
      roomName: call.roomName,
      owner: {
        id: user.id,
        email: user.email,
      },
    }
  }

  async getLiveKitToken(accessToken: string, callId: string, participantId: string, participantName: string) {
    await this.requireUser(accessToken)
    const call = await this.databaseService.getCallById(callId)

    if (!call) {
      throw new NotFoundException('La llamada no existe')
    }

    return this.livekitService.createToken(call.room_name, participantId, participantName)
  }

  async startTranslation(
    accessToken: string,
    callId: string,
    sourceLanguage: 'es' | 'en',
    targetLanguage: 'es' | 'en',
  ) {
    await this.requireUser(accessToken)
    const call = await this.databaseService.getCallById(callId)

    if (!call) {
      throw new NotFoundException('La llamada no existe')
    }

    await this.databaseService.updateCallTranslation(callId, sourceLanguage, targetLanguage)

    return {
      callId,
      status: 'ACTIVE',
      sourceLanguage,
      targetLanguage,
    }
  }

  private async requireUser(accessToken: string) {
    const user = await this.databaseService.getUserBySessionToken(accessToken)

    if (!user) {
      throw new UnauthorizedException('Sesión no válida o caducada')
    }

    return user
  }
}
