import type { AuthSession, CallRecord, LiveKitTokenResponse, ParticipantTokenRequest } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_PREFIX = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
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
    throw new Error(message || `HTTP ${response.status}`)
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
      return request<{ callId: string; status: string; sourceLanguage: 'es' | 'en'; targetLanguage: 'es' | 'en' }>(
        `/calls/${callId}/translation/start`,
        {
          method: 'POST',
          body: JSON.stringify({ sourceLanguage, targetLanguage }),
        },
      )
    },
  },
}
