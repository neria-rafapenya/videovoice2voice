export type AuthUser = {
  id: string
  email: string
}

export type AuthSession = {
  accessToken: string
  user: AuthUser
}

export type CallRecord = {
  callId: string
  roomName: string
  owner: AuthUser
}

export type LiveKitTokenResponse = {
  livekitUrl: string
  token: string
}

export type TranslationStartResponse = {
  callId: string
  status: string
  sourceLanguage: 'es' | 'en'
  targetLanguage: 'es' | 'en'
  dispatchId?: string
}

export type ParticipantTokenRequest = {
  participantId: string
  participantName: string
}
