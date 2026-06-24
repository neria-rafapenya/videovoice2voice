import type {
  AuthSession,
  CallRecord,
  LiveKitTokenResponse,
  ParticipantTokenRequest,
  TranslationStartResponse,
} from './types'
import { getStoredAccessToken } from './session'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_PREFIX = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getStoredAccessToken()

  let response: Response

  try {
    response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new Error(
      `No se pudo conectar con la API en ${API_URL}${API_PREFIX}. Arranca el backend con "yarn dev:api" o "yarn dev".`,
    )
  }

  if (!response.ok) {
    const message = await response.text()
    throw new ApiError(message || `HTTP ${response.status}`, response.status)
  }

  return response.json() as Promise<T>
}

export const realApi = {
  auth: {
    login(email: string, password: string): Promise<AuthSession> {
      return request<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    },
    me(): Promise<{ user: AuthSession['user'] }> {
      return request<{ user: AuthSession['user'] }>('/auth/me')
    },
  },
  calls: {
    create(): Promise<CallRecord> {
      return request<CallRecord>('/calls', {
        method: 'POST',
      })
    },
    getToken(callId: string, participant: ParticipantTokenRequest): Promise<LiveKitTokenResponse> {
      return request<LiveKitTokenResponse>(`/calls/${callId}/token`, {
        method: 'POST',
        body: JSON.stringify(participant),
      })
    },
    startTranslation(
      callId: string,
      sourceLanguage: 'es' | 'en',
      targetLanguage: 'es' | 'en',
    ) {
      return request<TranslationStartResponse>(`/calls/${callId}/translation/start`, {
        method: 'POST',
        body: JSON.stringify({ sourceLanguage, targetLanguage }),
      })
    },
  },
}
