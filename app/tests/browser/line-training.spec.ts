import { readFile, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Download, Page } from '@playwright/test'
import type { LineTraining } from '../../src/domain/line-training.ts'
import { lineTrainingV1Fixture, seedLineTrainingV1 } from '../fixtures/line-training-v1.ts'

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

async function openLegacyLineDocument(page: Page) {
  const legacy = lineTrainingV1Fixture()
  await page.route('**/legacy-line-seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }))
  await page.goto('/legacy-line-seed')
  await page.evaluate(seedLineTrainingV1, legacy)
  await page.goto('/')
  return legacy
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

async function readLine(page: Page, documentId?: string) {
  return page.evaluate(async documentId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<LineTraining>((resolve, reject) => {
        const tx = db.transaction('lineDocuments')
        const store = tx.objectStore('lineDocuments')
        const request = documentId ? store.get(documentId) : store.getAll()
        tx.oncomplete = () => {
          const record = documentId ? request.result : request.result[0]
          if (record) resolve(record.data)
          else reject(new Error(`Linjedokumentet mangler${documentId ? ` (${documentId})` : ''}.`))
        }
        tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  }, documentId)
}

function linePdfTimes(document: LineTraining) {
  const formatter = new Intl.DateTimeFormat('nb-NO', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset',
  })
  const times = document.snapshots.flatMap(source => [source.confirmedThrough, ...source.entries.flatMap(entry => [
    entry.recordedAt, entry.editedAt, entry.confirmation.confirmedAt,
  ])])
  return Object.fromEntries(times.map(time => [time, formatter.format(new Date(time))]))
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

test('individuell ekstralinje gjelder samme sjåfør i flere dokumenter og fryses først med bekreftet kjøring', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 630 })
  await lineDocument(page)
  const firstDocument = await readLine(page)
  const overview = () => button(page, 'Til dokumentoversikten').click()
  const open = (id: string) => page.getByRole('button', { name: /^Åpne linjeopplæring/ }).filter({ hasText: id }).click()
  const selectDriver = (employeeNumber: string) => page.getByRole('button', { name: new RegExp(`Åse Øvelø Ansattnummer ${employeeNumber} ·`) }).click()
  const download = () => Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])

  await actor(page, 'sjåfør')
  await addEntry(page, 'L01', '2025-04-13')
  await actor(page, 'instruktør')
  await entries(page).first().getByRole('checkbox').check()
  await confirm(page, 'Øyvind Fiktiv')
  const [early] = await download()
  const firstSource = (await readLine(page, firstDocument.documentId)).snapshots[0]
  await overview()
  await button(page, 'Ny linjeopplæring').click()
  const documentReference = page.locator('p.line-reference').filter({ hasText: /^Dokumentreferanse / })
  await expect(documentReference).toBeVisible()
  const secondId = (await documentReference.innerText()).replace('Dokumentreferanse ', '')
  expect(secondId).not.toBe(firstDocument.documentId)
  await overview()
  await button(page, 'Opprett sjåfør').click()
  await page.getByLabel('Sjåførnavn').fill('Åse Øvelø')
  await page.getByLabel('Ansattnummer', { exact: true }).fill('DEMO-ANNEN')
  await button(page, 'Opprett ny registrering').click()
  await button(page, 'Ny linjeopplæring').click()
  await expect(documentReference).toBeVisible()
  const otherId = (await documentReference.innerText()).replace('Dokumentreferanse ', '')
  await overview()
  await selectDriver('DEMO-LINE')
  await open(firstDocument.documentId)

  const choose = async (lineId: string) => {
    await page.getByLabel('Ekstralinje').selectOption(lineId)
    await button(page, 'Tildel ekstralinje').click()
    const dialog = page.getByRole('dialog', { name: 'Bekreft linjetildeling' })
    await expect(dialog).toBeVisible()
    return dialog
  }
  const dialog = await choose('L10')
  await expect(dialog.getByRole('heading')).toBeFocused()
  expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0)
  await expect(dialog).toContainText('Åse Øvelø · Fiktivt ansattnummer DEMO-LINE')
  await expect(dialog).toContainText(`Sjåførreferanse ${firstDocument.driverRef}`)
  await expect(dialog).toContainText('Linje 30')
  await expect(dialog).toContainText('Kjøres med leddbuss. Egen opplæring')
  await dialog.getByRole('button', { name: 'Avbryt' }).click()
  await expect(button(page, 'Tildel ekstralinje')).toBeFocused()
  await expect(page.locator('[data-line-id="L10"]')).toHaveCount(0)

  await choose('L10')
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      const request = originalPut.apply(this, args)
      if (this.name === 'lineAssignments') {
        IDBObjectStore.prototype.put = originalPut
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
  })
  const submit = dialog.getByRole('button', { name: 'Bekreft tildeling' })
  await submit.click()
  await expect(dialog.getByRole('alert')).toContainText('Tildelingen kunne ikke lagres')
  await expect(page.locator('[data-line-id="L10"]')).toHaveCount(0)
  await submit.evaluate(element => { element.click(); element.click() })
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Linje 30 er tildelt og lagret på denne enheten.')).toBeVisible()
  const assigned = page.getByRole('region', { name: 'Individuelt tildelte linjer' })
  const assigned30 = assigned.locator('[data-line-id="L10"]')
  await expect(assigned30).toContainText('Ingen bekreftet kjøredato')
  await expect(assigned30).toContainText('Kjøres med leddbuss. Egen opplæring')
  await expect(page.getByLabel('Ekstralinje').locator('option[value="L10"]')).toHaveCount(0)
  await (await choose('L22')).getByRole('button', { name: 'Bekreft tildeling' }).click()
  await expect(assigned.locator('[data-line-id]')).toHaveCount(2)
  expect((await readLine(page, firstDocument.documentId)).snapshots).toEqual([firstSource])

  await overview()
  await open(secondId)
  await expect(assigned30).toContainText('Kjøres med leddbuss. Egen opplæring')
  await page.reload()
  await expect(assigned30).toContainText('Ingen bekreftet kjøredato')
  await overview()
  await open(firstDocument.documentId)
  await actor(page, 'sjåfør')
  await expect(page.getByLabel('Ekstralinje')).toHaveCount(0)
  await addEntry(page, 'L10', '2025-04-15')
  await actor(page, 'instruktør')
  await entries(page).first().getByRole('checkbox').check()
  await confirm(page, 'Astrid Fiktiv')
  await expect(assigned30).toContainText('15.04.2025')
  await expect(assigned30).toContainText('Astrid Fiktiv')
  const [latest] = await download()
  await page.getByLabel('Bekreftet historikkversjon').selectOption('1')
  const [archived] = await download()
  const finalDocument = await readLine(page, firstDocument.documentId)
  expect(finalDocument.snapshots[0]).toEqual(firstSource)
  expect(finalDocument.snapshots[1].assignedLines?.map(line => line.id)).toEqual(['L10'])
  for (const file of [early, latest, archived]) await expectPortraitA4(file)
  if (process.env.TIDE_LINE_PDF_FIXTURE === '1') {
    await early.saveAs(info.outputPath('før-tildeling.pdf'))
    await latest.saveAs(info.outputPath('med-tildeling.pdf'))
    await archived.saveAs(info.outputPath('tidligere-versjon.pdf'))
    await writeFile(info.outputPath('linje-kilder.json'), JSON.stringify({ firstSource, finalDocument, times: linePdfTimes(finalDocument) }, null, 2), 'utf8')
  }

  await overview()
  await selectDriver('DEMO-ANNEN')
  await open(otherId)
  await expect(page.locator('[data-line-id]')).toHaveCount(21)
  await actor(page, 'sjåfør')
  await button(page, 'Legg til registrering').click()
  await expect(entries(page).first().locator('option[value="L10"]')).toHaveCount(0)
})

