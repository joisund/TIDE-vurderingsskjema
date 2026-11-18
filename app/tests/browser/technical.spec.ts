import { readFile, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { TechnicalSnapshot } from '../../src/domain/technical-training.ts'

const instructor = 'Øyvind Fiktiv'
const driver = 'Åse Øvelø'
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const label = (page: Page, name: string) => page.getByLabel(name, { exact: true })
const role = (page: Page, value: string) => label(page, 'Simuleringsrolle').selectOption(value)
const boxesFor = (page: Page) => page.getByRole('checkbox', { name: /^Gjennomgått/ })

function longReason(prefix: string) {
  const tail = ` ${prefix} sluttmerke ÆØÅ æøå åäö`
  const body = (`${prefix} Fiktiv begrunnelse om kjøretøy og utstyr med æøå og åäö. `).repeat(210)
  return body.slice(0, 10_000 - tail.length) + tail
}

async function registerCandidate(page: Page) {
  await page.goto('/')
  await role(page, 'instruktør')
  await button(page, 'Opprett sjåfør').click()
  await label(page, 'Sjåførnavn').fill(driver)
  await label(page, 'Ansattnummer').fill('DEMO-32')
  await button(page, 'Opprett ny registrering').click()
}

async function enterHeader(page: Page, busType: string) {
  await label(page, 'Instruktørnavn').fill(instructor)
  await label(page, 'Busstype').fill(busType)
  await label(page, 'Opplæringsdato').fill('2028-02-29')
}

async function openTechnicalDraft(page: Page) {
  await registerCandidate(page)
  await button(page, 'Ny teknisk opplæring').click()
  await enterHeader(page, 'Volvo K1')
  await button(page, 'Opprett teknisk opplæring').click()
  await button(page, 'Kontroller teknisk opplæring').waitFor()
  await role(page, 'sjåfør')
  await expect(boxesFor(page)).toHaveCount(52)
}

test('sjåføren fører selv den tekniske sjekklisten, instruktøren låser og begge kan hente PDF', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await registerCandidate(page)
  await button(page, 'Ny teknisk opplæring').click()
  await button(page, 'Opprett teknisk opplæring').click()
  await expect(label(page, 'Instruktørnavn')).toHaveAttribute('aria-invalid', 'true')
  await expect(label(page, 'Busstype')).toHaveAttribute('aria-invalid', 'true')
  await expect(label(page, 'Opplæringsdato')).toHaveAttribute('aria-invalid', 'true')
  await enterHeader(page, 'Volvo K1')
  await button(page, 'Opprett teknisk opplæring').click()
  await button(page, 'Kontroller teknisk opplæring').click()
  const issueHeading = page.getByRole('heading', { name: 'Mangler før bekreftelse' })
  await expect(issueHeading).toBeFocused()
  await button(page, 'Kontroller teknisk opplæring').focus()
  await button(page, 'Kontroller teknisk opplæring').press('Enter')
  await expect(issueHeading).toBeFocused()
  await expect(page.getByText('Minst ett punkt må være gjennomgått.')).toBeVisible()
  const boxes = boxesFor(page)
  await expect(boxes).toHaveCount(0)
  await expect(button(page, 'Last ned PDF')).toHaveCount(0)
  await role(page, 'sjåfør')
  await expect(boxes).toHaveCount(52)
  const exception = page.getByRole('button', { name: /^Gjelder ikke busstypen · T1-03/ })
  await exception.click()
  const reason = page.getByRole('dialog', { name: 'Gjelder ikke busstypen' })
  await reason.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(reason.getByLabel('Begrunnelse')).toHaveAttribute('aria-invalid', 'true')
  await reason.getByLabel('Begrunnelse').fill('Midlertidig utkast')
  await page.keyboard.press('Escape')
  await expect(exception).toBeFocused()
  await expect(page.locator('#technical-point-T1-03')).toContainText('Ikke gjennomgått')
  await expect(page.getByText('Midlertidig utkast')).toHaveCount(0)
  const exceptionBox = page.getByRole('checkbox', { name: /^Gjennomgått · T1-03/ })
  await expect(exceptionBox).toHaveAccessibleDescription('Ikke gjennomgått')
  await exception.click()
  await expect(reason.getByLabel('Begrunnelse')).toHaveValue('Midlertidig utkast')
  await reason.getByLabel('Begrunnelse').fill('Fraværende')
  await reason.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(exceptionBox).toHaveAccessibleDescription('Gjelder ikke busstypen Fraværende')
  await expect(page.getByRole('button', { name: /^Rediger begrunnelse · T1-03/ })).toBeVisible()

  const pdfFixture = process.env.TIDE_TECHNICAL_PDF_FIXTURE === '1'
  const exceptions = new Set(['T1-03'])
  if (pdfFixture) {
    for (const id of ['T2-03', 'T3-03']) {
      await page.getByRole('button', { name: new RegExp(`^Gjelder ikke busstypen · ${id}`) }).click()
      await reason.getByLabel('Begrunnelse').fill(longReason(id === 'T2-03' ? 'Avsnitt A' : 'Avsnitt B'))
      await reason.getByRole('button', { name: 'Lagre begrunnelse' }).click()
      exceptions.add(id)
    }
  }

  for (const box of await boxes.all()) {
    const id = (await box.getAttribute('aria-label'))?.match(/T[1-4]-\d{2}/)?.[0]
    if (!id || !exceptions.has(id)) await box.check()
  }
  const ready = page.getByText('Klar for instruktørbekreftelse', { exact: true })
  await expect(ready).toBeVisible()
  await boxes.first().uncheck()
  await expect(ready).toHaveCount(0)
  await boxes.first().check()
  await label(page, 'Busstype').fill('Volvo FN')
  await role(page, 'instruktør')
  await expect(label(page, 'Busstype')).toHaveValue('Volvo FN')
  await expect(boxes).toHaveCount(0)
  await expect(ready).toBeVisible()
  await button(page, 'Kontroller teknisk opplæring').click()
  const confirmation = page.getByRole('dialog', { name: 'Bekreft teknisk opplæring' })
  await expect(confirmation.getByText('Volvo FN', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(confirmation).toHaveCount(0)
  await expect(button(page, 'Last ned PDF')).toHaveCount(0)
  await button(page, 'Kontroller teknisk opplæring').click()
  await confirmation.getByLabel('Bekreftende instruktør').fill('Feil instruktør')
  await confirmation.getByRole('button', { name: 'Bekreft teknisk opplæring' }).click()
  await expect(confirmation.getByLabel('Bekreftende instruktør')).toHaveAttribute('aria-invalid', 'true')
  await confirmation.getByLabel('Bekreftende instruktør').fill(instructor)
  await confirmation.getByRole('button', { name: 'Bekreft teknisk opplæring' }).click()
  await expect(page.getByText(`Teknisk opplæring bekreftet av ${instructor}`, { exact: true })).toBeVisible()
  const first = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned PDF').click()])
  if (pdfFixture) {
    await first[0].saveAs(info.outputPath('teknisk-instruktor.pdf'))
    const snapshot = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open('tide-kjorevurdering')
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
      try {
        return await new Promise<TechnicalSnapshot>((resolve, reject) => {
          const tx = db.transaction('technicalDocuments')
          const request = tx.objectStore('technicalDocuments').getAll()
          tx.oncomplete = () => resolve(request.result[0].data.snapshot)
          tx.onabort = () => reject(tx.error)
        })
      } finally {
        db.close()
      }
    })
    const confirmedAtLocal = new Intl.DateTimeFormat('nb-NO', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset',
    }).format(new Date(snapshot.confirmation.confirmedAt))
    await writeFile(info.outputPath('teknisk-kilde.json'), JSON.stringify({ snapshot, confirmedAtLocal }, null, 2), 'utf8')
  }
  const path = await first[0].path()
  expect((await readFile(path)).subarray(0, 4).toString()).toBe('%PDF')
  await role(page, 'sjåfør')
  await expect(label(page, 'Simuleringsrolle')).toHaveAttribute('aria-disabled', 'false')
  await expect(label(page, 'Simuleringsrolle')).toHaveValue('sjåfør')
  await page.reload()
  await expect(label(page, 'Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(page.getByRole('heading', { name: 'Teknisk opplæring', exact: true })).toBeVisible()
  await expect(page.getByText('Fraværende', { exact: true })).toBeVisible()
  await expect(boxes).toHaveCount(0)
  const second = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned PDF').click()])
  expect(second[0].suggestedFilename()).toBe(first[0].suggestedFilename())
  if (pdfFixture) await second[0].saveAs(info.outputPath('teknisk-sjafor.pdf'))
})

test('sjåføren kan opprette et separat dokument med samme dato fra valgt sjåførkontekst', async ({ page }) => {
  await registerCandidate(page)
  await role(page, 'sjåfør')
  await expect(page.getByRole('heading', { name: 'Dokumentoversikt' })).toBeVisible()
  for (let index = 0; index < 2; index += 1) {
    await button(page, 'Ny teknisk opplæring').click()
    await enterHeader(page, 'Volvo BB')
    await button(page, 'Opprett teknisk opplæring').click()
    await expect(page.getByRole('checkbox', { name: /^Gjennomgått/ })).toHaveCount(52)
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0)
    await button(page, 'Til dokumentoversikten').click()
  }
  const documents = page.getByRole('button', { name: /^Teknisk opplæring/ })
  await expect(documents).toHaveCount(2)
  await expect(documents.filter({ hasText: 'Volvo BB' })).toHaveCount(2)
  const references = await documents.getByText(/^Dokumentreferanse /).allTextContents()
  expect(new Set(references).size).toBe(2)
  for (const reference of references) {
    await expect(page.getByRole('button', { name: new RegExp(reference) })).toHaveCount(1)
  }
  await role(page, 'fadder')
  await expect(documents).toHaveCount(0)
})

