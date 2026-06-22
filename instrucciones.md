# Informe técnico — Sandbox de videocall con traducción voz a voz en tiempo real

## 1. Objetivo

Construir un sandbox funcional para validar la viabilidad de una aplicación de videollamadas con traducción voz a voz en tiempo real.

El objetivo inicial no es crear un producto completo tipo Zoom/Teams, sino demostrar técnicamente este flujo:

```text
Usuario A habla español
↓
La aplicación captura el audio
↓
Gemini Live Translate traduce a inglés
↓
Usuario B escucha audio en inglés

Usuario B habla inglés
↓
La aplicación captura el audio
↓
Gemini Live Translate traduce a español
↓
Usuario A escucha audio en español
```

El sandbox debe permitir una llamada 1:1, con vídeo, audio original opcional, audio traducido y una medición básica de latencia/coste.

---

## 2. Alcance del MVP

### Incluido en la primera fase

* Aplicación web en React + Vite.
* Backend en NestJS.
* Videollamada 1:1 usando LiveKit.
* Autenticación básica.
* Generación de tokens LiveKit desde backend.
* Conexión con Gemini Live Translate.
* Traducción voz a voz español ↔ inglés.
* Subtítulos opcionales derivados del stream traducido si la API lo permite.
* Registro básico de sesiones.
* Medición de duración de llamada.
* Estimación de coste por sesión.
* PostgreSQL para usuarios, sesiones y consumo.
* Redis para sesiones temporales, presencia y control de estado.
* Preparación básica para billing, aunque no se cobrará todavía en el sandbox.

### Fuera del MVP inicial

* Salas múltiples complejas.
* Llamadas grupales.
* Marketplace de idiomas.
* Grabaciones.
* Compartir pantalla.
* Panel avanzado de administración.
* Facturación real con Stripe.
* App móvil.
* Clonación de voz.
* Moderación avanzada.
* Multi-tenant.
* Escalado Kubernetes.

---

## 3. Stack propuesto

### Frontend

* React
* Vite
* TypeScript
* LiveKit React SDK
* Zustand o React Context para estado simple
* React Router
* Tailwind, CSS Modules o styled-components
* Web Audio API para control de audio local/traducido
* Axios o fetch API

### Backend

* NestJS
* TypeScript
* WebSocket Gateway
* REST API
* LiveKit Server SDK
* Gemini Live API SDK o cliente WebSocket propio
* PostgreSQL
* Prisma ORM
* Redis
* JWT Auth
* Docker Compose

### Infraestructura local/sandbox

* Docker Compose
* PostgreSQL container
* Redis container
* LiveKit server container
* Backend NestJS local/container
* Frontend Vite local
* Gemini Live API externa
* Variables de entorno en `.env`

---

## 4. Arquitectura lógica

```text
┌────────────────────┐
│ Frontend React     │
│                    │
│ - UI videocall     │
│ - LiveKit client   │
│ - Auth simple      │
│ - Audio controls   │
└─────────┬──────────┘
          │
          │ REST / WebSocket
          ↓
┌────────────────────┐
│ Backend NestJS     │
│                    │
│ - Auth             │
│ - LiveKit tokens   │
│ - Session manager  │
│ - Gemini bridge    │
│ - Billing tracker  │
└─────┬─────────┬────┘
      │         │
      │         ↓
      │   ┌──────────────┐
      │   │ Gemini Live  │
      │   │ Translate    │
      │   └──────────────┘
      │
      ↓
┌────────────────────┐
│ LiveKit Server     │
│                    │
│ - WebRTC rooms     │
│ - audio/video      │
│ - participants     │
└────────────────────┘

┌────────────────────┐
│ PostgreSQL         │
│ - users            │
│ - calls            │
│ - usage            │
└────────────────────┘

┌────────────────────┐
│ Redis              │
│ - ephemeral state  │
│ - room presence    │
│ - locks            │
└────────────────────┘
```

---

## 5. Diseño funcional del sandbox

### Pantallas mínimas

#### 1. Login

Formulario sencillo:

* email
* password

Para el sandbox se puede usar un usuario precargado.

#### 2. Home

Botón:

```text
Iniciar llamada demo
```

Al pulsarlo:

