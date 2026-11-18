import { readFile, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Download, Page } from '@playwright/test'
import type { LineTraining } from '../../src/domain/line-training.ts'

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const actor = (page: Page, role: string) => page.getByLabel('Simuleringsrolle').selectOption(role)
const entries = (page: Page) => page.getByRole('region', { name: 'Registreringer til bekreftelse' }).locator('[data-entry-id]')
const retry = 'Prøv lagring igjen'
const discard = 'Forkast ulagrede endringer og last inn linjeoversikten'
const correction = 'Bytt til sjåfør for å rette registreringene'

async function lineDocument(page: Page) {
  await page.goto('/')
  await actor(page, 'instruktør')
  await button(page, 'Opprett sjåfør').click()
  await page.getByLabel('Sjåførnavn').fill('Åse Øvelø')
  await page.getByLabel('Ansattnummer', { exact: true }).fill('DEMO-LINE')
  await button(page, 'Opprett ny registrering').click()
  await button(page, 'Ny linjeopplæring').click()
  await expect(page.getByRole('heading', { name: 'Linjeopplæring', exact: true })).toBeVisible()
}

async function addEntry(page: Page, lineId: string, drivenDate: string) {
  await button(page, 'Legg til registrering').click()
  const entry = entries(page).last()
  await entry.getByLabel(/^Linje ·/).selectOption(lineId)
  if (drivenDate) await entry.getByLabel(/^Kjøredato ·/).fill(drivenDate)
}

async function confirm(page: Page, name: string) {
  await button(page, 'Bekreft registreringer').click()
  const dialog = page.getByRole('dialog', { name: 'Bekreft registreringer' })
  await dialog.getByLabel('Instruktørnavn').fill(name)
  await dialog.getByRole('button', { name: 'Lås valgte registreringer' }).click()
  await expect(dialog).toHaveCount(0)
}

async function expectPortraitA4(file: Download) {
  const content = await readFile((await file.path())!)
  expect(content.subarray(0, 4).toString()).toBe('%PDF')
  const pages = [...content.toString('latin1').matchAll(/^\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/gm)]
  expect(pages.length).toBeGreaterThan(1)
  for (const [, width, height] of pages) {
    expect(Number(width)).toBeCloseTo(595.28, 2)
    expect(Number(height)).toBeCloseTo(841.89, 2)
  }
}

async function readLine(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<LineTraining>((resolve, reject) => {
        const tx = db.transaction('lineDocuments')
        const request = tx.objectStore('lineDocuments').getAll()
        tx.oncomplete = () => resolve(request.result[0].data)
        tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  })
}

async function changeStorage(page: Page, change: 'unselect' | number) {
  await page.evaluate(async change => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(typeof change === 'number' ? 'lineDocuments' : 'meta', 'readwrite')
        const store = tx.objectStore(tx.objectStoreNames[0])
        const read = store.openCursor(typeof change === 'number' ? undefined : 'session')
        read.onsuccess = () => {
          const cursor = read.result!
          const record = cursor.value
          if (typeof change === 'number') record.data.pdfLayoutVersion = change
          else delete record.data.document
          cursor.update(record)
        }
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  }, change)
}

async function abortLineSaves(page: Page, attempts = 1) {
  await page.evaluate(attempts => {
    const { put } = IDBObjectStore.prototype
    let remaining = attempts
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args)
      if (this.name === 'lineDocuments') {
        remaining -= 1
        if (!remaining) IDBObjectStore.prototype.put = put
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
  }, attempts)
}

