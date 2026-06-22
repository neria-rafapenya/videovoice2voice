import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { clearStoredSession, getStoredSession } from '../lib/session'
import { ApiError } from '../lib/realApi'
import type { AuthSession, AuthUser } from '../lib/types'

type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthSession>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    return getStoredSession() as AuthSession | null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      window.localStorage.setItem('videovoice2voice.session', JSON.stringify(session))
    } else {
      clearStoredSession()
    }
  }, [session])

  useEffect(() => {
    let cancelled = false

    async function validateSession() {
      if (!session) {
        if (!cancelled) {
          setIsLoading(false)
        }
        return
      }

      try {
        await api.auth.me()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void validateSession()

    return () => {
      cancelled = true
    }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session),
      isLoading,
      login: async (email, password) => {
        const nextSession = await api.auth.login(email, password)
        setSession(nextSession)
        return nextSession
      },
      logout: () => {
        setSession(null)
      },
    }),
    [isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