* se crea una llamada 1:1
* se genera un room de LiveKit
* se redirige al usuario a `/call/:callId`

#### 3. Call Screen

Elementos mínimos:

* vídeo local
* vídeo remoto
* botón activar/desactivar micrófono
* botón activar/desactivar cámara
* selector de idioma propio
* selector de idioma destino
* botón iniciar traducción
* botón finalizar llamada
* indicador de latencia aproximada
* contador de duración
* log técnico visible en modo debug

Ejemplo:

```text
Mi idioma: Español
Idioma remoto: Inglés
Traducción: ON
Latencia media: 2.4s
Duración: 00:07:42
Coste estimado: 0.28 USD
```

---

## 6. Flujo técnico de llamada

### Paso 1 — Login

El usuario se autentica contra NestJS.

```text
POST /auth/login
```

El backend devuelve:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "user_1",
    "email": "demo@app.com"
  }
}
```

---

### Paso 2 — Crear llamada

```text
POST /calls
```

El backend:

1. crea un registro en PostgreSQL
2. genera un `callId`
3. crea nombre de room LiveKit
4. devuelve datos de conexión

Respuesta:

```json
{
  "callId": "call_123",
  "roomName": "sandbox-call-123"
}
```

---

### Paso 3 — Obtener token LiveKit

```text
POST /calls/:callId/token
```

El backend genera un token LiveKit con permisos limitados:

* join room
* publish audio
* publish video
* subscribe audio/video

Respuesta:

```json
{
  "livekitUrl": "ws://localhost:7880",
  "token": "livekit_jwt"
}
```

---

### Paso 4 — Conectar a LiveKit

El frontend usa el token y conecta con LiveKit.

```text
React Client → LiveKit Room
```

En este punto ya debe funcionar una videollamada normal 1:1.

Este es el primer hito técnico.

---

### Paso 5 — Activar traducción

El usuario pulsa:

```text
Activar traducción
```

Frontend llama a:

```text
POST /calls/:callId/translation/start
```

Body:

```json
{
  "sourceLanguage": "es",
  "targetLanguage": "en"
}
```

El backend:

1. abre una sesión con Gemini Live Translate
2. asocia la sesión a `callId`
3. marca traducción como activa en Redis
4. prepara el bridge de audio

---

## 7. Estrategia de integración con Gemini Live Translate

Para el sandbox hay dos estrategias posibles.

---

### Estrategia A — Backend como puente de audio

El frontend captura audio local y lo envía al backend mediante WebSocket.

```text
Frontend
  ↓ audio chunks
NestJS WebSocket
  ↓ audio stream
Gemini Live Translate
  ↓ translated audio chunks
NestJS WebSocket
  ↓ audio traducido
Frontend remoto
```

Ventajas:

* API key protegida.
* Control total del consumo.
* Fácil medir coste.
* Fácil registrar sesiones.
* Fácil cortar streams.
* Mejor para producto futuro.

Desventajas:

* Más latencia.
* Backend transporta audio.
* Más carga en servidor.

Esta es la opción recomendada para el sandbox.

---

### Estrategia B — Agente conectado a LiveKit

Un worker/agent se conecta a la room de LiveKit como participante oculto.

```text
LiveKit Room
  ↓ audio track usuario A
Translation Agent
  ↓ Gemini Live Translate
LiveKit Room
  ↓ publica audio traducido como nuevo track
Usuario B escucha track traducido
```

Ventajas:

* Arquitectura más limpia a futuro.
* El audio traducido se trata como un track más de LiveKit.
* Escala mejor.
* Menos lógica especial en frontend.

Desventajas:

* Más compleja inicialmente.
* Requiere crear worker/agent.
* Más difícil de depurar al principio.

Recomendación:

* MVP técnico rápido: Estrategia A.
* Evolución seria: Estrategia B.

---

## 8. Arquitectura recomendada para el primer sandbox

Aunque el stack final incluye LiveKit, PostgreSQL, Redis, Auth y Billing, el sandbox debe simplificarse así:

```text
React + Vite
NestJS
LiveKit local
PostgreSQL local
Redis local
Gemini Live Translate
Auth básica JWT
Billing simulado
```

Nada de Kubernetes.
Nada de microservicios.
Nada de colas.
Nada de Stripe real.
Nada de multi-room avanzado.

---

## 9. Módulos backend NestJS

Estructura propuesta:

```text
src/
  app.module.ts

  config/
    env.config.ts
    livekit.config.ts
    gemini.config.ts
    database.config.ts

  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      jwt.strategy.ts
      dto/

    users/
      users.module.ts
      users.service.ts

    calls/
      calls.module.ts
      calls.controller.ts
      calls.service.ts
      dto/

    livekit/
      livekit.module.ts
      livekit.service.ts

    translation/
      translation.module.ts
      translation.gateway.ts
      translation.service.ts
      gemini-live.service.ts
      audio-buffer.service.ts

    usage/
      usage.module.ts
      usage.service.ts

    billing/
      billing.module.ts
      billing.service.ts

  prisma/
    prisma.service.ts
