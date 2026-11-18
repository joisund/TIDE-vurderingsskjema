type StreamEvents = { data: [Uint8Array]; end: []; error: [unknown]; close: [] }

type PdfStream = {
  on<Event extends keyof StreamEvents>(event: Event, listener: (...args: StreamEvents[Event]) => void): void
  off<Event extends keyof StreamEvents>(event: Event, listener: (...args: StreamEvents[Event]) => void): void
  pause(): void
  destroy?(): void
}

function discard(stream: PdfStream) {
  // En avbrutt strøm kan fortsatt rapportere feil frem til den er lukket.
  const ignore = () => undefined
  const closed = () => {
    stream.off('error', ignore)
    stream.off('close', closed)
  }
  stream.on('error', ignore)
  stream.on('close', closed)
  stream.pause()
  stream.destroy?.()
}

function prefixOf(chunks: readonly Uint8Array[]): string {
  const decoder = new TextDecoder()
  let remaining = 64 * 1024
  let prefix = ''
  for (const chunk of chunks) {
    const bytes = chunk.subarray(0, remaining)
    prefix += decoder.decode(bytes, { stream: true })
    remaining -= bytes.length
    if (!remaining) break
  }
  return prefix + decoder.decode()
}

// PDFKit bruker en lett, Node-lignende lesestrøm i nettleserbygget.
export function pdfBlobFromStream(
  open: () => Promise<PdfStream>, signal?: AbortSignal, checkPrefix?: (prefix: string) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let stream: PdfStream | undefined
    let settled = false
    const chunks: Uint8Array<ArrayBuffer>[] = []

    function cleanup() {
      settled = true
      signal?.removeEventListener('abort', aborted)
      stream?.off('data', read)
      stream?.off('end', ended)
      stream?.off('error', failed)
      chunks.length = 0
    }
    function read(chunk: Uint8Array) {
      chunks.push(chunk instanceof Uint8Array && chunk.buffer instanceof ArrayBuffer
        ? chunk as Uint8Array<ArrayBuffer> : new Uint8Array(chunk))
    }
    function ended() {
      try {
        if (checkPrefix) checkPrefix(prefixOf(chunks))
        const blob = new Blob(chunks, { type: 'application/pdf' })
        cleanup()
        resolve(blob)
      } catch (error) {
        failed(error)
      }
    }
    function failed(error: unknown) {
      if (settled) return
      cleanup()
      if (stream) discard(stream)
      reject(error)
    }
    function aborted() {
      failed(signal?.reason)
    }

    if (signal?.aborted) return aborted()
    signal?.addEventListener('abort', aborted, { once: true })
    void Promise.resolve().then(() => {
      signal?.throwIfAborted()
      return open()
    }).then(result => {
      if (settled) {
        discard(result)
        return
      }
      stream = result
      result.on('error', failed)
      result.on('end', ended)
      result.on('data', read)
    }).catch(failed)
  })
}