test('gjenlesing av en tildeling på samme dokumentrevisjon bevarer ulagret kjøredato', async ({ page, context }) => {
  await lineDocument(page)
  await actor(page, 'sjåfør')
  await addEntry(page, 'L01', '')
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  const before = await readLine(page)
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 500))
  const dateField = entries(page).first().getByLabel(/^Kjøredato ·/)
  await dateField.fill('2025-04-15')
  await expect(page.getByText('Endringer er ikke lagret', { exact: true })).toBeVisible()

  const tab = await context.newPage()
  await tab.goto('/')
  await actor(tab, 'instruktør')
  await tab.getByLabel('Ekstralinje').selectOption('L25')
  await button(tab, 'Tildel ekstralinje').click()
  await button(tab, 'Bekreft tildeling').click()
  await expect(tab.getByText('Linje 450 er tildelt og lagret på denne enheten.')).toBeVisible()
  await actor(tab, 'sjåfør')
  await expect(button(tab, 'Legg til registrering')).toBeVisible()
  await tab.close()
  await page.bringToFront()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  await expect(page.locator('[data-line-id="L25"]')).toContainText('Ingen bekreftet kjøredato')
  await expect(dateField).toHaveValue('2025-04-15')
  expect((await readLine(page)).revision).toBe(before.revision)
  await page.clock.resume()
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  expect((await readLine(page)).entries[0].drivenDate).toBe('2025-04-15')
})

