import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { expect, test } from '@playwright/test'
import type { APIResponse, Page } from '@playwright/test'
import { seedPilot } from '../../server/pilot-accounts.ts'
import { startPilotServer } from '../../server/pilot-server.ts'
import { TestDriveStore } from '../../server/test-drive-store.ts'
import { testDriveV1 } from '../../src/content/test-drive.v1.ts'

async function signIn(store: TestDriveStore, page: Page, email: string, checkThrottle = false) {
  await page.getByRole('textbox', { name: 'E-postadresse' }).fill(email)
  await page.getByRole('button', { name: 'Send engangskode' }).click()
  const field = page.getByRole('textbox', { name: 'Engangskode' })
  await expect(field).toBeFocused()
  const resend = page.getByRole('button', { name: 'Be om ny kode' })
  if (checkThrottle) {
    for (let index = 0; index < 4; index++) {
      await Promise.all([page.waitForResponse('**/api/testkjoring/auth/code'), resend.click()])
    }
  }
  const message = store.database.prepare(`
    SELECT value FROM pilot_mailbox WHERE email = ? AND kind = 'code' ORDER BY id DESC LIMIT 1
  `).get(email)
  expect(message?.value).toMatch(/^\d{6}$/)
  await field.fill(String(message?.value))
  if (checkThrottle) {
    await resend.click()
    await expect(page.getByRole('alert')).toContainText('Du kan fortsatt prøve den siste koden.')
    await expect(field).toHaveValue(String(message?.value))
  }
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Logg ut' })).toBeVisible()
  await expect(page.locator('header')).toContainText(email)
}

