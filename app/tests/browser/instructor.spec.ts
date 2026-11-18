import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { updateDayDraft } from '../../src/domain/day-draft.ts'
import { confirmDriverDay, updateDriverDayDraft } from '../../src/domain/driver-day.ts'
import { saveFollowUp } from '../../src/domain/follow-up.ts'
import { confirmMentorDay, updateMentorDay } from '../../src/domain/mentor-day.ts'
import type { Actor, Role } from '../../src/domain/run.ts'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

const role = (page: Page) => page.getByLabel('Simuleringsrolle')
const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const driverName = 'Åse Eksempel'
const employeeNumber = 'DEMO-31'
const instructor = 'Siv Øvingsleder'
const confirmationText = 'Instruktørens del bekreftet av ' + instructor

async function fillDriver(page: Page) {
  await button(page, 'Opprett sjåfør').click()
  await page.getByLabel('Sjåførnavn').fill(driverName)
  await page.getByLabel('Ansattnummer').fill(employeeNumber)
}

async function createInstructorRun(page: Page, initialLastDay = '1') {
  await button(page, 'Ny instruktørvurdering').click()
  await expect(page.getByText(/Faglig kontekst · Instruktør/)).toBeVisible()
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(driverName)
  await expect(page.getByLabel('Sjåførnavn')).not.toBeEditable()
  await page.getByLabel('Instruktørnavn').fill(instructor)
  await page.getByLabel('Første dato').fill('2028-03-01')
  await page.getByLabel('Startplan').selectOption(initialLastDay)
  await button(page, 'Opprett instruktørvurdering').click()
  await expect(heading(page, 'Dagsoversikt')).toBeVisible()
}

async function setActiveRoleInOtherTab(page: Page, active: Role) {
  await page.evaluate(async active => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite')
        const store = tx.objectStore('meta')
        const request = store.get('session')
        request.onsuccess = () => {
          const record = request.result
          record.data.role = active
          store.put(record, 'session')
        }
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }, active)
}

async function waitOnDriverStore(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tide-kjorevurdering')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction('drivers', 'readwrite')
    const store = tx.objectStore('drivers')
    let held = true
    Object.assign(window, { releaseDriverStore: () => { held = false } })
    tx.oncomplete = () => db.close()
    await new Promise<void>(resolve => {
      function hold() {
        const request = store.count()
        request.onsuccess = () => {
          resolve()
          if (held) hold()
        }
      }
      hold()
    })
  })
}

