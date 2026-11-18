import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { updateDriverDayDraft } from '../../src/domain/driver-day.ts'
import type { Day, Run } from '../../src/domain/run.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const role = (page: Page) => page.getByLabel('Simuleringsrolle')
const mentor = (page: Page) => page.getByRole('button', { name: 'Åpne dagens faddervurdering' })
const plan = (page: Page) => page.getByRole('region', { name: 'Behov for videre oppfølging' })
const yes = (page: Page) => plan(page).getByRole('radio', { name: 'Ja', exact: true })
const no = (page: Page) => plan(page).getByRole('radio', { name: 'Nei', exact: true })
const days = (page: Page) => plan(page).getByRole('radio', { name: 'Flere fadderdager' })
const training = (page: Page) => plan(page).getByRole('radio', { name: 'Utvidet kjøretrening før fadderkjøring fortsetter' })
const count = (page: Page) => plan(page).getByRole('combobox', { name: 'Antall ekstra dager' })
const status = (page: Page) => page.getByRole('status')
const now = (page: Page, day: number) => plan(page).getByText(`Gjeldende planlagt siste dag · Dag ${day}`, { exact: true })
const after = (page: Page) => page.getByRole('button', { name: 'Åpne dagens ettervurdering' })
const strength = (page: Page) => page.getByRole('textbox', { name: 'Styrke 1 · frivillig' })
const firstCriterion = approvedContent.criteria[0].title
const openComment = (page: Page) => page.getByRole('button', { name: `Kommentar til ${firstCriterion} · Fadder · Dag 1` })
const comment = (page: Page) => page.getByRole('textbox', { name: `Fadders kommentar · ${firstCriterion} · Dag 1` })

async function create(page: Page, initialLastDay = '3') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-116')
  await page.getByLabel('Faddernavn').fill('Emil Eksempel')
  await page.getByLabel('Første dato').fill('2027-04-05')
  await page.getByLabel('Startplan').selectOption(initialLastDay)
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(mentor(page)).toBeVisible()
  return readSavedRun(page)
}

async function chooseDays(page: Page, number: string) {
  await yes(page).check()
  await days(page).check()
  await count(page).selectOption(number)
}

test('fadder velger underveis, får kvittert siste dag og leser historikk med riktig rolle', async ({ page }) => {
  await create(page)
  await mentor(page).click()
  await expect(now(page, 3)).toBeVisible()
  await expect(plan(page)).toContainText('Dagens oppfølging er ubesvart.')
  await expect(no(page)).not.toBeChecked()
  await expect(training(page)).toHaveCount(0)
  await expect(count(page)).toHaveCount(0)
  await yes(page).focus()
  await page.keyboard.press('Space')
  await expect(yes(page)).toBeFocused()
  await expect(status(page)).toContainText('Ufullstendig planutkast')
  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('fadder')
  await expect(yes(page)).toBeChecked()
  await days(page).check()
  await expect(count(page)).toHaveAccessibleDescription('Velg antall ekstra dager.')
  await expect(now(page, 3)).toBeVisible()
  expect((await readSavedRun(page)).planEvents).toBeUndefined()

  await count(page).focus()
  await count(page).selectOption('1')
  await expect(now(page, 4)).toBeVisible({ timeout: 2000 })
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(count(page)).toBeFocused()
  await count(page).selectOption('2')
  await expect(now(page, 5)).toBeVisible({ timeout: 2000 })
  const extended = await readSavedRun(page)
  expect(extended.planEvents?.map(event => [event.oldLastDay, event.newLastDay])).toEqual([[3, 4], [4, 5]])
  expect(new Set(extended.planEvents?.map(event => event.decisionId)).size).toBe(1)

  await no(page).check()
  await expect(count(page)).toHaveCount(0)
  await expect(training(page)).toHaveCount(0)
  await expect(now(page, 3)).toBeVisible()
  await yes(page).check()
  await training(page).check()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await plan(page).getByText('Planhistorikk').click()
  await expect(plan(page).getByRole('list')).toContainText('Emil Eksempel, fadder')
  await expect(plan(page).getByRole('list')).toContainText('Dag 3 (uendret)')
  await role(page).selectOption('sjåfør')
  await expect(page.getByText('Under oppfølging', { exact: true })).toBeVisible()
  await expect(page.getByText('Planlagt siste dag', { exact: true })).toBeVisible()
  await expect(page.getByText('Dag 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Planhistorikk')).toHaveCount(0)
  await expect(training(page)).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Under oppfølging', { exact: true })).toBeVisible({ timeout: 5000 })
})