```

---

## 10. Modelo de datos inicial

### User

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  calls        Call[]
}
```

### Call

```prisma
model Call {
  id              String    @id @default(uuid())
  roomName        String    @unique
  ownerId         String
  owner           User      @relation(fields: [ownerId], references: [id])

  status          CallStatus @default(CREATED)

  sourceLanguage  String?
  targetLanguage  String?

  startedAt       DateTime?
  endedAt         DateTime?
  durationSeconds Int       @default(0)

  createdAt       DateTime  @default(now())

  usages          UsageRecord[]
}
```

### UsageRecord

```prisma
model UsageRecord {
  id              String   @id @default(uuid())
  callId          String
  call            Call     @relation(fields: [callId], references: [id])

  provider        String
  model           String
  inputAudioSec   Int      @default(0)
  outputAudioSec  Int      @default(0)
  estimatedCost   Decimal  @default(0)

  createdAt       DateTime @default(now())
}
```

### Enum

```prisma
enum CallStatus {
  CREATED
  ACTIVE
  ENDED
  FAILED
}
```

---

## 11. Variables de entorno

### Backend

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/videocall_translate
REDIS_URL=redis://localhost:6379

JWT_SECRET=dev_secret_change_me
JWT_EXPIRES_IN=1d

LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

GEMINI_API_KEY=xxxx
GEMINI_MODEL=gemini-3.5-live-translate-preview

BILLING_ENABLED=false
ESTIMATED_GEMINI_COST_PER_MINUTE_USD=0.0368
```

### Frontend

```env
VITE_API_URL=http://localhost:3000
VITE_LIVEKIT_URL=ws://localhost:7880
```

---

## 12. Docker Compose sandbox

Servicios mínimos:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: videocall_translate
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  livekit:
    image: livekit/livekit-server:latest
    command: --dev
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
```

Para el sandbox se puede usar LiveKit en modo dev. Para producción habrá que configurar dominio, SSL, TURN, UDP y despliegue más robusto.

---

## 13. Flujo de audio recomendado para el MVP

### Audio original

LiveKit gestiona el audio/vídeo normal entre participantes.

```text
Usuario A mic/cam → LiveKit → Usuario B
Usuario B mic/cam → LiveKit → Usuario A
```

### Audio traducido

El sandbox debe añadir una segunda capa:

```text
Usuario A mic
↓
Frontend A captura audio en chunks
↓
NestJS translation gateway
↓
Gemini Live Translate es→en
↓
NestJS translation gateway
↓
Frontend B reproduce audio traducido
```

Y al revés:

```text
Usuario B mic
↓
Frontend B captura audio en chunks
↓
NestJS translation gateway
↓
Gemini Live Translate en→es
↓
NestJS translation gateway
↓
Frontend A reproduce audio traducido
```

---

## 14. Decisión de producto en el sandbox

Durante las pruebas se deben validar tres modos:

### Modo 1 — Solo audio traducido

El usuario escucha únicamente la traducción.

Ventaja:

* Experiencia más limpia.

Problema:

* Si hay latencia, la conversación puede sentirse rara.

---

### Modo 2 — Audio original bajo + traducción encima

El usuario escucha el idioma original con volumen bajo y la traducción encima.

Ventaja:

* Más natural.
* Permite percibir tono emocional.

Problema:

* Puede ser confuso.

---

### Modo 3 — Push to translate

