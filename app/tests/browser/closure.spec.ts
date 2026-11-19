import { readFile, writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { updateDayDraft } from '../../src/domain/day-draft.ts'
import { confirmDriverDay, updateDriverDayDraft } from '../../src/domain/driver-day.ts'
import { saveFollowUp } from '../../src/domain/follow-up.ts'
import { confirmMentorDay, updateMentorDay } from '../../src/domain/mentor-day.ts'
import type { Actor, Run } from '../../src/domain/run.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const role = (page: Page) => page.getByLabel('Simuleringsrolle')
const back = (page: Page) => page.getByRole('button', { name: 'Til dagsoversikten' })
const overview = (page: Page) => page.getByRole('heading', { name: 'Dagsoversikt' })
const openClosure = (page: Page) => page.getByRole('button', { name: 'Avslutt perioden', exact: true })
const review = (page: Page) => page.getByRole('button', { name: 'Kontroller avslutning' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Avslutte perioden?' })
const submit = (page: Page) => dialog(page).getByRole('button', { name: 'Avslutt perioden', exact: true })
const outcome = (page: Page, name: string) => page.getByRole('radio', { name, exact: true })
const text = (page: Page) => page.getByRole('textbox', { name: 'Fadders oppsummering (valgfritt)' })
const saved = (page: Page) => expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
const fullHistory = (page: Page) => page.getByRole('heading', { name: 'Hele skjemaet' })

async function createRun(page: Page) {
  await page.goto('/')
  const create = page.getByRole('button', { name: 'Opprett løp', exact: true })
  await create.click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-21')
  await page.getByLabel('Faddernavn').fill('Første Fadder')
  await page.getByLabel('Første dato').fill('2026-11-18')
  await create.click()
  await expect(overview(page)).toBeVisible()
}

async function answerAll(page: Page, count = 22, skip = 0) {
  const choices = page.getByRole('button', { name: /^OK ·/ })
  await expect(choices).toHaveCount(count)
  for (const button of (await choices.all()).slice(skip)) await button.click()
}

function command(run: Run, actor: Actor) {
  return { commandId: crypto.randomUUID(), runId: run.id, expectedRevision: run.revision, actor }
}

async function seedCompletedRun(page: Page, pdfProof = false) {
  await createRun(page)
  const driver: Actor = { id: crypto.randomUUID(), role: 'sjåfør' }
  const mentor: Actor = { id: crypto.randomUUID(), role: 'fadder' }
  const confirmedAt = '2026-11-18T15:00:00.000Z'
  const answers = Object.fromEntries(approvedContent.criteria.map(({ id }) => [id, { value: 'ok' as const, reason: null }]))
  const item = approvedContent.criteria[0].id
  let run = lockedRun(await readSavedRun(page))
  const dayId = run.firstDay.id
  run = updateDayDraft(run, { ...command(run, mentor), payload: {
    dayId, changes: { bus1: 'DEMO-BUSS', routes: '21', startTime: '08:00', endTime: '15:00' },
  } })
  run = updateDriverDayDraft(run, { ...command(run, driver), payload: {
    dayId, planRevision: 1, changes: {
      answers: pdfProof ? { ...answers, [item]: { value: 'needs_improvement', reason: null } } : answers,
      evaluation: { decision: 'submitted', texts: { strength1: 'Egen styrke' } },
    },
  } })
  run = confirmDriverDay(run, { ...command(run, driver), payload: { dayId, planRevision: 1, confirmedAt } })
  run = updateMentorDay(run, { ...command(run, mentor), payload: {
    dayId, changes: {
      answers: pdfProof ? { ...answers, [item]: { value: 'not_relevant', reason: 'Ingen uniformskontroll' } } : answers,
      comments: { [item]: pdfProof ? 'Langkommentar begynner.\n' + 'Überføring'.repeat(1000) + '\nSluttmerke ÆØÅ åäö?' : 'Historisk fadderkommentar' },
    },
  } })
  run = saveFollowUp(run, { ...command(run, mentor), payload: { dayId, source: 'daily', choice: { kind: 'training' } } })
  run = confirmMentorDay(run, { ...command(run, mentor), payload: { dayId, confirmedAt } })
  await writeSavedRun(page, run)
  await page.reload()
  await expect(overview(page)).toBeVisible()
}

test('fadder lukker tidlig etter reelle bekreftelser og begge roller leser samme skjema', async ({ page }) => {
  test.setTimeout(90_000)
  const criterion = approvedContent.criteria[0]
  await createRun(page)
  await openClosure(page).click()
  await expect(outcome(page, 'Godkjent')).not.toBeChecked()
  await expect(outcome(page, 'Oppfølgingsbehov')).not.toBeChecked()
  await review(page).click()
  await expect(outcome(page, 'Godkjent')).toHaveAttribute('aria-describedby', 'conclusion-status-error')
  await expect(outcome(page, 'Godkjent')).toBeFocused()
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.getByText('Dag 1 · Førvurderingen må bekreftes av sjåføren.')).toBeVisible()
  await back(page).click()
  await page.getByLabel('Buss 1').fill('DEMO-BUSS')
  await page.getByLabel('Linjer').fill('21 og 37')
  await page.getByLabel('Inn-tid').fill('08:00')
  await page.getByLabel('Ut-tid').fill('15:00')
  await role(page).selectOption('sjåfør')
  await page.getByRole('button', { name: 'Åpne førvurderingen' }).click()
  await page.getByRole('button', { name: /^Ikke relevant ·/ }).first().click()
  await page.getByRole('dialog').getByRole('textbox').fill('Ingen rygging')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await answerAll(page, 22, 1)
  await page.getByRole('button', { name: 'Kontroller og bekreft førvurderingen' }).click()
  await page.getByRole('button', { name: 'Bekreft og lås', exact: true }).click()
  await back(page).click()
  const historical = await readSavedRun(page)
  historical.baseline!.answers[0].reason = 'Kort'
  historical.firstDay.driverAfterAnswers![0].reason = 'Kort'
  await writeSavedRun(page, historical)
  await page.reload()
  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
  await expect(page.getByText('Begrunnelse · Kort')).toBeVisible()
  await answerAll(page, 21)
  await page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' }).click()
  await page.getByRole('button', { name: 'Hopp over egenevalueringen' }).click()
  await page.getByRole('button', { name: 'Bekreft min del' }).click()
  await back(page).click()
  await role(page).selectOption('fadder')
  await page.getByRole('textbox', { name: 'Faddernavn', exact: true }).fill('Andre Fadder')
  await page.getByRole('button', { name: 'Åpne dagens faddervurdering' }).click()
  await answerAll(page)
  await page.getByRole('button', { name: /^Kan bli bedre ·/ }).first().click()
  await page.getByRole('button', { name: /Avslå sjåførens Ikke relevant/ }).click()
  await page.getByRole('dialog').getByRole('textbox').fill('Rygging ble gjennomført')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).click()
  await page.getByRole('button', { name: `Kommentar til ${criterion.title} · Fadder · Dag 1` }).click()
  await page.getByRole('textbox', { name: `Fadders kommentar · ${criterion.title} · Dag 1` }).fill('Egen merknad fra fadder')
  await outcome(page, 'Nei').check()
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås dagen' }).click()
  await back(page).click()

  await page.setViewportSize({ width: 320, height: 640 })
  await openClosure(page).click()
  await expect(page.getByLabel('Avsluttende faddernavn')).toHaveValue('Andre Fadder')
  await page.getByLabel('Avsluttende faddernavn').fill('')
  await review(page).click()
  await expect(page.getByLabel('Avsluttende faddernavn')).toHaveAttribute('aria-describedby', 'closing-name-error')
  await expect(page.getByLabel('Avsluttende faddernavn')).toBeFocused()
  const conclusion = 'Fadders oppsummering etter registrert økt.\n' + 'Langtekst'.repeat(1100)
  await text(page).fill(conclusion)
  await outcome(page, 'Godkjent').check()
  await role(page).selectOption('sjåfør')
  await expect(text(page)).toHaveCount(0)
  await expect(openClosure(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await page.getByText('Vurderingspunkter · Dag 1').click()
  await expect(page.locator('body')).not.toContainText('Egen merknad fra fadder')
  await expect(page.locator('body')).not.toContainText(conclusion)
  await back(page).click()
  await role(page).selectOption('fadder')
  await openClosure(page).click()
  await expect(text(page)).toHaveValue(conclusion)
  await expect(outcome(page, 'Godkjent')).toBeChecked()
  await page.getByLabel('Avsluttende faddernavn').fill('Tredje Fadder')
  await page.clock.setFixedTime(new Date('2026-11-19T09:00:00.000Z'))
  await review(page).press('Enter')
  await expect(dialog(page)).toContainText('Fadder · Tredje Fadder ·')
  await expect(dialog(page)).toContainText('Ingen flere dager kan legges til. Sjåføren får tilgang til hele skjemaet.')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(review(page)).toBeFocused()
  expect((await readSavedRun(page)).lifecycle).toBe('open')
  await page.clock.setFixedTime(new Date('2026-11-19T22:59:00.000Z'))
  await review(page).click()
  await expect(dialog(page)).toContainText(/19\.11\./)
  await page.clock.setFixedTime(new Date('2026-11-19T23:00:00.000Z'))
  await submit(page).press('Enter')
  await expect(page.getByRole('alert')).toContainText('Datoen har endret seg.')
  await expect(review(page)).toBeFocused()
  expect((await readSavedRun(page)).lifecycle).toBe('open')
  await review(page).press('Enter')
  await expect(dialog(page)).toContainText(/20\.11\./)
  await submit(page).press('Enter')
  await expect(fullHistory(page)).toBeVisible()
  const closed = await readSavedRun(page)
  expect(closed.closureSnapshot?.closedBy.confirmedAt).toBe('2026-11-19T23:00:00.000Z')
  expect(closed.closureSnapshot?.closedBy.actor.name).toBe('Tredje Fadder')
  expect(closed.closureSnapshot?.history.firstDay.mentorConfirmation?.actor.name).toBe('Andre Fadder')
  expect(closed.closureSnapshot?.history.firstDay.mentorDay?.reviews[criterion.id]?.decision).toBe('rejected')

  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('sjåfør')
  await expect(role(page)).toHaveAttribute('aria-disabled', 'false')
  await expect(fullHistory(page)).toBeVisible()
  await page.getByText('Vurderingspunkter · Dag 1').click()
  await expect(page.getByText('Egen merknad fra fadder')).toBeVisible()
  await expect(page.getByText('Fadders avslagskommentar · Rygging ble gjennomført')).toBeVisible()
  await expect(page.getByText(conclusion)).toBeVisible()
  await expect(page.locator('main input, main textarea')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.reload()
  await expect(overview(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Opprett neste dag' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Åpne hele skjemaet' }).click()
  await expect(page.getByText(conclusion)).toBeVisible()
  await page.getByText('Vurderingspunkter · Dag 1').click()
  await expect(page.getByRole('region', { name: /^Dag 1 ·/ }).getByText('Begrunnelse · Kort')).toBeVisible()
})

test('foreldet modal godtar ingen ny konklusjon og henter lukking fra annen fane', async ({ page, context }) => {
  await seedCompletedRun(page)
  await openClosure(page).click()
  await outcome(page, 'Godkjent').check()
  await review(page).click()
  await expect(dialog(page)).toBeVisible()

  const other = await context.newPage()
  await other.goto('/')
  await openClosure(other).click()
  await outcome(other, 'Oppfølgingsbehov').check()
  await saved(other)
  await submit(page).click()
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Avslutt perioden', exact: true })).toBeFocused()
  await expect(outcome(page, 'Oppfølgingsbehov')).toBeChecked()
  expect((await readSavedRun(page)).lifecycle).toBe('open')
  await review(page).click()
  await review(other).click()
  await submit(other).click()
  await expect(fullHistory(other)).toBeVisible()
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  await expect(fullHistory(page)).toBeFocused()
  await expect(page.getByText('Oppfølgingsbehov', { exact: true })).toBeVisible()
  expect((await readSavedRun(page)).closureSnapshot?.conclusion.text).toBe('')
})

test('PDF-avbrudd ved rollebytte og nytt forsøk bevarer den kvitterte avslutningen', async ({ page }) => {
  await page.addInitScript(() => {
    const held = new WeakSet<IDBTransaction>()
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'runs' && this.transaction.mode === 'readonly' && Reflect.get(window, 'holdPdfRead')) {
        Reflect.set(window, 'holdPdfRead', false)
        held.add(this.transaction)
      }
      return get.call(this, key)
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(this: IDBTransaction, callback: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (held.has(this)) Reflect.set(window, 'releasePdfRead', () => callback.call(this, event))
          else callback.call(this, event)
        })
      },
    })
  })
  await seedCompletedRun(page)
  const download = page.getByRole('button', { name: 'Last ned PDF', exact: true })
  await page.getByRole('button', { name: 'Åpne historikk' }).click()
  await expect(download).toHaveCount(0)
  await back(page).click()
  await openClosure(page).click()
  await outcome(page, 'Oppfølgingsbehov').check()
  await review(page).click()
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  const closed = await readSavedRun(page)
  const firstButton = await download.elementHandle()
  let downloads = 0
  page.on('download', () => { downloads += 1 })
  await page.evaluate(() => Reflect.set(window, 'holdPdfRead', true))
  await download.press('Enter')
  await expect(page.getByText('Lager PDF …')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releasePdfRead'))).toBe('function')
  await role(page).selectOption('sjåfør')
  await expect.poll(() => firstButton.evaluate(element => element.isConnected)).toBe(false)
  await page.evaluate(() => Reflect.get(window, 'releasePdfRead')())

  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL
    URL.createObjectURL = blob => {
      URL.createObjectURL = createObjectURL
      if (blob.type === 'application/pdf') throw new Error('Simulert feil ved klargjøring av PDF')
      return createObjectURL(blob)
    }
  })
  await expect(download).toBeEnabled()
  await download.press('Enter')
  await expect(page.getByRole('alert')).toContainText('PDF-en kunne ikke opprettes.')
  expect(downloads).toBe(0)
  const retry = page.getByRole('button', { name: 'Prøv å laste ned PDF igjen' })
  await expect(retry).toBeFocused()
  const [file] = await Promise.all([page.waitForEvent('download'), retry.press('Enter')])
  expect(file.suggestedFilename()).toMatch(/\.pdf$/i)
  expect(await file.failure()).toBeNull()
  expect((await readFile(await file.path())).subarray(0, 5).toString()).toBe('%PDF-')
  expect(downloads).toBe(1)
  expect(await readSavedRun(page)).toEqual(closed)
})

