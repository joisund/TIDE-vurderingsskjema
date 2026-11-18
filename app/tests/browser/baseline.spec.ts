import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { approvedContent } from '../../src/content/approved-content.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const first = approvedContent.criteria[0]
const last = approvedContent.criteria[21]
const status = (page: Page) => page.getByRole('status')
const helpButton = (page: Page, title = first.title) => page.getByRole('button', { name: `Hjelp om ${title}`, exact: true })
const option = (page: Page, label: string, title = first.title) => page.getByRole('button', {
  name: `${label} · ${title} · Sjåfør · Førvurdering`, exact: true,
})
const reason = (page: Page) => page.getByLabel('Begrunn hvorfor dette ikke er relevant')
const check = (page: Page) => page.getByRole('button', { name: 'Kontroller og bekreft førvurderingen' })
const openBaseline = (page: Page) => page.getByRole('button', { name: 'Åpne førvurderingen' }).click()

async function setup(page: Page, mentorName = 'Emil Eksempel') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await page.getByLabel('Sjåførnavn').fill('Nora Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-101')
  await page.getByLabel('Faddernavn').fill(mentorName)
  await page.getByLabel('Første dato').fill('2027-03-28')
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
}

async function asDriver(page: Page) {
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await openBaseline(page)
}

async function fillAnswers(page: Page, from = 0) {
  for (const criterion of approvedContent.criteria.slice(from)) {
    const button = option(page, 'OK', criterion.title)
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(status(page)).toHaveText('Lagret på denne enheten')
}

test('snapshot brukes av begge roller, punkthjelp gjenoppretter fokus og bare godkjent begrunnelse endrer svar', async ({ page }) => {
  await setup(page)
  const storedRun = await readSavedRun(page)
  const storedFirstHelp = 'Hjelpetekst fra den lagrede versjonen for dette løpet.'
  const storedLastHelp = 'En annen godkjent punkttekst i løpets snapshot.'
  const criteria = [
    { ...last, help: storedLastHelp }, { ...first, help: storedFirstHelp },
    ...storedRun.content.criteria.slice(1, -1),
  ]
  await writeSavedRun(page, { ...storedRun, content: { ...storedRun.content, criteria } })
  await openBaseline(page)
  await expect(page.getByRole('heading', { name: 'Førvurdering', exact: true })).toBeFocused()
  await expect(page.locator('.matrix-row')).toHaveCount(22)
  await expect(page.getByText('Ubesvart', { exact: true })).toHaveCount(22)
  await expect(check(page)).toHaveCount(0)
  await expect(option(page, 'OK')).toHaveCount(0)
  const help = helpButton(page)
  await help.focus()
  await expect(help).toBeFocused()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading')).toHaveText(`Hjelp om ${first.title}`)
  await expect(dialog.locator('p')).toHaveText(storedFirstHelp)
  await page.keyboard.press('Escape')
  await expect(help).toBeFocused()
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await asDriver(page)
  await expect(page.locator('.matrix-headings span')).toHaveText(['Vurderingspunkt', 'OK', 'Kan bli bedre', 'Ikke relevant'])
  await expect(page.locator('.matrix-row .matrix-criterion > p:first-of-type')).toHaveText(criteria.map(item => item.title))
  await expect(page.locator('.matrix-row').first().locator('.criterion-number > span')).toHaveText('22')
  await expect(page.locator('.assessment-matrix > section').first().getByRole('heading'))
    .toHaveText('Trafikk / kjøreteknikk · Optimal kjøreteknikk')
  await expect(page.locator('.matrix-choice[aria-pressed="true"]')).toHaveCount(0)
  await helpButton(page, last.title).click()
  await expect(dialog.locator('p')).toHaveText(storedLastHelp)
  await dialog.getByRole('button', { name: 'Lukk hjelp' }).click()
  await expect(helpButton(page, last.title)).toBeFocused()
  await option(page, 'Kan bli bedre').click()
  await option(page, 'Ikke relevant').click()
  await expect(dialog).toContainText(first.title)
  await expect(dialog).toContainText('Sjåfør · Førvurdering')
  await reason(page).fill('Billettering')
  await dialog.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(reason(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(reason(page)).toHaveAccessibleDescription(/minst to ord og minst ti tegn/)
  await page.keyboard.press('Escape')
  await expect(option(page, 'Ikke relevant')).toBeFocused()
  await expect(option(page, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.reload()
  await openBaseline(page)
  await option(page, 'Ikke relevant').click()
  await expect(reason(page)).toHaveValue('Billettering')
  await reason(page).fill('  Ingen  \n rygging  ')
  await dialog.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(option(page, 'Ikke relevant')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Begrunnelse · Ingen rygging')).toBeVisible()
  await option(page, 'Ikke relevant').click()
  await reason(page).fill('Ingen billettering')
  await dialog.getByRole('button', { name: 'Avbryt' }).click()
  await expect(page.getByText('Begrunnelse · Ingen rygging')).toBeVisible()
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(option(page, 'Ikke relevant')).toHaveCount(0)
  await expect(page.getByText('Begrunnelse · Ingen rygging')).toBeVisible()
  await helpButton(page).click()
  await page.emulateMedia({ media: 'print' })
  await expect(dialog).toBeHidden()
  await expect(helpButton(page)).toBeHidden()
})

test('kontroll viser mangler med fokus ved riktig svar og øktfelt', async ({ page }) => {
  await setup(page)
  await page.getByLabel('Faddernavn').fill(' ')
  await asDriver(page)
  await check(page).click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: `${last.title} · Velg et svar.`, exact: true }).click()
  await expect(option(page, 'OK', last.title)).toBeFocused()
  await expect(option(page, 'OK', last.title)).toHaveAccessibleDescription('Velg et svar.')
  await page.getByRole('button', { name: 'Dag 1 · Skriv inn fadderens navn.' }).click()
  await expect(page.getByRole('group', { name: 'Faddernavn' })).toBeFocused()
  await expect(page.getByRole('group', { name: 'Faddernavn' })).toHaveAccessibleDescription(/Skriv inn fadderens navn/)
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  const editableMentorName = page.locator('input#day-field-mentorName')
  await expect(editableMentorName).toBeEditable()
  await expect(editableMentorName).toBeFocused()
})

test('senere dag leser dag 1 som førkontekst og gjenbruker de samme 22 førposisjonene', async ({ page }) => {
  await setup(page)
  await asDriver(page)
  await option(page, 'OK').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  const run = await readSavedRun(page)
  const secondDay = {
    id: crypto.randomUUID(), number: 2 as const, date: '2027-03-29', driverId: run.driver.id,
    driverIdentity: { name: 'Nora Dagto', employeeNumber: 'DEMO-101' },
    mentorName: 'Fadder Dagto', identityConfirmed: false,
  }
  await writeSavedRun(page, { ...run, laterDays: [secondDay] }, secondDay.id)
  await page.reload()
  await expect(page.locator('.profile .day-context')).toHaveText('Nora Dagto · Dag 2')
  await openBaseline(page)
  await expect(page.locator('.profile .day-context')).toHaveText('Nora Eksempel · Dag 1')
  const before = page.getByRole('region', { name: 'Sjåførens førvurdering' })
  await expect(before.getByText('Sjåfør · Nora Eksempel · Dag 1 · 28.03.2027')).toBeVisible()
  await expect(before.getByText('Samme førvurdering fra dag 1.')).toBeVisible()
  await expect(page.locator('.matrix-row')).toHaveCount(22)
  await expect(option(page, 'OK')).toHaveAttribute('aria-pressed', 'true')
  expect((await readSavedRun(page)).baseline?.answers).toEqual(run.baseline?.answers)
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(page.locator('.profile .day-context')).toHaveText('Nora Dagto · Dag 2')
})

test('foreldet fane må kontrollere lagret før-svar før et uttrykkelig nytt forsøk', async ({ page, context }) => {
  await setup(page)
  await asDriver(page)
  const stale = await context.newPage()
  await stale.goto('/')
  await openBaseline(stale)
  await option(page, 'OK').click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await option(stale, 'Kan bli bedre').click()
  await expect(stale.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await expect(stale.getByRole('region', { name: 'Lagrede før-svar' })).toContainText('Valgt · OK')
  await expect(stale.getByText('Valgt · Kan bli bedre', { exact: true })).toBeVisible()
  await expect(check(stale)).toHaveCount(0)
  await stale.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(status(stale)).toHaveText('Lagret på denne enheten')
  await expect(option(stale, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
})

test('konflikt bevarer uttrykkelig sletting av begrunnelsesutkast og annet lagret kriterium', async ({ page, context }) => {
  await setup(page)
  await asDriver(page)
  await option(page, 'Ikke relevant').click()
  await reason(page).fill('Ingen rygging')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  const stale = await context.newPage()
  await stale.goto('/')
  await openBaseline(stale)
  await option(page, 'Kan bli bedre').click()
  await option(page, 'Ikke relevant').click()
  await reason(page).fill('Råtekst fra den andre fanen')
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).click()
  await option(page, 'Kan bli bedre', last.title).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await option(stale, 'Ikke relevant').click()
  await expect(reason(stale)).toHaveValue('Ingen rygging')
  await stale.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await expect(stale.getByRole('region', { name: 'Lagrede før-svar' })).toContainText('Råtekst fra den andre fanen')
  await stale.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(status(stale)).toHaveText('Lagret på denne enheten')
  await expect(option(stale, 'Kan bli bedre', last.title)).toHaveAttribute('aria-pressed', 'true')
  await option(stale, 'Ikke relevant').click()
  await expect(reason(stale)).toHaveValue('Ingen rygging')
  expect((await readSavedRun(stale)).baseline?.reasonDrafts[first.id]).toBeUndefined()
})

test('åpen begrunnelse ved rollebytte bevarer utkastet og gir fokus til konfliktsammenligning', async ({ page, context }) => {
  await setup(page)
  await asDriver(page)
  await check(page).click()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toBeVisible()
  await option(page, 'Ikke relevant').click()
  const remote = await context.newPage()
  await remote.goto('/')
  await remote.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(remote.getByLabel('Simuleringsrolle')).toHaveValue('fadder')
  await remote.close()
  await page.bringToFront()
  await reason(page).fill('Ingen billettering')
  await expect(reason(page)).not.toBeEditable()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toContainText('sammenligne med de lagrede svarene')
  await expect(dialog.getByRole('button', { name: 'Lagre begrunnelse' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Kontroller lagrede svar' }).click()
  await expect(page.getByRole('heading', { name: 'Lagrede før-svar' })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Mangler før bekreftelse' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Lagrede før-svar' })).toContainText('Ingen billettering')
  await page.getByRole('button', { name: 'Gjenoppta som sjåfør' }).click()
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await option(page, 'Ikke relevant').click()
  await expect(reason(page)).toHaveValue('Ingen billettering')
  await writeSavedRun(page, lockedRun(await readSavedRun(page)))
  await reason(page).fill('Ingen billettering i dag')
  await expect(reason(page)).not.toBeEditable()
  await dialog.getByRole('button', { name: 'Kontroller lagrede svar' }).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lagre mine endringer' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Bruk lagrede svar' }).click()
  await expect(page.getByText('Valgt · OK', { exact: true })).toHaveCount(22)
})

test('begrunnelsesutkast forsøker flush under innskriving, og feil blokkerer rute og rolle', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs') {
        if (Reflect.get(window, 'rejectDraft')) throw new DOMException('Kvote', 'QuotaExceededError')
        this.transaction.addEventListener('complete', () => {
          const receipts = Reflect.get(window, 'draftCompleteTimes') as number[] | undefined
          receipts?.push(performance.now())
        })
      }
      return put.call(this, value, key)
    }
  })
  await setup(page)
  await asDriver(page)
  await page.bringToFront()
  await option(page, 'Ikke relevant').click()
  await page.evaluate(() => {
    Reflect.set(window, 'draftCompleteTimes', [])
    document.querySelector('textarea')!.addEventListener('input', () => {
      if (Reflect.get(window, 'draftFirstInput') === undefined) Reflect.set(window, 'draftFirstInput', performance.now())
      Reflect.set(window, 'draftLastInput', performance.now())
    })
  })
  await reason(page).pressSequentially('Ingen billettering i dag', { delay: 115 })
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Lagret på denne enheten')
  const times = await page.evaluate(() => {
    const receipts = Reflect.get(window, 'draftCompleteTimes') as number[]
    return {
      during: Math.round(receipts[0] - Reflect.get(window, 'draftFirstInput')),
      tail: Math.round(receipts.at(-1)! - Reflect.get(window, 'draftLastInput')),
      wroteDuringInput: receipts[0] < Reflect.get(window, 'draftLastInput'),
    }
  })
  expect(times.wroteDuringInput).toBe(true)
  expect(times.during).toBeLessThanOrEqual(2000)
  expect(times.tail).toBeLessThanOrEqual(2000)
  console.log(`${testInfo.project.name}: førutkast kvittert etter ${times.during} ms under vedvarende skriving, ${times.tail} ms etter siste input`)
  await page.getByRole('dialog').getByRole('button', { name: 'Avbryt' }).click()
  await page.evaluate(() => Reflect.set(window, 'rejectDraft', true))
  await option(page, 'Kan bli bedre').click()
  await page.getByRole('button', { name: 'Til dagsoversikten' }).click()
  await expect(page.getByRole('alert')).toContainText('Endringene er ikke lagret')
  await expect(page.getByRole('heading', { name: 'Førvurdering', exact: true })).toBeVisible()
  await expect(check(page)).toBeDisabled()
  await page.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(option(page, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => Reflect.set(window, 'rejectDraft', false))
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(status(page)).toHaveText('Lagret på denne enheten')
  await page.reload()
  await openBaseline(page)
  await expect(option(page, 'Kan bli bedre')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Ikke relevant').click()
  await expect(reason(page)).toHaveValue('Ingen billettering i dag')
})

test('låsevarsel, avbrudd før complete og lukking etter commit før kvittering', async ({ page, context }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name === 'commands') (Reflect.get(window, 'confirmAttemptIds') as string[] | undefined)?.push(String(key))
      if (this.name === 'commands' && Reflect.get(window, 'abortBaseline')) {
        Reflect.deleteProperty(window, 'abortBaseline')
        request.addEventListener('success', () => this.transaction.abort())
      }
      return request
    }
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(handler: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (!this.objectStoreNames.contains('commands') || !Reflect.get(window, 'pauseBaseline')) {
            handler.call(this, event)
            return
          }
          Reflect.deleteProperty(window, 'pauseBaseline')
          Reflect.set(window, 'baselineCommitted', true)
        })
      },
    })
  })
  await setup(page)
  await asDriver(page)
  await option(page, 'Ikke relevant').click()
  await reason(page).fill('Ingen rygging')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await fillAnswers(page, 1)
  const dialog = page.getByRole('dialog')
  await check(page).click()
  await expect(dialog).toContainText('Sjåfør · Nora Eksempel')
  await expect(dialog).toContainText('28.03.2027')
  await expect(dialog).toContainText('Disse svarene låses og kan ikke endres senere')
  await expect(dialog).toContainText('identitet, dato og tilhørighet for dag 1')
  await page.keyboard.press('Escape')
  await expect(check(page)).toBeFocused()
  await expect(page.getByText('Ikke bekreftet', { exact: true })).toBeVisible()
  await check(page).click()
  await page.evaluate(() => {
    Reflect.set(window, 'confirmAttemptIds', [])
    Reflect.set(window, 'abortBaseline', true)
  })
  await dialog.getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Førvurderingen kunne ikke bekreftes')
  await page.evaluate(() => Reflect.set(window, 'abortBaseline', true))
  await dialog.getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Førvurderingen kunne ikke bekreftes')
  await dialog.getByRole('button', { name: 'Avbryt' }).click()
  await check(page).click()
  await page.evaluate(() => Reflect.set(window, 'pauseBaseline', true))
  await dialog.getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'baselineCommitted'))).toBe(true)
  const attemptIds = await page.evaluate(() => Reflect.get(window, 'confirmAttemptIds') as string[])
  expect(attemptIds).toHaveLength(3)
  expect(attemptIds[1]).toBe(attemptIds[0])
  expect(attemptIds[2]).not.toBe(attemptIds[1])
  await expect(dialog).toBeVisible()
  await expect(page.locator('.baseline-state')).toHaveText('Ikke bekreftet')
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/')
  await expect(reopened.getByText('Førvurderingen er låst', { exact: true })).toBeVisible()
  await expect(reopened.locator('#day-field-driverName')).toHaveAttribute('role', 'group')
  await expect(reopened.getByLabel('Inn-tid')).toBeEditable()
  await openBaseline(reopened)
  await expect(option(reopened, 'OK')).toHaveCount(0)
  await expect(reopened.getByText('Begrunnelse · Ingen rygging')).toBeVisible()
  await expect(reopened.locator('time[datetime$="Z"]')).toBeVisible()
})

