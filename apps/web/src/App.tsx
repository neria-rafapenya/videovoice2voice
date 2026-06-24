import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import { useAuth } from './auth/AuthContext'
import { Shell } from './components/Shell'
import { LocalPreview } from './components/LocalPreview'
import { LiveCallViewer } from './components/LiveCallViewer'
import { api } from './lib/api'
import { ApiError } from './lib/realApi'
import { formatDuration, formatCurrency } from './lib/format'
import { getOrCreateParticipantIdentity } from './lib/participant'

const languageChoices = [
  { code: 'es' as const, label: 'Español' },
  { code: 'en' as const, label: 'Inglés' },
]

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/call/:callId" element={<CallPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/home'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="route-loading">Cargando sesión...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('demo@app.com')
  const [password, setPassword] = useState('demo-demo-demo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="hero-panel auth-panel">
        <div className="hero-copy">
          <span className="eyebrow">videovoice2voice</span>
          <h1>Accede y entra al dashboard de videollamada voz a voz</h1>
          <p className="hero-text">
            Ya tenemos rutas reales, sesión local y un API que después podremos cambiar por
            NestJS sin rehacer la interfaz.
          </p>
          <div className="metric-row">
            <article className="metric-card">
              <span className="metric-label">Rutas</span>
              <strong>/login</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Backend</span>
              <strong>API local</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">LiveKit</span>
              <strong>Token listo</strong>
            </article>
          </div>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Login</span>
              <h2>Acceso</h2>
            </div>
            <span className="pill">JWT local</span>
          </div>

          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="helper-copy">Usuario demo: demo@app.com / demo-demo-demo</p>
        </form>
      </section>
    </main>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceLanguage, setSourceLanguage] = useState<'es' | 'en'>('es')
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'en'>('en')
  const [voiceMode, setVoiceMode] = useState<'solo-translation' | 'translation-plus-original' | 'push-to-translate'>(
    'solo-translation',
  )

  async function handleCreateCall() {
    setLoading(true)
    setError(null)

    try {
      const call = await api.calls.create()
      navigate(`/call/${call.callId}`, {
        state: {
          sourceLanguage,
          targetLanguage,
          voiceMode,
        },
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout()
        navigate('/login', { replace: true })
        return
      }

      setError(err instanceof Error ? err.message : 'No se pudo crear la llamada')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-grid">
      <section className="panel dashboard-panel dashboard-hero">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Dashboard</span>
            <h2>Llamada y voz a voz</h2>
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Salir
          </button>
        </div>

        <p className="hero-text">
          Usuario conectado: <strong>{user?.email}</strong>. Elige idiomas, define cómo quieres
          escuchar la traducción y lanza la llamada cuando estés listo.
        </p>

        <div className="language-group">
          <div className="language-group-header">
            <span className="panel-kicker">Mi idioma</span>
            <strong>{languageChoices.find((item) => item.code === sourceLanguage)?.label}</strong>
          </div>
          <div className="button-row">
            {languageChoices.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`choice-button ${sourceLanguage === item.code ? 'is-selected' : ''}`}
                onClick={() => setSourceLanguage(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="language-group">
          <div className="language-group-header">
            <span className="panel-kicker">Idioma destino</span>
            <strong>{languageChoices.find((item) => item.code === targetLanguage)?.label}</strong>
          </div>
          <div className="button-row">
            {languageChoices.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`choice-button ${targetLanguage === item.code ? 'is-selected' : ''}`}
                onClick={() => setTargetLanguage(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="language-group">
          <div className="language-group-header">
            <span className="panel-kicker">Modo voz a voz</span>
            <strong>
              {voiceMode === 'solo-translation'
                ? 'Solo traducción'
                : voiceMode === 'translation-plus-original'
                  ? 'Original + traducción'
                  : 'Push to translate'}
            </strong>
          </div>
          <div className="button-row">
            <button
              type="button"
              className={`choice-button ${voiceMode === 'solo-translation' ? 'is-selected' : ''}`}
              onClick={() => setVoiceMode('solo-translation')}
            >
              Solo traducción
            </button>
            <button
              type="button"
              className={`choice-button ${voiceMode === 'translation-plus-original' ? 'is-selected' : ''}`}
              onClick={() => setVoiceMode('translation-plus-original')}
            >
              Original + traducción
            </button>
            <button
              type="button"
              className={`choice-button ${voiceMode === 'push-to-translate' ? 'is-selected' : ''}`}
              onClick={() => setVoiceMode('push-to-translate')}
            >
              Push to translate
            </button>
          </div>
        </div>

        <div className="session-summary dashboard-metrics">
          <article>
            <span>Estado</span>
            <strong>Listo para llamar</strong>
          </article>
          <article>
            <span>Audio</span>
            <strong>{sourceLanguage} → {targetLanguage}</strong>
          </article>
          <article>
            <span>Modo</span>
            <strong>{voiceMode === 'solo-translation' ? 'Traducción' : voiceMode === 'translation-plus-original' ? 'Ambos' : 'Manual'}</strong>
          </article>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <button type="button" className="primary-button dashboard-call-button" onClick={handleCreateCall} disabled={loading}>
          {loading ? 'Abriendo llamada...' : 'Llamada'}
        </button>
      </section>

      <section className="panel dashboard-panel video-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Video</span>
            <h2>Entrada a materia video</h2>
          </div>
          <span className="pill pill-soft">Live video</span>
        </div>

        <div className="video-stage dashboard-video">
          <div className="video-tile video-local">
            <span className="video-badge">Tu cámara</span>
            <div className="avatar">VO</div>
            <p>Preview local con audio y control de cámara.</p>
          </div>
          <div className="video-tile video-remote">
            <span className="video-badge">Remoto</span>
            <div className="avatar avatar-alt">VO</div>
            <p>Aquí se mostrará el participante con traducción voz a voz.</p>
          </div>
        </div>

        <div className="log-box">
          <p>POST /calls</p>
          <p>POST /calls/:callId/token</p>
          <p>POST /calls/:callId/translation/start</p>
          <p>LiveKit room ready for video</p>
        </div>
      </section>
    </main>
  )
}

function CallPage() {
  const { callId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const preset = location.state as
    | {
        sourceLanguage?: 'es' | 'en'
        targetLanguage?: 'es' | 'en'
        voiceMode?: 'solo-translation' | 'translation-plus-original' | 'push-to-translate'
      }
    | null
  const participantId = useMemo(() => getOrCreateParticipantIdentity(), [])
  const participantName = user?.email ?? participantId
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [translationEnabled, setTranslationEnabled] = useState(true)
  const [sourceLanguage, setSourceLanguage] = useState<'es' | 'en'>(preset?.sourceLanguage ?? 'es')
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'en'>(preset?.targetLanguage ?? 'en')
  const [mode, setMode] = useState<'solo-translation' | 'translation-plus-original' | 'push-to-translate'>(
    preset?.voiceMode ?? 'solo-translation',
  )
  const [durationSeconds, setDurationSeconds] = useState(462)
  const [latencySeconds, setLatencySeconds] = useState(2.4)
  const [debugOpen, setDebugOpen] = useState(true)
  const [loadingToken, setLoadingToken] = useState(false)
  const [tokenData, setTokenData] = useState<{ livekitUrl: string; token: string } | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [translationStatus, setTranslationStatus] = useState<string>('Pendiente')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [roomConnected, setRoomConnected] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const mediaRequestStarted = useRef(false)
  const translationAutoStartRequested = useRef(false)

  const estimatedCost = useMemo(() => formatCurrency((durationSeconds / 60) * 0.0368), [durationSeconds])
  const tokenText = useMemo(() => {
    if (!tokenData) return ''
    return typeof tokenData.token === 'string' ? tokenData.token : JSON.stringify(tokenData.token)
  }, [tokenData])

  const syncMediaTrackState = useCallback(
    (kind: 'audio' | 'video', enabled: boolean) => {
      const tracks = kind === 'audio' ? mediaStream?.getAudioTracks() : mediaStream?.getVideoTracks()
      tracks?.forEach((track) => {
        track.enabled = enabled
      })
    },
    [mediaStream],
  )

  const loadToken = useCallback(async () => {
    if (!callId) return
    setLoadingToken(true)
    setTokenError(null)

    try {
      const token = await api.calls.getToken(callId, {
        participantId,
        participantName,
      })
      setTokenData(token)
      setRoomConnected(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout()
        navigate('/login', { replace: true })
        return
      }

      setTokenError(err instanceof Error ? err.message : 'No se pudo obtener el token LiveKit')
      setRoomConnected(false)
    } finally {
      setLoadingToken(false)
    }
  }, [callId, logout, navigate, participantId, participantName])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadToken()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadToken])

  const requestMedia = useCallback(async () => {
    if (mediaRequestStarted.current) {
      return
    }

    mediaRequestStarted.current = true
    setMediaLoading(true)
    setMediaError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      setMediaStream(stream)
      setMediaReady(true)
    } catch (err) {
      setMediaReady(false)
      setMediaError(
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a cámara y micrófono. Revisa permisos del navegador.',
      )
    } finally {
      setMediaLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!tokenData) {
      return
    }

    const timeout = window.setTimeout(() => {
      void requestMedia()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [requestMedia, tokenData])

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop())
    }
  }, [mediaStream])

  useEffect(() => {
    syncMediaTrackState('audio', micEnabled)
  }, [micEnabled, syncMediaTrackState])

  useEffect(() => {
    syncMediaTrackState('video', cameraEnabled)
  }, [cameraEnabled, syncMediaTrackState])

  const handleStartTranslation = useCallback(async () => {
    if (!callId) return

    setTranslationLoading(true)
    setTokenError(null)

    try {
      const result = await api.calls.startTranslation(callId, sourceLanguage, targetLanguage)
      setTranslationStatus(`${result.status}: ${result.sourceLanguage} → ${result.targetLanguage}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout()
        navigate('/login', { replace: true })
        return
      }

      setTokenError(err instanceof Error ? err.message : 'No se pudo activar la traducción')
    } finally {
      setTranslationLoading(false)
    }
  }, [callId, logout, navigate, sourceLanguage, targetLanguage])

  useEffect(() => {
    if (!tokenData || !translationEnabled || translationAutoStartRequested.current) {
      return
    }

    translationAutoStartRequested.current = true
    void handleStartTranslation()
  }, [handleStartTranslation, tokenData, translationEnabled])

  useEffect(() => {
    if (!translationEnabled) {
      translationAutoStartRequested.current = false
    }
  }, [translationEnabled])

  return (
    <main className="page-grid call-page">
      <section className="panel call-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Video call</span>
            <h2>Room {callId}</h2>
          </div>
        <div className="header-actions">
            <button type="button" className="ghost-button" onClick={loadToken} disabled={loadingToken}>
              {loadingToken ? 'Cargando token...' : 'Obtener token LiveKit'}
            </button>
            <button type="button" className="ghost-button" onClick={logout}>
              Salir
            </button>
          </div>
        </div>

        <div className="call-intro">
          <div>
            <span className="panel-kicker">Voice setup</span>
            <strong>
              {sourceLanguage} → {targetLanguage}
            </strong>
          </div>
          <div>
            <span className="panel-kicker">Modo</span>
            <strong>
              {mode === 'solo-translation'
                ? 'Solo traducción'
                : mode === 'translation-plus-original'
                  ? 'Original + traducción'
                  : 'Push to translate'}
            </strong>
          </div>
          <div>
            <span className="panel-kicker">Translation</span>
            <strong className={`translation-badge ${translationEnabled ? 'is-on' : 'is-off'}`}>
              {translationEnabled ? 'Traducción activa' : 'Traducción pausada'}
            </strong>
          </div>
        </div>

        <div className="call-visor-grid">
          <div className="viewer-shell">
            {mediaStream ? (
              <LocalPreview stream={mediaStream} />
            ) : (
              <div className="viewer-loading">Preparando cámara local...</div>
            )}
          </div>

          <div className="remote-shell">
            {tokenData ? (
              <LiveCallViewer
                serverUrl={tokenData.livekitUrl}
                token={tokenData.token}
                connected={roomConnected && mediaReady}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                onDisconnected={() => setRoomConnected(false)}
              />
            ) : (
              <div className="viewer-loading">Preparando sala de video...</div>
            )}
          </div>
        </div>

        {mediaError ? <p className="error-banner">{mediaError}</p> : null}
        {mediaLoading ? <p className="helper-copy">El navegador está pidiendo acceso a cámara y micro...</p> : null}
        {!mediaReady && !mediaLoading ? (
          <p className="helper-copy">Si el navegador lo bloquea, habilita cámara y micro desde la barra de permisos.</p>
        ) : null}

        <div className="controls">
          <button
            type="button"
            className={`toggle-button ${micEnabled ? 'is-on' : ''}`}
            onClick={() => setMicEnabled((value) => !value)}
          >
            Micrófono {micEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`toggle-button ${cameraEnabled ? 'is-on' : ''}`}
            onClick={() => setCameraEnabled((value) => !value)}
          >
            Cámara {cameraEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`toggle-button ${translationEnabled ? 'is-on' : ''}`}
            onClick={() => {
              setTranslationEnabled((value) => {
                const nextValue = !value

                if (nextValue) {
                  translationAutoStartRequested.current = false
                }

                return nextValue
              })
            }}
          >
            Traducción {translationEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="form-grid two-columns">
          <label className="field">
            <span>Mi idioma</span>
            <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value as 'es' | 'en')}>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </label>

          <label className="field">
            <span>Idioma remoto</span>
            <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value as 'es' | 'en')}>
              <option value="en">Inglés</option>
              <option value="es">Español</option>
            </select>
          </label>

          <label className="field">
            <span>Modo de audio</span>
            <select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as 'solo-translation' | 'translation-plus-original' | 'push-to-translate')
              }
            >
              <option value="solo-translation">Solo traducción</option>
              <option value="translation-plus-original">Original + traducción</option>
              <option value="push-to-translate">Push to translate</option>
            </select>
          </label>

          <label className="field">
            <span>Latencia objetivo</span>
            <input
              value={`${latencySeconds.toFixed(1)} s`}
              onChange={(event) => {
                const nextValue = Number.parseFloat(event.target.value.replace(',', '.'))
                if (!Number.isNaN(nextValue)) {
                  setLatencySeconds(nextValue)
                }
              }}
            />
          </label>
        </div>

        <div className="session-summary">
          <article>
            <span>Duración</span>
            <strong>{formatDuration(durationSeconds)}</strong>
          </article>
          <article>
            <span>Coste estimado</span>
            <strong>{estimatedCost}</strong>
          </article>
          <article>
            <span>Estado</span>
            <strong>{translationStatus}</strong>
          </article>
        </div>

        <label className="field duration-field">
          <span>Simular duración de sesión</span>
          <input
            type="range"
            min={0}
            max={3600}
            step={15}
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
          />
        </label>

        {tokenError ? <p className="error-banner">{tokenError}</p> : null}

        {tokenData ? (
          <div className="token-box">
            <div>
              <span>LiveKit URL</span>
              <strong>{tokenData.livekitUrl}</strong>
            </div>
            <div>
              <span>Participante</span>
              <strong>{participantName}</strong>
            </div>
            <div>
              <span>Token</span>
              <code>{tokenText}</code>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            translationAutoStartRequested.current = false
            void handleStartTranslation()
          }}
          disabled={translationLoading}
        >
          {translationLoading ? 'Activando traducción...' : 'Activar traducción'}
        </button>
        <p className="helper-copy">La traducción se activa sola al entrar a la sala, incluso si todavía no hay otro participante.</p>
      </section>

      <section className="panel footer-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Debug</span>
            <h2>Logs técnicos</h2>
          </div>
          <button type="button" className="ghost-button" onClick={() => setDebugOpen((open) => !open)}>
            {debugOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {debugOpen ? (
          <div className="log-box" role="log" aria-live="polite">
            <p>GET /me → session active</p>
            <p>POST /calls/{callId}/token → token solicitado para {participantId}</p>
            <p>POST /calls/{callId}/translation/start → {translationEnabled ? 'bridge Gemini activo' : 'translation paused'}</p>
            <p>Web Audio API → captura local preparada</p>
          </div>
        ) : (
          <div className="log-box log-box-muted">
            <p>Panel de logs oculto.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