test('PDF-feil identifiserer korrupt dokument i historikk og ved oppstart', async ({ page }) => {
  await seedCompletedRun(page)
  await openClosure(page).click()
  await outcome(page, 'Godkjent').check()
  await review(page).click()
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  const closed = await readSavedRun(page)
  const corrupted = structuredClone(closed)
  const answers = corrupted.closureSnapshot!.history.baseline.answers
  answers[1] = answers[0]
  await writeSavedRun(page, corrupted)
  const download = page.getByRole('button', { name: 'Last ned PDF', exact: true })
  await download.click()
  await expect(page.getByRole('alert')).toContainText('Punkt 1 er registrert flere ganger.')
  await expect(fullHistory(page)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Punkt 1 er registrert flere ganger.')
  await expect(download).toHaveCount(0)
  await writeSavedRun(page, closed)
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await page.getByRole('button', { name: 'Åpne hele skjemaet' }).click()
  await expect(fullHistory(page)).toBeVisible()
  expect(await readSavedRun(page)).toEqual(closed)
})

test('PDF melder tegn uten skriftstøtte eller matrise uten plass og bevarer historikken', async ({ page }) => {
  await seedCompletedRun(page)
  await openClosure(page).click()
  await outcome(page, 'Godkjent').check()
  const original = 'ABCDE李😀↔FGHI'
  await text(page).fill(original)
  await review(page).click()
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  await page.getByRole('button', { name: 'Last ned PDF', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('U+674E, U+1F600, U+2194')
  await expect(page.getByText(original, { exact: true })).toBeVisible()
  const closed = await readSavedRun(page)
  expect(closed.closureSnapshot?.conclusion.text).toBe(original)

  const oversized = structuredClone(closed)
  const snapshot = oversized.closureSnapshot!
  oversized.closureSnapshot = { ...snapshot, conclusion: { ...snapshot.conclusion, text: '' } }
  snapshot.history.content.criteria[0].title = 'Umulig korrupt matrise '.repeat(200)
  await writeSavedRun(page, oversized)
  await page.getByRole('button', { name: 'Prøv å laste ned PDF igjen' }).click()
  await expect(page.getByRole('alert')).toContainText('vurderingspunkt 1 får ikke plass i A4-matrisen')
  await expect(fullHistory(page)).toBeVisible()
  expect(await readSavedRun(page)).toEqual(oversized)
})

test('senere uferdig dag leder til riktig øktfelt fra dag 1 og låst avvik kan leses', async ({ page }) => {
  await seedCompletedRun(page)
  await page.getByRole('button', { name: 'Opprett neste dag' }).click()
  await page.getByRole('textbox', { name: 'Dato', exact: true }).fill('2026-11-19')
  await page.getByRole('textbox', { name: 'Faddernavn', exact: true }).fill('Neste Fadder')
  await page.getByRole('button', { name: 'Opprett dag', exact: true }).click()
  await page.getByRole('button', { name: 'Åpne dag 1' }).click()
  await openClosure(page).click()
  await outcome(page, 'Godkjent').check()
  await review(page).click()
  await expect(page.getByRole('heading', { name: 'Gjenstår før avslutning' })).toBeFocused()
  await expect(dialog(page)).toHaveCount(0)
  const issue = page.getByRole('button', { name: 'Gå til feltet for dag 2 · Oppgi minst én buss.' })
  await issue.click()
  await expect(page.getByRole('textbox', { name: 'Buss 1' })).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'Buss 1' })).toHaveAttribute('aria-describedby', /day-field-bus1-error/)
  expect((await readSavedRun(page)).lifecycle).toBe('open')

  const changed = await readSavedRun(page)
  changed.firstDay.mentorConfirmation!.actor.name = 'Avvikende Fadder'
  await writeSavedRun(page, changed, changed.firstDay.id)
  await page.reload()
  await openClosure(page).click()
  await review(page).click()
  await expect(page.getByText('Dag 1 · Øktopplysningene og bekreftelsene for den låste dagen samsvarer ikke.')).toBeVisible()
  await expect(dialog(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Les låst historikk for dag 1' }).click()
  await expect(page.getByRole('heading', { name: 'Historikk', exact: true })).toBeVisible()
  await expect(page.getByText('Låst. Bekreftet av Avvikende Fadder, fadder.', { exact: false })).toBeVisible()
})

test('avbrudd og mistet kvittering bevarer én atomisk avslutning med riktig tidspunkt', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key)
      if (this.name === 'runs' && value.data?.lifecycle === 'closed' && Reflect.get(window, 'abortClose')) {
        request.addEventListener('success', () => this.transaction.abort(), { once: true })
      }
      return request
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    const abort = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'onabort')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(this: IDBTransaction, callback: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'holdCloseComplete')) {
            Reflect.set(window, 'releaseClose', () => abort.get!.call(this)?.call(this, event))
          } else callback.call(this, event)
        })
      },
    })
    const transaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readonly' && Reflect.get(window, 'failCloseRead')) throw new DOMException('Testavbrudd')
      return transaction.call(this, stores, mode, options)
    }
  })
  await seedCompletedRun(page)
  await openClosure(page).click()
  await text(page).fill('Bevart oppsummering')
  await outcome(page, 'Oppfølgingsbehov').check()
  await page.clock.setFixedTime(new Date('2026-11-19T09:00:00.000Z'))
  await review(page).click()
  await page.evaluate(() => Reflect.set(window, 'abortClose', true))
  await submit(page).click()
  await expect(dialog(page).getByRole('alert')).toContainText('Perioden er fortsatt åpen.')
  const open = await readSavedRun(page)
  expect(open.lifecycle).toBe('open')
  expect(open.conclusionDraft?.text).toBe('Bevart oppsummering')
  expect(open.firstDay.mentorConfirmation).toBeDefined()
  await page.evaluate(() => {
    Reflect.set(window, 'abortClose', false)
    Reflect.set(window, 'holdCloseComplete', true)
  })
  await page.clock.setFixedTime(new Date('2026-11-19T10:00:00.000Z'))
  await submit(page).click()
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseClose'))).toBe('function')
  await expect(dialog(page)).toContainText('Lagrer avslutning …')
  await expect(fullHistory(page)).toHaveCount(0)
  const committed = await readSavedRun(page)
  expect(committed.closureSnapshot?.conclusion.text).toBe('Bevart oppsummering')
  expect(committed.closureSnapshot?.closedBy.confirmedAt).toBe('2026-11-19T10:00:00.000Z')
  await page.evaluate(() => {
    Reflect.set(window, 'holdCloseComplete', false)
    Reflect.set(window, 'failCloseRead', true)
    Reflect.get(window, 'releaseClose')()
  })
  await expect(dialog(page).getByRole('alert')).toContainText('Avslutningen kunne ikke kontrolleres.')
  await expect(fullHistory(page)).toHaveCount(0)
  await page.evaluate(() => Reflect.set(window, 'failCloseRead', false))
  await page.clock.setFixedTime(new Date('2026-11-21T10:00:00.000Z'))
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  expect(await readSavedRun(page)).toEqual(committed)
  const closureCommands = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open('tide-kjorevurdering')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('commands', 'readonly')
      const request = tx.objectStore('commands').getAll()
      tx.oncomplete = () => {
        db.close()
        resolve(request.result.filter(record => JSON.parse(record.data.fingerprint)[0] === 'close-run').length)
      }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
  }))
  expect(closureCommands).toBe(1)
})

