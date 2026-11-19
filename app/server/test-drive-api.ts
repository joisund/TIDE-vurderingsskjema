import type { IncomingMessage, ServerResponse } from 'node:http'
import { testDriveApiPath } from '../src/content/test-drive-api.ts'
import type { CreateTestDrive } from '../src/content/test-drive-api.ts'
import { testDriveOptionalFields } from '../src/content/test-drive.v1.ts'
import type { TestDriveHeader } from '../src/content/test-drive.v1.ts'
import { PilotError, pilotSessionLifetime, TestDriveStore } from './test-drive-store.ts'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const jsonLimit = 8192

function invalid(): never { throw new PilotError(400, 'invalid_input') }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}

function text(value: unknown, length: number) {
  if (typeof value !== 'string' || value.length > length) invalid()
  if (Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) invalid()
  return value.trim()
}

function emailAddress(value: unknown) {
  const email = text(value, 254).toLowerCase()
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@pilot\.test$/.test(email)) invalid()
  return email
}

function validateHeader(value: unknown): TestDriveHeader {
  const data = object(value)
  const result: TestDriveHeader = {}
  for (const { id } of testDriveOptionalFields) {
    if (data[id] === undefined) continue
    const value = text(data[id], 120)
    if (!value) continue
    if (id === 'driveDate') {
      const date = new Date(`${value}T00:00:00.000Z`)
      if (!/^\d{4}-\d\d-\d\d$/.test(value) || !Number.isFinite(date.getTime()) || !date.toISOString().startsWith(value)) invalid()
    }
    result[id] = value
  }
  return result
}

function createInput(body: Record<string, unknown>): CreateTestDrive {
  const requestId = text(body.requestId, 36).toLowerCase()
  const departmentId = text(body.departmentId, 100)
  const candidateName = text(body.candidateName, 120)
  const candidateEmail = emailAddress(body.candidateEmail)
  const instructorId = text(body.instructorId, 100)
  const expiresAt = text(body.expiresAt, 35)
  if (!uuid.test(requestId) || !departmentId || !candidateName || !instructorId) invalid()
  const expiry = new Date(expiresAt)
  if (!Number.isFinite(expiry.getTime()) || expiry.toISOString() !== expiresAt) throw new PilotError(400, 'invalid_expiry')
  return { requestId, departmentId, candidateName, candidateEmail, instructorId, expiresAt, header: validateHeader(body.header ?? {}) }
}

async function readJson(request: IncomingMessage) {
  if (request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    throw new PilotError(415, 'json_required')
  }
  if (Number(request.headers['content-length']) > jsonLimit) throw new PilotError(413, 'body_too_large')
  const chunks: Buffer[] = []
  let size = 0
  let oversized = false
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > jsonLimit) oversized = true
    if (!oversized) chunks.push(buffer)
  }
  if (oversized) throw new PilotError(413, 'body_too_large')
  let value: unknown
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { invalid() }
  return object(value)
}

function sessionToken(request: IncomingMessage, cookieName: string) {
  for (const field of (request.headers.cookie ?? '').split(';')) {
    const [name, value] = field.trim().split('=', 2)
    if (name === cookieName && value && /^[a-f0-9-]{72}$/.test(value)) return value
  }
  return ''
}

function setSession(response: ServerResponse, origin: URL, cookieName: string, value: string) {
  const maxAge = value ? pilotSessionLifetime / 1000 : 0
  const secure = origin.protocol === 'https:' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${cookieName}=${value}; Path=${testDriveApiPath}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`)
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body))
}

export function isTestDriveApiPath(path: string) {
  const pathname = path.split('?', 1)[0]
  return pathname === testDriveApiPath || pathname?.startsWith(`${testDriveApiPath}/`)
}

export function createTestDriveApi(store: TestDriveStore, origin: URL, clock = Date.now) {
  const cookieName = `tide_test_drive_${origin.port || (origin.protocol === 'https:' ? '443' : '80')}`
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    try {
      if (request.headers.host !== origin.host) throw new PilotError(403, 'origin_forbidden')
      const method = request.method
      if (method !== 'GET' && method !== 'POST') throw new PilotError(405, 'method_not_allowed')
      if (method === 'POST' && request.headers.origin !== origin.origin) throw new PilotError(403, 'origin_forbidden')

      const path = new URL(request.url ?? '/', origin).pathname.slice(testDriveApiPath.length)
      const body = method === 'POST' ? await readJson(request) : {}
      const now = clock()
      const token = sessionToken(request, cookieName)
      if (method === 'POST' && path === '/auth/code') {
        const challengeId = store.requestCode(emailAddress(body.email), now)
        return json(response, 202, { challengeId })
      }
      if (method === 'POST' && path === '/auth/verify') {
        const email = emailAddress(body.email)
        const challengeId = text(body.challengeId, 36)
        const code = text(body.code, 6)
        if (!uuid.test(challengeId) || !/^\d{6}$/.test(code)) throw new PilotError(401, 'invalid_code')
        const verified = store.verifyCode(email, challengeId, code, now)
        if (token) store.signOut(token)
        setSession(response, origin, cookieName, verified)
        return json(response, 200, { signedIn: true })
      }
      if (method === 'POST' && path === '/auth/logout') {
        if (token) store.signOut(token)
        setSession(response, origin, cookieName, '')
        return json(response, 200, { signedIn: false })
      }

      const account = store.authenticate(token, now)
      if (method === 'GET' && path === '/workspace') return json(response, 200, store.workspace(account, now, origin.origin))
      if (method === 'POST' && path === '/runs') {
        const result = store.createRun(account, createInput(body), now, origin.origin)
        return json(response, result.created ? 201 : 200, result.run)
      }

      const route = /^\/runs\/([^/]+)(\/revoke)?$/.exec(path)
      const id = route?.[1]
      if (id && uuid.test(id)) {
        if (method === 'GET' && !route?.[2]) {
          return json(response, 200, store.withAssignment(account.id, id, now, run => store.detail(run)))
        }
        if (method === 'POST' && route?.[2]) return json(response, 200, store.revokeCandidate(account, id, now, origin.origin))
      }
      throw new PilotError(404, 'not_found')
    } catch (error) {
      if (error instanceof PilotError) return json(response, error.status, { error: error.code })
      console.error('Pilot-API: intern feil', error instanceof Error ? error.name : typeof error)
      return json(response, 500, { error: 'server_error' })
    }
  }
}
