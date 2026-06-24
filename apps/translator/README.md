# Translator Agent

LiveKit translator agent for voice-to-voice dubbing.

## Railway

Asocia este servicio al directorio `apps/translator` y despliega usando el `Dockerfile`.

Environment variables:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

The agent is dispatched to a room by the API when translation starts.
