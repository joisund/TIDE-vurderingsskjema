import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createSecureServer } from 'node:https'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { testDrivePath } from '../src/content/test-drive-api.ts'
import { pilotDatabaseFile, pilotStaticRoot } from './pilot-config.ts'
import { createTestDriveApi, isTestDriveApiPath } from './test-drive-api.ts'
import { TestDriveStore } from './test-drive-store.ts'

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

async function serveStatic(request: IncomingMessage, response: ServerResponse, origin: URL) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', 'no-cache')
  if (request.headers.host !== origin.host) return response.writeHead(403).end()
  if (request.method !== 'GET' && request.method !== 'HEAD') return response.writeHead(405).end()

  const path = (request.url ?? '/').split('?', 1)[0]
  if (!path || !/^\/(?:[\w-][\w.-]*\/)*[\w.-]*\/?$/.test(path) || path.split('/').some(part => part.startsWith('.'))) {
    return response.writeHead(404).end()
  }
  const relative = ['/', testDrivePath, testDrivePath.slice(0, -1)].includes(path) ? 'index.html' : path.slice(1)
  const contentType = contentTypes[extname(relative)]
  if (!contentType) return response.writeHead(404).end()

  try {
    const data = await readFile(join(pilotStaticRoot, relative))
    response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length })
    return response.end(request.method === 'HEAD' ? undefined : data)
  } catch {
    return response.writeHead(404).end()
  }
}

type PilotOptions = { host: string; port: number; publicOrigin?: string; key?: string; cert?: string }

export function startPilotServer(store: TestDriveStore, { host, port, publicOrigin, key, cert }: PilotOptions) {
  const hostInUrl = host.includes(':') ? `[${host}]` : host
  let origin = new URL(publicOrigin ?? `http://${hostInUrl}:${port}`)
  const secure = origin.protocol === 'https:'
  const loopback = host === '127.0.0.1' || host === '::1'
  const loopbackOrigin = ['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname)
  if (!Number.isInteger(port) || port < 0 || port > 65535 || origin.href !== `${origin.origin}/` ||
    (secure ? !key || !cert : origin.protocol !== 'http:' || !loopback || !loopbackOrigin || key || cert)) {
    throw new Error('Bruk loopback for HTTP. HTTPS krever PILOT_ORIGIN, PILOT_TLS_KEY og PILOT_TLS_CERT.')
  }

  try { readFileSync(join(pilotStaticRoot, 'index.html')) } catch {
    throw new Error('Kjør «npm run build» før du starter piloten.')
  }

  let handleApi: ReturnType<typeof createTestDriveApi>
  const handler = (request: IncomingMessage, response: ServerResponse) => {
    if (isTestDriveApiPath(request.url ?? '/')) void handleApi(request, response)
    else void serveStatic(request, response, origin)
  }
  const server = secure ? createSecureServer({ key: readFileSync(key!), cert: readFileSync(cert!) }, handler) : createServer(handler)
  server.on('listening', () => {
    const bound = server.address()
    if (!publicOrigin && port === 0 && bound && typeof bound !== 'string') origin = new URL(`http://${hostInUrl}:${bound.port}`)
    handleApi = createTestDriveApi(store, origin)
  })
  return server.listen(port, host)
}

if (import.meta.main) {
  const store = new TestDriveStore(pilotDatabaseFile())
  const host = process.env.PILOT_BIND ?? '127.0.0.1'
  const port = Number(process.env.PILOT_PORT ?? '4173')
  const publicOrigin = process.env.PILOT_ORIGIN
  const server = startPilotServer(store, { host, port, publicOrigin, key: process.env.PILOT_TLS_KEY, cert: process.env.PILOT_TLS_CERT })
  server.on('close', () => store.database.close())
  server.on('listening', () => {
    const bound = server.address()
    const hostname = host.includes(':') ? `[${host}]` : host
    const origin = publicOrigin ?? `http://${hostname}:${bound && typeof bound !== 'string' ? bound.port : port}`
    console.log(`Testkjøring ${new URL(testDrivePath, origin).href}`)
  })
}