test('foreldet fane viser kvittert plan og eget forslag separat før uttrykkelig valg', async ({ page, context }) => {
  await create(page)
  await mentor(page).click()
  const stale = await context.newPage()
  await stale.goto('/')
  await mentor(stale).click()
  await chooseDays(page, '2')
  await expect(now(page, 5)).toBeVisible()
  await chooseDays(stale, '1')
  await expect(stale.getByRole('alert')).toContainText('Endringene er ikke lagret')
  const conflict = stale.getByRole('region', { name: 'Lagrede fadderopplysninger' })
  await expect(conflict).toContainText('Lagret plan · Dag 5')
  await expect(conflict).toContainText('Ditt ulagrede oppfølgingsvalg · Ja · Flere fadderdager · 1')
  await expect(conflict).toContainText('Foreslått siste dag med lagret plan · Dag 4')
  await expect(now(stale, 5)).toBeVisible()
  await expect(plan(stale).getByText('Foreslått siste dag')).toHaveCount(0)
  await stale.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(conflict).toBeVisible()
  expect((await readSavedRun(stale)).planEvents).toHaveLength(1)
  await conflict.getByRole('button', { name: 'Lagre mitt fadderutkast' }).click()
  await expect(now(stale, 4)).toBeVisible()
  expect((await readSavedRun(stale)).planEvents?.map(event => event.newLastDay)).toEqual([5, 4])
})

test('foreldet planutkast valideres mot andre dagers kvitterte valg før det kan lagres', async ({ page, context }) => {
  const run = await create(page)
  const second = { id: crypto.randomUUID(), number: 2, date: '2027-04-09', driverId: run.driver.id,
    mentorName: 'Fadder på dag to', identityConfirmed: false } as const
  await writeSavedRun(page, { ...run, laterDays: [second] })
  await page.reload()
  await mentor(page).click()
  const remote = await context.newPage()
  await remote.goto('/')
  await remote.getByRole('button', { name: 'Åpne dag 2', exact: true }).click()
  await mentor(remote).click()
  await chooseDays(remote, '2')
  await expect(now(remote, 5)).toBeVisible()

  await chooseDays(page, '1')
  const conflict = page.getByRole('region', { name: 'Lagrede fadderopplysninger' })
  await expect(conflict).toContainText('Planen kan ha maksimalt fem dager.')
  await expect(conflict.getByRole('button', { name: 'Lagre mitt fadderutkast' })).toHaveCount(0)
  await conflict.getByRole('button', { name: 'Behold fadderutkastet for redigering' }).click()
  await expect(count(page)).toHaveValue('1')
  await expect(count(page)).toHaveAccessibleDescription('Planen kan ha maksimalt fem dager.')
  await expect(now(page, 5)).toBeVisible()
  expect((await readSavedRun(page)).planEvents).toHaveLength(1)
})

test('abort og tapt kvittering beholder skille mellom gjeldende plan og ulagret forslag', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    const unacknowledged = new WeakSet<IDBTransaction>()
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name !== 'commands' || JSON.parse(value.data.fingerprint)[0] !== 'save-follow-up') return request
      if (Reflect.get(window, 'abortPlan')) {
        Reflect.deleteProperty(window, 'abortPlan')
        request.addEventListener('success', () => this.transaction.abort())
      } else if (Reflect.get(window, 'losePlanReceipt')) {
        Reflect.deleteProperty(window, 'losePlanReceipt')
        unacknowledged.add(this.transaction)
      }
      return request
    }
    const property = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...property,
      set(handler: (event: Event) => void) {
        property.set!.call(this, (event: Event) => {
          if (unacknowledged.has(this)) this.onabort?.(event)
          else handler.call(this, event)
        })
      },
    })
  })
  await create(page)
  await mentor(page).click()
  await page.evaluate(() => Reflect.set(window, 'abortPlan', true))
  await chooseDays(page, '1')
  await expect(status(page)).toHaveText('Ulagrede endringer')
  await expect(now(page, 3)).toBeVisible()
  await expect(count(page)).toHaveValue('1')
  await expect(count(page)).toBeDisabled()
  await expect(no(page)).toBeDisabled()
  await expect(training(page)).toBeDisabled()
  await openComment(page).click()
  await expect(comment(page)).toBeEditable()
  expect((await readSavedRun(page)).planEvents).toBeUndefined()

  await page.evaluate(() => Reflect.set(window, 'losePlanReceipt', true))
  const retry = page.getByRole('button', { name: 'Prøv igjen', exact: true })
  await retry.click()
  await expect(retry).toBeVisible()
  await expect(now(page, 3)).toBeVisible()
  await expect(count(page)).toBeDisabled()
  await expect(count(page)).toHaveValue('1')
  const committed = await readSavedRun(page)
  expect(committed.plan?.lastDay).toBe(4)
  expect(committed.planEvents).toHaveLength(1)
  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('fadder')
  await retry.click()
  await expect(now(page, 4)).toBeVisible()
  expect(await readSavedRun(page)).toEqual(committed)
  await page.reload()
  await mentor(page).click()
  await expect(now(page, 4)).toBeVisible()
  await expect(count(page)).toHaveValue('1')
})

