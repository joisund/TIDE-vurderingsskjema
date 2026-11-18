import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { confirmDriverDay, updateDriverDayDraft } from '../../src/domain/driver-day.ts'
import { currentPlan } from '../../src/domain/follow-up.ts'
import { updateMentorDay } from '../../src/domain/mentor-day.ts'
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
const checkDay = (page: Page) => page.getByRole('button', { name: 'Kontroller mangler' })
const confirmDay = (page: Page) => page.getByRole('button', { name: 'Bekreft og lås dagen' })
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

function confirmStoredAfter(run: Awaited<ReturnType<typeof readSavedRun>>, day: Day) {
  const actor = { id: crypto.randomUUID(), role: 'sjåfør' } as const
  const planRevision = currentPlan(run).revision
  const inherited = new Set(day.driverAfterAnswers?.filter(answer => answer.locked).map(answer => answer.criterionId))
  const draft = updateDriverDayDraft(run, {
    commandId: crypto.randomUUID(), runId: run.id, expectedRevision: run.revision, actor,
    payload: { dayId: day.id, planRevision, changes: {
      answers: Object.fromEntries(approvedContent.criteria.filter(({ id }) => !inherited.has(id))
        .map(({ id }) => [id, { value: 'ok', reason: null }])),
      evaluation: { decision: 'skipped' },
    } },
  })
  return confirmDriverDay(draft, {
    commandId: crypto.randomUUID(), runId: run.id, expectedRevision: draft.revision, actor,
    payload: { dayId: day.id, planRevision, confirmedAt: '2027-03-29T14:00:00Z' },
  })
}

async function fillSession(page: Page, mentorName?: string) {
  if (mentorName) await page.getByLabel('Faddernavn').fill(mentorName)
  await page.getByLabel('Buss 1').fill('12')
  await page.getByLabel('Linjer').fill('20 og 25')
  await page.getByLabel('Inn-tid').fill('22:00')
  await page.getByLabel('Ut-tid').fill('02:30')
}