test('testkjøring har egen innlogging, eksakte tildelinger og tilbakekall på tvers av nettleserøkter', async ({ browser }, info) => {
  const store = new TestDriveStore(info.outputPath('testkjoring.sqlite'))
  seedPilot(store)
  const server = startPilotServer(store, { host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fant ikke adressen til pilotserveren.')
  const origin = `http://127.0.0.1:${address.port}`
  const settings = { hasTouch: true, viewport: { width: 320, height: 740 }, locale: 'nb-NO', timezoneId: 'Europe/Oslo' }
  const [adminContext, candidateContext, otherContext, instructorContext] = await Promise.all([
    browser.newContext(settings), browser.newContext(settings), browser.newContext(settings), browser.newContext(settings),
  ])
  const [admin, candidate, other, instructor] = await Promise.all([
    adminContext.newPage(), candidateContext.newPage(), otherContext.newPage(), instructorContext.newPage(),
  ])

  const unassigned = 'Testkjøringen er ikke tilgjengelig for denne innloggingen.'
  try {
    await admin.goto(origin)
    await admin.getByRole('link', { name: 'Testkjøring', exact: true }).click()
    await expect(admin.getByRole('heading', { name: 'Logg inn til testkjøring' })).toBeVisible()
    await expect(admin.getByLabel('Simuleringsrolle')).toHaveCount(0)
    await signIn(store, admin, 'opplaering-bergen@pilot.test')
    await expect(admin.getByLabel('Avdeling', { exact: true })).toHaveValue('bergen')
    await admin.getByLabel('Kandidatens navn').fill('Nora Eksempel')
    await admin.getByLabel('Kandidatens e-post').fill('kandidat-1@pilot.test')
    await admin.getByLabel('Instruktør', { exact: true }).selectOption('instructor-bergen')
    const deadlineField = admin.getByLabel('Kandidatens tilgang utløper')
    await deadlineField.fill('2027-03-28T02:30')
    await admin.getByRole('button', { name: 'Opprett og inviter' }).click()
    await expect(admin.getByRole('alert')).toContainText('Dette tidspunktet finnes ikke i lokal tid.')
    await deadlineField.fill('2099-06-15T12:30')
    await expect(admin.getByText('Lokal tid · UTC+02:00', { exact: true })).toBeVisible()
    await admin.getByText('Flere opplysninger om testkjøringen', { exact: true }).click()
    await admin.getByLabel('Buss', { exact: true }).fill('Testbuss 7')

    const createUrl = '**/api/testkjoring/runs'
    await admin.route(createUrl, async route => {
      const response = await route.fetch()
      expect(response.status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    await admin.getByRole('button', { name: 'Opprett og inviter' }).click()
    await expect(admin.getByRole('button', { name: 'Prøv opprettingen igjen' })).toBeEnabled()
    await admin.getByRole('link', { name: 'Til tilgangsstyring' }).click()
    await expect(admin.getByRole('heading', { name: 'Tilgangsstyring' })).toBeFocused()
    await admin.reload()
    await admin.getByRole('button', { name: 'Prøv opprettingen igjen' }).click()
    await expect(admin.getByRole('status')).toContainText('Invitasjonen er sendt til kandidat-1@pilot.test')
    await expect(admin.getByRole('link', { name: 'Invitasjonslenke' })).toHaveCount(1)
    const invite = await admin.getByRole('link', { name: 'Invitasjonslenke' }).getAttribute('href')
    expect(invite).toMatch(new RegExp(`^${origin}/testkjoring/\\?lop=[a-f0-9-]+$`))
    expect(store.database.prepare("SELECT count(*) AS total FROM pilot_mailbox WHERE kind = 'invitation'").get()?.total).toBe(1)

    await admin.getByRole('link', { name: 'Invitasjonslenke' }).click()
    await expect(admin.getByRole('alert')).toHaveText(unassigned)
    await admin.getByRole('link', { name: 'Til testkjøringsoversikten' }).click()

    await Promise.all([candidate.goto(invite!), other.goto(invite!), instructor.goto(invite!)])
    await Promise.all([signIn(store, candidate, 'kandidat-1@pilot.test', true),
      signIn(store, other, 'kandidat-2@pilot.test'), signIn(store, instructor, 'instruktor-bergen@pilot.test')])
    await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await expect(candidate.getByText('Testbuss 7')).toBeVisible()
    await expect(other.getByRole('alert')).toHaveText(unassigned)
    await expect(instructor.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await candidate.getByText('Evalueringskriterier', { exact: true }).click()
    await instructor.getByText('Evalueringskriterier', { exact: true }).click()
    await expect(candidate.locator('.test-drive-criteria li')).toHaveCount(22)
    expect(await instructor.locator('.test-drive-criteria li').allTextContents()).toEqual(await candidate.locator('.test-drive-criteria li').allTextContents())
    await candidate.addStyleTag({ content: ':root { font-size: 200%; }' })
    expect(await candidate.evaluate(() => document.documentElement.scrollWidth)).toBe(320)

    await candidate.getByRole('link', { name: 'Til testkjøringsoversikten' }).click()
    await expect(candidate.getByRole('heading', { name: 'Mine testkjøringer' })).toBeVisible()
    await expect(candidate.getByText(/^Løpsreferanse /)).toBeVisible()
    await candidate.getByRole('link', { name: /Nora Eksempel/ }).click()
    await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await admin.getByRole('button', { name: 'Trekk tilbake tilgang' }).click()
    await admin.getByRole('button', { name: 'Bekreft tilbakekall' }).click()
    await expect(admin.getByText('Trukket tilbake', { exact: true })).toBeVisible()
    let release: () => void = () => {}
    const pausedResponse = new Promise<void>(resolve => { release = resolve })
    await candidate.route('**/api/testkjoring/runs/*', async route => {
      await pausedResponse
      await route.continue()
    }, { times: 1 })
    try {
      await candidate.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
      await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toHaveCount(0)
      await candidate.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
      await expect(candidate.getByText('Åpner testkjøringen …')).toBeVisible()
      await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toHaveCount(0)
    } finally { release() }
    await expect(candidate.getByRole('alert')).toHaveText(unassigned)
    await expect(candidate.getByRole('button', { name: 'Logg ut' })).toBeVisible()
    await instructor.reload()
    await expect(instructor.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await instructor.getByRole('link', { name: 'Til testkjøringsoversikten' }).click()
    await expect(instructor.getByRole('link', { name: /Nora Eksempel/ })).toHaveCount(1)

    const now = Date.now()
    const shortRun = store.createRun({ id: 'admin-bergen', name: 'Siri Eksempel', email: 'opplaering-bergen@pilot.test' }, {
      requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail: 'kandidat-1@pilot.test',
      instructorId: 'instructor-bergen', expiresAt: new Date(now + 60_000).toISOString(), header: {},
    }, now, origin).run
    await candidate.clock.install()
    await candidate.goto(shortRun.invitationUrl)
    await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await candidate.clock.fastForward(60_000)
    await expect(candidate.getByRole('alert')).toHaveText(unassigned)
    await instructor.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(instructor.getByRole('link', { name: /Nora Eksempel/ })).toHaveCount(2)
    await expect(instructor.getByText(`Løpsreferanse ${shortRun.id}`)).toBeVisible()
  } finally {
    await Promise.all([adminContext.close(), candidateContext.close(), otherContext.close(), instructorContext.close()])
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    store.database.close()
  }
})

test('kandidaten beholder ulagrede valg og leverer to separate vurderinger fra mobilvisningen', async ({ browser }, info) => {
  test.setTimeout(60_000)
  const store = new TestDriveStore(info.outputPath('kandidatvurdering.sqlite'))
  seedPilot(store)
  const server = startPilotServer(store, { host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fant ikke adressen til pilotserveren.')
  const origin = `http://127.0.0.1:${address.port}`
  const now = Date.now()
  const candidateEmail = 'kandidat-1@pilot.test'
  const run = store.createRun({ id: 'admin-bergen', name: 'Siri Eksempel', email: 'opplaering-bergen@pilot.test' }, {
    requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail,
    instructorId: 'instructor-bergen', expiresAt: new Date(now + 60 * 60_000).toISOString(), header: {},
  }, now, origin).run
  const settings = { hasTouch: true, viewport: { width: 320, height: 740 }, locale: 'nb-NO', timezoneId: 'Europe/Oslo' }
  const contexts = await Promise.all([browser.newContext(settings), browser.newContext(settings), browser.newContext(settings)])
  const [candidate, secondClient, instructor] = await Promise.all(contexts.map(context => context.newPage()))
  const before = candidate.getByRole('region', { name: 'Førvurdering', exact: true })
  const after = candidate.getByRole('region', { name: 'Ettervurdering', exact: true })
  const secondBefore = secondClient.getByRole('region', { name: 'Førvurdering', exact: true })
  const detailUrl = `${origin}/api/testkjoring/runs/${run.id}`
  const workspaceUrl = `${origin}/api/testkjoring/workspace`
  const saveUrl = `${detailUrl}/candidate/before/save`
  const afterSaveUrl = `${detailUrl}/candidate/after/save`
  const afterSubmitUrl = `${detailUrl}/candidate/after/submit`

  async function recheck(page: Page) {
    await Promise.all([
      page.waitForResponse(detailUrl), page.evaluate(() => window.dispatchEvent(new Event('focus'))),
    ])
  }

  async function holdReply(page: Page, url: string, abort = false) {
    const ready = Promise.withResolvers<APIResponse>()
    const gate = Promise.withResolvers<void>()
    await page.route(url, async route => {
      const response = await route.fetch()
      ready.resolve(response)
      await gate.promise
      if (abort) await route.abort()
      else await route.fulfill({ response })
    }, { times: 1 })
    return { response: ready.promise, release: gate.resolve }
  }

  try {
    await Promise.all([candidate.goto(run.invitationUrl), instructor.goto(run.invitationUrl)])
    await Promise.all([signIn(store, candidate, candidateEmail), signIn(store, instructor, 'instruktor-bergen@pilot.test')])
    await expect(after.getByRole('status')).toHaveText('Åpnes når instruktøren bekrefter at kjøringen er gjennomført.')
    await expect(instructor.getByRole('button', { name: 'Bekreft gjennomført kjøring' })).toHaveCount(0)
    await expect(instructor.getByRole('radio')).toHaveCount(0)
    await expect(before.getByRole('group')).toHaveCount(22)
    await expect(before.getByRole('radio', { name: 'OK', exact: true })).toHaveCount(22)
    await expect(before.getByRole('radio', { name: 'Kan bli bedre' })).toHaveCount(22)
    const punctuality = before.getByRole('group', { name: 'Punktlighet' })
    const improvePunctuality = punctuality.getByRole('radio', { name: 'Kan bli bedre' })
    await punctuality.getByRole('radio', { name: 'OK', exact: true }).focus()
    await candidate.keyboard.press('ArrowRight')
    await expect(improvePunctuality).toBeChecked()
    const magnification = await candidate.addStyleTag({ content: ':root { font-size: 200%; }' })
    expect(await candidate.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    await magnification.evaluate(node => node.remove())

    await before.getByRole('button', { name: 'Lever førvurdering' }).click()
    await expect(before.getByRole('alert')).toHaveText('Svar på alle kriteriene før du leverer.')
    await expect(before.getByRole('alert')).toBeInViewport()
    const save = before.getByRole('button', { name: 'Lagre førvurdering' })
    const submit = before.getByRole('button', { name: 'Lever førvurdering' })
    let intercepted = ''
    await candidate.route(saveUrl, async route => {
      intercepted = route.request().postData() ?? ''
      const response = await route.fetch()
      expect(response.status()).toBe(200)
      await route.abort()
    }, { times: 1 })
    await save.click()
    await expect(before.getByRole('alert')).toContainText('Kunne ikke lagre førvurderingen.')
    await expect(before.getByRole('alert')).toContainText('Prøv å lagre igjen før du leverer.')
    await expect(before.getByRole('alert')).toBeInViewport()
    await expect(submit).toBeDisabled()
    await expect(before.getByRole('status')).toContainText('Ulagrede svar')
    await expect(improvePunctuality).toBeChecked()
    const retry = candidate.waitForRequest(saveUrl)
    await save.click()
    expect((await retry).postData()).toBe(intercepted)
    await expect(before.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1')
    await expect(submit).toBeEnabled()
    const draftOnly = before.getByRole('group', { name: 'Stress/nervøsitet' }).getByRole('radio', { name: 'Kan bli bedre' })
    await draftOnly.check()
    await candidate.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect(before.getByRole('radio')).toHaveCount(0)
    await candidate.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await expect(before.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1')
    await expect(improvePunctuality).toBeChecked()
    await expect(draftOnly).not.toBeChecked()

    await secondClient.goto(run.invitationUrl)
    await signIn(store, secondClient, candidateEmail)
    await expect(secondBefore.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1')
    await expect(secondBefore.getByRole('group', { name: 'Punktlighet' }).getByRole('radio', { name: 'Kan bli bedre' })).toBeChecked()
    const checked = before.getByRole('group', { name: 'Personlig fremtreden/hygiene' }).getByRole('radio', { name: 'OK', exact: true })
    await checked.check()
    const waitingSave = await holdReply(candidate, saveUrl, true)
    try {
      await save.click()
      expect((await waitingSave.response).status()).toBe(200)
      await recheck(candidate)
      await expect(before.getByRole('status')).toHaveText('Lagret utkast · Revisjon 2')
      const failed = candidate.waitForEvent('requestfailed', { predicate: request => request.url() === saveUrl })
      waitingSave.release()
      await failed
      await expect(submit).toBeEnabled()
      await expect(before.getByRole('alert')).toHaveCount(0)
    } finally { waitingSave.release() }
    await recheck(secondClient)
    await expect(secondBefore.getByRole('status')).toHaveText('Lagret utkast · Revisjon 2')

    const unsaved = before.getByRole('group', { name: 'Stress/nervøsitet' }).getByRole('radio', { name: 'Kan bli bedre' })
    await unsaved.check()
    await candidate.route(detailUrl, route => route.abort(), { times: 1 })
    await Promise.all([
      candidate.waitForEvent('requestfailed', { predicate: request => request.url() === detailUrl }),
      candidate.evaluate(() => window.dispatchEvent(new Event('focus'))),
    ])
    await expect(candidate.getByRole('alert')).toContainText('Kunne ikke oppdatere testkjøringen.')
    await expect(unsaved).toBeChecked()
    await recheck(candidate)
    await expect(candidate.getByRole('alert')).toHaveCount(0)
    await expect(unsaved).toBeChecked()
    await candidate.route(workspaceUrl, route => route.abort(), { times: 1 })
    await Promise.all([
      candidate.waitForEvent('requestfailed', { predicate: request => request.url() === workspaceUrl }),
      recheck(candidate),
    ])
    await expect(candidate.getByRole('alert')).toHaveCount(0)
    await expect(unsaved).toBeChecked()
    await secondBefore.getByRole('group', { name: 'Selvinnsikt' }).getByRole('radio', { name: 'OK', exact: true }).check()
    await secondBefore.getByRole('button', { name: 'Lagre førvurdering' }).click()
    await expect(secondBefore.getByRole('status')).toHaveText('Lagret utkast · Revisjon 3')
    await save.click()
    await expect(before.getByRole('alert')).toContainText('En nyere revisjon er lagret på en annen klient.')
    await expect(before.getByRole('status')).toHaveText('Lagret utkast · Revisjon 3 · Ulagrede svar')
    await expect(unsaved).toBeChecked()
    await before.getByRole('button', { name: 'Bruk lagrede svar' }).click()
    await expect(unsaved).not.toBeChecked()
    await expect(before.getByRole('group', { name: 'Selvinnsikt' }).getByRole('radio', { name: 'OK', exact: true })).toBeChecked()

    for (const radio of await before.getByRole('radio', { name: 'OK', exact: true }).all()) await radio.check()
    const olderDetail = await holdReply(candidate, detailUrl)
    try {
      const started = candidate.waitForRequest(detailUrl)
      await candidate.evaluate(() => window.dispatchEvent(new Event('focus')))
      const olderRequest = await started
      const captured = await (await olderDetail.response).json()
      expect(captured.phase).toBe('before')
      expect(captured.candidateAssessments.before.revision).toBe(3)
      await submit.click()
      await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 4')
      const delivered = candidate.waitForEvent('requestfinished', { predicate: request => request === olderRequest })
      olderDetail.release()
      await delivered
      await candidate.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 4')
    } finally { olderDetail.release() }
    await expect(before.getByRole('heading', { name: 'Førvurdering' })).toBeFocused()
    await expect(before.getByRole('radio')).toHaveCount(0)
    await expect(after.getByRole('radio')).toHaveCount(0)

    await instructor.getByRole('button', { name: 'Oppdater status' }).click()
    await expect(instructor.getByText('Levert og låst · Revisjon 4')).toBeVisible()
    const candidateProgress = instructor.getByRole('region', { name: 'Kandidatens vurderinger' })
    await expect(candidateProgress.getByText('OK', { exact: true })).toHaveCount(0)
    const completeDriving = instructor.getByRole('button', { name: 'Bekreft gjennomført kjøring' })
    await instructor.evaluate(() => {
      const timeout = AbortSignal.timeout.bind(AbortSignal)
      AbortSignal.timeout = milliseconds => {
        AbortSignal.timeout = timeout
        return timeout(Math.min(milliseconds, 400))
      }
    })
    const pausedConfirmation = await holdReply(instructor, `${detailUrl}/complete-driving`)
    try {
      await completeDriving.click()
      expect((await pausedConfirmation.response).status()).toBe(200)
      await expect(instructor.getByRole('alert')).toContainText('Ventetiden utløp.')
      await expect(completeDriving).toBeEnabled()
    } finally { pausedConfirmation.release() }
    await completeDriving.click()
    await expect(candidateProgress.getByRole('status')).toHaveText('Kjøringen er bekreftet gjennomført. Ettervurderingen er åpnet.')
    await after.getByRole('button', { name: 'Oppdater status' }).click()
    await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 4')
    await expect(after.getByRole('status')).toHaveText('Ingen svar lagret')
    await expect(after.locator('input:checked')).toHaveCount(0)
    await before.getByText('Se svar i førvurderingen').click()
    await expect(before.getByText('OK', { exact: true })).toHaveCount(22)

    for (const radio of await after.getByRole('radio', { name: 'Kan bli bedre' }).all()) await radio.check()
    await candidate.route(afterSaveUrl, async route => {
      expect((await route.fetch()).status()).toBe(200)
      await route.abort()
    }, { times: 1 })
    const saveAfter = after.getByRole('button', { name: 'Lagre ettervurdering' })
    await saveAfter.click()
    await expect(after.getByRole('alert')).toContainText('Kunne ikke lagre ettervurderingen.')
    await recheck(secondClient)
    const secondAfter = secondClient.getByRole('region', { name: 'Ettervurdering', exact: true })
    await expect(secondAfter.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1')
    await secondAfter.getByRole('group', { name: 'Punktlighet' }).getByRole('radio', { name: 'OK', exact: true }).check()
    const closedByOther = secondClient.waitForResponse(afterSubmitUrl)
    await secondAfter.getByRole('button', { name: 'Lever ettervurdering' }).click()
    expect((await closedByOther).status()).toBe(200)
    await expect(secondAfter.getByRole('heading', { name: 'Ettervurdering' })).toBeFocused()
    await saveAfter.click()
    await expect(after.getByRole('status')).toHaveText('Levert og låst · Revisjon 2 · Ulagrede svar')
    await expect(after.getByRole('alert')).toHaveCount(0)
    await expect(after.getByRole('heading', { name: 'Ulagrede svar' })).toBeVisible()
    const lockedAnswers = after.locator('details')
    await after.getByText('Se svar i ettervurderingen').click()
    await expect(lockedAnswers.getByText('OK', { exact: true })).toBeVisible()
    await expect(lockedAnswers.getByText('Kan bli bedre', { exact: true })).toHaveCount(21)
    await expect(after.locator('dl').last()).toHaveText('PunktlighetKan bli bedre')
    await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 4')

    const creator = { id: 'admin-bergen', name: 'Siri Eksempel', email: 'opplaering-bergen@pilot.test' }
    const revoked = store.createRun(creator, {
      requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail,
      instructorId: 'instructor-bergen', expiresAt: run.expiresAt, header: {},
    }, Date.now(), origin).run
    await candidate.goto(revoked.invitationUrl)
    await before.getByRole('group', { name: 'Punktlighet' }).getByRole('radio', { name: 'Kan bli bedre' }).check()
    const revokedDetailUrl = `${origin}/api/testkjoring/runs/${revoked.id}`
    await candidate.route(revokedDetailUrl, route => route.abort())
    store.revokeCandidate(creator, revoked.id, Date.now(), origin)
    const deniedWrite = candidate.waitForResponse(`${revokedDetailUrl}/candidate/before/save`)
    await save.click()
    expect((await deniedWrite).status()).toBe(404)
    await expect(candidate.getByRole('alert')).toHaveText('Testkjøringen er ikke tilgjengelig for denne innloggingen.')
    await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toHaveCount(0)
    await expect(save).toHaveCount(0)
  } finally {
    await Promise.all(contexts.map(context => context.close()))
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    store.database.close()
  }
})

test('instruktøren kan lagre og levere skjermet på mobil med gjenoppretting etter tapt kvittering', async ({ browser }, info) => {
  test.setTimeout(60_000)
  const store = new TestDriveStore(info.outputPath('instruktorvurdering.sqlite'))
  seedPilot(store)
  const server = startPilotServer(store, { host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fant ikke adressen til pilotserveren.')
  const origin = `http://127.0.0.1:${address.port}`
  const now = Date.now()
  const candidateEmail = 'kandidat-1@pilot.test'
  const run = store.createRun({ id: 'admin-bergen', name: 'Siri Eksempel', email: 'opplaering-bergen@pilot.test' }, {
    requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail,
    instructorId: 'instructor-bergen', expiresAt: new Date(now + 60 * 60_000).toISOString(), header: {},
  }, now, origin).run
  const settings = { hasTouch: true, viewport: { width: 320, height: 740 }, locale: 'nb-NO', timezoneId: 'Europe/Oslo' }
  const contexts = await Promise.all([browser.newContext(settings), browser.newContext(settings), browser.newContext(settings)])
  const [candidate, instructor, secondInstructor] = await Promise.all(contexts.map(context => context.newPage()))
  const before = candidate.getByRole('region', { name: 'Førvurdering', exact: true })
  const assessment = instructor.getByRole('region', { name: 'Instruktørvurdering', exact: true })
  const comment = assessment.getByRole('textbox', { name: 'Kommentar til Punktlighet' })
  const overall = assessment.getByRole('textbox', { name: 'Samlet kommentar' })
  const save = assessment.getByRole('button', { name: 'Lagre instruktørvurdering' })
  const submit = assessment.getByRole('button', { name: 'Lever instruktørvurdering' })
  const detailUrl = `${origin}/api/testkjoring/runs/${run.id}`
  const saveUrl = `${detailUrl}/instructor/save`
  const submitUrl = `${detailUrl}/instructor/submit`
  const secret = 'Skjermet testmerke «Øvelse»'
  const commentText = `${secret}\nSjekk speil og høyre side.`
  const overallText = 'Helhetsobservasjon: gjennomgå «sving» og fartsvalg.\nØv på myk bremsing.'

  function refresh(page: Page) {
    return Promise.all([page.waitForResponse(detailUrl), page.evaluate(() => window.dispatchEvent(new Event('focus')))])
  }

  async function expectShielded(reload = false) {
    const [response] = reload
      ? await Promise.all([candidate.waitForResponse(detailUrl), candidate.reload()])
      : await refresh(candidate)
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).not.toContain(secret)
    expect(body).not.toMatch(/instructorAssessment|instructorChoices|resultChoices|overallComment/)
    await expect(candidate.getByRole('heading', { name: 'Nora Eksempel' })).toBeVisible()
    await expect(candidate.getByRole('region', { name: 'Instruktørvurdering' })).toHaveCount(0)
    await expect(candidate.locator('body')).not.toContainText(secret)
  }

  try {
    await Promise.all([candidate.goto(run.invitationUrl), instructor.goto(run.invitationUrl)])
    await Promise.all([signIn(store, candidate, candidateEmail), signIn(store, instructor, 'instruktor-bergen@pilot.test')])
    await expect(assessment.getByRole('status')).toHaveText('Åpnes når kandidaten har levert førvurderingen.')
    for (const radio of await before.getByRole('radio', { name: 'OK', exact: true }).all()) await radio.check()
    await before.getByRole('button', { name: 'Lever førvurdering' }).click()
    await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 1')
    await instructor.getByRole('button', { name: 'Oppdater status' }).click()
    await expect(assessment.getByRole('radio', { name: 'OK', exact: true })).toHaveCount(22)
    await expect(assessment.getByRole('radio', { name: 'Kan bli bedre' })).toHaveCount(22)
    await expect(assessment.getByRole('radio', { name: 'Ikke bestått' })).toHaveCount(22)
    await expect(comment).toHaveAttribute('maxlength', '1000')
    await expect(overall).toHaveAttribute('maxlength', '12000')
    await expect(comment).toHaveAccessibleDescription('Inntil 1000 tegn')
    await expect(overall).toHaveAccessibleDescription('Inntil 12000 tegn')
    const magnification = await instructor.addStyleTag({ content: ':root { font-size: 200%; }' })
    expect(await instructor.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    await magnification.evaluate(node => node.remove())

    await submit.click()
    await expect(assessment.getByRole('alert')).toHaveText('Svar på alle kriteriene før du leverer.')
    await expect(assessment.getByRole('alert')).toBeFocused()
    await comment.fill(commentText)
    let interrupted = ''
    await instructor.route(saveUrl, async route => {
      interrupted = route.request().postData() ?? ''
      expect((await route.fetch()).status()).toBe(200)
      await route.abort()
    }, { times: 1 })
    await save.click()
    await expect(assessment.getByRole('alert')).toContainText('Prøv å lagre igjen før du leverer.')
    await expect(comment).toHaveValue(commentText)
    await expect(submit).toBeDisabled()
    await overall.fill(overallText)
    const retrySave = instructor.waitForRequest(saveUrl)
    await save.click()
    expect((await retrySave).postData()).toBe(interrupted)
    await expect(assessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1 · Ulagret vurdering')
    await expect(overall).toHaveValue(overallText)
    await expectShielded()

    await instructor.route(detailUrl, route => route.abort(), { times: 1 })
    await Promise.all([
      instructor.waitForEvent('requestfailed', { predicate: request => request.url() === detailUrl }),
      instructor.evaluate(() => window.dispatchEvent(new Event('focus'))),
    ])
    await expect(overall).toHaveValue(overallText)
    await expect(assessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 1 · Ulagret vurdering')
    const older = Promise.withResolvers<APIResponse>()
    const release = Promise.withResolvers<void>()
    await instructor.route(detailUrl, async route => {
      const response = await route.fetch()
      older.resolve(response)
      await release.promise
      await route.fulfill({ response })
    }, { times: 1 })
    try {
      const waiting = refresh(instructor)
      expect((await (await older.promise).json()).instructorAssessment.revision).toBe(1)
      await save.click()
      await expect(assessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 2')
      release.resolve()
      await waiting
      await instructor.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(assessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 2')
      await expect(overall).toHaveValue(overallText)
    } finally { release.resolve() }

    const secondAssessment = secondInstructor.getByRole('region', { name: 'Instruktørvurdering', exact: true })
    const secondComment = secondAssessment.getByRole('textbox', { name: 'Kommentar til Punktlighet' })
    const secondOverall = secondAssessment.getByRole('textbox', { name: 'Samlet kommentar' })
    await secondInstructor.goto(run.invitationUrl)
    await signIn(store, secondInstructor, 'instruktor-bergen@pilot.test')
    await expect(secondAssessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 2')
    await overall.fill('Min nye vurdering')
    await secondOverall.fill('Lagret på en annen klient')
    await secondAssessment.getByRole('button', { name: 'Lagre instruktørvurdering' }).click()
    await expect(secondAssessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 3')
    await refresh(instructor)
    await expect(assessment.getByRole('status')).toHaveText('Lagret utkast · Revisjon 3 · Ulagret vurdering')
    await expect(overall).toHaveValue('Min nye vurdering')
    await expect(save).toBeDisabled()
    await expect(submit).toBeDisabled()
    await assessment.getByRole('button', { name: 'Bruk lagret vurdering' }).click()
    await expect(overall).toHaveValue('Lagret på en annen klient')
    await overall.fill(overallText)
    await secondComment.fill('')

    await instructor.getByRole('button', { name: 'Bekreft gjennomført kjøring' }).click()
    await expect(instructor.getByText('Kjøringen er bekreftet gjennomført. Ettervurderingen er åpnet.')).toBeVisible()
    for (const radio of await assessment.getByRole('radio', { name: 'OK', exact: true }).all()) await radio.check()
    await assessment.getByRole('group', { name: 'Punktlighet' }).getByRole('radio', { name: 'Ikke bestått' }).check()
    await expect(assessment.getByRole('group', { name: 'Samlet resultat' }).locator('input:checked')).toHaveCount(0)
    await submit.click()
    await expect(assessment.getByRole('alert')).toHaveText('Velg et samlet resultat før du leverer.')
    await expect(assessment.getByRole('alert')).toBeFocused()
    await assessment.getByRole('radio', { name: 'Med forbehold' }).check()
    await instructor.route(submitUrl, async route => {
      interrupted = route.request().postData() ?? ''
      expect((await route.fetch()).status()).toBe(200)
      await route.abort()
    }, { times: 1 })
    await submit.click()
    await expect(assessment.getByRole('alert')).toContainText('Kunne ikke levere instruktørvurderingen.')
    await expect(overall).toHaveValue(overallText)
    const retrySubmit = instructor.waitForRequest(submitUrl)
    await submit.click()
    expect((await retrySubmit).postData()).toBe(interrupted)
    await expect(assessment.getByRole('status')).toHaveText('Levert og låst · Revisjon 4')
    await expect(assessment.getByRole('heading', { name: 'Instruktørvurdering' })).toBeFocused()
    await expect(assessment.getByRole('textbox')).toHaveCount(0)
    await assessment.getByText('Se instruktørvurderingen').click()
    await expect(assessment.getByText('Med forbehold')).toBeVisible()
    await expect(assessment.getByText(secret, { exact: false })).toBeVisible()
    await expect(assessment.locator('dd').filter({ hasText: /^Ikke bestått$/ })).toBeVisible()
    await expect(assessment.getByText(overallText, { exact: true })).toHaveText(overallText, { useInnerText: true })
    await refresh(secondInstructor)
    await expect(secondAssessment.getByRole('status')).toHaveText('Levert og låst · Revisjon 4 · Ulagret vurdering')
    await expect(secondAssessment.getByText('Tom kommentar', { exact: true })).toBeVisible()
    await expectShielded(true)
    await expect(before.getByRole('status')).toHaveText('Levert og låst · Revisjon 1')
  } finally {
    await Promise.all(contexts.map(context => context.close()))
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    store.database.close()
  }
})

test('samme nettleserprofil fjerner skjermet instruktørvisning ved bytte av innlogging', async ({ browser }, info) => {
  const store = new TestDriveStore(info.outputPath('sesjonsbytte.sqlite'))
  seedPilot(store)
  const server = startPilotServer(store, { host: '127.0.0.1', port: 0 })
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fant ikke adressen til pilotserveren.')
  const origin = `http://127.0.0.1:${address.port}`
  const now = Date.now()
  const candidateEmail = 'kandidat-1@pilot.test'
  const instructorEmail = 'instruktor-bergen@pilot.test'
  const run = store.createRun({ id: 'admin-bergen', name: 'Siri Eksempel', email: 'opplaering-bergen@pilot.test' }, {
    requestId: randomUUID(), departmentId: 'bergen', candidateName: 'Nora Eksempel', candidateEmail,
    instructorId: 'instructor-bergen', expiresAt: new Date(now + 60 * 60_000).toISOString(), header: {},
  }, now, origin).run
  const secret = 'Skjermet tekst i den første fanen'
  const answers = Object.fromEntries(testDriveV1.criteria.map(({ id }) => [id, 'ok']))
  store.withAssignment(run.candidate.id, run.id, now, assignment =>
    store.writeCandidateAssessment(assignment, 'before', 'submit', { requestId: randomUUID(), revision: 0, answers }, now), 'candidate')
  store.withAssignment(run.instructor.id, run.id, now, assignment =>
    store.writeInstructorAssessment(assignment, 'save', {
      requestId: randomUUID(), revision: 0, answers: {}, comments: {}, overallComment: secret, result: null,
    }, now), 'instructor')
  const context = await browser.newContext()
  const [firstTab, secondTab] = await Promise.all([context.newPage(), context.newPage()])
  const detailUrl = `${origin}/api/testkjoring/runs/${run.id}`
  const workspaceUrl = `${origin}/api/testkjoring/workspace`
  const assessment = firstTab.getByRole('region', { name: 'Instruktørvurdering', exact: true })
  const delayed = Promise.withResolvers<APIResponse>()
  const release = Promise.withResolvers<void>()
  const completed = Promise.withResolvers<void>()
  try {
    await firstTab.goto(run.invitationUrl)
    await signIn(store, firstTab, instructorEmail)
    await expect(assessment.getByRole('textbox', { name: 'Samlet kommentar' })).toHaveValue(secret)
    await secondTab.goto(run.invitationUrl)
    await expect(secondTab.locator('header')).toContainText(instructorEmail)
    await firstTab.route(detailUrl, async route => {
      const response = await route.fetch()
      delayed.resolve(response)
      await release.promise
      try { await route.fulfill({ response }) }
      catch (error) { if (!route.request().failure()) throw error }
      finally { completed.resolve() }
    }, { times: 1 })
    await firstTab.evaluate(() => window.dispatchEvent(new Event('focus')))
    expect((await (await delayed.promise).json()).instructorAssessment.overallComment).toBe(secret)

    await firstTab.route(workspaceUrl, route => route.abort())
    await secondTab.getByRole('button', { name: 'Logg ut' }).click()
    await expect(secondTab.getByRole('heading', { name: 'Logg inn til testkjøring' })).toBeVisible()
    await expect(assessment).toHaveCount(0)
    await expect(firstTab.locator('header')).not.toContainText(instructorEmail)
    await firstTab.unroute(workspaceUrl)
    await signIn(store, secondTab, candidateEmail)
    await expect(firstTab.locator('header')).toContainText(candidateEmail)
    await expect(firstTab.getByRole('region', { name: 'Førvurdering', exact: true })).toBeVisible()

    release.resolve()
    await completed.promise
    await firstTab.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(assessment).toHaveCount(0)
    await expect(firstTab.locator('body')).not.toContainText(secret)
    await expect(firstTab.getByRole('textbox', { name: 'Samlet kommentar' })).toHaveCount(0)
  } finally {
    release.resolve()
    await context.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    store.database.close()
  }
})
