import { IndexedDbRunStore, SCHEMA_VERSION } from '../adapters/indexeddb/run-store.ts'
import { RunApplication } from '../application/run-application.ts'
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
let stylesheetLoads = 0

function stylesReady() {
  return getComputedStyle(document.documentElement).getPropertyValue('--tide-styles-ready').trim() === '1'
}

async function loadResources() {
  let link: HTMLLinkElement | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
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
      Promise.all([styles, image.decode()]),
      new Promise<never>((_, reject) => { timeout = setTimeout(reject, 5000) }),
    ])
  } catch {
    if (!stylesReady()) link?.remove()
    throw new AppError('resource_load')
  } finally {
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

export const app = { application, logo, prepare, requestPersistence, report }
