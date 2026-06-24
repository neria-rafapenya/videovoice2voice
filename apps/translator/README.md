# Translator Agent

LiveKit translator agent for voice-to-voice dubbing.

## Railway

Asocia este servicio al directorio `apps/translator` y despliega usando el `Dockerfile`.

Environment variables:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `TTS_VOICE_FEMALE` optional, defaults to `Ashley`
- `TTS_VOICE_MALE` optional, defaults to `Diego`

The agent is dispatched to a room by the API when translation starts.