test('kvittert bekreftelse vises som låst ved lesefeil og kan leses igjen etter gjenåpning', async ({ page }) => {
  await page.addInitScript(() => {
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failBaselineFollowup')) {
        Reflect.deleteProperty(window, 'failBaselineFollowup')
        Reflect.set(window, 'baselineFollowupFailed', true)
        throw new DOMException('Kun denne lesingen feiler', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
  })
  await setup(page)
  await asDriver(page)
  await fillAnswers(page)
  await check(page).click()
  await page.evaluate(() => Reflect.set(window, 'failBaselineFollowup', true))
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => Reflect.get(window, 'baselineFollowupFailed'))).toBe(true)
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await expect(option(page, 'OK')).toHaveCount(0)
  await page.reload()
  await openBaseline(page)
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await expect(page.locator('time[datetime$="Z"]')).toBeVisible()
})

test('ukjent bekreftelsesutfall beholder kommandoen ved ny bekreftelse etter lukking', async ({ page }) => {
  await page.addInitScript(() => {
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'commands') (Reflect.get(window, 'confirmAttemptIds') as string[] | undefined)?.push(String(key))
      return get.call(this, key)
    }
    const getAll = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failNextBaselineRead')) {
        Reflect.deleteProperty(window, 'failNextBaselineRead')
        throw new DOMException('Kun denne lesingen feiler', 'UnknownError')
      }
      return getAll.apply(this, args)
    }
    const property = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...property,
      set(handler: (event: Event) => void) {
        property.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'loseNextBaselineReceipt')) {
            Reflect.deleteProperty(window, 'loseNextBaselineReceipt')
            Reflect.set(window, 'failNextBaselineRead', true)
            this.onabort?.(event)
          } else handler.call(this, event)
        })
      },
    })
  })
  await setup(page)
  await asDriver(page)
  await fillAnswers(page)
  await check(page).click()
  await page.evaluate(() => {
    Reflect.set(window, 'confirmAttemptIds', [])
    Reflect.set(window, 'loseNextBaselineReceipt', true)
  })
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Status for førbekreftelsen kunne ikke leses')
  await dialog.getByRole('button', { name: 'Avbryt' }).click()
  await check(page).click()
  await dialog.getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  const attemptIds = await page.evaluate(() => Reflect.get(window, 'confirmAttemptIds') as string[])
  expect(attemptIds).toHaveLength(2)
  expect(attemptIds[1]).toBe(attemptIds[0])
})

