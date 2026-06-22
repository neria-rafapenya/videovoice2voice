import { Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { LivekitService } from '../livekit/livekit.service'

type CallRecord = {
  callId: string
  roomName: string
  owner: {
    id: string
    email: string
  }
  sourceLanguage?: 'es' | 'en'
  targetLanguage?: 'es' | 'en'
  translationEnabled?: boolean
}

@Injectable()
export class CallsService {
  private readonly calls = new Map<string, CallRecord>()

  constructor(private readonly livekitService: LivekitService) {}

  createCall() {
    const callId = randomUUID()
    const call: CallRecord = {
      callId,
      roomName: `video-call-${callId}`,
      owner: {
        id: 'user_demo_1',
        email: process.env.DEMO_USER_EMAIL ?? 'demo@app.com',
      },
    }

    this.calls.set(callId, call)
    return call
  }

  async getLiveKitToken(callId: string, participantId: string, participantName: string) {
    const call = this.calls.get(callId)

    if (!call) {
      throw new NotFoundException('La llamada no existe')
    }

    return this.livekitService.createToken(call.roomName, participantId, participantName)
  }

  startTranslation(callId: string, sourceLanguage: 'es' | 'en', targetLanguage: 'es' | 'en') {
    const call = this.calls.get(callId)

    if (!call) {
      throw new NotFoundException('La llamada no existe')
    }

    call.sourceLanguage = sourceLanguage
    call.targetLanguage = targetLanguage
    call.translationEnabled = true
    this.calls.set(callId, call)

    return {
      callId,
      status: 'ACTIVE',
      sourceLanguage,
      targetLanguage,
    }
  }
}
