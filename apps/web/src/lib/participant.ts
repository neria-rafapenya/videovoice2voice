const PARTICIPANT_KEY = 'videovoice2voice.participant-id'

export function getOrCreateParticipantIdentity() {
  const existing = window.localStorage.getItem(PARTICIPANT_KEY)

  if (existing) {
    return existing
  }

  const next = `participant_${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(PARTICIPANT_KEY, next)
  return next
}
