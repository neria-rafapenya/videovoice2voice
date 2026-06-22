import { spawnSync } from 'node:child_process'

const dockerCheck = spawnSync('docker', ['info'], { stdio: 'ignore' })

if (dockerCheck.error || dockerCheck.status !== 0) {
  console.warn('[infra] Docker no está disponible; se omite el arranque de postgres/livekit/redis.')
  process.exit(0)
}

const compose = spawnSync('docker', ['compose', '-p', 'videovoice2voice', 'up', '-d', '--remove-orphans'], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(compose.status ?? 1)
