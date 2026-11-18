import { IndexedDbRunStore, SCHEMA_VERSION } from '../adapters/indexeddb/run-store.ts'
import { preparePdfResources, renderClosurePdf, renderTechnicalPdf } from '../adapters/pdf/renderer.tsx'
import { RunApplication } from '../application/run-application.ts'
import { createRunPdfDownload, createTechnicalPdfDownload } from '../application/run-pdf.ts'
import logo from '../assets/tide-logo-rgb.png'
import { approvedContent } from '../content/approved-content.ts'
import { AppError } from '../domain/run.ts'
import stylesheet from '../ui/app.css?url&no-inline'

declare const __APP_BUILD__: string

function browserStorage(): IDBFactory | undefined {
  try {
    return globalThis.indexedDB
  } catch {
    return undefined
  }
}

const application = new RunApplication(new IndexedDbRunStore(browserStorage()), approvedContent, () => crypto.randomUUID())
const downloadRunPdf = createRunPdfDownload(application, renderClosurePdf)
const downloadTechnicalPdf = createTechnicalPdfDownload(application, renderTechnicalPdf)
let stylesheetLoads = 0

function stylesReady() {
  return getComputedStyle(document.documentElement).getPropertyValue('--tide-styles-ready').trim() === '1'
}

async function loadResources() {
  let link: HTMLLinkElement | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  const pdf = new AbortController()
  try {
    const styles = stylesReady() ? undefined : new Promise<void>((resolve, reject) => {
      link = document.createElement('link')
      link.rel = 'stylesheet'
      const url = new URL(stylesheet, document.baseURI)
      // Firefox kan gjenbruke et tomt eller avbrutt stilark fra dokumentets ressurslager.
      stylesheetLoads += 1
      if (stylesheetLoads > 1) url.searchParams.set('retry', String(stylesheetLoads))
      link.href = url.href
      link.onload = () => stylesReady() ? resolve() : reject()
      link.onerror = reject
      document.head.append(link)
    })
    const image = new Image()
    image.src = logo
    await Promise.race([
      Promise.all([styles, image.decode(), preparePdfResources(pdf.signal)]),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          pdf.abort()
          reject(new AppError('resource_load'))
        }, 5000)
      }),
    ])
  } catch {
    if (!stylesReady()) link?.remove()
    throw new AppError('resource_load')
  } finally {
    pdf.abort()
    clearTimeout(timeout)
    if (link) {
      link.onload = null
      link.onerror = null
    }
  }
}

async function prepare() {
  await loadResources()
  return application.open()
}

async function requestPersistence() {
  try {
    const storage = navigator.storage
    if (await storage?.persisted?.()) return true
    return (await storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

function report(error: unknown) {
  console.warn('Tide', { code: error instanceof AppError ? error.code : 'unexpected', build: __APP_BUILD__, schema: SCHEMA_VERSION })
}

export const app = { application, downloadRunPdf, downloadTechnicalPdf, logo, prepare, requestPersistence, report }
