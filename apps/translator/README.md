# Translator Agent

LiveKit translator agent for voice-to-voice dubbing.

## Railway

Asocia este servicio al directorio `apps/translator` y despliega usando el `Dockerfile`.

Environment variables:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `TTS_VOICE_DEFAULT` optional, defaults to `Diego`
- `TTS_VOICE_MALE` optional, voice fallback for masculine speaker mapping
- `TTS_VOICE_FEMALE` optional, voice fallback for feminine speaker mapping

## Comportamiento actual

- El agente se despacha por la API cuando empieza la traducción.
- El modo por defecto es `fast`, con una pequeña espera de estabilidad para no repetir trozos del mismo turno.
- El modo `stable` espera más al cierre de frase.
- Las interrupciones de TTS están desactivadas para que la locución no se corte cuando el usuario vuelve a hablar.
- La voz se elige por sesión desde la API; `speaker_id` ayuda a distinguir hablantes, pero no identifica género por sí mismo.

The agent is dispatched to a room by the API when translation starts.