test('sjåfør fører en linje i frittstående dokument, instruktør låser et utvalg og begge laster bekreftet historikk', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 630 })
  await lineDocument(page)
  await expect(page.locator('[data-line-id]')).toHaveCount(26)
  await expect(page.getByText('Ingen bekreftet kjøredato', { exact: true })).toHaveCount(26)
  await expect(button(page, 'Last ned bekreftet linjeopplæring')).toHaveCount(0)
  await expect(button(page, 'Legg til registrering')).toHaveCount(0)
  await page.getByLabel('Kandidatnavn').fill('Åse Øvelø äö')
  await actor(page, 'sjåfør')
  await expect(page.getByText('Åse Øvelø äö', { exact: true })).toBeVisible()
  await addEntry(page, 'L10', '2025-04-13')
  await addEntry(page, 'L11', '2025-')
  const getEntryId = () => entries(page).first().getAttribute('data-entry-id')
  const firstId = await getEntryId()
  await actor(page, 'instruktør')
  const checkbox = (row: number) => entries(page).nth(row).getByRole('checkbox')
  await expect(checkbox(0)).toHaveAccessibleName(/Velg Registrering 1 · Linje 30 · 2025-04-13/)
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveCount(0)
  await checkbox(1).check()
  await button(page, 'Bekreft registreringer').click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeFocused()
  await expect(page.getByRole('link', { name: /Skriv inn faktisk kjøredato/ })).toBeVisible()
  await checkbox(1).uncheck()
  await checkbox(0).check()
  await button(page, 'Bekreft registreringer').click()
  const dialog = page.getByRole('dialog', { name: 'Bekreft registreringer' })
  await expect(dialog.getByText('Kjøres med leddbuss. Egen opplæring', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Lås valgte registreringer' }).click()
  await expect(dialog.getByLabel('Instruktørnavn')).toHaveAttribute('aria-invalid', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(button(page, 'Bekreft registreringer')).toBeFocused()
  await expect(button(page, 'Last ned bekreftet linjeopplæring')).toHaveCount(0)
  await confirm(page, 'Øyvind Fiktiv')
  await expect(page.locator('[data-line-id="L10"]')).toContainText('Øyvind Fiktiv')
  await expect(page.locator(`[data-line-id="L10"] [data-entry-id="${firstId}"]`)).toBeVisible()
  await expect(entries(page)).toHaveCount(1)
  await expect(page.getByText('1 utkast venter på bekreftelse og inngår ikke i PDF-filen.')).toBeVisible()
  const [first] = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  expect(first.suggestedFilename()).toMatch(/^linjeopplaering-v1-.*\.pdf$/)
  await expectPortraitA4(first)
  const pdfFixture = process.env.TIDE_LINE_PDF_FIXTURE === '1'
  const firstDocument = pdfFixture ? await readLine(page) : undefined
  if (pdfFixture) await first.saveAs(info.outputPath('v1-original.pdf'))
  await actor(page, 'sjåfør')
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveValue('2025-')
  await entries(page).first().getByRole('button', { name: /^Fjern utkast/ }).click()
  await addEntry(page, 'L10', '2025-04-12')
  await actor(page, 'instruktør')
  await checkbox(0).check()
  await confirm(page, 'Astrid Fiktiv Træn ÆØÅ')
  await expect(page.getByLabel('Bekreftet historikkversjon')).toHaveValue('2')
  await expect(page.locator('[data-line-id="L10"]')).toContainText('Astrid Fiktiv Træn ÆØÅ')
  await expect(page.locator('[data-line-id="L10"]')).toContainText('Øyvind Fiktiv')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Linjeopplæring', exact: true })).toBeVisible()
  await expect(page.getByLabel('Bekreftet historikkversjon')).toHaveValue('2')
  await actor(page, 'sjåfør')
  await expect(button(page, 'Legg til registrering')).toBeVisible()
  await addEntry(page, 'L12', '2025-04-30')
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  const [latest] = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  expect(latest.suggestedFilename()).toMatch(/^linjeopplaering-v2-.*\.pdf$/)
  await expectPortraitA4(latest)
  await page.getByLabel('Bekreftet historikkversjon').selectOption('1')
  await expect(page.getByText('Bekreftelser etter versjon 1 inngår ikke i PDF-filen.')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Nyeste historikkversjon 2/ })).toBeVisible()
  const [archived] = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  expect(archived.suggestedFilename()).toBe(first.suggestedFilename())
  await expectPortraitA4(archived)
  if (pdfFixture && firstDocument) {
    await latest.saveAs(info.outputPath('v2.pdf'))
    await archived.saveAs(info.outputPath('v1-nytt-uttak.pdf'))
    const finalDocument = await readLine(page)
    expect(finalDocument.snapshots[0]).toEqual(firstDocument.snapshots[0])
    const formatter = new Intl.DateTimeFormat('nb-NO', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset',
    })
    const times = finalDocument.snapshots.flatMap(source => [source.confirmedThrough, ...source.entries.flatMap(entry => [
      entry.recordedAt, entry.editedAt, entry.confirmation.confirmedAt,
    ])])
    await writeFile(info.outputPath('linje-kilder.json'), JSON.stringify({
      firstDocument, finalDocument, times: Object.fromEntries(times.map(time => [time, formatter.format(new Date(time))])),
    }, null, 2), 'utf8')
  }
  await button(page, 'Til dokumentoversikten').click()
  const savedDocument = page.getByRole('button', { name: /^Åpne linjeopplæring/ })
  await expect(savedDocument).toContainText('2 bekreftede registreringer · 1 utkast')
  await savedDocument.click()
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveValue('2025-04-30')
  await expect(page.getByLabel('Bekreftet historikkversjon')).toHaveValue('2')
})

