import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { driverAfterOf, updateDriverDayDraft } from '../../src/domain/driver-day.ts'
import type { Day, Run } from '../../src/domain/run.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const [first, second] = approvedContent.criteria
const last = approvedContent.criteria.at(-1)!
const status = (page: Page) => page.getByRole('status')
const reason = (page: Page) => page.getByLabel('Begrunn hvorfor dette ikke er relevant')
const openLink = (page: Page) => page.getByRole('button', { name: 'Åpne dagens ettervurdering' })
const check = (page: Page) => page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' })
const evaluation = (page: Page) => page.getByRole('region', { name: 'Egenevaluering – frivillig' })
const strength = (page: Page) => page.getByRole('textbox', { name: 'Styrke 1 · frivillig' })
const confirm = (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Bekreft min del' })
const answer = (page: Page, title: string, label: string, day = 1) => page.getByRole('button', {
  name: `${label} · ${title} · Sjåfør · Ettervurdering · Dag ${day}`, exact: true,
})

async function create(page: Page, initialLastDay = '1') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-101')
  await page.getByLabel('Faddernavn').fill('Emil Eksempel')
  await page.getByLabel('Første dato').fill('2027-03-28')
  await page.getByLabel('Startplan').selectOption(initialLastDay)
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  return readSavedRun(page)
}

async function openAsDriver(page: Page) {
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await openLink(page).click()
}

function withAnswers(run: Run, day: Day, excluded: string[] = []) {
  return updateDriverDayDraft(run, {
    commandId: crypto.randomUUID(), runId: run.id, expectedRevision: run.revision,
    actor: { id: crypto.randomUUID(), role: 'sjåfør' },
    payload: { dayId: day.id, planRevision: run.plan?.revision ?? 1,
      changes: { answers: Object.fromEntries(driverAfterOf(run, day).answers
        .filter(item => !item.locked && !excluded.includes(item.criterionId))
        .map(item => [item.criterionId, { value: 'ok', reason: null }])) } },
  })
}