test('instruktøren finner, skiller og velger lokale sjåførregistreringer på smale og brede flater', async ({ page }) => {
  await page.goto('/')
  await role(page).selectOption('instruktør')
  await expect(heading(page, 'Instruktøroversikt')).toBeVisible()
  await expect(page.getByText('Det er ingen sjåfører registrert på denne enheten.')).toBeVisible()
  await button(page, 'Opprett sjåfør').focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Sjåførnavn').fill('  ')
  await button(page, 'Opprett ny registrering').click()
  await expect(page.getByLabel('Sjåførnavn')).toBeFocused()
  await expect(page.getByLabel('Sjåførnavn')).toHaveAccessibleDescription('Skriv inn sjåførens navn.')
  await expect(page.getByLabel('Ansattnummer')).toHaveAccessibleDescription('Skriv inn ansattnummer.')
  await page.getByLabel('Sjåførnavn').fill(driverName)
  await page.getByLabel('Ansattnummer').fill(employeeNumber)
  await page.getByRole('status').evaluate(element => { element.setAttribute('data-observed', 'driver-create') })
  await button(page, 'Opprett ny registrering').click()
  const saved = page.getByRole('status').filter({ hasText: 'Lagret på denne enheten' })
  await expect(saved).toBeVisible()
  await expect(saved).toHaveAttribute('data-observed', 'driver-create')
  await expect(page.getByText('Det er ingen vurderinger for denne registreringen.')).toBeVisible()
  const firstRegistration = await page.getByRole('button', { pressed: true }).innerText()
  await fillDriver(page)
  await expect(heading(page, 'Samme navn og ansattnummer finnes')).toBeVisible()
  await button(page, 'Opprett ny registrering').click()
  const registrationName = new RegExp('^' + driverName + ' Ansattnummer')
  const otherRegistration = page.getByRole('button', { pressed: false, name: registrationName })
  await expect(otherRegistration).toBeVisible()
  expect(await page.getByRole('button', { pressed: true }).innerText()).not.toBe(firstRegistration)
  await page.getByLabel('Søk etter navn eller ansattnummer').fill('DEMO-31')
  await expect(page.getByRole('button', { name: registrationName })).toHaveCount(2)
  await otherRegistration.click()
  await createInstructorRun(page)
  const run = await readSavedRun(page)
  expect(firstRegistration).toContain(run.driver.id)
  await button(page, 'Til instruktøroversikten').click()
  await expect(page.getByRole('button', { name: /Vurderingsskjema · Instruktør.*Pågående/ })).toBeVisible()
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const size = await button(page, 'Opprett sjåfør').boundingBox()
    expect(size!.height).toBeGreaterThanOrEqual(48)
    expect(size!.width).toBeGreaterThanOrEqual(44)
  }
  await page.setViewportSize({ width: 320, height: 650 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.reload()
  await expect(heading(page, 'Instruktøroversikt')).toBeVisible()
  await expect(page.getByRole('button', { pressed: true })).toContainText(run.driver.id)
  const document = page.getByRole('button', { name: /Vurderingsskjema · Instruktør.*Pågående/ })
  await expect(document).toBeVisible()
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (names, mode, options) {
      const tx = transaction.call(this, names, mode, options)
      if (mode === 'readwrite' && tx.objectStoreNames.contains('drivers')) {
        IDBDatabase.prototype.transaction = transaction
        tx.abort()
      }
      return tx
    }
  })
  await otherRegistration.click()
  await expect(page.getByRole('alert')).toContainText('Sjåføren kunne ikke åpnes.')
  await expect(document).toBeVisible()
  await waitOnDriverStore(page)
  try {
    await otherRegistration.click()
    await expect(page.getByRole('status').filter({ hasText: 'Laster dokumentasjon for valgt sjåfør …' })).toBeVisible()
    await expect(document).toHaveCount(0)
  } finally {
    await page.evaluate(() => (window as Window & { releaseDriverStore: () => void }).releaseDriverStore())
  }
  await expect(page.getByText('Det er ingen vurderinger for denne registreringen.')).toBeVisible()
  await role(page).selectOption('fadder')
  await button(page, 'Opprett løp').click()
  await page.getByLabel('Sjåførnavn').fill('Fiktiv Faddersjåfør')
  await page.getByLabel('Ansattnummer').fill('DEMO-32')
  await page.getByLabel('Faddernavn').fill('Fadder Eksempel')
  await page.getByLabel('Første dato').fill('2028-03-02')
  await button(page, 'Opprett løp').click()
  await button(page, 'Til løpsoversikten').click()
  await role(page).selectOption('instruktør')
  await expect(heading(page, 'Instruktøroversikt')).toBeVisible()
  await page.reload()
  await expect(heading(page, 'Instruktøroversikt')).toBeVisible()
  await expect(page.getByText('Det er ingen vurderinger for denne registreringen.')).toBeVisible()
  const search = page.getByLabel('Søk etter navn eller ansattnummer')
  const fadderDriver = page.getByRole('button', { name: /^Fiktiv Faddersjåfør Ansattnummer DEMO-32/ })
  await search.fill('faddersjåfør')
  await expect(fadderDriver).toBeVisible()
  await expect(page.getByRole('button', { name: registrationName })).toHaveCount(0)
  await search.fill('DEMO-32')
  await expect(fadderDriver).toBeVisible()
  await search.fill('ÅSE')
  await expect(fadderDriver).toHaveCount(0)
  await expect(page.getByRole('button', { name: registrationName })).toHaveCount(2)
  await search.fill('ukjent nummer')
  await expect(page.getByText('Ingen sjåfører passer søket.')).toBeVisible()
})

