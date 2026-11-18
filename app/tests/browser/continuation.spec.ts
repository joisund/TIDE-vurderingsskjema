import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { readSavedRun } from './saved-run-fixture.ts'

const firstCriterion = approvedContent.criteria[0]
const role = (page: Page) => page.getByLabel('Simuleringsrolle')
const timeline = (page: Page) => page.getByRole('region', { name: 'Registrerte dager' })
const overview = (page: Page) => page.getByRole('heading', { name: 'Dagsoversikt' })
const next = (page: Page) => page.getByRole('button', { name: 'Opprett neste dag' })
const submitDay = (page: Page) => page.getByRole('button', { name: 'Opprett dag', exact: true })
const back = (page: Page) => page.getByRole('button', { name: 'Til dagsoversikten' })
const mentor = (page: Page) => page.getByRole('button', { name: 'Åpne dagens faddervurdering' })

async function createRun(page: Page, plan = '3') {
  await page.goto('/')
  const create = page.getByRole('button', { name: 'Opprett løp', exact: true })
  await create.click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-18')
  await page.getByLabel('Faddernavn').fill('Fadder Første')
  await page.getByLabel('Første dato').fill('2028-03-01')
  await page.getByLabel('Startplan').selectOption(plan)
  await create.click()
  await expect(overview(page)).toBeVisible()
}

async function fillDay(page: Page, date: string, name: string) {
  await next(page).click()
  await expect(page.getByRole('heading', { name: 'Opprett neste dag' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Dato', exact: true }).fill(date)
  await page.getByRole('textbox', { name: 'Faddernavn', exact: true }).fill(name)
}

async function answerAll(page: Page, skipFirst = false) {
  const choices = page.getByRole('button', { name: /^OK ·/ })
  await expect(choices).toHaveCount(22)
  for (const button of (await choices.all()).slice(skipFirst ? 1 : 0)) await button.click()
}

test('to faner med samme dato åpner samme dag og beholder opprinnelig økt', async ({ page, context }) => {
  await createRun(page)
  const stale = await context.newPage()
  await stale.goto('/')
  await fillDay(page, '2028-03-08', 'Fadder Andre')
  await fillDay(stale, '2028-03-08', 'Skal ikke overskrive')
  await submitDay(page).click()
  await expect(overview(page)).toBeVisible()
  await submitDay(stale).click()
  await expect(stale.getByText('Datoen er allerede registrert. Den eksisterende dagen er åpnet.')).toBeVisible()
  await expect(stale.getByLabel('Faddernavn')).toHaveValue('Fadder Andre')
  await expect(timeline(stale).getByRole('listitem')).toHaveCount(2)
  await expect(timeline(stale).locator('[aria-current]')).toContainText('Dag 2 · 08.03.2028')
  await expect(stale.getByText('Ettervurderingen åpner når førvurderingen er bekreftet.')).toBeVisible()

  await fillDay(stale, '2028-03-07', 'Fadder Tredje')
  await submitDay(stale).click()
  await expect(stale.getByLabel('Dato', { exact: true })).toHaveValue('2028-03-07')
  await expect(stale.getByLabel('Dato', { exact: true })).toBeFocused()
  await expect(stale.getByText('Velg en dato etter siste registrerte dato.')).toBeVisible()
  await stale.getByRole('button', { name: 'Avbryt' }).click()
  await timeline(stale).getByRole('button', { name: 'Åpne dag 1' }).click()
  await expect(stale.getByLabel('Faddernavn')).toHaveValue('Fadder Første')
  await stale.reload()
  await expect(timeline(stale).locator('[aria-current]')).toContainText('Dag 1 · 01.03.2028')
})

test('abort bevarer feltene, og dagvalg vises først etter kvittert complete', async ({ page, context }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key)
      if (this.name === 'runs' && Reflect.get(window, 'abortDayCreation')) {
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(this: IDBTransaction, callback: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'holdDayComplete')) {
            Reflect.set(window, 'releaseDayComplete', () => callback.call(this, event))
            return
          }
          callback.call(this, event)
        })
      },
    })
  })
  await createRun(page)
  await fillDay(page, '2028-03-08', 'Fadder Andre')
  await page.evaluate(() => Reflect.set(window, 'abortDayCreation', true))
  await submitDay(page).click()
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret.')
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue('2028-03-08')
  await expect(page.getByLabel('Faddernavn')).toHaveValue('Fadder Andre')
  expect((await readSavedRun(page)).laterDays).toBeUndefined()

  await page.evaluate(() => {
    Reflect.set(window, 'abortDayCreation', false)
    Reflect.set(window, 'holdDayComplete', true)
  })
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseDayComplete'))).toBe('function')
  await expect(overview(page)).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Lagrer …')
  expect((await readSavedRun(page)).laterDays).toHaveLength(1)
  const other = await context.newPage()
  await other.goto('/')
  await timeline(other).getByRole('button', { name: 'Åpne dag 1' }).click()
  await expect(timeline(other).locator('[aria-current]')).toContainText('Dag 1 · 01.03.2028')
  await page.evaluate(() => {
    Reflect.set(window, 'holdDayComplete', false)
    Reflect.get(window, 'releaseDayComplete')()
  })
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 2 · 08.03.2028')
  await other.reload()
  await expect(timeline(other).locator('[aria-current]')).toContainText('Dag 1 · 01.03.2028')
  await other.close()

  await fillDay(page, '2028-03-15', 'Fadder Tredje')
  await page.evaluate(() => {
    Reflect.deleteProperty(window, 'releaseDayComplete')
    Reflect.set(window, 'holdDayComplete', true)
  })
  await submitDay(page).click()
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseDayComplete'))).toBe('function')
  await page.reload()
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 3 · 15.03.2028')
  expect((await readSavedRun(page)).laterDays).toHaveLength(2)
})

