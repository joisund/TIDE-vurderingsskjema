import { useLayoutEffect, useRef, useState } from 'react'
import type { DownloadRunPdf } from '../application/run-pdf.ts'
import { PdfRenderingError } from '../application/run-pdf.ts'
import { ClosureSnapshotError } from '../domain/closure.ts'
import { AppError } from '../domain/run.ts'
import { explain } from './app-errors.ts'

type Props = { runId: string; busy: boolean; downloadRunPdf: DownloadRunPdf; report: (error: unknown) => void }
type PdfFailure = string | { message: string; reload: () => void }

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
  return <PdfDownload busy={busy} download={signal => downloadRunPdf(runId, signal)} report={report}
    describeError={errorMessage} />
}

function technicalPdfError(error: unknown) {
  if (error instanceof AppError && error.code === 'locked') return 'PDF er tilgjengelig når dokumentet er bekreftet og lagret.'
  if (error instanceof AppError) return `PDF-en kunne ikke opprettes. ${explain(error)}`
  if (error instanceof PdfRenderingError) return `PDF-en kunne ikke opprettes. ${error.message}`
  return 'PDF-en kunne ikke opprettes. Prøv igjen.'
}

export function PdfDownload({ busy, download, report, label = 'Last ned PDF', describeError = technicalPdfError, cancelWhenHidden = false }: {
  busy: boolean
  download: (signal: AbortSignal) => Promise<{ blob: Blob; filename: string }>
  report: (error: unknown) => void
  label?: string
  describeError?: (error: unknown) => PdfFailure
  cancelWhenHidden?: boolean
}) {
  const attempt = useRef<AbortController>(undefined)
  const [generating, setGenerating] = useState(false)
  const [failure, setFailure] = useState<PdfFailure>('')
  const [notice, setNotice] = useState('')

  useLayoutEffect(() => {
    if (busy) attempt.current?.abort()
  }, [busy])

  useLayoutEffect(() => {
    const cancel = () => attempt.current?.abort()
    const onHidden = () => { if (document.visibilityState === 'hidden') cancel() }
    window.addEventListener('pagehide', cancel)
    if (cancelWhenHidden) document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', cancel)
      document.removeEventListener('visibilitychange', onHidden)
      cancel()
      attempt.current = undefined
    }
  }, [cancelWhenHidden])

  async function startDownload() {
    if (busy || attempt.current || (cancelWhenHidden && document.visibilityState === 'hidden')) return
    const active = new AbortController()
    attempt.current = active
    setFailure('')
    setNotice('Lager PDF …')
    setGenerating(true)
    try {
      const { blob, filename } = await download(active.signal)
      if (cancelWhenHidden && document.visibilityState === 'hidden') active.abort()
      if (active.signal.aborted) return
      downloadBlob(blob, filename)
      setNotice('PDF-filen er klar.')
    } catch (error) {
      if (active.signal.aborted) return
      report(error)
      setFailure(describeError(error))
      setNotice('')
    } finally {
      if (attempt.current === active) {
        attempt.current = undefined
        setGenerating(false)
        if (active.signal.aborted) setNotice('')
      }
    }
  }

  const reload = typeof failure !== 'string'
  return (
    <>
      <div className="actions">
        <button type="button" className="button primary" aria-disabled={busy || generating}
          aria-describedby={failure ? 'run-pdf-error' : undefined} onClick={() => {
            if (busy || generating) return
            if (reload) failure.reload()
            else void startDownload()
          }}>
          {reload ? 'Last siden på nytt' : failure ? 'Prøv å laste ned PDF igjen' : label}
        </button>
      </div>
      <p aria-live="polite" aria-atomic="true">{notice}</p>
      {failure && <p className="field-error" id="run-pdf-error" role="alert">{reload ? failure.message : failure}</p>}
    </>
  )
}