test('tildelingen kvitteres etter skrivecommit og nytt forsøk bare leser det aktive valget', async ({ page }) => {
  await lineDocument(page)
  await page.getByLabel('Ekstralinje').selectOption('L10')
  await button(page, 'Tildel ekstralinje').click()
  const dialog = page.getByRole('dialog', { name: 'Bekreft linjetildeling' })
  await expect(dialog).toBeVisible()
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction
    let committedAttempt = false
    let interruptedRead = false
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (Array.isArray(stores) && stores.includes('lineAssignments')) {
        if (mode === 'readwrite' && stores.includes('commands')) {
          if (committedAttempt) throw new DOMException('Uventet ny skriving', 'InvalidStateError')
          committedAttempt = true
        } else if (mode === 'readonly' && committedAttempt && !interruptedRead) {
          interruptedRead = true
          throw new DOMException('Injisert lesefeil etter lagring', 'InvalidStateError')
        }
      }
      return transaction.call(this, stores, mode, options)
    }
  })
  await button(page, 'Bekreft tildeling').click()
  await expect(dialog.getByRole('alert')).toHaveText('Linjetildelingen er lagret. Visningen kunne ikke oppdateres.')
  await expect(button(page, 'Bekreft tildeling')).toHaveCount(0)
  await changeStorage(page, 'unselect')
  await button(page, 'Kontroller lagringen igjen').click()
  await expect(page.getByRole('heading', { name: 'Instruktøroversikt' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Linjetildelingen er lagret.' })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: /^Åpne linjeopplæring/ }).click()
  await expect(page.locator('[data-line-id="L10"]')).toContainText('Ingen bekreftet kjøredato')
})

test('foreldet tildelingsdialog åpner det aktive valget etter avvist skriving', async ({ page }) => {
  await lineDocument(page)
  await page.getByLabel('Ekstralinje').selectOption('L10')
  await button(page, 'Tildel ekstralinje').click()
  await expect(page.getByRole('dialog', { name: 'Bekreft linjetildeling' })).toBeVisible()
  await changeStorage(page, 'unselect')
  await button(page, 'Bekreft tildeling').click()
  await expect(page.getByRole('heading', { name: 'Instruktøroversikt' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('Linjetildelingen ble ikke lagret. Det aktive valget er endret.')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^Åpne linjeopplæring/ }).click()
  await expect(page.getByLabel('Ekstralinje')).toBeVisible()
  await expect(page.locator('[data-line-id="L10"]')).toHaveCount(0)
})

test('sjåfør fører en linje i frittstående dokument, instruktør låser et utvalg og begge laster bekreftet historikk', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 630 })
  await lineDocument(page)
  await expect(page.locator('[data-line-id]')).toHaveCount(21)
  await expect(page.getByRole('heading', { name: 'Linje 413', exact: true })).toBeVisible()
  await expect(page.getByText('Ingen bekreftet kjøredato', { exact: true })).toHaveCount(21)
  await expect(button(page, 'Last ned bekreftet linjeopplæring')).toHaveCount(0)
  await expect(button(page, 'Legg til registrering')).toHaveCount(0)
  await page.getByLabel('Kandidatnavn').fill('Åse Øvelø äö')
  await actor(page, 'sjåfør')
  await expect(page.getByText('Åse Øvelø äö', { exact: true })).toBeVisible()
  await addEntry(page, 'L01', '2025-04-13')
  await expect(entries(page).first().locator('option')).toHaveCount(22)
  await expect(entries(page).first().locator('option[value="L10"]')).toHaveCount(0)
  await addEntry(page, 'L11', '2025-')
  const getEntryId = () => entries(page).first().getAttribute('data-entry-id')
  const firstId = await getEntryId()
  await actor(page, 'instruktør')
  const checkbox = (row: number) => entries(page).nth(row).getByRole('checkbox')
  await expect(checkbox(0)).toHaveAccessibleName(/Velg Registrering 1 · Linje 20 · 2025-04-13/)
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveCount(0)
  await checkbox(1).check()
  await button(page, 'Bekreft registreringer').click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeFocused()
  await expect(page.getByRole('link', { name: /Skriv inn faktisk kjøredato/ })).toBeVisible()
  await checkbox(1).uncheck()
  await checkbox(0).check()
  await button(page, 'Bekreft registreringer').click()
  const dialog = page.getByRole('dialog', { name: 'Bekreft registreringer' })
  await dialog.getByRole('button', { name: 'Lås valgte registreringer' }).click()
  await expect(dialog.getByLabel('Instruktørnavn')).toHaveAttribute('aria-invalid', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(button(page, 'Bekreft registreringer')).toBeFocused()
  await expect(button(page, 'Last ned bekreftet linjeopplæring')).toHaveCount(0)
  await confirm(page, 'Øyvind Fiktiv')
  await expect(page.locator('[data-line-id="L01"]')).toContainText('Øyvind Fiktiv')
  await expect(page.locator(`[data-line-id="L01"] [data-entry-id="${firstId}"]`)).toBeVisible()
  await expect(entries(page)).toHaveCount(1)
  await expect(page.getByText('1 utkast venter på bekreftelse og inngår ikke i PDF-filen.')).toBeVisible()
  const [first] = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  expect(first.suggestedFilename()).toMatch(/^linjeopplaering-v1-.*\.pdf$/)
  await expectPortraitA4(first)
  await actor(page, 'sjåfør')
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveValue('2025-')
  await entries(page).first().getByRole('button', { name: /^Fjern utkast/ }).click()
  await addEntry(page, 'L01', '2025-04-12')
  await actor(page, 'instruktør')
  await checkbox(0).check()
  await confirm(page, 'Astrid Fiktiv Træn ÆØÅ')
  await expect(page.getByLabel('Bekreftet historikkversjon')).toHaveValue('2')
  await expect(page.locator('[data-line-id="L01"]')).toContainText('Astrid Fiktiv Træn ÆØÅ')
  await expect(page.locator('[data-line-id="L01"]')).toContainText('Øyvind Fiktiv')
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
  if (process.env.TIDE_LINE_PDF_FIXTURE === '1') {
    await latest.saveAs(info.outputPath('standardmal.pdf'))
    const finalDocument = await readLine(page)
    await writeFile(info.outputPath('linje-kilder.json'), JSON.stringify({ finalDocument, times: linePdfTimes(finalDocument) }, null, 2), 'utf8')
  }
  await page.getByLabel('Bekreftet historikkversjon').selectOption('1')
  await expect(page.getByText('Bekreftelser etter versjon 1 inngår ikke i PDF-filen.')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Nyeste historikkversjon 2/ })).toBeVisible()
  const [archived] = await Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  expect(archived.suggestedFilename()).toBe(first.suggestedFilename())
  await expectPortraitA4(archived)
  await button(page, 'Til dokumentoversikten').click()
  const savedDocument = page.getByRole('button', { name: /^Åpne linjeopplæring/ })
  await expect(savedDocument).toContainText('2 bekreftede registreringer · 1 utkast')
  await savedDocument.click()
  await expect(entries(page).first().getByLabel(/^Kjøredato ·/)).toHaveValue('2025-04-30')
  await expect(page.getByLabel('Bekreftet historikkversjon')).toHaveValue('2')
})

