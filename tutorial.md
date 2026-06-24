# Tutorial: construir una app de videollamada voz a voz con LiveKit, NestJS y React

Esta guía resume lo que hemos montado en `videovoice2voice` y por qué se han tomado ciertas decisiones.
La idea es que sirva como lección práctica para otra persona que quiera construir una app similar desde cero.

## 1. Objetivo

Queremos una aplicación de videollamada donde:

- El usuario entra con login.
- Crea o abre una llamada.
- Se conecta con cámara y micrófono.
- Se activa un agente de traducción voz a voz.
- La traducción se escucha casi en tiempo real.
- La sesión muestra un minutero y un coste estimado.

No usamos un flujo “mock” en la interfaz final. La UI habla con una API real y el agente de traducción vive como servicio aparte.

## 2. Arquitectura

El proyecto está dividido en tres piezas:

- `apps/web`: frontend en React + Vite + TypeScript.
- `apps/api`: backend en NestJS.
- `apps/translator`: agente Python de LiveKit que hace la traducción de voz.

Además, usamos:

- LiveKit Cloud para la sala de audio y vídeo.
- PostgreSQL para usuarios, sesiones y llamadas.
- Railway para desplegar la API, la web y el agente.

## 3. Tecnologías usadas

### Frontend

- React
- React Router
- Vite
- TypeScript
- LiveKit Components para renderizar la sala y el audio

### Backend

- NestJS
- PostgreSQL
- `pg` para acceso a base de datos
- `livekit-server-sdk` para generar tokens y despachar el agente

### Agente de traducción

- Python
- `livekit-agents`
- LiveKit Inference
- STT, LLM y TTS desde LiveKit Cloud

## 4. Flujo general

El flujo real de la app es este:

1. El usuario inicia sesión.
2. La web crea una llamada en la API.
3. La web pide un token LiveKit para entrar al room.
4. La web se conecta a la sala.
5. Al activar traducción, la API despacha el agente `translator-agent`.
6. El agente escucha el audio, transcribe, traduce y sintetiza voz.
7. La UI recibe avisos de estado por data channel.
8. La pantalla muestra duración y coste estimado.

## 5. Por qué usamos un agente separado

Podríamos haber intentado hacer toda la traducción en el frontend o en la API, pero eso tiene varios problemas:

- El navegador no debería cargar con la lógica de IA.
- Necesitamos una sala viva con media bidireccional.
- Conviene aislar la lógica de voz para poder escalarla y redeplegarla aparte.

LiveKit encaja bien porque el agente se conecta como un participante más de la room.

## 6. Estructura de la API