async function prepareDayLock(page: Page, notRelevantId?: string) {
  const baseline = lockedRun(await create(page), notRelevantId)
  const run = confirmStoredAfter(baseline, baseline.firstDay)
  const mentor = {
    commandId: crypto.randomUUID(), runId: run.id, expectedRevision: run.revision,
    actor: { id: crypto.randomUUID(), role: 'fadder' as const },
  }
  await writeSavedRun(page, updateMentorDay(run, { ...mentor, payload: { dayId: run.firstDay.id, changes: {
    answers: Object.fromEntries(approvedContent.criteria.map(({ id }) => [id, { value: 'ok', reason: null }])),
  } } }))
  await page.reload()
  await fillSession(page)
  await mentorLink(page).click()
  await page.getByRole('radio', { name: 'Nei', exact: true }).check()
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
  await page.getByRole('button', { name: 'Åpne førvurderingen' }).click()
  const beforeChoice = (title: string, label: string) => page.getByRole('button', { name: `${label} · ${title} · Sjåfør · Førvurdering`, exact: true })
  await beforeChoice(second.title, 'Ikke relevant').click()
  await ownReason(page).fill('Ingen rygging')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  for (const criterion of approvedContent.criteria.filter(item => item.id !== second.id)) await beforeChoice(criterion.title, 'OK').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.getByRole('button', { name: 'Kontroller og bekreft førvurderingen' }).click()
  await page.getByRole('button', { name: 'Bekreft og lås', exact: true }).click()
  await back(page).click()
  await page.getByRole('button', { name: 'Åpne dagens ettervurdering' }).click()
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
  await decline(page, second.title).click()
  await rejectReason(page).fill('Vi rygget tidligere')
  await page.getByRole('dialog').getByRole('button', { name: 'Avslå Ikke relevant' }).click()
  await expect(review(page, second.title)).toContainText('Avslått av Emil Eksempel')
  const saved = await readSavedRun(page)
  expect(saved.firstDay.mentorDay!.answers[1].value).toBe('ok')
  expect(saved.firstDay.mentorDay!.reviews[second.id]!.answerId).toBe(saved.firstDay.driverAfterAnswers![1].id)
  expect(saved.firstDay.driverAfterAnswers![1].inheritedFrom).toBe(saved.baseline!.answers[1].id)
  expect(saved.firstDay.driverConfirmation?.actor.name).toBe('Nora Eksempel')
  expect(saved.firstDay.mentorConfirmation).toBeUndefined()
  await page.getByRole('radio', { name: 'Ja', exact: true }).check()
  await page.getByRole('radio', { name: 'Flere fadderdager' }).check()
  await checkDay(page).click()
  const missingBus = issues(page).getByRole('button', { name: 'Øktopplysninger · Oppgi minst én buss.' })
  await missingBus.click()
  await expect(page.getByRole('alert')).toContainText('Fullfør eller forkast planutkastet')
  await expect(page.getByLabel('Antall ekstra dager')).toBeFocused()
  await expect(page.getByRole('radio', { name: 'Flere fadderdager' })).toBeChecked()
  await page.getByRole('button', { name: 'Forkast planutkast' }).click()
  await missingBus.click()
  await expect(page.getByLabel('Buss 1')).toBeFocused()
  await expect(page.getByLabel('Buss 1')).toHaveAccessibleDescription(/Oppgi minst én buss/)
  await fillSession(page, 'Ada Dagensfadder')
  await mentorLink(page).click()
  await page.getByRole('radio', { name: 'Ja', exact: true }).check()
  await page.getByRole('radio', { name: 'Flere fadderdager' }).check()
  await checkDay(page).click()
  await issues(page).getByRole('button', { name: 'Oppfølging · Velg antall ekstra dager.' }).press('Enter')
  await expect(page.getByLabel('Antall ekstra dager')).toBeFocused()
  await page.getByLabel('Antall ekstra dager').selectOption('1')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await answer(page, first.title, 'Ikke relevant').click()
  await ownReason(page).fill('Utkast til ny begrunnelse')
  await page.keyboard.press('Escape')
  await decline(page, second.title).click()
  await rejectReason(page).fill('Utkast til ny avslagskommentar')
  await page.keyboard.press('Escape')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await expect(page.getByText('Lagret begrunnelsesutkast · Utkast til ny begrunnelse')).toBeVisible()
  await expect(page.getByText('Lagret avslagsutkast · Utkast til ny avslagskommentar')).toBeVisible()
  const beforeLock = await readSavedRun(page)
  const dialog = page.getByRole('dialog', { name: 'Bekreft faddervurderingen og lås dagen' })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 660 })
    await checkDay(page).press('Enter')
    await expect(dialog.getByRole('heading')).toBeFocused()
    await expect(dialog).toContainText('Ada Dagensfadder')
    await expect(dialog).toContainText('28.03.2027')
    await expect(dialog).toContainText('Dagens vurderinger og kommentarer låses permanent')
    await expect(dialog).toContainText('forblir merket som utkast')
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    if (width === 320) {
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Avbryt' })).toBeFocused()
      await page.keyboard.press('Enter')
    } else await page.keyboard.press('Escape')
    await expect(checkDay(page)).toBeFocused()
  }
  expect(await readSavedRun(page)).toEqual(beforeLock)
  await checkDay(page).click()
  await confirmDay(page).click()
  await expect(page.getByText('Låst. Bekreftet av Ada Dagensfadder, fadder.')).toBeFocused()
  await expect(page.locator('time[datetime$="Z"]')).toBeVisible()
  const locked = await readSavedRun(page)
  expect(locked).toEqual({ ...beforeLock, revision: beforeLock.revision + 1, firstDay: {
    ...beforeLock.firstDay, mentorConfirmation: {
      actor: { id: expect.any(String), role: 'fadder', name: 'Ada Dagensfadder' },
      confirmedAt: expect.stringMatching(/Z$/), date: '2027-03-28', part: 'mentor_day',
    },
  } })
  await writeSavedRun(page, { ...locked, revision: locked.revision + 1, laterDays: [{
    id: crypto.randomUUID(), number: 2, date: '2027-03-29', driverId: locked.driver.id,
    mentorName: 'Ada Dagensfadder', identityConfirmed: false,
  }] })
  await back(page).click()
  const history = page.getByRole('region', { name: 'Registrerte dager' }).getByRole('listitem')
  await expect(history.nth(0)).toContainText('Dagen er låst')
  await expect(history.nth(0)).toContainText('Faddervurdering bekreftet av Ada Dagensfadder, fadder.')
  await expect(history.nth(1)).toContainText('Dagen er åpen')
  await role(page).selectOption('sjåfør')
  await expect(mentorLink(page)).toHaveCount(0)
  await expect(history.nth(0)).toContainText('Dagen er låst')
  await expect(history.nth(0)).not.toContainText('Faddervurdering bekreftet')
  await expect(history.nth(1)).toContainText('Dagen er åpen')
  await expect(page.getByText('Beholdt kommentar gjennom rollebytte', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Under oppfølging', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Inn-tid' })).toHaveCount(0)
  await role(page).selectOption('fadder')
  await expect(mentorLink(page)).toBeVisible()
  await page.reload()
  await expect(mentorLink(page)).toBeVisible({ timeout: 5000 })
  await mentorLink(page).click()
  await expect(page.getByText('Låst. Bekreftet av Ada Dagensfadder, fadder.')).toBeVisible()
  await expect(page.getByText('Beholdt kommentar gjennom rollebytte', { exact: true })).toBeVisible()
  await expect(page.getByText('Lagret begrunnelsesutkast · Utkast til ny begrunnelse')).toBeVisible()
  await expect(page.getByText('Lagret avslagsutkast · Utkast til ny avslagskommentar')).toBeVisible()
  await expect(page.getByText('Fadders begrunnelse · Ingen billettering')).toBeVisible()
  await expect(review(page, second.title)).toContainText('Avslått av Emil Eksempel')
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
  const help = page.getByRole('button', { name: `Hjelp om ${first.title}` })
  await expect(help).toBeDisabled()
  await help.evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.getByRole('dialog')).toHaveCount(0)
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

  await writeSavedRun(page, confirmStoredAfter(changed, changed.laterDays![0]), dayTwo.id)
  await page.reload()
  await fillSession(page)
  await mentorLink(page).click()
  for (const criterion of approvedContent.criteria.filter(({ id }) => id !== second.id)) await answer(page, criterion.title, 'OK', false, 2).click()
  await page.getByRole('radio', { name: 'Nei', exact: true }).check()
  await checkDay(page).click()
  await confirmDay(page).click()
  await expect(page.getByText('Låst. Bekreftet av Dagens fadder, fadder.')).toBeVisible()
  await expect(answer(page, second.title, 'Kan bli bedre', false, 2)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Kontroller mangler' })).toHaveCount(0)
  await expect(page.getByText('Kommentar for dag to', { exact: true })).toBeVisible()
  await expect(text(page, second.title, 2)).toHaveCount(0)
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

test('dagslåsen ruller tilbake ved abort, tåler tapt kvittering og verner mot gammel dialog', async ({ page, context }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name === 'commands' && Reflect.get(window, 'abortMentorConfirmation')) {
        Reflect.deleteProperty(window, 'abortMentorConfirmation')
        request.addEventListener('success', () => this.transaction.abort())
      }
      return request
    }
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'commands') (Reflect.get(window, 'mentorConfirmAttempts') as string[] | undefined)?.push(String(key))
      return get.call(this, key)
    }
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failMentorConfirmationRead')) {
        Reflect.deleteProperty(window, 'failMentorConfirmationRead')
        throw new DOMException('Feil ved kontroll av status', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(handler: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'loseMentorConfirmationReceipt')) {
            Reflect.deleteProperty(window, 'loseMentorConfirmationReceipt')
            Reflect.set(window, 'failMentorConfirmationRead', true)
            this.onabort?.(event)
          } else handler.call(this, event)
        })
      },
    })
  })
  await prepareDayLock(page)
  await checkDay(page).click()
  const stale = await context.newPage()
  await stale.goto('/')
  await mentorLink(stale).click()
  await checkDay(stale).click()
  await expect(confirmDay(stale)).toBeVisible()

  await page.bringToFront()
  const baseline = await readSavedRun(page)
  await page.clock.setFixedTime(new Date('2027-03-28T13:00:00Z'))
  await page.evaluate(() => {
    Reflect.set(window, 'mentorConfirmAttempts', [])
    Reflect.set(window, 'abortMentorConfirmation', true)
  })
  await confirmDay(page).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Dagen kunne ikke bekreftes')
  expect(await readSavedRun(page)).toEqual(baseline)
  await page.keyboard.press('Escape')
  await expect(checkDay(page)).toBeFocused()
  await page.clock.setFixedTime(new Date('2027-03-28T14:00:00Z'))
  await checkDay(page).click()
  await expect(confirmDay(page)).toBeVisible()
  await page.evaluate(() => {
    Reflect.set(window, 'abortMentorConfirmation', true)
    Reflect.set(window, 'failMentorConfirmationRead', true)
  })
  await confirmDay(page).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Status for dagsbekreftelsen kunne ikke leses')
  await expect(confirmDay(page)).toHaveCount(0)
  const recover = page.getByRole('button', { name: 'Kontroller lagret tilstand' })
  await page.evaluate(() => Reflect.set(window, 'failMentorConfirmationRead', true))
  await recover.click()
  await expect(recover).toBeEnabled()
  expect(await page.evaluate(() => (Reflect.get(window, 'mentorConfirmAttempts') as string[]).length)).toBe(2)
  expect(await readSavedRun(page)).toEqual(baseline)
  await recover.click()
  await expect(page.getByRole('alert')).toContainText('Dagen er åpen.')
  await expect(checkDay(page)).toBeFocused()
  await page.clock.setFixedTime(new Date('2027-03-28T15:00:00Z'))
  await checkDay(page).click()
  await expect(confirmDay(page)).toBeVisible()
  await page.evaluate(() => Reflect.set(window, 'loseMentorConfirmationReceipt', true))
  await confirmDay(page).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Status for dagsbekreftelsen kunne ikke leses')
  await expect(page.locator('.baseline-state')).toHaveText('Faddervurderingen er ikke bekreftet')
  await page.keyboard.press('Escape')
  await expect(checkDay(page)).toBeDisabled()
  const locked = await readSavedRun(page)
  expect(locked.planEvents).toEqual(baseline.planEvents)
  expect(locked.firstDay.driverConfirmation).toEqual(baseline.firstDay.driverConfirmation)
  expect(locked.firstDay.mentorConfirmation?.confirmedAt).toBe('2027-03-28T15:00:00.000Z')

  await stale.bringToFront()
  await confirmDay(stale).click()
  await expect(stale.getByText('Låst. Bekreftet av Emil Eksempel, fadder.')).toBeVisible()
  await page.bringToFront()
  await recover.click()
  await expect(page.getByText('Låst. Bekreftet av Emil Eksempel, fadder.')).toBeFocused()
  const attempts = await page.evaluate(() => Reflect.get(window, 'mentorConfirmAttempts') as string[])
  expect(attempts).toHaveLength(3)
  expect(new Set(attempts).size).toBe(3)
  expect(await readSavedRun(page)).toEqual(locked)
})