async function answerAll(page: Page) {
  const choices = page.getByRole('button', { name: /^OK ·/ })
  await expect(choices).toHaveCount(22)
  for (const choice of await choices.all()) await choice.click()
}

test('tilbakebuffer og vanlig synlighetsskifte skjuler instruktørutkast etter rollebytte i en annen fane', async ({ page, context }) => {
  await page.goto('/')
  await role(page).selectOption('instruktør')
  await fillDriver(page)
  const remote = await context.newPage()
  await remote.goto('/')

  async function restoreAfterRoleChange(backCache: boolean) {
    await role(remote).selectOption('fadder')
    await expect(role(remote)).toHaveValue('fadder')
    await page.evaluate(backCache => {
      if (backCache) {
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      } else document.dispatchEvent(new Event('visibilitychange'))
    }, backCache)
    const resume = button(page, 'Gjenoppta som instruktør')
    await expect(resume).toBeVisible()
    await expect(page.getByLabel('Sjåførnavn')).toHaveCount(0)
    await expect(page.getByLabel('Instruktørnavn')).toHaveCount(0)
    await resume.click()
  }

  await restoreAfterRoleChange(true)
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(driverName)
  await expect(page.getByLabel('Ansattnummer')).toHaveValue(employeeNumber)
  await button(page, 'Opprett ny registrering').click()
  await button(page, 'Ny instruktørvurdering').click()
  await page.getByLabel('Instruktørnavn').fill(instructor)
  await page.getByLabel('Første dato').fill('2028-03-01')
  await remote.reload()
  await expect(role(remote)).toHaveValue('instruktør')
  await restoreAfterRoleChange(false)
  await expect(page.getByLabel('Instruktørnavn')).toHaveValue(instructor)
  await expect(page.getByLabel('Første dato')).toHaveValue('2028-03-01')
})

async function lockInitialDay(page: Page) {
  const at = '2028-03-01T15:00:00.000Z'
  const driver: Actor = { id: crypto.randomUUID(), role: 'sjåfør' }
  const instructor: Actor = { id: crypto.randomUUID(), role: 'instruktør' }
  let run = lockedRun(await readSavedRun(page))
  const dayId = run.firstDay.id
  const command = (actor: Actor) => ({ commandId: crypto.randomUUID(), runId: run.id, expectedRevision: run.revision, actor })
  const answers = Object.fromEntries(run.content.criteria.map(({ id }) => [id, { value: 'ok' as const, reason: null }]))
  run = updateDayDraft(run, { ...command(instructor), payload: { dayId,
    changes: { bus1: 'DEMO-BUSS', routes: '21', startTime: '08:00', endTime: '15:00' },
  } })
  run = updateDriverDayDraft(run, { ...command(driver), payload: { dayId, planRevision: 1,
    changes: { answers, evaluation: { decision: 'skipped' } },
  } })
  run = confirmDriverDay(run, { ...command(driver), payload: { dayId, planRevision: 1, confirmedAt: at } })
  run = updateMentorDay(run, { ...command(instructor), payload: { dayId, changes: { answers } } })
  run = saveFollowUp(run, { ...command(instructor), payload: { dayId, source: 'daily', choice: { kind: 'none' } } })
  run = confirmMentorDay(run, { ...command(instructor), payload: { dayId, confirmedAt: at } })
  await writeSavedRun(page, run)
  await page.reload()
  await expect(heading(page, 'Dagsoversikt')).toBeVisible()
}