test('dag 1 bruker godkjent matrise og låst arv, og én frivillig egenevaluering låses med egen del', async ({ page }) => {
  const run = await create(page)
  await expect(openLink(page)).toHaveCount(0)
  await expect(page.getByText('Ettervurderingen åpner når førvurderingen er bekreftet.')).toBeVisible()
  const locked = lockedRun(run, first.id)
  await writeSavedRun(page, locked)
  await openAsDriver(page)
  await expect(page.locator('.matrix-row')).toHaveCount(22)
  await expect(page.getByText('Ubesvart', { exact: true })).toHaveCount(21)
  await expect(page.getByText('Begrunnelse · Ingen rygging')).toBeVisible()
  await expect(page.getByText('Låst · Videreført fra førvurderingen')).toBeVisible()
  await expect(answer(page, first.title, 'OK')).toHaveCount(0)
  await page.getByRole('button', { name: `Hjelp om ${first.title}`, exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(first.help)
  await page.keyboard.press('Escape')
  await check(page).click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeFocused()
  await page.getByRole('button', { name: `${second.title} · Velg et svar.`, exact: true }).click()
  await expect(answer(page, second.title, 'OK')).toBeFocused()
  await answer(page, second.title, 'Kan bli bedre').click()
  await answer(page, second.title, 'Ikke relevant').click()
  await reason(page).fill('Billettering')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(reason(page)).toHaveAttribute('aria-invalid', 'true')
  await page.keyboard.press('Escape')
  await expect(answer(page, second.title, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await answer(page, second.title, 'Ikke relevant').click()
  await reason(page).fill('  Ingen \n  billettering  ')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(page.getByText('Begrunnelse · Ingen billettering')).toBeVisible()
  for (const item of approvedContent.criteria.slice(2)) await answer(page, item.title, 'OK').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await check(page).click()
  await expect(evaluation(page).getByRole('textbox')).toHaveCount(6)
  await expect(evaluation(page)).toContainText('Dette er første og planlagt siste dag.')
  const skip = page.getByRole('button', { name: 'Hopp over egenevalueringen' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toContainText('Egenevaluering · Hoppet over')
  await page.keyboard.press('Escape')
  await expect(skip).toBeFocused()
  expect((await readSavedRun(page)).firstDay.driverConfirmation).toBeUndefined()
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(evaluation(page)).toContainText('Valg lagret i utkast · Hoppet over')
  await expect(page.getByText('Ikke bekreftet', { exact: true })).toBeVisible()
  await expect(evaluation(page).getByRole('textbox')).toHaveCount(0)
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await check(page).click()

  await strength(page).fill('Godt overblikk i trafikken')
  await expect(status(page)).toHaveText('Lagret på denne enheten', { timeout: 2000 })
  await page.reload()
  await openLink(page).click()
  await check(page).click()
  await expect(strength(page)).toHaveValue('Godt overblikk i trafikken')
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(page.getByRole('dialog')).toContainText('Sjåfør · Nora Eksempel')
  await expect(page.getByRole('dialog')).toContainText('Dag 1 · 28.03.2027')
  await expect(page.getByRole('dialog')).toContainText('Dagens 22 ettersvar med begrunnelser låses permanent.')
  await expect(page.getByRole('dialog')).toContainText('Egenevalueringen låses sammen med svarene.')
  await confirm(page).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeFocused()
  await expect(strength(page)).not.toBeEditable()
  await expect(answer(page, second.title, 'OK')).toHaveCount(0)
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(strength(page)).toHaveValue('Godt overblikk i trafikken')
  await expect(strength(page)).not.toBeEditable()
  await expect(check(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(page.getByRole('region', { name: 'Registrerte dager' })).toContainText('Ettervurdering bekreftet av Nora Eksempel, sjåfør.')
  await expect(page.getByLabel('Inn-tid')).toBeEditable()
  const saved = await readSavedRun(page)
  expect(saved.baselineConfirmation).toEqual(locked.baselineConfirmation)
  expect(saved.firstDay.driverAfterAnswers?.[0]).toEqual(locked.firstDay.driverAfterAnswers?.[0])
  expect(saved.firstDay.driverEvaluation?.state).toBe('submitted')
})

test('en gammel dialog må bruke ny plan, bevarer dag-2-tekst og låser bare sjåførens dag', async ({ page, context }) => {
  const run = lockedRun(await create(page, '2'), first.id)
  const day: Day & { number: 2 } = {
    id: crypto.randomUUID(), number: 2, date: '2027-03-29', driverId: run.driver.id,
    driverIdentity: { name: 'Nora Dagto', employeeNumber: 'DEMO-101' }, mentorName: 'Dagens fadder', identityConfirmed: false,
  }
  const selectedRun = { ...run, laterDays: [day], revision: run.revision + 1 }
  await writeSavedRun(page, selectedRun, day.id)
  await page.reload()
  await openAsDriver(page)
  await expect(page.getByText('Ubesvart', { exact: true })).toHaveCount(22)
  await expect(answer(page, first.title, 'Ikke relevant', 2)).toBeVisible()
  const answered = withAnswers(selectedRun, day)
  await writeSavedRun(page, answered)
  await page.reload()
  await openLink(page).click()
  await check(page).click()
  await expect(evaluation(page)).toContainText('Dette er planlagt siste dag.')
  await strength(page).fill('Tekst fra planlagt siste dag')
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(page.getByRole('dialog')).toContainText('dagens identitet, dato og tilhørighet')
  const remote = await context.newPage()
  await remote.goto('/')
  const beforePlan = await readSavedRun(remote)
  await writeSavedRun(remote, { ...beforePlan, plan: { revision: 2, lastDay: 3 }, revision: beforePlan.revision + 1 })
  await remote.close()
  await page.bringToFront()
  await confirm(page).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('Løpet ble endret')
  await expect(page.getByText('Planlagt siste dag · Dag 3')).toBeVisible()
  await expect(page.getByText('Tekst beholdt fra et tidligere tilbud.')).toBeVisible()
  await expect(strength(page)).toHaveValue('Tekst fra planlagt siste dag')
  await expect(page.getByRole('button', { name: 'Hopp over egenevalueringen' })).toHaveCount(0)
  await check(page).click()
  await expect(page.getByRole('dialog')).toContainText('Nora Dagto')
  await confirm(page).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Dagto, sjåfør.')).toBeVisible()
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(page.getByRole('region', { name: 'Registrerte dager' })).toContainText('Ettervurdering bekreftet av Nora Dagto, sjåfør.')
  await expect(page.getByLabel('Inn-tid')).toBeEditable()
  const saved = await readSavedRun(page)
  expect(saved.laterDays?.[0].driverEvaluation).toMatchObject({ dayId: day.id, date: day.date, state: 'not_offered',
    planRevision: 2, offerPlanRevision: 1, texts: { strength1: 'Tekst fra planlagt siste dag' } })
  expect(saved.laterDays?.[0].identityConfirmed).toBe(true)
  expect(saved.laterDays?.[0].mentorConfirmation).toBeUndefined()
  expect(saved.firstDay).toEqual(run.firstDay)
})

test('ubekreftet tekst overlever fjernet tilbud, og mangellisten peker til øktfelt på dag 2', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs' && Reflect.get(window, 'rejectText')) throw new DOMException('Kvote', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  const run = lockedRun(await create(page))
  const day: Day & { number: 2 } = {
    id: crypto.randomUUID(), number: 2, date: '2027-03-29', driverId: run.driver.id,
    driverIdentity: { name: 'Nora Dagto', employeeNumber: 'DEMO-101' }, mentorName: 'Dagens fadder', identityConfirmed: false,
  }
  const planned = withAnswers({ ...run, laterDays: [day], plan: { revision: 2, lastDay: 2 }, revision: run.revision + 1 }, day)
  await writeSavedRun(page, planned, day.id)
  await page.reload()
  await openAsDriver(page)
  await check(page).click()
  await expect(strength(page)).toBeEditable()
  const offered = await readSavedRun(page)
  expect(offered.laterDays?.[0].evaluationDraft).toMatchObject({ offerPlanRevision: 2, texts: {} })
  await page.evaluate(() => Reflect.set(window, 'rejectText', true))
  await strength(page).fill('Teksten ble skrevet før planen endret seg')
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await page.evaluate(() => Reflect.set(window, 'rejectText', false))
  const savedDay = offered.laterDays![0]
  const driverAfterAnswers = savedDay.driverAfterAnswers!.map((item, index) => index === 0
    ? { ...item, value: null, answerRevision: item.answerRevision + 1 } : item)
  await writeSavedRun(page, { ...offered, plan: { revision: 3, lastDay: 3 }, revision: offered.revision + 1,
    laterDays: [{ ...savedDay, driverAfterAnswers, mentorNameDraft: ' ' }] })
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('region', { name: 'Lagrede ettersvar' })).toContainText('Teksten ble skrevet før planen endret seg')
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeFocused()
  await expect(page.getByText('Tekst beholdt fra et tidligere tilbud.')).toBeVisible()
  await expect(strength(page)).toHaveValue('Teksten ble skrevet før planen endret seg')
  await page.getByRole('button', { name: 'Dag 2 · Skriv inn fadderens navn.' }).click()
  await expect(page.getByRole('group', { name: 'Faddernavn' })).toBeFocused()
  await expect(page.getByText('Nora Dagto · Dag 2', { exact: true })).toBeVisible()
  const actual = await readSavedRun(page)
  expect(actual.laterDays?.[0].evaluationDraft?.texts.strength1).toBe('Teksten ble skrevet før planen endret seg')
})

test('lagringsfeil i frivillig tekst stanser rolle og rute, og abortert etterlås kan prøves igjen', async ({ page }) => {
  await page.addInitScript(() => {
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failFollowupRead')) {
        Reflect.deleteProperty(window, 'failFollowupRead')
        Reflect.set(window, 'followupFailed', true)
        throw new DOMException('Feil ved kontroll av utfallet', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs') {
        if (Reflect.get(window, 'rejectEvaluation')) throw new DOMException('Kvote', 'QuotaExceededError')
        this.transaction.addEventListener('complete', () => {
          const receipts = Reflect.get(window, 'evaluationReceipts') as number[] | undefined
          receipts?.push(performance.now())
          const writtenTexts = Reflect.get(window, 'writtenTexts') as string[] | undefined
          writtenTexts?.push(value.data.firstDay.evaluationDraft?.texts.strength1)
        })
      }
      return put.call(this, value, key)
    }
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name === 'commands' && Reflect.get(window, 'abortDriverDay')) {
        Reflect.deleteProperty(window, 'abortDriverDay')
        request.addEventListener('success', () => this.transaction.abort())
      }
      return request
    }
  })
  const run = lockedRun(await create(page))
  await writeSavedRun(page, withAnswers(run, run.firstDay))
  await openAsDriver(page)
  await check(page).click()
  await expect(strength(page)).toBeEditable()
  const started = await page.evaluate(() => {
    Reflect.set(window, 'evaluationReceipts', [])
    return performance.now()
  })
  await strength(page).pressSequentially('Stabil krypkjøring', { delay: 150 })
  const lastInput = await page.evaluate(() => performance.now())
  await expect(status(page)).toHaveText('Lagret på denne enheten', { timeout: 2000 })
  const receipts = await page.evaluate(() => Reflect.get(window, 'evaluationReceipts') as number[])
  expect(receipts.length).toBeGreaterThan(1)
  expect(receipts[0] - started).toBeLessThanOrEqual(2000)
  expect(receipts.at(-1)! - lastInput).toBeLessThanOrEqual(2000)
  await page.evaluate(() => Reflect.set(window, 'rejectEvaluation', true))
  await strength(page).fill('Tekst som må overleve feilen')
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await expect(status(page)).toHaveText('Ulagrede endringer')
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(strength(page)).toHaveValue('Tekst som må overleve feilen')
  await page.evaluate(() => Reflect.set(window, 'rejectEvaluation', false))
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.evaluate(() => Reflect.set(window, 'rejectEvaluation', true))
  await strength(page).fill('Utdatert tekst etter en ny feil')
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await page.evaluate(() => {
    Reflect.set(window, 'rejectEvaluation', false)
    Reflect.set(window, 'writtenTexts', [])
  })
  await strength(page).fill('Nyeste redigerte tekst')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  expect(await page.evaluate(() => Reflect.get(window, 'writtenTexts'))).toEqual(['Nyeste redigerte tekst'])
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(confirm(page)).toBeVisible()
  await page.evaluate(() => Reflect.set(window, 'abortDriverDay', true))
  await confirm(page).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Ettervurderingen kunne ikke bekreftes')
  expect((await readSavedRun(page)).firstDay.driverConfirmation).toBeUndefined()
  await page.evaluate(() => Reflect.set(window, 'failFollowupRead', true))
  await confirm(page).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'followupFailed'))).toBe(true)
  await expect(strength(page)).toHaveValue('Nyeste redigerte tekst')
})

