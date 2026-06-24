import '@livekit/components-styles'
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react'
import { useEffect } from 'react'
import { RoomEvent, Track } from 'livekit-client'

type LiveCallViewerProps = {
  serverUrl: string
  token: string
  connected: boolean
  micEnabled: boolean
  cameraEnabled: boolean
  onDisconnected: () => void
  onTranslatorStatus: (status: { level: 'ok' | 'warning'; message: string } | null) => void
}

function TrackSync({ micEnabled, cameraEnabled }: Pick<LiveCallViewerProps, 'micEnabled' | 'cameraEnabled'>) {
  const room = useRoomContext()

  useEffect(() => {
    void room.localParticipant.setMicrophoneEnabled(micEnabled)
  }, [micEnabled, room])

  useEffect(() => {
    void room.localParticipant.setCameraEnabled(cameraEnabled)
  }, [cameraEnabled, room])

  return null
}

function RemoteStage() {
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true })
  const remoteTracks = cameraTracks.filter((trackRef) => !trackRef.participant.isLocal)

  if (remoteTracks.length === 0) {
    return <div className="remote-stage-empty">Sala lista, esperando al otro participante...</div>
  }

  return (
    <div className="remote-stage">
      {remoteTracks.map((trackRef) => (
        <ParticipantTile key={`${trackRef.participant.identity}-${trackRef.source}`} trackRef={trackRef} />
      ))}
    </div>
  )
}

function TranslatorStatusListener({
  onTranslatorStatus,
}: Pick<LiveCallViewerProps, 'onTranslatorStatus'>) {
  const room = useRoomContext()

  useEffect(() => {
    const handleData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== 'translator-status') {
        return
      }

      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: string
          level?: 'ok' | 'warning'
          message?: string
        }

        if (message.type === 'translator-status' && message.level && message.message) {
          onTranslatorStatus({ level: message.level, message: message.message })
        }
      } catch {
        onTranslatorStatus({ level: 'warning', message: 'No se pudo leer el estado del traductor.' })
      }
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [onTranslatorStatus, room])

  return null
}

export function LiveCallViewer({
  serverUrl,
  token,
  connected,
  micEnabled,
  cameraEnabled,
  onDisconnected,
  onTranslatorStatus,
}: LiveCallViewerProps) {
  return (
    <div className="live-call-viewer">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={connected}
        audio
        video
        onDisconnected={onDisconnected}
        data-lk-theme="default"
        className="livekit-room"
      >
        <TrackSync micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
        <TranslatorStatusListener onTranslatorStatus={onTranslatorStatus} />
        <RemoteStage />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}