test('foreldede dag- og planforsøk beholder utfylte felter til instruktøren gjenopptar', async ({ page, context }) => {
  await page.goto('/')
  const remote = await context.newPage()
  await remote.goto('/')
  await page.bringToFront()
  await role(page).selectOption('instruktør')
  await fillDriver(page)
  await button(page, 'Opprett ny registrering').click()
  await createInstructorRun(page, '2')
  await lockInitialDay(page)

  await button(page, 'Opprett neste dag').click()
  const date = page.getByRole('textbox', { name: 'Dato', exact: true })
  const instructorName = page.getByRole('textbox', { name: 'Instruktørnavn', exact: true })
  await date.fill('2028-03-02')
  await instructorName.fill('Instruktør for dag to')
  await setActiveRoleInOtherTab(remote, 'fadder')
  await button(page, 'Opprett dag').click()
  const resume = button(page, 'Gjenoppta som instruktør')
  await expect(resume).toBeVisible()
  await expect(date).toBeHidden()
  await resume.click()
  await expect(date).toHaveValue('2028-03-02')
  await expect(instructorName).toHaveValue('Instruktør for dag to')
  await button(page, 'Prøv igjen').click()
  await expect(heading(page, 'Dagsoversikt')).toBeVisible()
  await button(page, 'Åpne dag 1').click()

  await button(page, 'Utvid planen').click()
  const extension = page.getByLabel('Antall ekstra dager')
  await extension.selectOption('1')
  await setActiveRoleInOtherTab(remote, 'fadder')
  await button(page, 'Lagre utvidelse').click()
  await expect(resume).toBeVisible()
  await expect(extension).toBeHidden()
  await resume.click()
  await expect(extension).toHaveValue('1')
  await button(page, 'Prøv igjen').click()
  await expect(heading(page, 'Dagsoversikt')).toBeVisible()
  expect((await readSavedRun(page)).plan?.lastDay).toBe(3)
})

async function simulateRoleChangeAfterConfirmation(page: Page) {
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (value, key) {
      const request = add.call(this, value, key)
      if (this.name === 'commands' && value.data?.receipt?.confirmation) {
        IDBObjectStore.prototype.add = add
        const meta = this.transaction.objectStore('meta')
        request.addEventListener('success', () => {
          const session = meta.get('session')
          session.onsuccess = () => {
            const record = session.result
            record.data.role = 'fadder'
            meta.put(record, 'session')
          }
        })
      }
      return request
    }
  })
}

