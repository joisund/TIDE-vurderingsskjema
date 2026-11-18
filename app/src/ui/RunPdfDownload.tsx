import { useLayoutEffect, useRef, useState } from 'react'
import type { DownloadRunPdf } from '../application/run-pdf.ts'
import { PdfRenderingError } from '../application/run-pdf.ts'
import { ClosureSnapshotError } from '../domain/closure.ts'
import { AppError } from '../domain/run.ts'

type Props = { runId: string; busy: boolean; downloadRunPdf: DownloadRunPdf; report: (error: unknown) => void }

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    // Nedlastingen kan lese Blob asynkront etter klikket.
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}

function errorMessage(error: unknown) {
  if (error instanceof ClosureSnapshotError) return `PDF-en kunne ikke opprettes. ${error.detail}`
  if (error instanceof PdfRenderingError) return `PDF-en kunne ikke opprettes. ${error.message}`
  if (error instanceof AppError && error.code === 'locked') {
    return 'PDF er tilgjengelig når løpet er avsluttet og lagret på denne enheten.'
  }
  return 'PDF-en kunne ikke opprettes. Prøv igjen.'
}

export function RunPdfDownload({ runId, busy, downloadRunPdf, report }: Props) {
  const attempt = useRef<AbortController>(undefined)
  const [generating, setGenerating] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')

  useLayoutEffect(() => {
    if (busy) attempt.current?.abort()
  }, [busy])

  useLayoutEffect(() => {
    const cancel = () => attempt.current?.abort()
    window.addEventListener('pagehide', cancel)
    return () => {
      window.removeEventListener('pagehide', cancel)
      cancel()
      attempt.current = undefined
    }
  }, [])

  async function startDownload() {
    if (busy || attempt.current) return
    const active = new AbortController()
    attempt.current = active
    setFailure('')
    setNotice('Lager PDF …')
    setGenerating(true)
    try {
      const { blob, filename } = await downloadRunPdf(runId, active.signal)
      if (active.signal.aborted) return
      downloadBlob(blob, filename)
      setNotice('PDF-filen er klar.')
    } catch (error) {
      if (active.signal.aborted) return
      report(error)
      setFailure(errorMessage(error))
      setNotice('')
    } finally {
      if (attempt.current === active) {
        attempt.current = undefined
        setGenerating(false)
        if (active.signal.aborted) setNotice('')
      }
    }
  }

  return (
    <>
      <div className="actions">
        <button type="button" className="button primary" aria-disabled={busy || generating}
          aria-describedby={failure ? 'run-pdf-error' : undefined} onClick={() => { void startDownload() }}>
          {failure ? 'Prøv å laste ned PDF igjen' : 'Last ned PDF'}
        </button>
      </div>
      <p aria-live="polite" aria-atomic="true">{notice}</p>
      {failure && <p className="field-error" id="run-pdf-error" role="alert">{failure}</p>}
    </>
  )
}
