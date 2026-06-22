const STORAGE_KEY = 'videovoice2voice.session'

export function getStoredSession() {
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as { accessToken?: string } | null
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function getStoredAccessToken() {
  return getStoredSession()?.accessToken ?? null
}

export function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY)
}
