import { Document, Font, Image, Page, Text, pdf } from '@react-pdf/renderer'
import { PdfRenderingError } from '../../application/run-pdf.ts'
import type { RenderClosurePdf, RenderLinePdf, RenderTechnicalPdf } from '../../application/run-pdf.ts'
import { linePdfLayoutVersion } from '../../domain/line-training.ts'
// Originalen rendret på hvit papirflate, med samme pikselmål og uten alfakanal.
// Da trenger ikke PDFKit å starte en ny PNG-dekodingsworker per side.
import logo from './tide-logo-pdf.png?inline'
import regularFont from './fonts/NotoSans-Regular.ttf?url&no-inline'
import boldFont from './fonts/NotoSans-Bold.ttf?url&no-inline'
import { closureDocument, pdfFont } from './closure-document.tsx'
import { pdfBlobFromStream } from './pdf-stream.ts'
import { technicalDocument } from './technical-document.tsx'
import { lineDocument } from './line-document.tsx'

let pdfReady = false
let preparation: { signal: AbortSignal; done: Promise<void> } | undefined

async function fontData(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('PDF-fonten kunne ikke lastes.')
  const bytes = await response.blob()
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener('abort', abort, { once: true })
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.onabort = () => reject(signal.reason)
    reader.onloadend = () => signal.removeEventListener('abort', abort)
    reader.readAsDataURL(bytes)
  })
}

export async function preparePdfResources(signal: AbortSignal) {
  if (pdfReady) return
  if (preparation?.signal.aborted) await preparation.done.catch(() => undefined)
  if (pdfReady) return
  preparation ??= { signal, done: loadPdfResources(signal).finally(() => { preparation = undefined }) }
  return preparation.done
}

async function loadPdfResources(signal: AbortSignal) {
  const [regular, bold] = await Promise.all([fontData(regularFont, signal), fontData(boldFont, signal)])
  signal.throwIfAborted()
  Font.register({ family: pdfFont, fonts: [{ src: regular, fontWeight: 400 }, { src: bold, fontWeight: 700 }] })
  Font.registerHyphenationCallback(word => [word])
  try {
    const fonts = await Promise.allSettled(([400, 700] as const).map(fontWeight => Font.load({
      fontFamily: pdfFont, fontStyle: 'normal', fontWeight,
    })))
    if (fonts.some(font => font.status === 'rejected')) throw new Error('PDF-fonten kunne ikke klargjøres.')
    signal.throwIfAborted()
    // Første render starter layoutmotorens WASM og klargjør logoen for PDF.
    await pdfBlobFromStream(() => pdf(
      <Document>
        <Page size="A4" style={{ fontFamily: pdfFont }}>
          <Image src={logo} style={{ width: 17 }} />
          <Text>PDF</Text>
          <Text style={{ fontWeight: 700 }}>PDF</Text>
        </Page>
      </Document>,
    ).toBuffer(), signal)
    pdfReady = true
  } catch (error) {
    // FontStore beholder et mislykket Promise for hver registrerte font.
    Font.clear()
    throw error
  }
}

export const renderClosurePdf: RenderClosurePdf = async (source, signal) => {
  if (!pdfReady) throw new Error('PDF-ressursene er ikke klare.')
  switch (source.pdfLayoutVersion) {
    case 1:
    case 2:
      break
    default:
      throw new PdfRenderingError('PDF-oppsettet støttes ikke.')
  }
  return pdfBlobFromStream(() => pdf(closureDocument({ logo, source })).toBuffer(), signal, prefix => {
    const firstBox = /^\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/m.exec(prefix)
    if (!firstBox || Math.abs(Number(firstBox[1]) - 841.89) > 0.02 || Math.abs(Number(firstBox[2]) - 595.28) > 0.02) {
      throw new PdfRenderingError('Vurderingsmatrisen fikk ikke plass på en liggende A4-side.')
    }
  })
}

export const renderTechnicalPdf: RenderTechnicalPdf = async (source, signal) => {
  if (!pdfReady) throw new PdfRenderingError('PDF-skriften og de øvrige ressursene er ikke klargjort.')
  if (source.pdfLayoutVersion !== 1) throw new PdfRenderingError('PDF-oppsettet for teknisk opplæring støttes ikke.')
  return pdfBlobFromStream(() => pdf(technicalDocument({ logo, source })).toBuffer(), signal)
}

export const renderLinePdf: RenderLinePdf = async (source, signal) => {
  if (!pdfReady) throw new PdfRenderingError('PDF-skriften og de øvrige ressursene er ikke klargjort.')
  if (source.pdfLayoutVersion !== linePdfLayoutVersion) throw new PdfRenderingError('PDF-oppsettet for linjeopplæring støttes ikke.')
  return pdfBlobFromStream(() => pdf(lineDocument({ logo, source })).toBuffer(), signal)
}