test('forkast etter kontekstbytte i en annen lagerforbindelse åpner den faktiske arbeidsflaten', async ({ page }) => {
  await openTechnicalDraft(page)
  // Skriv med en annen lagerforbindelse uten å utløse en fokusretur i denne fanen.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('tide-kjorevurdering')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite')
        const store = tx.objectStore('meta')
        const request = store.get('session')
        request.onsuccess = () => {
          const record = request.result
          store.put({ ...record, data: { ...record.data, role: 'instruktør' } }, 'session')
        }
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  })
  await page.getByRole('button', { name: /^Gjelder ikke busstypen · T1-01/ }).click()
  await page.getByRole('dialog').getByLabel('Begrunnelse').fill('Ulagret prøve etter rollebytte')
  await expect(page.getByRole('heading', { name: 'Ulagrede endringer' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Ulagret prøve etter rollebytte', { exact: true })).toBeVisible()
  await button(page, 'Forkast ulagrede endringer og last inn dokumentet').click()
  await expect(label(page, 'Simuleringsrolle')).toHaveValue('instruktør')
  await expect(button(page, 'Kontroller teknisk opplæring')).toBeVisible()
  await expect(page.getByText('Ulagret prøve etter rollebytte', { exact: true })).toHaveCount(0)
  await button(page, 'Til dokumentoversikten').click()
  await expect(page.getByRole('heading', { name: 'Instruktøroversikt' })).toBeVisible()
})

test('avbrutt teknisk lagring stopper rollebytte og kan gjentas med samme input', async ({ page }) => {
  await openTechnicalDraft(page)
  await page.evaluate(() => {
    const { put } = IDBObjectStore.prototype
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args)
      if (this.name === 'technicalDocuments') {
        IDBObjectStore.prototype.put = put
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
  })
  await label(page, 'Busstype').fill('Volvo FN – behold lokalt')
  await role(page, 'instruktør')
  await expect(page.getByText('Endringene er ikke lagret. Prøv igjen.', { exact: true })).toBeVisible()
  await expect(label(page, 'Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(label(page, 'Busstype')).toHaveValue('Volvo FN – behold lokalt')
  await button(page, 'Prøv lagring igjen').click()
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  await role(page, 'instruktør')
  await expect(button(page, 'Kontroller teknisk opplæring')).toBeVisible()
  await expect(label(page, 'Busstype')).toHaveValue('Volvo FN – behold lokalt')
})
