import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { reasonRequirement } from '../../src/domain/reason.ts'
import type { Day } from '../../src/domain/run.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const [first, second, third] = approvedContent.criteria
const last = approvedContent.criteria.at(-1)!
const role = (page: Page) => page.getByLabel('Simuleringsrolle')
const mentorLink = (page: Page) => page.getByRole('button', { name: 'Åpne dagens faddervurdering' })
const back = (page: Page) => page.getByRole('button', { name: 'Til dagsoversikten' })
const status = (page: Page) => page.getByRole('status')
const issues = (page: Page) => page.getByRole('region', { name: 'Mangler i faddervurderingen' })
const review = (page: Page, title: string) => page.getByRole('region', { name: `Behandle sjåførens relevansvalg · ${title} · Dag 1` })
const accept = (page: Page, title: string) => review(page, title).getByRole('button', { name: 'Bekreft sjåførens Ikke relevant', exact: false })
const decline = (page: Page, title: string) => review(page, title).getByRole('button', { name: 'Avslå sjåførens Ikke relevant', exact: false })
const comment = (page: Page, title: string, day = 1) => page.getByRole('button', { name: `Kommentar til ${title} · Fadder · Dag ${day}`, exact: true })
const text = (page: Page, title: string, day = 1) => page.getByRole('textbox', { name: `Fadders kommentar · ${title} · Dag ${day}`, exact: true })
const ownReason = (page: Page) => page.getByLabel('Begrunn hvorfor dette ikke er relevant')
const rejectReason = (page: Page) => page.getByLabel('Fadders kommentar ved avslag')
const answer = (page: Page, title: string, label: string, after = false, day = 1) => page.getByRole('button', {
  name: `${label} · ${title} · ${after ? 'Sjåfør · Ettervurdering' : 'Fadder · Faddervurdering'} · Dag ${day}`, exact: true,
})

async function create(page: Page, initialLastDay = '1') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-115')
  await page.getByLabel('Faddernavn').fill('Emil Eksempel')
  await page.getByLabel('Første dato').fill('2027-03-28')
  await page.getByLabel('Startplan').selectOption(initialLastDay)
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(mentorLink(page)).toBeVisible()
  return readSavedRun(page)
}

async function openAfter(page: Page) {
  await role(page).selectOption('sjåfør')
  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
}

async function setDriverReason(page: Page, title: string, reason: string) {
  await answer(page, title, 'Ikke relevant', true).click()
  await ownReason(page).fill(reason)
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
}