test('annen fane kan fylle planen mens et dagutkast står åpent', async ({ page, context }) => {
  await createRun(page, '2')
  await fillDay(page, '2028-03-15', 'Bevart navn')
  const other = await context.newPage()
  await other.goto('/')
  await fillDay(other, '2028-03-08', 'Fadder Andre')
  await submitDay(other).click()
  await expect(timeline(other).locator('[aria-current]')).toContainText('Dag 2')
  await submitDay(page).click()
  await expect(page.getByText(/Alle dager i planen er registrert/)).toBeVisible()
  await expect(page.getByLabel('Faddernavn')).toHaveValue('Bevart navn')
  await expect(page.getByLabel('Dato')).toHaveValue('2028-03-15')
  await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeDisabled()
  await page.getByLabel('Dato').fill('2028-03-08')
  await page.getByRole('button', { name: 'Åpne registrert dag' }).click()
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 2')
  await expect(page.getByLabel('Faddernavn')).toHaveValue('Fadder Andre')
})

function retainedPageEvent(page: Page, type: 'pagehide' | 'pageshow') {
  return page.evaluate(eventType => window.dispatchEvent(new PageTransitionEvent(eventType, { persisted: true })), type)
}

test('gjenopprettet dagsoversikt oppdaterer tidslinjen uten å endre noen fanes dagsvalg', async ({ page, context }) => {
  await createRun(page)
  await retainedPageEvent(page, 'pagehide')
  const other = await context.newPage()
  await other.goto('/')
  await fillDay(other, '2028-03-08', 'Fadder Andre')
  await submitDay(other).click()
  await expect(timeline(other).locator('[aria-current]')).toContainText('Dag 2')
  await retainedPageEvent(page, 'pageshow')
  await expect(timeline(page).getByRole('listitem')).toHaveCount(2)
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 1')
  await other.reload()
  await expect(timeline(other).locator('[aria-current]')).toContainText('Dag 2')
})

