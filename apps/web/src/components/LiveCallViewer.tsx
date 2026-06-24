import '@livekit/components-styles'
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react'
import { useEffect } from 'react'
import { Track } from 'livekit-client'

type LiveCallViewerProps = {
  serverUrl: string
  token: string
  connected: boolean
  micEnabled: boolean
  cameraEnabled: boolean
  onDisconnected: () => void
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

export function LiveCallViewer({ serverUrl, token, connected, micEnabled, cameraEnabled, onDisconnected }: LiveCallViewerProps) {
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
        <RemoteStage />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}