test('retting bytter til riktig sjåførfelt og sperres hvis den aktive adressen er endret', async ({ page }) => {
  await lineDocument(page)
  await actor(page, 'sjåfør')
  await addEntry(page, '', '2025-04-11')
  for (const stale of [false, true]) {
    await actor(page, 'instruktør')
    await entries(page).first().getByRole('checkbox').check()
    await button(page, 'Bekreft registreringer').click()
    await expect(button(page, correction)).toBeVisible()
    if (stale) await changeStorage(page, 'unselect')
    await button(page, correction).click()
    if (!stale) await expect(entries(page).first().getByLabel(/^Linje ·/)).toBeFocused()
    else {
      await expect(page.getByRole('alert')).toContainText('Rollebyttet kunne ikke fullføres')
      await page.reload()
      await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('instruktør')
      await expect(page.getByRole('button', { name: /^Åpne linjeopplæring/ })).toBeVisible()
    }
  }
})

test('avbrutt linjelagring stopper rollebytte, og utkastet kan lagres på nytt eller forkastes', async ({ page }) => {
  await lineDocument(page)
  await actor(page, 'sjåfør')
  await addEntry(page, 'L10', '2025-04-11')
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  const date = entries(page).first().getByLabel(/^Kjøredato ·/)
  await abortLineSaves(page)
  await date.fill('2025-04-12')
  await actor(page, 'instruktør')
  await expect(button(page, retry)).toBeVisible()
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(date).toHaveValue('2025-04-12')
  expect((await readLine(page)).entries[0].drivenDate).toBe('2025-04-11')
  await button(page, retry).click()
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  await actor(page, 'instruktør')
  await expect(entries(page).first().getByRole('checkbox')).toBeVisible()
  await expect(entries(page).first()).toContainText('2025-04-12')
  await actor(page, 'sjåfør')
  await expect(date).toBeVisible()
  await abortLineSaves(page, 2)
  await date.fill('2025-04-13')
  await expect(button(page, retry)).toBeVisible()
  await button(page, retry).click()
  await expect(button(page, retry)).toBeVisible()
  await expect(date).toHaveValue('2025-04-13')
  await button(page, discard).click()
  await expect(date).toHaveValue('2025-04-12')
  await actor(page, 'instruktør')
  await expect(entries(page).first().getByRole('checkbox')).toBeVisible()
})

test('gjenkontroll bevarer separat råtekst når samme linjeoversikt blir uleselig', async ({ page }) => {
  await lineDocument(page)
  await actor(page, 'sjåfør')
  await addEntry(page, 'L10', '2025-04-11')
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  await abortLineSaves(page)
  await entries(page).first().getByLabel(/^Kjøredato ·/).fill('2025-08-')
  await expect(button(page, retry)).toBeVisible()
  await changeStorage(page, 99)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('heading', { name: 'Ulagrede endringer' })).toBeVisible()
  await expect(page.getByText(/Kjøredato 2025-08-/)).toBeVisible()
  await expect(page.locator('[data-line-id]')).toHaveCount(0)
  expect((await readLine(page)).entries[0].drivenDate).toBe('2025-04-11')
  await button(page, discard).click()
  await expect(page.getByRole('alert')).toContainText('Linjeoversikten kunne ikke leses')
  await expect(page.getByText(/Kjøredato 2025-08-/)).toHaveCount(0)
  await changeStorage(page, 1)
  await button(page, 'Prøv igjen').click()
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveValue('2025-04-11')
})

test('registrering og bekreftelsesdialog flyter uten horisontal rulling med smal visning og stor tekst', async ({ page }) => {
  await lineDocument(page)
  await actor(page, 'sjåfør')
  await addEntry(page, 'L10', '2025-04-11')
  await actor(page, 'instruktør')
  await entries(page).first().getByRole('checkbox').check()
  await button(page, 'Bekreft registreringer').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const viewports = [320, 360, 390, 768, 1280]
  for (const width of viewports) {
    await page.setViewportSize({ width, height: width < 768 ? 620 : 810 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await page.locator('dialog').evaluate(dialog => dialog.scrollWidth)).toBeLessThanOrEqual(
      await page.locator('dialog').evaluate(dialog => dialog.clientWidth),
    )
  }
  await page.setViewportSize({ width: 620, height: 320 })
  await page.addStyleTag({ content: ':root { font-size: 200%; }' })
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).focus()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Avbryt' })).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(button(page, 'Bekreft registreringer')).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(620)
})
