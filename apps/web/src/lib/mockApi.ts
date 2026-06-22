import type { AuthSession, CallRecord, LiveKitTokenResponse, ParticipantTokenRequest } from './types'

const DEMO_EMAIL = 'demo@app.com'
const DEMO_PASSWORD = 'demo-demo-demo'

type StoredCall = CallRecord & {
  sourceLanguage?: 'es' | 'en'
  targetLanguage?: 'es' | 'en'
  translationEnabled?: boolean
}

const calls = new Map<string, StoredCall>()

function delay(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function createMockToken(userEmail: string) {
  return window.btoa(
    JSON.stringify({
      sub: userEmail,
      role: 'participant',
      issuedAt: new Date().toISOString(),
    }),
  )
}

export const mockApi = {
  auth: {
    async login(email: string, password: string): Promise<AuthSession> {
      await delay()

      if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        throw new Error('Credenciales demo incorrectas')
      }

      return {
        accessToken: createMockToken(email),
        user: {
          id: 'user_demo_1',
          email,
        },
      }
    },
  },
  calls: {
    async create(ownerEmail = DEMO_EMAIL): Promise<CallRecord> {
      await delay()

      const callId = createId('call')
      const roomName = `video-call-${callId}`
      const call: StoredCall = {
        callId,
        roomName,
        owner: {
          id: 'user_demo_1',
          email: ownerEmail,
        },
      }

      calls.set(callId, call)

      return call
    },
    async getToken(callId: string, participant: ParticipantTokenRequest): Promise<LiveKitTokenResponse> {
      await delay()

      const call = calls.get(callId)

      if (!call) {
        throw new Error('La llamada no existe en el mock local')
      }

      return {
        livekitUrl: 'ws://localhost:7880',
        token: createMockToken(participant.participantId),
      }
    },
    async startTranslation(
      callId: string,
      sourceLanguage: 'es' | 'en',
      targetLanguage: 'es' | 'en',
    ) {
      await delay()

      const call = calls.get(callId)

      if (!call) {
        throw new Error('La llamada no existe en el mock local')
      }

      call.sourceLanguage = sourceLanguage
      call.targetLanguage = targetLanguage
      call.translationEnabled = true
      calls.set(callId, call)

      return {
        callId,
        status: 'ACTIVE',
        sourceLanguage,
        targetLanguage,
      }
    },
  },
}