test('gjenopprettet dagutkast skjules ved rollebytte og beholdes til uttrykkelig gjenopptakelse', async ({ page, context }) => {
  await createRun(page)
  await fillDay(page, '2028-03-08', 'Fadderutkast')
  const name = page.getByLabel('Faddernavn')
  await retainedPageEvent(page, 'pagehide')
  const other = await context.newPage()
  await other.goto('/')
  await role(other).selectOption('sjåfør')
  await expect(role(other)).toHaveValue('sjåfør')
  await retainedPageEvent(page, 'pageshow')
  await expect(name).toBeHidden()
  await page.getByRole('button', { name: 'Gjenoppta som fadder' }).click()
  await expect(name).toHaveValue('Fadderutkast')
  await expect(page.getByLabel('Dato')).toHaveValue('2028-03-08')
})

test('gjenopprettet dagsoversikt kontrollerer rollen igjen etter avbrutt lagring', async ({ page, context }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key)
      if (this.name === 'runs' && Reflect.get(window, 'holdAbortedDaySave')) {
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
    const abort = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'onabort')!
    Object.defineProperty(IDBTransaction.prototype, 'onabort', {
      ...abort,
      set(this: IDBTransaction, callback: (event: Event) => void) {
        abort.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'holdAbortedDaySave')) {
            Reflect.set(window, 'releaseDayAbort', () => callback.call(this, event))
          } else callback.call(this, event)
        })
      },
    })
  })
  await createRun(page)
  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('sjåfør')
  const time = page.getByLabel('Inn-tid')
  await page.evaluate(() => Reflect.set(window, 'holdAbortedDaySave', true))
  await time.fill('08:35')
  await retainedPageEvent(page, 'pagehide')
  await retainedPageEvent(page, 'pageshow')
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseDayAbort'))).toBe('function')
  const other = await context.newPage()
  await other.goto('/')
  await role(other).selectOption('fadder')
  await expect(role(other)).toHaveValue('fadder')
  await page.evaluate(() => {
    Reflect.set(window, 'holdAbortedDaySave', false)
    Reflect.get(window, 'releaseDayAbort')()
  })
  const resume = page.getByRole('button', { name: 'Gjenoppta som sjåfør' })
  await expect(resume).toBeVisible()
  await expect(time).toBeHidden()
  await resume.click()
  await expect(role(page)).toHaveValue('sjåfør')
  await expect(time).toHaveValue('08:35')
})