El usuario activa traducción solo cuando lo necesita.

Ventaja:

* Más barato.
* Menos ruido.
* Más controlado para demo.

Problema:

* Menos mágico.

Recomendación para demo inicial:

```text
Modo 1: solo audio traducido
```

Luego añadir selector:

```text
Audio original: ON/OFF
Audio traducido: ON/OFF
```

---

## 15. Roadmap de desarrollo

## Fase 0 — Preparación técnica

Objetivo: dejar entorno listo.

Acciones:

1. Crear repositorio.
2. Crear monorepo simple:

```text
/apps/web
/apps/api
/docker-compose.yml
```

3. Configurar Yarn.
4. Crear Docker Compose con PostgreSQL, Redis y LiveKit.
5. Crear `.env.example`.
6. Validar LiveKit local.
7. Validar conexión básica con Gemini Live API desde script Node aislado.

Entregable:

* Entorno local levantado.
* Script `test-gemini-live-translate.ts` funcionando con audio de prueba o micrófono.

---

## Fase 1 — Videocall básica sin traducción

Objetivo: llamada 1:1 funcional.

Acciones:

1. Crear frontend React/Vite.
2. Crear backend NestJS.
3. Crear módulo Auth básico.
4. Crear módulo Calls.
5. Crear módulo LiveKit.
6. Implementar endpoint para crear llamada.
7. Implementar endpoint para obtener token LiveKit.
8. Integrar LiveKit React SDK.
9. Crear pantalla de llamada.
10. Mostrar vídeo local y remoto.
11. Activar/desactivar micro.
12. Activar/desactivar cámara.
13. Finalizar llamada.

Criterio de aceptación:

* Dos pestañas o dos navegadores pueden entrar en la misma llamada.
* Ambos usuarios se ven y se escuchan.
* La llamada queda registrada en PostgreSQL.

---

## Fase 2 — Integración Gemini aislada

Objetivo: probar traducción sin videollamada.

Acciones:

1. Crear módulo `translation`.
2. Crear servicio `GeminiLiveService`.
3. Abrir sesión con Gemini Live Translate.
4. Enviar audio desde un archivo o micrófono.
5. Recibir audio traducido.
6. Guardar logs técnicos.
7. Medir latencia básica.
8. Medir segundos de audio input/output.

Criterio de aceptación:

* Se envía audio en español.
* Se recibe audio en inglés.
* Se puede reproducir la respuesta traducida.
* Se registra duración y coste estimado.

---

## Fase 3 — Captura de audio desde frontend

Objetivo: enviar audio real del navegador al backend.

Acciones:

1. Usar `getUserMedia` para capturar micrófono.
2. Crear `AudioContext`.
3. Trocear audio en chunks.
4. Enviar chunks al backend por WebSocket.
5. Normalizar formato de audio requerido por Gemini.
6. Gestionar start/stop de stream.
7. Añadir logs en pantalla.

Criterio de aceptación:

* El frontend captura audio del micro.
* El backend recibe chunks correctamente.
* El backend puede reenviar esos chunks a Gemini.

---

## Fase 4 — Traducción en llamada 1:1

Objetivo: unir LiveKit + Gemini.

Acciones:

1. En la pantalla de llamada, añadir botón `Activar traducción`.
2. Al activar, abrir WebSocket de traducción.
3. Enviar audio local al backend.
4. Backend envía audio a Gemini.
5. Backend recibe audio traducido.
6. Backend identifica destinatario remoto.
7. Backend envía audio traducido al otro usuario.
8. Frontend remoto reproduce audio traducido.
9. Repetir el flujo inverso.

Criterio de aceptación:

* Usuario A habla español.
* Usuario B oye inglés hablado.
* Usuario B habla inglés.
* Usuario A oye español hablado.
* La latencia es aceptable para demo.
* Se puede desactivar la traducción.

---

## Fase 5 — Control de audio y UX mínima

Objetivo: que la demo sea comprensible y presentable.

Acciones:

1. Añadir selector:

   * escuchar audio original
   * escuchar audio traducido
   * escuchar ambos
2. Añadir indicador:

   * conectado
   * traduciendo
   * error Gemini
   * reconectando