test('mangelsjekk og gjenopprettet fadderfane viser ny dagslås, med eget utkast i konflikten', async ({ page, context }) => {
  await prepareDayLock(page)
  async function openOtherMentor() {
    const other = await context.newPage()
    await other.goto('/')
    await mentorLink(other).click()
    return other
  }
  const dirty = await openOtherMentor()
  const observer = await openOtherMentor()
  const writer = await openOtherMentor()
  const dispatch = (target: Page, type: 'pagehide' | 'pageshow') =>
    target.evaluate(name => window.dispatchEvent(new PageTransitionEvent(name, { persisted: true })), type)
  await dirty.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs') throw new DOMException('Prøvefeil', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await comment(dirty, first.title).click()
  await text(dirty, first.title).fill('Ulagret tekst i gammel fane')
  await expect(status(dirty)).toHaveText('Ulagrede endringer')
  await checkDay(page).click()
  await expect(confirmDay(page)).toBeVisible()
  await dispatch(page, 'pagehide')
  await expect(confirmDay(page)).toBeHidden()
  await dispatch(dirty, 'pagehide')
  await checkDay(writer).click()
  await confirmDay(writer).click()
  const locked = (target: Page) => target.getByText('Låst. Bekreftet av Emil Eksempel, fadder.', { exact: true })
  await expect(locked(writer)).toBeVisible()

  await page.bringToFront()
  await dispatch(page, 'pageshow')
  await expect(locked(page)).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await dirty.bringToFront()
  await dispatch(dirty, 'pageshow')
  await expect(locked(dirty)).toBeVisible()
  const comparison = dirty.getByRole('region', { name: 'Lagrede fadderopplysninger' })
  await expect(comparison).toContainText('Din kommentar · Ulagret tekst i gammel fane')
  await expect(comparison.getByRole('button', { name: 'Lagre mitt fadderutkast' })).toHaveCount(0)
  await comparison.getByRole('button', { name: 'Bruk lagrede opplysninger' }).click()
  await expect(locked(dirty)).toBeVisible()
  await expect(comparison).toHaveCount(0)

  await observer.bringToFront()
  await checkDay(observer).click()
  await expect(locked(observer)).toBeFocused()
  await expect(issues(observer)).toHaveCount(0)
  await expect(observer.getByRole('dialog')).toHaveCount(0)
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

test('beholder kvitterte data og låser dagen lokalt etter 60 sekunder uten nett', async ({ page, context }, testInfo) => {
  test.setTimeout(85_000)
  await prepareDayLock(page, first.id)
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
  await checkDay(page).click()
  await confirmDay(page).click()
  await expect(page.getByText('Låst. Bekreftet av Emil Eksempel, fadder.')).toBeVisible()
  await context.setOffline(false)
  const reopenStarted = performance.now()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Dagens faddervurdering' })).toContainText('Faddervurderingen er låst', { timeout: 5000 })
  const reopenedIn = performance.now() - reopenStarted
  expect(reopenedIn).toBeLessThanOrEqual(5000)
  await expect(mentorLink(page)).toBeVisible({ timeout: 5000 })
  await mentorLink(page).click()
  await expect(answer(page, third.title, 'Kan bli bedre')).toHaveCount(0)
  await expect(page.getByRole('group', { name: third.title, exact: true })).toContainText('Kan bli bedre')
  await expect(review(page, first.title)).toContainText('Bekreftet av Emil Eksempel')
  await expect(page.getByText('Kvittert før nettbruddet', { exact: true })).toBeVisible()
  console.log(`${testInfo.project.name}: dagsbekreftelse etter 60 sekunder frakoblet og gjenåpning med lås på ${Math.round(reopenedIn)} ms`)
})