test('22 egne svar og kommentarer før og etter sjåførlås med innsyn begrenset til rett rolle', async ({ page }) => {
  const run = await create(page)
  await mentorLink(page).click()
  await expect(page.locator('.matrix-row')).toHaveCount(22)
  await expect(page.getByText('Ubesvart', { exact: true })).toHaveCount(22)
  await expect(page.getByRole('button', { name: /^Kommentar til / })).toHaveCount(22)
  await expect(page.getByText('Sjåføren må bekrefte sin del før dagen kan låses.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: `Hjelp om ${first.title}`, exact: true }).press('Enter')
  await expect(page.getByRole('dialog')).toContainText(first.help)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  await expect(issues(page).getByRole('heading')).toBeFocused()
  await issues(page).getByRole('button', { name: `${first.title} · Velg et faddersvar.`, exact: true }).click()
  await expect(answer(page, first.title, 'OK')).toBeFocused()
  await comment(page, first.title).press('Enter')
  await expect(comment(page, first.title)).toHaveAttribute('aria-expanded', 'true')
  await text(page, first.title).fill('S')
  await expect(status(page)).toHaveText('Lagret på denne enheten', { timeout: 2000 })
  await expect(text(page, first.title)).toBeFocused()
  await answer(page, first.title, 'Kan bli bedre').click()
  await answer(page, first.title, 'Ikke relevant').click()
  await ownReason(page).fill('Ettord')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(ownReason(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(ownReason(page)).toHaveAccessibleDescription(
    `${first.title} Fadder · Emil Eksempel · Faddervurdering · Dag 1 ${reasonRequirement}`,
  )
  await page.keyboard.press('Escape')
  await expect(answer(page, first.title, 'Ikke relevant')).toBeFocused()
  await expect(answer(page, first.title, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await answer(page, first.title, 'Ikke relevant').click()
  await expect(ownReason(page)).toHaveValue('Ettord')
  await ownReason(page).fill('  Ingen \n billettering ')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(page.getByText('Fadders begrunnelse · Ingen billettering')).toBeVisible()
  await expect(text(page, first.title)).toHaveValue('S')
  for (const criterion of approvedContent.criteria.slice(1)) await answer(page, criterion.title, 'OK').click()
  await expect(issues(page)).toContainText('Alle fadderpunkter og aktuelle relevansvalg er behandlet.')
  await text(page, first.title).fill('Beholdt kommentar gjennom rollebytte')
  await role(page).selectOption('sjåfør')
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  await expect(mentorLink(page)).toHaveCount(0)
  await expect(page.locator('textarea')).toHaveCount(0)
  await page.goto('about:blank')
  await page.goBack()
  await expect(role(page)).toHaveValue('sjåfør')
  await expect(mentorLink(page)).toHaveCount(0)
  const mentorSaved = await readSavedRun(page)
  expect(mentorSaved.firstDay.mentorDay!.answers).toHaveLength(22)
  expect(mentorSaved.firstDay.mentorDay!.comments[first.id]?.text).toBe('Beholdt kommentar gjennom rollebytte')
  expect(mentorSaved.firstDay.mentorConfirmation).toBeUndefined()
  expect(mentorSaved.id).toBe(run.id)
  await writeSavedRun(page, lockedRun(mentorSaved, second.id))
  await page.reload()
  await openAfter(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.mentor-row-details')).toHaveCount(0)
  for (const criterion of approvedContent.criteria.filter(item => item.id !== second.id)) await answer(page, criterion.title, 'OK', true).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.getByRole('button', { name: 'Kontroller og fullfør ettervurderingen' }).click()
  await page.getByRole('button', { name: 'Hopp over egenevalueringen' }).click()
  await page.getByRole('button', { name: 'Bekreft min del' }).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await role(page).selectOption('fadder')
  await back(page).click()
  await mentorLink(page).click()
  await expect(page.getByText('Sjåføren må bekrefte sin del før dagen kan låses.', { exact: false })).toHaveCount(0)
  await expect(page.locator('.mentor-review')).toHaveCount(1)
  await expect(review(page, second.title)).toContainText('Sjåførens begrunnelse · Ingen rygging')
  await accept(page, second.title).click()
  await expect(review(page, second.title)).toContainText('Bekreftet av Emil Eksempel')
  const saved = await readSavedRun(page)
  expect(saved.firstDay.mentorDay!.answers[1].value).toBe('ok')
  expect(saved.firstDay.mentorDay!.reviews[second.id]!.answerId).toBe(saved.firstDay.driverAfterAnswers![1].id)
  expect(saved.firstDay.driverAfterAnswers![1].inheritedFrom).toBe(saved.baseline!.answers[1].id)
  expect(saved.firstDay.driverConfirmation?.actor.name).toBe('Nora Eksempel')
  expect(saved.firstDay.mentorConfirmation).toBeUndefined()
})

test('endret ettersvar i annen fane avviser gammel dialog og beholder fadders tre egne tekstfelt', async ({ page, context }) => {
  const run = lockedRun(await create(page), first.id)
  await writeSavedRun(page, run)
  await openAfter(page)
  await setDriverReason(page, second.title, 'Ingen billettering')
  await role(page).selectOption('fadder')
  await back(page).click()
  await mentorLink(page).click()
  await accept(page, second.title).click()
  await expect(review(page, second.title)).toContainText('Bekreftet av Emil Eksempel')
  const committed = await readSavedRun(page)
  await answer(page, second.title, 'Ikke relevant').click()
  await ownReason(page).fill('Ingen rygging')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await comment(page, second.title).click()
  await text(page, second.title).fill('X')
  await decline(page, second.title).click()
  await rejectReason(page).fill('Ettord')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).click()
  await expect(rejectReason(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(rejectReason(page)).toHaveAccessibleDescription(
    `${second.title} Fadder · Emil Eksempel · Faddervurdering · Dag 1 Nora Eksempel, sjåfør · Ikke relevant · Ingen billettering ${reasonRequirement}`,
  )
  await rejectReason(page).fill('Fadder observerte salg')
  await expect(status(page)).toHaveText('Lagret på denne enheten')

  const remote = await context.newPage()
  await remote.goto('/')
  await openAfter(remote)
  await setDriverReason(remote, second.title, 'Ingen ombordbetaling')
  await role(remote).selectOption('fadder')
  await expect(answer(remote, second.title, 'OK', true)).toHaveCount(0)
  await remote.close()
  await page.bringToFront()
  await expect(page.getByRole('dialog')).toContainText('Ingen billettering')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).click()
  await expect(page.getByRole('alert')).toContainText('Løpet ble endret')
  await expect(review(page, second.title)).toContainText('Fadders avgjørelse · Utdatert')
  await expect(review(page, second.title)).toContainText('Ingen ombordbetaling')
  const stale = await readSavedRun(page)
  expect(stale.firstDay.mentorDay!.reviews[second.id]).toEqual(committed.firstDay.mentorDay!.reviews[second.id])
  expect(stale.firstDay.mentorDay!.comments[second.id]?.text).toBe('X')
  expect(stale.firstDay.mentorDay!.answers[1].reason).toBe('Ingen rygging')
  await page.getByRole('button', { name: 'Kontroller mangler' }).click()
  await issues(page).getByRole('button', { name: `${second.title} · Behandle sjåførens endrede Ikke relevant-valg på nytt.`, exact: true }).click()
  await expect(accept(page, second.title)).toBeFocused()
  await decline(page, second.title).click()
  await expect(rejectReason(page)).toHaveValue('Fadder observerte salg')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).click()
  await expect(review(page, second.title)).toContainText('Avslått av Emil Eksempel')
  await expect(review(page, second.title)).toContainText('Fadders avslagskommentar · Fadder observerte salg')
  await expect(issues(page)).not.toContainText(`${second.title} · Behandle`)
  await expect(text(page, second.title)).toHaveValue('X')
  const rejected = await readSavedRun(page)
  expect(rejected.firstDay.mentorDay!.reviews[second.id]!.answerRevision).toBe(rejected.firstDay.driverAfterAnswers![1].answerRevision)
  expect(rejected.firstDay.driverAfterAnswers![1].reason).toBe('Ingen ombordbetaling')
  const changedAgain = await context.newPage()
  await changedAgain.goto('/')
  await openAfter(changedAgain)
  await answer(changedAgain, second.title, 'OK', true).click()
  await expect(status(changedAgain)).toHaveText('Lagret på denne enheten')
  await role(changedAgain).selectOption('fadder')
  await expect(answer(changedAgain, second.title, 'OK', true)).toHaveCount(0)
  await changedAgain.close()
  await page.bringToFront()
  await accept(page, second.title).press('Enter')
  await expect(review(page, second.title)).toHaveCount(0)
  await expect(comment(page, second.title)).toBeFocused()
  await expect(page.getByText('Sjåføren har ikke lenger valgt Ikke relevant.')).toBeVisible()
  await expect(answer(page, second.title, 'Ikke relevant')).toHaveAttribute('aria-pressed', 'true')
})

test('relevansavgjørelse gjenopptas etter avbrutt utkastlagring og bruker samme ID ved tapt kvittering', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    const get = IDBObjectStore.prototype.get
    const unacknowledged = new WeakSet<IDBTransaction>()
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'commands') (Reflect.get(window, 'mentorCommandIds') as string[] | undefined)?.push(String(key))
      return get.call(this, key)
    }
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name !== 'commands') return request
      const [kind] = JSON.parse(value.data.fingerprint) as string[]
      if (kind === 'save-mentor-day' && Reflect.get(window, 'abortMentorPrerequisite')) {
        Reflect.deleteProperty(window, 'abortMentorPrerequisite')
        request.addEventListener('success', () => this.transaction.abort())
      }
      if (kind === 'review-driver-relevance' && Reflect.get(window, 'loseMentorReceipt')) {
        Reflect.deleteProperty(window, 'loseMentorReceipt')
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
  const retry = page.getByRole('button', { name: 'Prøv igjen', exact: true })
  const run = lockedRun(await create(page), first.id)
  await writeSavedRun(page, run)
  await mentorLink(page).click()
  await comment(page, first.title).click()
  await page.evaluate(() => Reflect.set(window, 'abortMentorPrerequisite', true))
  await text(page, first.title).fill('Kommentar før bekreftelsen')
  await accept(page, first.title).press('Enter')
  await expect(page.getByRole('alert')).toContainText('Prøv igjen for å lagre relevansavgjørelsen')
  await expect(status(page)).toHaveText('Ulagrede endringer')
  await expect(text(page, first.title)).not.toBeEditable()
  await expect(answer(page, first.title, 'OK')).toBeDisabled()
  await expect(retry).toBeEnabled()
  expect((await readSavedRun(page)).firstDay.mentorDay).toBeUndefined()
  await retry.click()
  await expect(review(page, first.title)).toContainText('Bekreftet av Emil Eksempel')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(text(page, first.title)).toBeEditable()

  await decline(page, first.title).click()
  await page.evaluate(() => {
    Reflect.set(window, 'abortMentorPrerequisite', true)
    Reflect.set(window, 'loseMentorReceipt', true)
    Reflect.set(window, 'mentorCommandIds', [])
  })
  await rejectReason(page).fill('  Det ble øvd på rygging  ')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).press('Enter')
  await expect(page.getByRole('alert')).toContainText('Prøv igjen for å lagre relevansavgjørelsen')
  expect((await readSavedRun(page)).firstDay.mentorDay?.reviews[first.id]?.decision).toBe('accepted')
  await retry.click()
  await expect(page.getByRole('alert')).toContainText('Prøv igjen for å lagre relevansavgjørelsen')
  await expect(text(page, first.title)).not.toBeEditable()
  await expect(answer(page, first.title, 'Ikke relevant')).toBeDisabled()
  await expect(status(page)).toHaveText('Ulagrede endringer')
  const committed = await readSavedRun(page)
  expect(committed.firstDay.mentorDay?.reviews[first.id]?.rejectionComment).toBe('Det ble øvd på rygging')
  await retry.click()
  await expect(review(page, first.title)).toContainText('Avslått av Emil Eksempel')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(text(page, first.title)).toBeEditable()
  expect(await readSavedRun(page)).toEqual(committed)
  const ids = await page.evaluate(() => Reflect.get(window, 'mentorCommandIds') as string[])
  expect(ids).toHaveLength(4)
  expect(ids[0]).toBe(ids[1])
  expect(ids[2]).toBe(ids[3])
  expect(ids[0]).not.toBe(ids[2])
})

test('mangellisten venter på riktig lagret faddervisning og rapporterer lesefeil som avbrutt kontroll', async ({ page }) => {
  await page.addInitScript(() => {
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failMentorCheck')) {
        Reflect.deleteProperty(window, 'failMentorCheck')
        throw new DOMException('Lesefeil i mangelsjekk', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
    const property = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...property,
      set(handler: (event: Event) => void) {
        property.set!.call(this, (event: Event) => {
          if (this.mode === 'readonly' && this.objectStoreNames.contains('runs') && Reflect.get(window, 'holdMentorCheck')) {
            Reflect.deleteProperty(window, 'holdMentorCheck')
            Reflect.set(window, 'releaseMentorCheck', () => handler.call(this, event))
          } else handler.call(this, event)
        })
      },
    })
  })
  const check = page.getByRole('button', { name: 'Kontroller mangler' })
  await create(page)
  await mentorLink(page).click()
  for (const criterion of approvedContent.criteria) await answer(page, criterion.title, 'OK').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await writeSavedRun(page, lockedRun(await readSavedRun(page), first.id))
  await page.evaluate(() => Reflect.set(window, 'failMentorCheck', true))
  await check.press('Enter')
  await expect(issues(page)).toContainText('Kontrollen kunne ikke fullføres. Prøv igjen.')
  await expect(issues(page)).not.toContainText('Alle fadderpunkter')
  await expect(issues(page).getByRole('heading')).toBeFocused()
  await page.evaluate(() => Reflect.set(window, 'holdMentorCheck', true))
  await check.press('Enter')
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseMentorCheck'))).toBe('function')
  await expect(issues(page)).toContainText('Kontrollerer lagrede opplysninger')
  await expect(issues(page)).not.toContainText('Alle fadderpunkter')
  await page.evaluate(() => Reflect.get(window, 'releaseMentorCheck')())
  await expect(issues(page)).toContainText('Behandle sjåførens Ikke relevant-valg.')
  await expect(issues(page).getByRole('heading')).toBeFocused()
  await expect(review(page, first.title)).toContainText('Ingen rygging')
})

test('rå begrunnelse har mangellenke og uttrykkelig lagring tømmer råtekst også etter konflikt', async ({ page, context }) => {
  await create(page)
  await mentorLink(page).click()
  await answer(page, first.title, 'Ikke relevant').click()
  const remote = await context.newPage()
  await remote.goto('/')
  await mentorLink(remote).click()
  await comment(remote, second.title).click()
  await text(remote, second.title).fill('Annen lagret faddertekst')
  await answer(remote, first.title, 'Ikke relevant').click()
  await ownReason(remote).fill('Ettord')
  await expect(status(remote)).toHaveText('Lagret på denne enheten')
  await remote.keyboard.press('Escape')
  await remote.getByRole('button', { name: 'Kontroller mangler' }).click()
  await issues(remote).getByRole('button', { name: `${first.title} · ${reasonRequirement}`, exact: true }).click()
  await expect(ownReason(remote)).toHaveValue('Ettord')
  await expect(ownReason(remote)).toBeFocused()
  await expect(ownReason(remote)).toHaveAttribute('aria-invalid', 'true')
  await remote.close()
  await page.bringToFront()
  await ownReason(page).fill('Ingen billettering')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).press('Enter')
  await page.getByRole('button', { name: 'Lagre mitt fadderutkast' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  const saved = (await readSavedRun(page)).firstDay.mentorDay!
  expect(saved.reasonDrafts[first.id]).toBeUndefined()
  expect(saved.answers[0].reason).toBe('Ingen billettering')
  expect(saved.comments[second.id]?.text).toBe('Annen lagret faddertekst')
  await answer(page, first.title, 'Ikke relevant').click()
  await expect(ownReason(page)).toHaveValue('Ingen billettering')
})

test('lagrer dag 2 via fadderflaten, gjenåpner rett dag og viser lagret dagslås som lesing', async ({ page }) => {
  const original = lockedRun(await create(page, '2'))
  const dayTwo: Day & { number: 2 } = {
    id: crypto.randomUUID(), number: 2, date: '2027-03-29', driverId: original.driver.id,
    mentorName: 'Dagens fadder', identityConfirmed: false,
  }
  await writeSavedRun(page, { ...original, laterDays: [dayTwo] }, dayTwo.id)
  await page.reload()
  await mentorLink(page).click()
  await expect(page.getByText('Dagens fadder · Dag 2', { exact: false })).toBeVisible()
  await answer(page, second.title, 'Kan bli bedre', false, 2).click()
  await comment(page, second.title, 2).click()
  await text(page, second.title, 2).fill('Kommentar for dag to')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  const changed = await readSavedRun(page)
  expect(changed.firstDay).toEqual(original.firstDay)
  expect(changed.laterDays![0].mentorDay?.answers[1].value).toBe('needs_improvement')
  expect(changed.laterDays![0].mentorDay?.comments[second.id]?.actor.name).toBe('Dagens fadder')
  await page.reload()
  await mentorLink(page).click()
  await expect(answer(page, second.title, 'Kan bli bedre', false, 2)).toHaveAttribute('aria-pressed', 'true')
  await comment(page, second.title, 2).click()
  await expect(text(page, second.title, 2)).toHaveValue('Kommentar for dag to')

  const locked = changed.laterDays![0]
  await writeSavedRun(page, { ...changed, revision: changed.revision + 1, laterDays: [{
    ...locked, driverIdentity: { name: changed.driver.name, employeeNumber: changed.driver.employeeNumber },
    mentorConfirmation: {
      actor: { id: locked.mentorDay!.comments[second.id]!.actor.id, role: 'fadder', name: locked.mentorName },
      confirmedAt: '2027-03-29T15:00:00Z',
    },
  }] }, dayTwo.id)
  await page.reload()
  await mentorLink(page).click()
  await expect(page.getByText('Låst. Bekreftet av Dagens fadder, fadder.')).toBeVisible()
  await expect(answer(page, second.title, 'Kan bli bedre', false, 2)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Kontroller mangler' })).toHaveCount(0)
  await comment(page, second.title, 2).click()
  await expect(text(page, second.title, 2)).toHaveValue('Kommentar for dag to')
  await expect(text(page, second.title, 2)).not.toBeEditable()
  expect((await readSavedRun(page)).firstDay).toEqual(original.firstDay)
})

test('aborterte transaksjoner beholder utkast, hindrer rolle og rute og kan prøves på nytt', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name === 'commands' && Reflect.get(window, 'abortMentorWrite')) {
        request.addEventListener('success', () => this.transaction.abort())
      }
      return request
    }
  })
  const original = lockedRun(await create(page), first.id)
  await writeSavedRun(page, original)
  await mentorLink(page).click()
  await page.evaluate(() => Reflect.set(window, 'abortMentorWrite', true))
  await comment(page, first.title).click()
  await text(page, first.title).fill('Ulagret faddertekst')
  await role(page).selectOption('sjåfør')
  await expect(role(page)).toHaveValue('fadder')
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await back(page).click()
  await expect(text(page, first.title)).toHaveValue('Ulagret faddertekst')
  expect((await readSavedRun(page)).firstDay.mentorDay).toBeUndefined()
  await page.evaluate(() => Reflect.deleteProperty(window, 'abortMentorWrite'))
  await page.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.evaluate(() => Reflect.set(window, 'abortMentorWrite', true))
  await accept(page, first.title).click()
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await expect(review(page, first.title)).toContainText('Ikke behandlet')
  expect((await readSavedRun(page)).firstDay.mentorDay!.reviews[first.id]).toBeUndefined()
  await page.evaluate(() => Reflect.deleteProperty(window, 'abortMentorWrite'))
  await page.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  await expect(review(page, first.title)).toContainText('Bekreftet av Emil Eksempel')
  await expect(answer(page, first.title, 'OK')).toHaveAttribute('aria-pressed', 'false')
  await role(page).selectOption('sjåfør')
  await expect(mentorLink(page)).toHaveCount(0)
  await expect(page.getByText('Ulagret faddertekst', { exact: false })).toHaveCount(0)
})