test('tapt kvittering kan repeteres, og gammel dialog i annen fane får den kvitterte låsen', async ({ page, context }) => {
  await page.addInitScript(() => {
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'commands') (Reflect.get(window, 'confirmAttempts') as string[] | undefined)?.push(String(key))
      return get.call(this, key)
    }
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failDriverDayRead')) {
        Reflect.deleteProperty(window, 'failDriverDayRead')
        throw new DOMException('Feil ved kontroll av utfallet', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(handler: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'loseDriverDayReceipt')) {
            Reflect.deleteProperty(window, 'loseDriverDayReceipt')
            Reflect.set(window, 'failDriverDayRead', true)
            this.onabort?.(event)
          } else handler.call(this, event)
        })
      },
    })
  })
  const run = lockedRun(await create(page))
  await writeSavedRun(page, withAnswers(run, run.firstDay))
  await openAsDriver(page)
  await check(page).click()
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(confirm(page)).toBeVisible()
  const stale = await context.newPage()
  await stale.goto('/')
  await openLink(stale).click()
  await check(stale).click()
  await stale.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(confirm(stale)).toBeVisible()

  await page.bringToFront()
  await page.evaluate(() => {
    Reflect.set(window, 'confirmAttempts', [])
    Reflect.set(window, 'loseDriverDayReceipt', true)
  })
  await confirm(page).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Status for etterbekreftelsen kunne ikke leses')
  await expect(page.locator('.baseline-state').first()).toHaveText('Ikke bekreftet')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alert')).toContainText('Status for etterbekreftelsen kunne ikke leses')
  await expect(strength(page)).not.toBeEditable()
  const saved = await readSavedRun(page)
  expect(saved.firstDay.driverEvaluation?.state).toBe('submitted')
  expect(saved.firstDay.driverEvaluation?.texts).toEqual({})
  await stale.bringToFront()
  await confirm(stale).click()
  await expect(stale.getByRole('dialog')).toHaveCount(0)
  await expect(stale.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await page.bringToFront()
  await page.getByRole('button', { name: 'Prøv bekreftelsen igjen' }).click()
  await confirm(page).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  const attempts = await page.evaluate(() => Reflect.get(window, 'confirmAttempts') as string[])
  expect(attempts).toHaveLength(2)
  expect(attempts[0]).toBe(attempts[1])
  expect(await readSavedRun(page)).toEqual(saved)
})

