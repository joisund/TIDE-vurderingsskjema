import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { seedPilot } from '../../server/pilot-accounts.ts'
import { startPilotServer } from '../../server/pilot-server.ts'
import { TestDriveStore } from '../../server/test-drive-store.ts'

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

  async function signIn(page: Page, email: string, checkThrottle = false) {
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

  const unassigned = 'Testkjøringen er ikke tilgjengelig for denne innloggingen.'
  try {
    await admin.goto(origin)
    await admin.getByRole('link', { name: 'Testkjøring', exact: true }).click()
    await expect(admin.getByRole('heading', { name: 'Logg inn til testkjøring' })).toBeVisible()
    await expect(admin.getByLabel('Simuleringsrolle')).toHaveCount(0)
    await signIn(admin, 'opplaering-bergen@pilot.test')
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
    await Promise.all([signIn(candidate, 'kandidat-1@pilot.test', true), signIn(other, 'kandidat-2@pilot.test'), signIn(instructor, 'instruktor-bergen@pilot.test')])
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
