import type { ClosureSnapshot } from '../domain/closure.ts'
import type { RunApplication } from './run-application.ts'

export type RenderClosurePdf = (source: ClosureSnapshot, signal?: AbortSignal) => Promise<Blob>
export type DownloadRunPdf = (runId: string, signal?: AbortSignal) => Promise<{ blob: Blob; filename: string }>

export class PdfRenderingError extends Error {}

export function createRunPdfDownload(application: RunApplication, render: RenderClosurePdf): DownloadRunPdf {
  return async (runId, signal) => {
    const source = await application.withOpenStorage(() => application.readClosureSnapshot(runId))
    signal?.throwIfAborted()
    // Lagringstransaksjonen er ferdig før dokumentet komponeres.
    const blob = await render(source, signal)
    signal?.throwIfAborted()
    if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('PDF-filen kunne ikke opprettes.')
    return { blob, filename: `kjorevurdering-${source.history.firstDay.date}-${runId}.pdf` }
  }
}