test('feil forklares etter at rolle fra en annen fane erstatter førvisningen', async ({ page, context }) => {
  await setup(page)
  await asDriver(page)
  await fillAnswers(page)
  await check(page).click()
  const remote = await context.newPage()
  await remote.goto('/')
  await remote.getByLabel('Simuleringsrolle').selectOption('fadder')
  await expect(remote.getByLabel('Simuleringsrolle')).toHaveValue('fadder')
  await remote.close()
  await page.bringToFront()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('fadder')
  await expect(page.getByRole('alert')).toContainText('Den aktive rollen ble endret i en annen fane.')
  await expect(option(page, 'OK')).toHaveCount(0)
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(check(page)).toBeVisible()
  await check(page).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
})

test('matrise og dialog ved 320–1280 CSSpx, 200 % tekst, portrett og landskap', async ({ page }) => {
  await setup(page)
  await asDriver(page)
  await page.bringToFront()
  const header = page.locator('.matrix-headings')
  for (const size of [[320, 800], [360, 800], [390, 844], [768, 1024], [844, 390], [1280, 900], [320, 256]]) {
    const [width, height] = size
    await page.setViewportSize({ width, height })
    for (const font of ['100%', '200%']) {
      await page.locator('html').evaluate((html, font) => { html.style.fontSize = font }, font)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      const button = option(page, 'Kan bli bedre', last.title)
      await button.evaluate(element => {
        const target = element as HTMLButtonElement
        target.scrollIntoView({ block: 'center' })
        document.querySelector('h1')!.focus({ preventScroll: true })
        window.scrollBy(0, target.getBoundingClientRect().top - 4)
        target.focus({ preventScroll: true })
      })
      await expect.poll(async () => {
        const [headingBox, buttonBox] = await Promise.all([header.boundingBox(), button.boundingBox()])
        return Math.abs(headingBox!.y) < 1 && buttonBox!.y >= headingBox!.height
      }, { message: `Sticky fokus ved ${width} × ${height}, tekst ${font}` }).toBe(true)
      const [headingBox, buttonBox, helpBox] = await Promise.all([header.boundingBox(), button.boundingBox(), helpButton(page).boundingBox()])
      expect(buttonBox!.y).toBeGreaterThanOrEqual(headingBox!.height)
      expect(buttonBox!.width).toBeGreaterThanOrEqual(44)
      expect(buttonBox!.height).toBeGreaterThanOrEqual(48)
      expect(helpBox!.width).toBeGreaterThanOrEqual(44)
      expect(helpBox!.height).toBeGreaterThanOrEqual(44)
      await option(page, 'Ikke relevant', last.title).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      const cancel = dialog.getByRole('button', { name: 'Avbryt' })
      await cancel.focus()
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Lagre begrunnelse' })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(option(page, 'Ikke relevant', last.title)).toBeFocused()
    }
  }
})

test('svar og førbekreftelse lagres gjennom 60 sekunder uten nett', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  await setup(page)
  await asDriver(page)
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.bringToFront()
  await context.setOffline(true)
  const started = performance.now()
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await option(page, 'Ikke relevant').click()
  await reason(page).fill('Ingen billettering')
  await page.getByRole('button', { name: 'Lagre begrunnelse' }).click()
  await fillAnswers(page, 1)
  await page.waitForTimeout(Math.max(0, 60_000 - (performance.now() - started)))
  await check(page).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bekreft og lås' }).click()
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  expect(requests).toEqual([])
  await context.setOffline(false)
  const offlineMs = Math.round(performance.now() - started)
  await expect(page.getByText('Nett tilkoblet', { exact: true })).toBeVisible({ timeout: 5000 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await openBaseline(page)
  await expect(page.getByText('Låst. Bekreftet av Nora Eksempel, sjåfør.')).toBeVisible()
  await expect(page.getByText('Begrunnelse · Ingen billettering')).toBeVisible()
  console.log(`${testInfo.project.name}: førvurdering lagret og låst etter ${offlineMs} ms frakoblet uten nettverksforespørsler`)
})
