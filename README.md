# videovoice2voice

Monorepo base para el sandbox de videollamada con traducción voz a voz.

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
