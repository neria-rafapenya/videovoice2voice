# videovoice2voice

Monorepo base para el sandbox de videollamada con traducción voz a voz.

## Guía

- [Tutorial de arquitectura y aprendizaje](./tutorial.md)

## Estructura

- `apps/web`: frontend React + Vite + TypeScript
- `apps/api`: backend NestJS con auth, calls y token LiveKit
- `docker-compose.yml`: servicios locales de apoyo

## Arranque

```bash
yarn install
yarn dev:all
```

`dev:all` levanta la API en `3001` para no chocar con una instancia vieja en `3000`.

Si quieres arrancar solo la app:

```bash
yarn dev
```

Si quieres arrancarlos por separado:

```bash
yarn dev:infra
yarn dev:web
yarn dev:api
```

## Variables de entorno

### `apps/web`

```bash
VITE_API_URL=http://localhost:3001
VITE_LIVEKIT_URL=wss://video2video-14mhpqjz.livekit.cloud
```

### `apps/api`

```bash
PORT=3000
DATABASE_URL=postgresql://root:root@127.0.0.1:5432/videovoice2voice
LIVEKIT_URL=wss://video2video-14mhpqjz.livekit.cloud
LIVEKIT_API_KEY=tu_livekit_api_key
LIVEKIT_API_SECRET=tu_livekit_api_secret
LIVEKIT_TRANSLATOR_AGENT_NAME=translator-agent
DEMO_USER_EMAIL=demo@app.com
DEMO_USER_PASSWORD=demo-demo-demo
```

### `apps/translator`

```bash
LIVEKIT_URL=wss://video2video-14mhpqjz.livekit.cloud
LIVEKIT_API_KEY=tu_livekit_api_key
LIVEKIT_API_SECRET=tu_livekit_api_secret
GOOGLE_API_KEY=tu_gemini_api_key
GEMINI_REALTIME_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_VOICE=Puck
```

## Railway

Despliegue recomendado:

1. `apps/api` como servicio web.
1. `apps/web` como servicio web.
1. `apps/translator` como servicio aparte con Dockerfile.

Root directory por servicio:

1. API: `apps/api`
1. Web: `apps/web`
1. Translator: `apps/translator`