test('én instruktørdag gjennomføres med separate låser og samme slutt-PDF for begge roller', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/')
  const remote = await context.newPage()
  await remote.goto('/')
  await page.bringToFront()
  await role(page).selectOption('instruktør')
  await fillDriver(page)
  await button(page, 'Opprett ny registrering').click()
  await createInstructorRun(page)
  await page.getByLabel('Buss 1').fill('DEMO-BUSS')
  await page.getByLabel('Linjer').fill('21 og 37')
  await page.getByLabel('Inn-tid').fill('08:00')
  await page.getByLabel('Ut-tid').fill('15:00')
  await role(page).selectOption('fadder')
  await expect(heading(page, 'Velg rolle for vurderingen')).toBeVisible()
  await expect(page.getByLabel('Buss 1')).toHaveCount(0)
  await role(page).selectOption('sjåfør')
  await button(page, 'Åpne førvurderingen').click()
  await answerAll(page)
  await button(page, 'Kontroller og bekreft førvurderingen').click()
  await button(page, 'Bekreft og lås').click()
  await button(page, 'Til dagsoversikten').click()
  await button(page, 'Åpne dagens ettervurdering').click()
  await answerAll(page)
  await button(page, 'Kontroller og fullfør ettervurderingen').click()
  await button(page, 'Hopp over egenevalueringen').click()
  await button(page, 'Bekreft min del').click()
  await button(page, 'Til dagsoversikten').click()
  await role(page).selectOption('instruktør')
  await button(page, 'Åpne dagens instruktørvurdering').click()
  await expect(heading(page, 'Dagens instruktørvurdering')).toBeVisible()
  await answerAll(page)
  await page.getByRole('button', { name: /^Kommentar til .* · Instruktør · Dag 1/ }).first().click()
  const comment = 'Historisk instruktørkommentar · ÆØÅ åäö\n' + 'Utfylling i kjørevurderingen. '.repeat(380)
  await page.getByRole('textbox', { name: /^Instruktørens kommentar/ }).fill(comment)
  await page.getByRole('radio', { name: 'Nei', exact: true }).check()
  await button(page, 'Kontroller mangler').click()
  const lock = page.getByRole('dialog', { name: 'Bekreft instruktørvurderingen og lås dagen' })
  await expect(lock.getByText('Instruktør · ' + instructor)).toBeVisible()
  await setActiveRoleInOtherTab(remote, 'fadder')
  await lock.getByRole('button', { name: 'Bekreft og lås dagen' }).click()
  const resume = button(page, 'Gjenoppta som instruktør')
  await expect(resume).toBeVisible()
  await expect(button(page, 'Kontroller lagret tilstand')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /^Instruktørens kommentar/ })).toHaveCount(0)
  expect((await readSavedRun(page)).firstDay.mentorConfirmation).toBeUndefined()
  await resume.click()
  await expect(page.getByText('Dagen er åpen. Kontroller de lagrede opplysningene før du bekrefter på nytt.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /^Instruktørens kommentar/ })).toHaveValue(comment)
  await button(page, 'Kontroller mangler').click()
  await simulateRoleChangeAfterConfirmation(page)
  await lock.getByRole('button', { name: 'Bekreft og lås dagen' }).click()
  await expect(resume).toBeVisible()
  const confirmed = (await readSavedRun(page)).firstDay.mentorConfirmation
  expect(confirmed?.actor.role).toBe('instruktør')
  await resume.click()
  await expect(page.getByText(confirmationText, { exact: true })).toBeVisible()
  expect((await readSavedRun(page)).firstDay.mentorConfirmation).toEqual(confirmed)
  await button(page, 'Til dagsoversikten').click()
  await role(page).selectOption('sjåfør')
  await button(page, 'Åpne historikk').click()
  await expect(page.locator('body')).not.toContainText('Historisk instruktørkommentar')
  await expect(page.locator('body')).not.toContainText('Planhistorikk')
  await button(page, 'Til dagsoversikten').click()
  await role(page).selectOption('instruktør')
  await button(page, 'Avslutt perioden').click()
  await page.getByLabel('Instruktørens oppsummering (valgfritt)').fill('Åse har gjennomført Kjøreøkt · öäå')
  await page.getByRole('radio', { name: 'Oppfølgingsbehov', exact: true }).check()
  await button(page, 'Kontroller avslutning').click()
  await page.getByRole('dialog', { name: 'Avslutte perioden?' }).getByRole('button', { name: 'Avslutt perioden' }).click()
  await expect(heading(page, 'Hele skjemaet')).toBeVisible()
  await expect(page.getByText(confirmationText, { exact: false })).toBeVisible()
  const run = await readSavedRun(page)
  expect(run.closureSnapshot?.documentVersion).toBe(2)
  expect(run.closureSnapshot?.history.firstDay.mentorConfirmation?.actor.role).toBe('instruktør')
  await context.setOffline(true)
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  const downloadButton = button(page, 'Last ned PDF')
  const pending = page.waitForEvent('download')
  await downloadButton.click()
  const download = await pending
  await download.saveAs(testInfo.outputPath('instruktor.pdf'))
  await writeFile(testInfo.outputPath('instruktor-kilde.json'), JSON.stringify(run), { encoding: 'utf8' })
  await role(page).selectOption('fadder')
  await expect(heading(page, 'Velg rolle for vurderingen')).toBeVisible()
  await expect(downloadButton).toHaveCount(0)
  await role(page).selectOption('sjåfør')
  await button(page, 'Åpne hele skjemaet').click()
  await expect(page.getByText(confirmationText, { exact: false })).toBeVisible()
  const driverPending = page.waitForEvent('download')
  await downloadButton.click()
  const driverDownload = await driverPending
  expect(driverDownload.suggestedFilename()).toBe(download.suggestedFilename())
  await driverDownload.saveAs(testInfo.outputPath('sjafor.pdf'))
})