test('egenevaluering og bekreftelse kan betjenes på små flater med 200 prosent tekst', async ({ page }) => {
  const run = lockedRun(await create(page))
  await writeSavedRun(page, withAnswers(run, run.firstDay))
  await openAsDriver(page)
  for (const [width, height] of [[320, 256], [360, 800], [390, 844], [768, 1024], [844, 390], [1280, 900]]) {
    await page.setViewportSize({ width, height })
    await page.locator('html').evaluate(html => { html.style.fontSize = '200%' })
    const button = answer(page, last.title, 'Kan bli bedre')
    await button.evaluate(target => {
      target.scrollIntoView({ block: 'center' })
      window.scrollBy(0, target.getBoundingClientRect().top - 4)
      ;(target as HTMLElement).focus({ preventScroll: true })
    })
    await expect.poll(async () => {
      const headingBox = await page.locator('.matrix-headings').boundingBox()
      const buttonBox = await button.boundingBox()
      return Boolean(headingBox && buttonBox && buttonBox.y >= headingBox.height)
    }).toBe(true)
    expect((await button.boundingBox())?.width).toBeGreaterThanOrEqual(44)
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48 - 0.001)
    await check(page).click()
    await expect(evaluation(page).getByRole('heading')).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await evaluation(page).getByRole('textbox').last().focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Tilbake til svarene' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Hopp over egenevalueringen' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Gå til bekreftelse' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).focus()
    await page.keyboard.press('Tab')
    await expect(confirm(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Gå til bekreftelse' })).toBeFocused()
    await page.getByRole('button', { name: 'Tilbake til svarene' }).click()
  }
})

test('ettersvar, frivillig tekst og etterlås lagres under 60 sekunder nettbrudd', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  const run = lockedRun(await create(page))
  await writeSavedRun(page, withAnswers(run, run.firstDay, [last.id]))
  await openAsDriver(page)
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.bringToFront()
  await context.setOffline(true)
  const started = performance.now()
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await answer(page, last.title, 'Kan bli bedre').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await check(page).click()
  await strength(page).fill('Beholdt uten nett')
  await page.getByRole('button', { name: 'Gå til bekreftelse' }).click()
  await expect(confirm(page)).toBeVisible()
  await page.waitForTimeout(Math.max(0, 60_000 - (performance.now() - started)))
  await confirm(page).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  expect(requests).toEqual([])
  await context.setOffline(false)
  const offlineMs = Math.round(performance.now() - started)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Sjåførens ettervurdering er låst')).toBeVisible({ timeout: 5000 })
  await openLink(page).click()
  await expect(strength(page)).toHaveValue('Beholdt uten nett')
  await expect(page.getByText('Valgt · Kan bli bedre', { exact: true })).toBeVisible()
  console.log(`${testInfo.project.name}: ettersvar og egenevaluering låst etter ${offlineMs} ms frakoblet uten nettverksforespørsler`)
})