test('kjent complete viser kvittert plan og kan gjenta bare innlesingen', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    const transaction = IDBDatabase.prototype.transaction
    let failRead = false
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'commands' && JSON.parse(value.data.fingerprint)[0] === 'save-follow-up') failRead = true
      return add.call(this, value, key)
    }
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readonly' && failRead) {
        failRead = false
        throw new DOMException('Fiktiv lesefeil')
      }
      return transaction.call(this, stores, mode, options)
    }
  })
  await create(page)
  await mentor(page).click()
  await chooseDays(page, '1')
  await expect(page.getByRole('alert')).toHaveText('Oppfølgingen ble lagret. Gjeldende lagrede opplysninger kunne ikke leses.')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(now(page, 4)).toBeVisible()
  await expect(count(page)).toBeDisabled()
  const saved = await readSavedRun(page)
  expect(saved.planEvents).toHaveLength(1)
  await page.getByRole('button', { name: 'Les lagrede opplysninger på nytt' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(count(page)).toBeEnabled()
  expect(await readSavedRun(page)).toEqual(saved)
})

test('nyere revisjon ved etterlesing gjenkjenner planhendelsen og beholder separat faddertekst', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name !== 'commands' || JSON.parse(value.data.fingerprint)[0] !== 'save-follow-up'
        || Reflect.get(window, 'queuedOtherPlan')) return request
      Reflect.set(window, 'queuedOtherPlan', true)
      const nextTx = this.transaction.db.transaction('runs', 'readwrite')
      const store = nextTx.objectStore('runs')
      const get = store.get(value.data.receipt.runId)
      get.onsuccess = () => {
        const record = get.result as { schemaVersion: number; data: Run }
        const run = record.data
        const event = run.planEvents!.at(-1)!
        const choice = { kind: 'none' } as const
        run.revision += 1
        run.plan = { revision: event.planRevision + 1, lastDay: 3 }
        run.followUpDecisions![0].choice = choice
        run.planEvents!.push({ ...event, commandId: crypto.randomUUID(), oldLastDay: event.newLastDay,
          newLastDay: 3, choice, planRevision: run.plan.revision })
        store.put(record, run.id)
      }
      return request
    }
  })
  await create(page)
  await mentor(page).click()
  await openComment(page).click()
  await chooseDays(page, '1')
  await comment(page).fill('Teksten fra mitt fadderutkast')
  await plan(page).getByRole('button', { name: 'Lagre oppfølging' }).press('Enter')
  const conflict = page.getByRole('region', { name: 'Lagrede fadderopplysninger' })
  await expect(page.getByRole('alert')).toHaveText('Oppfølgingen ble lagret. Løpet er oppdatert. Kontroller de andre endringene.')
  await expect(conflict).toContainText('Din kommentar · Teksten fra mitt fadderutkast')
  await expect(conflict.getByText('Ditt ulagrede oppfølgingsvalg')).toHaveCount(0)
  await expect(now(page, 3)).toBeVisible()
  const saved = await readSavedRun(page)
  expect(saved.firstDay.mentorDay).toBeUndefined()
  expect(saved.planEvents?.map(event => event.newLastDay)).toEqual([4, 3])
  await conflict.getByRole('button', { name: 'Lagre mitt fadderutkast' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  const after = await readSavedRun(page)
  expect(after.firstDay.mentorDay?.comments[approvedContent.criteria[0].id]?.text).toBe('Teksten fra mitt fadderutkast')
  expect(after.planEvents).toEqual(saved.planEvents)
})

test('mangellenke, eksplisitt lagring og forkasting beholder fokus i oppfølgingsfeltet', async ({ page }) => {
  await create(page)
  await mentor(page).click()
  await yes(page).check()
  await days(page).check()
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  const issues = page.getByRole('region', { name: 'Mangler i faddervurderingen' })
  await issues.getByRole('button', { name: 'Oppfølging · Velg antall ekstra dager.' }).press('Enter')
  await expect(count(page)).toBeFocused()
  await expect(count(page)).toHaveValue('')
  await expect(days(page)).toBeChecked()
  await plan(page).getByRole('button', { name: 'Forkast planutkast' }).press('Enter')
  await expect(yes(page)).toBeFocused()
  await expect(yes(page)).not.toBeChecked()
  await expect(count(page)).toHaveCount(0)

  await chooseDays(page, '1')
  await plan(page).getByRole('button', { name: 'Lagre oppfølging' }).press('Enter')
  await expect(now(page, 4)).toBeVisible()
  await expect(count(page)).toBeFocused()
  await expect(plan(page).getByRole('button', { name: 'Lagre oppfølging' })).toHaveCount(0)
})