test('låst siste dag kan utvides separat, og lesing bevarer perspektiv og rolle', async ({ page, context }) => {
  test.setTimeout(90000)
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key)
      if (this.name === 'runs' && Reflect.get(window, 'abortExtension')) {
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
    const transaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readonly' && Reflect.get(window, 'failExtensionRead')) throw new DOMException('Prøvefeil')
      return transaction.call(this, stores, mode, options)
    }
  })
  await createRun(page, '1')
  await page.getByLabel('Buss 1').fill('DEMO-BUSS')
  await page.getByLabel('Linjer').fill('37')
  await page.getByLabel('Inn-tid').fill('08:00')
  await page.getByLabel('Ut-tid').fill('15:00')
  await role(page).selectOption('sjåfør')
  await page.getByRole('button', { name: 'Åpne førvurderingen' }).click()
  await answerAll(page)
  await page.getByRole('button', { name: 'Kontroller og bekreft førvurderingen' }).click()
  await page.getByRole('button', { name: 'Bekreft og lås', exact: true }).click()
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
  await answerAll(page)
  await page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' }).click()
  await page.getByRole('button', { name: 'Hopp over egenevalueringen' }).click()
  await page.getByRole('button', { name: 'Bekreft min del' }).click()
  await back(page).click()
  await role(page).selectOption('fadder')
  await mentor(page).click()
  await answerAll(page)
  await page.getByRole('button', { name: `Kommentar til ${firstCriterion.title} · Fadder · Dag 1` }).click()
  await page.getByRole('textbox', { name: `Fadders kommentar · ${firstCriterion.title} · Dag 1` }).fill('Fadderhistorikk dag én')
  await page.getByRole('radio', { name: 'Nei', exact: true }).check()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås dagen' }).click()
  await back(page).click()
  const locked = await readSavedRun(page)
  expect(locked.firstDay.mentorConfirmation?.actor.name).toBe('Fadder Første')

  await page.getByRole('button', { name: 'Utvid planen' }).press('Enter')
  await page.getByLabel('Antall ekstra dager').selectOption('1')
  await page.evaluate(() => Reflect.set(window, 'abortExtension', true))
  await page.getByRole('button', { name: 'Lagre utvidelse' }).click()
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret.')
  await expect(page.getByLabel('Antall ekstra dager')).toHaveValue('1')
  expect((await readSavedRun(page)).planEvents).toEqual(locked.planEvents)
  await page.evaluate(() => {
    Reflect.set(window, 'abortExtension', false)
    Reflect.set(window, 'failExtensionRead', true)
  })
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('alert')).toContainText('Den lagrede planen kunne ikke åpnes.')
  await expect(page.getByText('Planlagt siste dag · Dag 2', { exact: true })).toBeVisible()
  await page.evaluate(() => Reflect.set(window, 'failExtensionRead', false))
  await page.getByRole('button', { name: 'Åpne lagret plan' }).click()
  await expect(page.getByText('Under oppfølging', { exact: true })).toBeVisible()
  expect((await readSavedRun(page)).planEvents?.filter(event => event.source === 'extension')).toHaveLength(1)
  await expect(page.getByRole('button', { name: 'Utvid planen' })).toBeVisible()
  await fillDay(page, '2028-03-08', 'Fadder Andre')
  await submitDay(page).click()
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 2 · 08.03.2028')
  expect((await readSavedRun(page)).firstDay).toEqual(locked.firstDay)
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await expect(page.getByText('Samme førvurdering fra dag 1', { exact: false })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Fadderhistorikk dag én')
  await timeline(page).getByRole('button', { name: 'Åpne dag 1' }).click()
  await page.getByText('Vurderingspunkter · Dag 1').click()
  await expect(page.getByText('Fadderhistorikk dag én')).toBeVisible()
  await page.getByText('Planhistorikk', { exact: true }).click()
  await expect(page.getByText('Senere utvidelse · Ja · 1 ekstra fadderdag')).toBeVisible()

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(page.locator('body')).not.toContainText('Fadderhistorikk dag én')
  const other = await context.newPage()
  await other.goto('/')
  await role(other).selectOption('sjåfør')
  await expect(mentor(other)).toHaveCount(0)
  await other.close()
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect(role(page)).toHaveValue('sjåfør')
  await expect(page.locator('body')).not.toContainText('Fadderhistorikk dag én')
  await expect(page.getByText('Planhistorikk', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Egenevaluering · Dag 1')).toBeVisible()
  await expect(page.getByText('Hoppet over', { exact: true })).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Åpne dag 2' }).click()
  await expect(page.getByText('Egenevaluering · Dag 1')).toHaveCount(0)
  await page.reload()
  await expect(timeline(page).locator('[aria-current]')).toContainText('Dag 2 · 08.03.2028')
  await expect(role(page)).toHaveValue('sjåfør')

  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
  const driverIrrelevant = page.getByRole('button', { name: `Ikke relevant · ${firstCriterion.title} · Sjåfør · Ettervurdering · Dag 2` })
  await expect(driverIrrelevant).toHaveAttribute('aria-pressed', 'false')
  await driverIrrelevant.click()
  await page.getByLabel('Begrunn hvorfor dette ikke er relevant').fill('Ingen uniformskontroll')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await answerAll(page, true)
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' }).click()
  await page.getByRole('button', { name: 'Hopp over egenevalueringen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).click()
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await expect(page.getByText('Valg lagret i utkast · Hoppet over')).toBeVisible()
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
  await page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' }).click()
  await page.getByRole('button', { name: 'Hopp over egenevalueringen' }).click()
  await page.getByRole('button', { name: 'Bekreft min del' }).click()
  await back(page).click()
  await role(page).selectOption('fadder')
  await expect(role(page)).toHaveValue('fadder')
  await page.getByRole('textbox', { name: 'Buss 1' }).fill('DEMO-BUSS 2')
  await page.getByRole('textbox', { name: 'Linjer' }).fill('38')
  await page.getByLabel('Inn-tid').fill('08:00')
  await page.getByLabel('Ut-tid').fill('15:00')
  await mentor(page).click()
  await answerAll(page, true)
  const mentorValue = page.getByRole('button', { name: `Kan bli bedre · ${firstCriterion.title} · Fadder · Faddervurdering · Dag 2` })
  await mentorValue.click()
  await page.getByRole('button', { name: `Ikke relevant · ${firstCriterion.title} · Fadder · Faddervurdering · Dag 2` }).click()
  await page.getByLabel('Begrunn hvorfor dette ikke er relevant').fill('Fadders begrunnelsesutkast')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: `Avslå sjåførens Ikke relevant · ${firstCriterion.title} · Dag 2` }).click()
  await page.getByLabel('Fadders kommentar ved avslag').fill('Fadders avslagsutkast finnes')
  await page.keyboard.press('Escape')
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await page.getByText('Vurderingspunkter · Dag 2').click()
  const criterion = page.locator('.history-criteria li').filter({ has: page.getByRole('heading', { name: firstCriterion.title, exact: true }) })
  await expect(criterion).toContainText('Lagret begrunnelsesutkast · Fadders begrunnelsesutkast')
  await expect(criterion).toContainText('Lagret avslagsutkast · Fadders avslagsutkast finnes')
  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('sjåfør')
  await expect(page.locator('body')).not.toContainText('Fadders avslagsutkast finnes')
  await expect(page.locator('body')).not.toContainText('Fadders begrunnelsesutkast')
  await role(page).selectOption('fadder')
  await back(page).click()
  await mentor(page).click()
  await page.getByRole('button', { name: `Bekreft sjåførens Ikke relevant · ${firstCriterion.title} · Dag 2` }).click()
  await page.getByRole('radio', { name: 'Nei', exact: true }).check()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås dagen' }).click()
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await page.getByText('Vurderingspunkter · Dag 2').click()
  const before = criterion.locator('div').filter({ has: page.getByText('Sjåfør før · Dag 1', { exact: true }) })
  const after = criterion.locator('div').filter({ has: page.getByText('Sjåfør etter · Dag 2', { exact: true }) })
  const mentorPart = criterion.locator('div').filter({ has: page.getByText('Fadder · Dag 2', { exact: true }) })
  await expect(before.locator('dd')).toHaveText('OK')
  await expect(after.locator('dd')).toContainText('Ikke relevantBegrunnelse · Ingen uniformskontroll')
  await expect(mentorPart.locator('dd')).toContainText('Kan bli bedreFadders svar · Fadder Andre')
  await expect(criterion).toContainText('Bekreftet av Fadder Andre, fadder.')
  const finished = await readSavedRun(page)
  expect(finished.laterDays?.[0].mentorConfirmation?.actor.name).toBe('Fadder Andre')
  expect(finished.lifecycle).toBe('open')
})

test('lokalt manifest og ikoner passer installert variant og alle ressurser lastes lokalt', async ({ page }) => {
  const requests = new Set<string>()
  page.on('request', request => requests.add(request.url()))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toBeVisible()
  const resources = await page.evaluate(async () => {
    const manifestUrl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')!.href
    const response = await fetch(manifestUrl)
    const manifest = await response.json() as { display: string; start_url: string; icons: { src: string }[] }
    const dimensions = []
    for (const src of [...manifest.icons.map(icon => new URL(icon.src, manifestUrl).href), appleIcon]) {
      const image = new Image()
      image.src = src
      await image.decode()
      dimensions.push([image.naturalWidth, image.naturalHeight])
    }
    return { manifest, dimensions, origin: location.origin, workers: await navigator.serviceWorker.getRegistrations() }
  })
  expect(resources.manifest).toMatchObject({ display: 'standalone', start_url: './' })
  expect(resources.dimensions).toEqual([[192, 192], [512, 512], [180, 180]])
  expect(resources.workers).toEqual([])
  expect([...requests].every(url => new URL(url).origin === resources.origin)).toBe(true)
})
