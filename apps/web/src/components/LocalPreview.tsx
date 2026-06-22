import { useEffect, useMemo, useRef, useState } from 'react'

type LocalPreviewProps = {
  stream: MediaStream | null
  status?: string
}

export function LocalPreview({ stream, status }: LocalPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const meterSegments = useMemo(() => 14, [])

  useEffect(() => {
    if (!videoRef.current) return

    videoRef.current.srcObject = stream
  }, [stream])

  useEffect(() => {
    if (!stream) {
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.85

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)
    let animationFrame = 0

    const tick = () => {
      analyser.getByteTimeDomainData(data)

      let sumSquares = 0
      for (let index = 0; index < data.length; index += 1) {
        const normalized = (data[index] - 128) / 128
        sumSquares += normalized * normalized
      }

      const rms = Math.sqrt(sumSquares / data.length)
      setAudioLevel(Math.min(1, rms * 3))
      animationFrame = window.requestAnimationFrame(tick)
    }

    void audioContext.resume().then(() => {
      tick()
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
      source.disconnect()
      analyser.disconnect()
      void audioContext.close()
    }
  }, [stream])

  const visibleAudioLevel = stream ? audioLevel : 0
  const activeSegments = Math.max(1, Math.round(visibleAudioLevel * meterSegments))

  return (
    <div className="local-preview">
      <div className="local-preview-header">
        <span className="video-badge">Vista local</span>
        <div className="local-preview-meta">
          {status ? <span className="local-preview-status">{status}</span> : null}
        </div>
      </div>
      <video ref={videoRef} className="local-preview-video" autoPlay playsInline muted />
      <div className="audio-meter" aria-label="Nivel de audio del micrófono">
        {Array.from({ length: meterSegments }, (_, index) => (
          <span
            key={`segment-${index}`}
            className={`audio-meter-bar ${index < activeSegments ? 'is-active' : ''}`}
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