test('oppgradert grunnkursmal viser tidligere oppføringer og eksporterer gammel og ny kilde', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 630 })
  const legacy = await openLegacyLineDocument(page)

  const standard = page.getByRole('region', { name: /Linjer og bekreftede kjøredatoer/ })
  const history = page.getByRole('region', { name: 'Tidligere registrert utenfor grunnkurset' })
  await expect(standard.locator('[data-line-id]')).toHaveCount(21)
  await expect(history.locator('[data-line-id]')).toHaveCount(2)
  await expect(history.locator('[data-line-id="L10"]')).toContainText('Kjøres med leddbuss. Egen opplæring')
  await expect(history.locator('[data-line-id="L10"]')).toContainText('Øyvind Fiktiv')
  await expect(history.locator('[data-line-id="L22"]')).toContainText('1 utkast')

  const download = () => Promise.all([page.waitForEvent('download'), button(page, 'Last ned bekreftet linjeopplæring').click()])
  const [first] = await download()
  await expectPortraitA4(first)
  await actor(page, 'sjåfør')
  await expect(entries(page).first().getByLabel(/^Linje ·/)).toHaveValue('L22')
  await expect(entries(page).first()).toContainText('Tidligere registrert utenfor grunnkurset')
  await entries(page).first().getByLabel(/^Kjøredato ·/).fill('2025-04-15')
  await addEntry(page, 'L21', '2025-04-12')
  await expect(entries(page).last().locator('option[value="L22"]')).toHaveCount(0)
  await actor(page, 'instruktør')
  const earlierDraft = entries(page).first().getByRole('checkbox')
  await earlierDraft.check()
  await button(page, 'Bekreft registreringer').click()
  const dialog = page.getByRole('dialog', { name: 'Bekreft registreringer' })
  await expect(dialog.getByText('Tidligere registrert utenfor grunnkurset', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click()
  await earlierDraft.uncheck()
  await entries(page).last().getByRole('checkbox').check()
  await confirm(page, 'Astrid Fiktiv Træn ÆØÅ')
  await expect(standard.locator('[data-line-id="L21"]')).toContainText('Astrid Fiktiv Træn ÆØÅ')
  await expect(history.locator('[data-line-id="L10"]')).toContainText('Øyvind Fiktiv')
  const [latest] = await download()
  await expectPortraitA4(latest)
  await page.getByLabel('Bekreftet historikkversjon').selectOption('1')
  const [archived] = await download()
  expect(archived.suggestedFilename()).toBe(first.suggestedFilename())
  await expectPortraitA4(archived)

  const finalDocument = await readLine(page)
  expect(finalDocument.snapshots[0]).toEqual(legacy.document.snapshots[0])
  expect(finalDocument.entries[1]).toMatchObject({ lineId: 'L22', drivenDate: '2025-04-15', status: 'draft' })
  expect(finalDocument.snapshots[1].entries.map(entry => entry.lineId)).toEqual(['L10', 'L21'])
  if (process.env.TIDE_LINE_PDF_FIXTURE === '1') {
    await first.saveAs(info.outputPath('v1-original.pdf'))
    await latest.saveAs(info.outputPath('v2.pdf'))
    await archived.saveAs(info.outputPath('v1-nytt-uttak.pdf'))
    await writeFile(info.outputPath('linje-kilder.json'), JSON.stringify({
      firstDocument: legacy.document, finalDocument, times: linePdfTimes(finalDocument),
    }, null, 2), 'utf8')
  }
})