3. Añadir contador de duración.
4. Añadir coste estimado.
5. Añadir idioma propio/remoto.
6. Añadir logs debug colapsables.
7. Añadir gestión básica de errores.

Criterio de aceptación:

* La demo puede enseñarse a negocio/equipo.
* Se entiende cuándo traduce.
* Se entiende cuánto tarda.
* Se entiende cuánto costaría.

---

## Fase 6 — Billing simulado

Objetivo: preparar modelo económico sin cobrar realmente.

Acciones:

1. Crear tabla `UsageRecord`.
2. Al iniciar traducción, guardar timestamp.
3. Al finalizar, calcular segundos.
4. Calcular coste estimado.
5. Mostrar coste en pantalla.
6. Guardar coste en PostgreSQL.
7. Añadir endpoint:

```text
GET /calls/:callId/usage
```

Respuesta:

```json
{
  "durationSeconds": 600,
  "inputAudioSeconds": 600,
  "outputAudioSeconds": 570,
  "estimatedCostUsd": 0.37
}
```

Criterio de aceptación:

* Cada llamada muestra duración y coste estimado.
* El equipo puede valorar viabilidad económica.

---

## Fase 7 — Evaluación de viabilidad

Objetivo: decidir si merece la pena desarrollar producto completo.

Métricas a recoger:

* Latencia media.
* Latencia máxima.
* Cortes de audio.
* Precisión de traducción.
* Naturalidad de la voz.
* Coste por minuto.
* Consumo por llamada.
* CPU/RAM backend.
* Estabilidad de LiveKit local.
* Problemas de eco.
* Problemas con doble audio.
* Nivel de satisfacción de usuarios internos.

Criterio de éxito:

```text
La demo se considera viable si:
- La latencia media es inferior a 3 segundos.
- La traducción es comprensible.
- La llamada se mantiene estable durante 15 minutos.
- El coste estimado por hora es asumible.
- El equipo puede identificar una ruta clara hacia producto.
```

---

## 16. Secuencia de acciones ordenada

### Día 1 — Setup base

1. Crear repositorio.
2. Crear estructura monorepo.
3. Crear `docker-compose.yml`.
4. Levantar PostgreSQL.
5. Levantar Redis.
6. Levantar LiveKit en modo dev.
7. Crear proyecto NestJS.
8. Crear proyecto React/Vite.
9. Crear `.env.example`.
10. Documentar comandos básicos.

Comandos esperados:

```bash
yarn install
docker compose up -d
yarn dev:api
yarn dev:web
```

---

### Día 2 — Backend base

1. Configurar Prisma.
2. Crear modelo User.
3. Crear modelo Call.
4. Crear modelo UsageRecord.
5. Crear migraciones.
6. Crear AuthModule.
7. Crear CallsModule.
8. Crear LiveKitModule.
9. Crear endpoint login.
10. Crear endpoint create call.
11. Crear endpoint get LiveKit token.

---

### Día 3 — Frontend videocall

1. Crear LoginPage.
2. Crear HomePage.
3. Crear CallPage.
4. Integrar LiveKit React SDK.
5. Conectar a room.
6. Mostrar cámara local.
7. Mostrar participante remoto.
8. Añadir controles de micro/cámara.
9. Añadir botón finalizar.
10. Probar llamada entre dos navegadores.

Primer hito:

```text
Videollamada 1:1 funcionando sin traducción.
```

---

### Día 4 — Gemini aislado

1. Crear script Node de prueba.
2. Conectar con Gemini Live Translate.
3. Enviar audio de prueba.
4. Recibir audio traducido.
5. Reproducir audio traducido.
6. Medir tiempo entre input y output.
7. Documentar formato exacto de audio requerido.
8. Crear `GeminiLiveService` en NestJS.

Segundo hito:

```text
Traducción voz a voz funcionando fuera de la llamada.
```

---

### Día 5 — Audio browser → backend

1. Crear TranslationGateway en NestJS.
2. Crear WebSocket desde frontend.
3. Capturar audio con Web Audio API.
4. Enviar chunks al backend.
5. Validar recepción.
6. Loggear tamaño/frecuencia de chunks.
7. Adaptar formato para Gemini.
8. Enviar stream a Gemini.

Tercer hito:

```text
El audio del navegador llega a Gemini.
```

---

### Día 6 — Audio traducido backend → remoto

1. Asociar cada socket con `callId` y `userId`.
2. Identificar destinatario remoto.
3. Recibir audio traducido de Gemini.
4. Enviar audio traducido al otro participante.
5. Reproducir audio recibido en frontend remoto.
6. Repetir flujo inverso.
7. Añadir botón activar/desactivar traducción.

Cuarto hito:

```text
Usuario A habla español y Usuario B oye inglés.
Usuario B habla inglés y Usuario A oye español.
```

---

### Día 7 — Pulido de demo

1. Añadir selector de idioma.
2. Añadir indicador de traducción activa.
3. Añadir contador de duración.
4. Añadir coste estimado.
5. Añadir gestión de errores.
6. Añadir modo debug.
7. Probar llamada de 15 minutos.
8. Documentar resultados.
9. Preparar demo interna.
10. Preparar informe de viabilidad.

---

## 17. Riesgos técnicos

### Latencia

Principal riesgo. La traducción voz a voz no será instantánea. Hay que validar si la experiencia es aceptable.

Mitigación:

* chunks pequeños
* WebSocket persistente
* evitar reprocesar audio
* medir timestamps
* permitir escuchar audio original opcionalmente

---

### Eco y doble audio

Si el usuario escucha audio original y traducido a la vez, puede ser confuso.

Mitigación:

* controles claros de audio
* por defecto solo traducción
* opción para bajar volumen original

---

### Coste

Cada minuto traducido genera coste.

Mitigación:

* billing simulado desde el inicio
* botón start/stop traducción
* cortar sesiones inactivas
* límites por usuario

---

### Complejidad de audio en navegador

La captura, chunking y reproducción de audio puede ser delicada.

Mitigación:

* empezar con flujo simple
* no optimizar prematuramente
* aislar lógica en `audio.service.ts`
* logs visibles

---

### API en preview

Gemini Live Translate está en preview, por lo que puede cambiar.

Mitigación:

* encapsular integración en `GeminiLiveService`
* no acoplar frontend a Gemini
* preparar adaptador futuro para otro proveedor

---

## 18. Decisiones técnicas iniciales

### Usar LiveKit desde el principio

Aunque WebRTC nativo sería más simple, LiveKit evita construir toda la infraestructura de llamadas desde cero y permite evolucionar hacia producto.

### Usar backend como puente de Gemini

La API key no debe ir al frontend. Además, el backend debe controlar consumo, sesiones y billing.

### PostgreSQL desde el inicio

Aunque el sandbox podría vivir sin base de datos, conviene registrar llamadas y consumo desde el primer día.

### Redis desde el inicio

Redis se usará para estado efímero de llamadas y traducción activa.

### Billing simulado

No se integrará Stripe todavía, pero se dejará preparado el cálculo de consumo.

---

## 19. Criterios de aceptación del sandbox

El sandbox se considerará completo cuando:

1. Dos usuarios puedan entrar en una llamada.
2. Ambos puedan verse y oírse.
3. Un usuario pueda hablar español.
4. El otro pueda oír audio traducido en inglés.
5. El segundo pueda hablar inglés.
6. El primero pueda oír audio traducido en español.
7. Se pueda activar/desactivar traducción.
8. Se registre duración de llamada.
9. Se registre duración de traducción.
10. Se calcule coste estimado.
11. Se pueda hacer una demo de al menos 15 minutos.
12. El equipo pueda evaluar si la latencia y calidad son aceptables.

---

## 20. Resultado esperado

Al terminar el sandbox tendremos una prueba funcional de una aplicación de videollamada 1:1 con traducción voz a voz en tiempo real.

El objetivo no es perfección, sino validar:

* viabilidad técnica
* latencia real
* coste real aproximado
* calidad de traducción
* complejidad de integración
* posible recorrido como producto

Si el resultado es positivo, el siguiente paso será evolucionar hacia una arquitectura más robusta con:

* agentes LiveKit
* TURN en producción
* despliegue cloud
* autenticación real
* billing con Stripe
* planes de uso
* logs avanzados
* observabilidad
* escalado horizontal
* soporte multi-idioma
* llamadas grupales