test('kvittert plan fra fadder flytter et siste-dagstilbud og en gammel dialog bevarer teksten', async ({ page, context }) => {
  const run = lockedRun(await create(page, '2'))
  const day = {
    id: crypto.randomUUID(), number: 2, date: '2027-04-09', driverId: run.driver.id,
    mentorName: 'Fadder på dag to', identityConfirmed: false,
  } satisfies Day
  const seeded = { ...run, laterDays: [day], revision: run.revision + 1 }
  const answered = updateDriverDayDraft(seeded, {
    commandId: crypto.randomUUID(), runId: run.id, expectedRevision: seeded.revision,
    actor: { id: crypto.randomUUID(), role: 'sjåfør' },
    payload: { dayId: day.id, planRevision: 1, changes: {
      answers: Object.fromEntries(run.content.criteria.map(({ id }) => [id, { value: 'ok', reason: null }])),
    } },
  })
  await writeSavedRun(page, answered, day.id)
  await page.reload()
  await role(page).selectOption('sjåfør')
  await after(page).click()
  const check = page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' })
  await check.click()
  await strength(page).fill('God flyt før planendringen')
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Bekreft min del' })
  await expect(confirm).toBeVisible()

  const remote = await context.newPage()
  await remote.goto('/')
  await role(remote).selectOption('fadder')
  await mentor(remote).click()
  await chooseDays(remote, '1')
  await expect(now(remote, 3)).toBeVisible()
  await role(remote).selectOption('sjåfør')
  await expect(remote.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  await expect(mentor(remote)).toHaveCount(0)
  await remote.close()
  await page.bringToFront()
  await confirm.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Planlagt siste dag · Dag 3')).toBeVisible()
  await expect(strength(page)).toHaveValue('God flyt før planendringen')
  expect((await readSavedRun(page)).laterDays?.[0].driverConfirmation).toBeUndefined()
  await check.click()
  await confirm.click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  expect((await readSavedRun(page)).laterDays?.[0].driverEvaluation).toMatchObject({
    state: 'not_offered', dayId: day.id, offerPlanRevision: 1, planRevision: 2,
    texts: { strength1: 'God flyt før planendringen' },
  })
})

test('planfeltene beholder tastaturfokus og plass ved 200 prosent tekststørrelse', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await create(page)
  await mentor(page).click()
  await yes(page).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  await expect(days(page)).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  await expect(count(page)).toBeFocused()
  await count(page).selectOption('1')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(count(page)).toBeFocused()
  await page.locator('html').evaluate(html => { html.style.fontSize = '200%' })
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 640 })
    await count(page).focus()
    await training(page).focus()
    await expect(training(page)).toBeFocused()
    await expect(training(page)).toBeInViewport()
    expect(await page.locator('html').evaluate(html => html.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await training(page).press('Space')
  await expect(training(page)).toBeFocused()
  await expect(count(page)).toHaveCount(0)
  await expect(now(page, 3)).toBeVisible()
})

test('kvitterte planendringer lagres gjennom 60 sekunder nettbrudd', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  await create(page)
  await mentor(page).click()
  await chooseDays(page, '1')
  await expect(now(page, 4)).toBeVisible()
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await context.setOffline(true)
  const start = performance.now()
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await count(page).selectOption('2')
  await expect(now(page, 5)).toBeVisible({ timeout: 2000 })
  await page.waitForTimeout(Math.max(0, 60_000 - (performance.now() - start)))
  await training(page).check()
  await expect(now(page, 3)).toBeVisible({ timeout: 2000 })
  expect(requests).toEqual([])
  const offlineMs = Math.round(performance.now() - start)
  await context.setOffline(false)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Under oppfølging', { exact: true })).toBeVisible({ timeout: 5000 })
  await mentor(page).click()
  await expect(training(page)).toBeChecked()
  expect((await readSavedRun(page)).planEvents?.map(event => event.newLastDay)).toEqual([4, 5, 3])
  console.log(`${testInfo.project.name}: Plan lagret etter ${offlineMs} ms frakoblet uten nettverksforespørsler`)
})