La API en NestJS hace cuatro cosas principales:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/calls`
- `POST /api/calls/:callId/token`
- `POST /api/calls/:callId/translation/start`

### Qué guarda en base de datos

La tabla de llamadas almacena:

- `call_id`
- `room_name`
- `owner_id`
- idiomas de origen y destino
- estado de traducción
- `translation_dispatch_id`
- voz TTS elegida

### Por qué PostgreSQL

Porque necesitábamos persistir:

- sesiones de login
- llamadas creadas
- estado de traducción

Y queríamos algo sencillo de mover a Railway.

## 7. Estructura del frontend

La web se construyó con rutas reales:

- `/login`
- `/home`
- `/call/:callId`

### En la página de home

El dashboard permite:

- elegir idioma de origen
- elegir idioma destino
- elegir voz masculina o femenina
- crear la llamada

### En la página de llamada

La vista de llamada muestra:

- previsualización local de cámara
- visor remoto
- controles de micrófono y cámara
- estado de traducción
- minutero
- coste estimado
- aviso de salud del traductor

## 8. LiveKit: lo esencial que hemos aprendido

LiveKit nos resolvió la parte de transporte y presencia de la llamada. Lo importante aquí es entender qué hace cada parte:

- `LIVEKIT_URL`: dirección del cluster LiveKit Cloud.
- `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET`: credenciales del proyecto.
- La API genera tokens con `AccessToken`.
- El agente se despacha al room con `AgentDispatchClient`.

### Error típico que vimos

Un problema muy común fue confundir:

- la conexión del room
- la conexión del agente
- la conexión del proveedor de TTS

Si la sala funciona pero el agente no habla, el fallo puede estar en:

- el despacho del agente
- el arranque del contenedor
- el TTS saturado por límite de concurrencia

## 9. El agente de traducción

El agente está en `apps/translator`.

### Qué hace

- Entra en la sala de LiveKit.
- Recibe audio.
- Transcribe con STT.
- Traduce con LLM.
- Sintetiza con TTS.
- Publica avisos de estado a la sala.

### Qué modelos usamos

Actualmente usamos una estrategia estable y barata:

- STT: `deepgram/nova-3`
- LLM: `google/gemini-2.5-flash-lite`
- TTS: `inworld/inworld-tts-2`

### Por qué cambiamos varias veces

Al principio probamos un modelo speech-to-speech tipo realtime.
Funcionaba, pero no era lo más estable para doblaje.

Luego pasamos a una estrategia de pipeline:

- audio → texto
- texto → traducción
- traducción → voz

Eso nos dio más control sobre:

- latencia
- texto intermedio
- avisos de error

## 10. Lecciones sobre latencia

Hay una diferencia entre:

- latencia aceptable
- latencia “doblaje casi simultáneo”

Lo importante es saber que:

- el agente necesita detectar el final del turno
- STT necesita procesar la voz
- el LLM necesita generar la traducción
- el TTS necesita sintetizar el resultado

Por eso, aunque la app sea rápida, nunca será literalmente instantánea.

### Qué hicimos para reducir el retraso

- activamos generación preemptiva cuando tenía sentido
- ajustamos el endpointing
- intentamos empezar a traducir antes de cerrar del todo la frase
- simplificamos la voz TTS para evitar exceso de conexiones

## 11. Lección importante sobre costes

LiveKit Cloud no es “gratis ilimitado”.

En plan free/Build:

- hay límites duros de uso
- TTS y STT tienen concurrencia limitada
- si llegas al límite, las nuevas requests fallan

### Lo que aprendimos del límite de TTS

Cuando vimos un aviso de “100% of concurrent TTS connections used”, eso significaba:

- demasiadas sesiones TTS activas
- nuevas síntesis podían fallar
- no era un ban permanente, sino una saturación temporal

### Cómo lo mitigamos

- una sola voz por sesión
- menos cambios de voz dinámicos
- aviso visible en la UI si el traductor falla

## 12. Minutero y coste estimado

En la llamada añadimos dos indicadores:

- un minutero que cuenta el tiempo real de la sesión
- un coste estimado basado en la duración

Esto es útil para:

- entender consumo
- enseñar al usuario cuánto “lleva gastado”
- tener una referencia rápida antes de mirar billing real

### Importante

Ese coste es una estimación de producto, no una factura real.
Para el coste exacto hay que revisar:

- LiveKit Cloud Billing
- consumo de LiveKit Inference
- duración de la sesión

## 13. Comunicación entre agente y frontend

Una pieza muy útil fue usar el data channel de LiveKit para enviar mensajes de estado.

Ejemplos de mensajes:

- traducción activa
- alerta de fallo de TTS

Eso nos permite mostrar en la UI:

- un banner de aviso
- el estado real del traductor

## 14. Despliegue en Railway

Montamos tres servicios:

- `web`
- `api`
- `translator`

### Raíces de directorio

- Web: `apps/web`
- API: `apps/api`
- Translator: `apps/translator`

### Variables de entorno

Cada servicio lleva sus propias variables.

#### API

- `PORT`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_TRANSLATOR_AGENT_NAME`
- `DEMO_USER_EMAIL`
- `DEMO_USER_PASSWORD`

#### Web

- `VITE_API_URL`
- `VITE_LIVEKIT_URL`

#### Translator

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `TTS_VOICE_DEFAULT` opcional
- `TTS_VOICE_FEMALE` opcional

## 15. Cómo arrancarlo en local

Desde la raíz del repo:

```bash
yarn install
yarn dev:all
```

Eso levanta:

- infra local si hay Docker
- API
- web

## 16. Qué errores encontramos y qué aprendimos

### Error 1: API no accesible

Aprendizaje:
- la API debe escuchar en `0.0.0.0` en Railway
- CORS debe incluir la URL de la web desplegada

### Error 2: el agente se quedaba en ayuda de CLI

Aprendizaje:
- el contenedor debía arrancar con `python agent.py start`
- si no, LiveKit CLI muestra la ayuda en vez de ejecutar el worker

### Error 3: demasiado retraso al hablar

Aprendizaje:
- el final de turno estaba demasiado conservador
- hacer traducción antes de cerrar del todo ayuda

### Error 4: exceso de conexiones TTS

Aprendizaje:
- cambiar de voz en cada frase puede ser caro
- una sola voz por sesión es más estable y barata

## 17. Recomendación para seguir evolucionando

Si quieres continuar a partir de aquí, los siguientes pasos naturales serían:

- guardar historial de llamadas
- mostrar métricas reales de consumo
- permitir seleccionar voz manualmente por llamada
- añadir soporte multilingüe real
- mejorar el cálculo de coste con datos de usage reales

## 18. Resumen final

La enseñanza principal de este proyecto es que una app de voz en tiempo real no se resuelve solo “con IA”.
Necesitas coordinar bien:

- frontend
- backend
- sala de media
- agente de traducción
- métricas y límites

La combinación que hemos montado deja una base funcional y bastante realista para producción ligera:

- React para la experiencia
- NestJS para auth y control
- LiveKit para el tiempo real
- Python agent para la voz
- Railway para desplegarlo todo

