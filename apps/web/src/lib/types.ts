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
  ttsVoice: 'male' | 'female'
  translationMode: 'fast' | 'stable'
  dispatchId?: string
}

export type TranslationStopResponse = {
  callId: string
  status: string
}

export type ParticipantTokenRequest = {
  participantId: string
  participantName: string
}
