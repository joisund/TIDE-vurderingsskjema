import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { test } from 'node:test'
import { pdfBlobFromStream } from '../src/adapters/pdf/pdf-stream.ts'

const turn = () => new Promise<void>(resolve => setImmediate(resolve))

test('PDF-strømfeil avviser delvis fil og nytt forsøk får en komplett Blob', async () => {
  const broken = new PassThrough()
  const failed = pdfBlobFromStream(async () => broken)
  const expected = assert.rejects(failed, /simulert strømfeil/)
  await turn()
  broken.write('%PDF-')
  broken.emit('error', new Error('simulert strømfeil'))
  await expected
  await turn()
  assert.equal(broken.listenerCount('data'), 0)
  assert.equal(broken.listenerCount('error'), 0)

  const retry = new PassThrough()
  const file = pdfBlobFromStream(async () => retry, undefined, prefix => assert.equal(prefix, '%PDF-1.3\n%%EOF'))
  retry.end('%PDF-1.3\n%%EOF')
  assert.equal((await file).type, 'application/pdf')
})

test('avbrudd frigjør pågående PDF-strøm og påventet layout', async () => {
  const streaming = new PassThrough()
  const controller = new AbortController()
  const file = pdfBlobFromStream(async () => streaming, controller.signal)
  const stopped = assert.rejects(file, { name: 'AbortError' })
  await turn()
  streaming.write('%PDF-')
  controller.abort()
  await stopped
  assert.ok(streaming.isPaused())
  assert.ok(streaming.destroyed)
  assert.equal(streaming.listenerCount('data'), 0)
  assert.equal(streaming.listenerCount('end'), 0)

  const pending = Promise.withResolvers<PassThrough>()
  const pendingController = new AbortController()
  const stoppedLayout = assert.rejects(pdfBlobFromStream(() => pending.promise, pendingController.signal), { name: 'AbortError' })
  await turn()
  pendingController.abort()
  await stoppedLayout
  const late = new PassThrough({ emitClose: false })
  pending.resolve(late)
  await turn()
  assert.ok(late.isPaused())
  assert.ok(late.destroyed)
  assert.equal(late.listenerCount('data'), 0)
  assert.doesNotThrow(() => late.emit('error', new Error('sen strømfeil')))
  late.emit('close')
  assert.equal(late.listenerCount('error'), 0)
})