test('gjenopptakelse beholder ulagret oppsummering separat fra lukking i en annen fane', async ({ page, context }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs' && value.data?.conclusionDraft?.text === 'Lokalt ulagret notat') {
        throw new DOMException('Testavbrudd', 'QuotaExceededError')
      }
      return put.call(this, value, key)
    }
  })
  await seedCompletedRun(page)
  await openClosure(page).click()
  await text(page).fill('Lokalt ulagret notat')
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret.')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(text(page)).toBeHidden()

  const other = await context.newPage()
  await other.goto('/')
  await openClosure(other).click()
  await text(other).fill('Kvittert avslutning fra annen fane')
  await outcome(other, 'Godkjent').check()
  await review(other).click()
  await submit(other).click()
  await expect(fullHistory(other)).toBeVisible()
  await role(other).selectOption('sjåfør')
  await expect(role(other)).toHaveValue('sjåfør')

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  const resume = page.getByRole('button', { name: 'Gjenoppta som fadder' })
  await expect(resume).toBeVisible()
  await expect(text(page)).toBeHidden()
  await resume.click()
  await expect(text(page)).toHaveValue('Lokalt ulagret notat')
  await page.getByRole('button', { name: 'Prøv å lagre igjen' }).click()
  await expect(text(page)).toHaveValue('Lokalt ulagret notat')
  await page.getByRole('button', { name: 'Åpne lagret tilstand' }).click()
  await expect(fullHistory(page)).toBeVisible()
  await expect(page.getByText('Kvittert avslutning fra annen fane')).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Lokalt ulagret notat')
})