test('matrise, kommentar og avslag fungerer med tastatur og forstørret tekst i fem bredder', async ({ page }) => {
  const run = lockedRun(await create(page), last.id)
  await writeSavedRun(page, run)
  await mentorLink(page).click()
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 780 })
    await comment(page, last.title).press('Enter')
    await text(page, last.title).focus()
    await expect(text(page, last.title)).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    const [header, field] = await Promise.all([page.locator('.matrix-headings').boundingBox(), text(page, last.title).boundingBox()])
    expect(field!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1)
    await decline(page, last.title).press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading')).toBeFocused()
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await rejectReason(page).fill('Det var relevant')
    await page.keyboard.press('Escape')
    await expect(decline(page, last.title)).toBeFocused()
    await comment(page, last.title).press('Enter')
  }
})

test('beholder kvitterte data og lagrer videre lokalt etter 60 sekunder uten nett', async ({ page, context }) => {
  test.setTimeout(85_000)
  const run = lockedRun(await create(page), first.id)
  await writeSavedRun(page, run)
  await mentorLink(page).click()
  await comment(page, third.title).click()
  await text(page, third.title).fill('Kvittert før nettbruddet')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await context.setOffline(true)
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await page.waitForTimeout(60_500)
  await answer(page, third.title, 'Kan bli bedre').click()
  await accept(page, first.title).click()
  await expect(review(page, first.title)).toContainText('Bekreftet av Emil Eksempel')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  expect((await readSavedRun(page)).firstDay.mentorDay!.comments[third.id]?.text).toBe('Kvittert før nettbruddet')
  await context.setOffline(false)
  await page.reload()
  await expect(mentorLink(page)).toBeVisible({ timeout: 5000 })
  await mentorLink(page).click()
  await expect(answer(page, third.title, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await expect(review(page, first.title)).toContainText('Bekreftet av Emil Eksempel')
  await comment(page, third.title).click()
  await expect(text(page, third.title)).toHaveValue('Kvittert før nettbruddet')
})
