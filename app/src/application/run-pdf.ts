import type { ClosureSnapshot } from '../domain/closure.ts'
import type { RunApplication } from './run-application.ts'
import type { TechnicalSelection, TechnicalSnapshot } from '../domain/technical-training.ts'
import type { LineSelection, LineTrainingSnapshot } from '../domain/line-training.ts'

export type RenderClosurePdf = (source: ClosureSnapshot, signal?: AbortSignal) => Promise<Blob>
export type DownloadRunPdf = (runId: string, signal?: AbortSignal) => Promise<{ blob: Blob; filename: string }>
export type RenderTechnicalPdf = (source: TechnicalSnapshot, signal?: AbortSignal) => Promise<Blob>
export type DownloadTechnicalPdf = (document: TechnicalSelection, signal?: AbortSignal) => Promise<{ blob: Blob; filename: string }>
export type RenderLinePdf = (source: LineTrainingSnapshot, signal?: AbortSignal) => Promise<Blob>
export type LinePdfAddress = LineSelection & { sourceVersion?: number }
export type DownloadLinePdf = (document: LinePdfAddress, signal?: AbortSignal) => Promise<{ blob: Blob; filename: string }>

export class PdfRenderingError extends Error {}

function createDocumentPdfDownload<Address, Source>(
  read: (address: Address) => Promise<Source>,
  render: (source: Source, signal?: AbortSignal) => Promise<Blob>,
  filename: (source: Source) => string,
) {
  return async (address: Address, signal?: AbortSignal) => {
    const source = await read(address)
    signal?.throwIfAborted()
    // Lagringstransaksjonen er ferdig før dokumentet komponeres.
    const blob = await render(source, signal)
    signal?.throwIfAborted()
    if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('PDF-filen kunne ikke opprettes.')
    return { blob, filename: filename(source) }
  }
}

export function createRunPdfDownload(application: RunApplication, render: RenderClosurePdf): DownloadRunPdf {
  return createDocumentPdfDownload(
    runId => application.withOpenStorage(() => application.readClosureSnapshot(runId)),
    render, source => `kjorevurdering-${source.history.firstDay.date}-${source.history.id}.pdf`,
  )
}

export function createTechnicalPdfDownload(application: RunApplication, render: RenderTechnicalPdf): DownloadTechnicalPdf {
  const readSelected = (document: TechnicalSelection) =>
    application.withOpenStorage(() => application.readTechnicalSnapshot(document, true))
  return createDocumentPdfDownload(
    readSelected, async (source, signal) => {
      const blob = await render(source, signal)
      signal?.throwIfAborted()
      await readSelected(source)
      return blob
    }, source => `teknisk-opplaering-${source.header.trainingDate}-${source.documentId}.pdf`,
  )
}

export function createLinePdfDownload(application: RunApplication, render: RenderLinePdf): DownloadLinePdf {
  const readSelected = (document: LinePdfAddress) =>
    application.withOpenStorage(() => application.readLineSnapshot(document, document.sourceVersion, true))
  return createDocumentPdfDownload(
    readSelected, async (source, signal) => {
      const blob = await render(source, signal)
      signal?.throwIfAborted()
      await readSelected(source)
      return blob
    }, source => `linjeopplaering-v${source.sourceVersion}-${source.documentId}.pdf`,
  )
}