test('lastet app avslutter og laster ned lokal PDF etter 60 sekunders nettbrudd', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  await seedCompletedRun(page, true)
  await openClosure(page).click()
  const requests: string[] = []
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await context.setOffline(true)
  const started = performance.now()
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await outcome(page, 'Oppfølgingsbehov').check()
  await text(page).fill('Lokal avslutning under nettbrudd')
  await review(page).click()
  await expect(dialog(page)).toBeVisible()
  await page.waitForTimeout(Math.max(0, 60_000 - (performance.now() - started)))
  await submit(page).click()
  await expect(fullHistory(page)).toBeVisible()
  const closed = await readSavedRun(page)
  expect(closed.closureSnapshot?.conclusion.text).toBe('Lokal avslutning under nettbrudd')
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Last ned PDF', exact: true }).click(),
  ])
  const artifact = testInfo.outputPath('eksport.pdf')
  await file.saveAs(artifact)
  expect((await readFile(artifact)).subarray(0, 5).toString()).toBe('%PDF-')
  expect(requests).toEqual([])
  expect(await readSavedRun(page)).toEqual(closed)
  await writeFile(testInfo.outputPath('frosset-kilde.json'), JSON.stringify(closed, null, 2))
  await context.setOffline(false)
  const reopened = await context.newPage()
  await reopened.goto('/')
  await expect(reopened.getByRole('button', { name: 'Åpne hele skjemaet' })).toBeVisible({ timeout: 5000 })
  await reopened.getByRole('button', { name: 'Åpne hele skjemaet' }).click()
  await expect(reopened.getByText('Lokal avslutning under nettbrudd')).toBeVisible()
})
