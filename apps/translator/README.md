# Translator Agent

LiveKit + Gemini realtime translation agent.

## Railway

Asocia este servicio al directorio `apps/translator` y despliega usando el `Dockerfile`.

Environment variables:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY`
- `GEMINI_REALTIME_MODEL` optional
- `GEMINI_VOICE` optional

The agent is dispatched to a room by the API when translation starts.