test('avbrutt bytte fra tidligere linje skjuler valget frem til kommandoen er ferdig', async ({ page }) => {
  const legacy = await openLegacyLineDocument(page)
  await actor(page, 'sjåfør')
  const entry = entries(page).first()
  const line = entry.getByLabel(/^Linje ·/)
  const oldOption = line.locator('option[value="L22"]')
  const history = page.getByRole('region', { name: 'Tidligere registrert utenfor grunnkurset' })
  const historicRow = history.locator('[data-line-id="L22"]')
  await expect(oldOption).toHaveCount(1)
  await abortLineSaves(page)
  await entry.getByRole('button', { name: /^Fjern utkast/ }).click()
  await expect(entry).toHaveCount(0)
  await expect(button(page, retry)).toBeVisible()
  await expect(historicRow).toContainText('1 utkast')
  await button(page, discard).click()
  await expect(line).toHaveValue('L22')

  await abortLineSaves(page, 2)
  await line.selectOption('L01')
  await expect(button(page, retry)).toBeVisible()
  await expect(historicRow).toContainText('1 utkast')
  await expect(oldOption).toHaveCount(0)
  await entry.getByLabel(/^Kjøredato ·/).fill('2025-04-16')
  await expect(oldOption).toHaveCount(0)
  await expect(button(page, retry)).toBeVisible()
  await button(page, retry).click()
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  await expect(historicRow).toHaveCount(0)
  await expect(oldOption).toHaveCount(0)
  const saved = (await readLine(page)).entries.find(record => record.entryId === legacy.document.entries[1].entryId)
  expect(saved).toMatchObject({ lineId: 'L01', drivenDate: '2025-04-16', status: 'draft' })
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
  await addEntry(page, 'L01', '2025-04-11')
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
  await addEntry(page, 'L01', '2025-04-11')
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
  await addEntry(page, 'L01', '2025-04-11')
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
