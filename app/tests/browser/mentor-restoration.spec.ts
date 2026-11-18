import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

function retainedPageEvent(page: Page, type: 'pagehide' | 'pageshow') {
  return page.evaluate(eventType => window.dispatchEvent(new PageTransitionEvent(eventType, { persisted: true })), type)
}

async function openMentor(page: Page) {
  await page.goto('/')
  const create = page.getByRole('button', { name: 'Opprett løp', exact: true })
  await create.click()
  await page.getByLabel('Sjåførnavn').fill('Sjåfør Eksempel')
  await page.getByLabel('Ansattnummer').fill('DEMO-151')
  await page.getByLabel('Faddernavn').fill('Fadder Eksempel')
  await page.getByLabel('Første dato').fill('2026-11-23')
  await create.click()
  await page.getByRole('button', { name: 'Åpne dagens faddervurdering' }).click()
  await page.getByRole('button', { name: /^Kommentar til / }).first().click()
  return page.getByRole('textbox', { name: /^Fadders kommentar/ }).first()
}

async function switchAnotherTabToDriver(page: Page) {
  const other = await page.context().newPage()
  await other.goto('/')
  await other.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(other.getByRole('button', { name: 'Åpne dagens faddervurdering' })).toHaveCount(0)
  await other.close()
}

test('gjenopprettet faddervisning skjules frem til aktiv rolle kan kontrolleres', async ({ page }) => {
  await page.addInitScript(() => {
    const transaction = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readonly' && Reflect.get(window, 'testBlockRoleRead')) throw new DOMException('Prøvefeil')
      return transaction.call(this, stores, mode, options)
    }
  })

  const comment = await openMentor(page)
  await comment.fill('Testkommentar som skal skjermes')
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Ikke relevant ·/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await retainedPageEvent(page, 'pagehide')
  await expect(dialog).toBeHidden()
  await switchAnotherTabToDriver(page)
  await page.evaluate(() => Reflect.set(window, 'testBlockRoleRead', true))
  await retainedPageEvent(page, 'pageshow')
  await expect(page.getByRole('alert')).toContainText('Aktiv rolle kunne ikke kontrolleres.')
  await expect(dialog).toBeHidden()
  await expect(comment).toBeHidden()

  await page.evaluate(() => Reflect.set(window, 'testBlockRoleRead', false))
  await page.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(page.locator('.mentor-row-details')).toHaveCount(0)
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('ved rollekonflikt beholder den gjenopprettede fanen ulagret fadderutkast skjult', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs' && Reflect.get(window, 'testAbortMentorSave')) {
        this.transaction.abort()
        throw new DOMException('Prøvefeil')
      }
      return put.call(this, value, key)
    }
  })

  const comment = await openMentor(page)
  await page.evaluate(() => Reflect.set(window, 'testAbortMentorSave', true))
  await comment.fill('Fiktivt fadderutkast med skrivefeil')
  await expect(page.getByText('Ulagrede endringer', { exact: true })).toBeVisible()

  await retainedPageEvent(page, 'pagehide')
  await switchAnotherTabToDriver(page)
  await retainedPageEvent(page, 'pageshow')
  const recover = page.getByRole('button', { name: 'Gjenoppta som fadder', exact: true })
  await expect(recover).toBeVisible()
  await expect(comment).toBeHidden()

  await page.evaluate(() => Reflect.set(window, 'testAbortMentorSave', false))
  await recover.click()
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('fadder')
  await expect(comment).toHaveValue('Fiktivt fadderutkast med skrivefeil')
  await page.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  await expect(page.getByText('Lagret på denne enheten', { exact: true })).toBeVisible()
})
