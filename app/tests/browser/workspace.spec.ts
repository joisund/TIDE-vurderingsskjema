import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdtempDisposableSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = 'http://127.0.0.1:4173'
const input = { name: 'Nora Eksempel', employee: 'DEMO-101', mentor: 'Emil Eksempel', date: '2027-03-28' }

async function openForm(page: Page) {
  const button = page.getByRole('button', { name: 'Opprett løp' })
  await expect(button).toBeVisible()
  await button.click()
  await expect(page.getByRole('heading', { name: 'Opprett løp' })).toBeVisible()
}

async function fillForm(page: Page, data = input, plan = '3') {
  await page.getByLabel('Sjåførnavn').fill(data.name)
  await page.getByLabel('Ansattnummer').fill(data.employee)
  await page.getByLabel('Faddernavn').fill(data.mentor)
  await page.getByLabel('Første dato').fill(data.date)
  await page.getByLabel('Startplan').selectOption(plan)
}

async function save(page: Page) {
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
}

test('norsk startflate, lokale ressurser og oppretting i lastet app ved nettbrudd', async ({ page, context }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', { value: {
      persisted: async () => false,
      persist: async () => {
        Reflect.set(window, 'persistWasCalled', true)
        return false
      },
    } })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb')
  await expect(page.getByRole('heading', { name: 'Løpsoversikt' })).toBeVisible()
  await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Tide' })).toBeVisible()
  await expect.poll(() => page.getByRole('img', { name: 'Tide' }).evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('fadder')
  await expect(page.getByText('Nettleseren har ikke gitt varig lagring.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'persistWasCalled'))).toBe(true)
  expect(requests.every(url => new URL(url).origin === origin)).toBe(true)
  expect(page.context().serviceWorkers()).toHaveLength(0)
  await context.setOffline(true)
  await openForm(page)
  await expect(page.getByLabel('Startplan')).toHaveValue('3')
  await fillForm(page)
  await save(page)
  await expect(page.getByText('Ikke bekreftet', { exact: true })).toBeVisible()
  await expect(page.getByText('Dato ikke registrert', { exact: true })).toBeVisible()
})

test('vent på faktisk leseresultat før tomtilstand og registrering', async ({ page }) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open
    IDBFactory.prototype.open = function (name, version) {
      const request = open.call(this, name, version)
      Object.defineProperty(request, 'onsuccess', {
        set(handler: (event: Event) => void) {
          request.addEventListener('success', event => {
            Reflect.set(window, 'releaseDatabase', () => handler.call(request, event))
          })
        },
      })
      return request
    }
  })
  await page.goto('/')
  await expect(page.getByText('Åpner lokalt lager og laster løp …')).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseDatabase'))).toBe('function')
  await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
  await page.evaluate(() => Reflect.get(window, 'releaseDatabase')())
  await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toBeVisible()
})

test('statisk lenke for ny innlasting når appens inngangsmodul feiler', async ({ page }) => {
  await page.route('**/assets/*.js', route => route.abort())
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'last inn siden på nytt' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
})

test('sperrer registrering uten aktivt stilark og åpner etter nytt forsøk', async ({ page }) => {
  await page.route('**/assets/*.css', route => route.fulfill({ contentType: 'text/css', body: '' }), { times: 1 })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Appens ressurser kunne ikke lastes')
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toBeVisible()
  await expect(page.locator('.app-name')).toHaveCSS('font-weight', '650')
})

test('fastlåst logodekoding avsluttes med ressursfeil og nytt forsøk', async ({ page }) => {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode
    let first = true
    HTMLImageElement.prototype.decode = function () {
      if (!first) return decode.call(this)
      first = false
      return new Promise<void>(() => undefined)
    }
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Appens ressurser kunne ikke lastes', { timeout: 7000 })
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toBeVisible()
})

test('mangelliste og tastaturfokus knyttes til felt og beholder innskrevet tekst', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Opprett løp' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Opprett løp' })).toBeFocused()
  await page.getByLabel('Sjåførnavn').fill(input.name)
  await page.getByLabel('Ansattnummer').fill('   ')
  await page.getByLabel('Første dato').fill('2027-02-29')
  await page.getByRole('button', { name: 'Opprett løp' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.error-panel')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skriv inn ansattnummer.' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Ansattnummer')).toBeFocused()
  await expect(page.getByLabel('Ansattnummer')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Ansattnummer')).toHaveAccessibleDescription('Skriv inn ansattnummer.')
  await expect(page.getByLabel('Første dato')).toHaveAccessibleDescription('Bruk formatet ÅÅÅÅ-MM-DD. Oppgi en gyldig første kalenderdato.')
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(input.name)
  await expect(page.getByLabel('Første dato')).toHaveValue('2027-02-29')
  await expect(page.getByText(/buss 2/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Avbryt' }).click()
  await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toBeVisible()
})

test('abort beholder input, ikke tidlig kvittering, dobbeltklikk fullfører bare én gang', async ({ page }) => {
  const diagnostic: unknown[] = []
  page.on('console', async event => {
    if (event.type() === 'warning' && event.args().length === 2 && event.text().startsWith('Tide')) {
      diagnostic.push(await event.args()[1].jsonValue())
    }
  })
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key)
      if (key === 'session' && Reflect.get(window, 'abortNextCreate')) {
        Reflect.set(window, 'abortNextCreate', false)
        request.addEventListener('success', () => {
          Reflect.set(window, 'successBeforeAbort', document.querySelector('.save-status')?.textContent)
          this.transaction.abort()
        })
      }
      return request
    }
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await page.evaluate(() => Reflect.set(window, 'abortNextCreate', true))
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('alert')).toContainText('Lagringen kunne ikke fullføres')
  expect(await page.evaluate(() => Reflect.get(window, 'successBeforeAbort'))).not.toBe('Lagret på denne enheten')
  await expect(page.getByRole('status')).toHaveText('')
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(input.name)
  await expect(page.getByLabel('Første dato')).toHaveValue(input.date)
  await expect.poll(() => diagnostic).toEqual([{ code: 'storage_write', build: expect.stringMatching(/\S/), schema: 1 }])

  const retry = page.getByRole('button', { name: 'Prøv igjen' })
  await retry.evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
  })
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.getByRole('status')).not.toBeFocused()
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('button', { name: /Nora Eksempel/ })).toHaveCount(1)
})

test('lesefeil etter kvittering tillater bare å åpne akkurat det lagrede løpet', async ({ page, context }) => {
  await page.addInitScript(() => {
    const read = IDBObjectStore.prototype.getAll
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'runs' && Reflect.get(window, 'failNextRead')) {
        Reflect.set(window, 'failNextRead', false)
        throw new DOMException('Lesefeil', 'UnknownError')
      }
      return read.apply(this, args)
    }
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await page.evaluate(() => Reflect.set(window, 'failNextRead', true))
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('alert')).toContainText('Løpet er lagret, men kunne ikke åpnes')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)

  const other = await context.newPage()
  await other.goto('/')
  await expect(other.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
  await other.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await openForm(other)
  await fillForm(other, { ...input, name: 'Kim Testfører', employee: 'DEMO-102' })
  await save(other)

  await page.getByRole('button', { name: 'Åpne lagret løp' }).click()
  await expect(page.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('button', { name: /Nora Eksempel/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Kim Testfører/ })).toHaveCount(1)
})

test('rolleendring i en annen fane kan rettes fra skjemaet med bevart input', async ({ page, context }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page, input, '2')
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('button', { name: 'Opprett løp' })).toBeVisible()
  await other.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(other.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('alert')).toContainText('endret i en annen fane')
  await page.getByRole('button', { name: 'Last inn gjeldende tilstand' }).click()
  await expect(page.locator('.profile')).toContainText('Simuleringsrolle · Sjåfør')
  await page.getByRole('button', { name: 'Bytt til Fadder' }).click()
  await expect(page.locator('.profile')).toContainText('Simuleringsrolle · Fadder')
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(input.name)
  await expect(page.getByLabel('Første dato')).toHaveValue(input.date)
  await expect(page.getByLabel('Startplan')).toHaveValue('2')
  await save(page)
  await expect(page.locator('.details > div').filter({ hasText: 'Planlagt siste dag' })).toContainText('Dag 2')
})

test('rollebytte på dagen bevarer valgt løp når en annen fane har valgt et annet', async ({ page, context }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page, input, '1')
  await save(page)

  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await openForm(other)
  await fillForm(other, { ...input, name: 'Kim Testfører', employee: 'DEMO-102' }, '2')
  await save(other)
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(page.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
  await page.reload()
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(page.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
  await expect(page.locator('.details > div').filter({ hasText: 'Planlagt siste dag' })).toContainText('Dag 1')
})

test('to løp holdes atskilt, feil lesing er synlig, valg og rolle gjenåpnes på under fem sekunder', async ({
  playwright, browserName,
}, testInfo) => {
  using folder = mkdtempDisposableSync(join(tmpdir(), 'tide-pw-'))
  const engine = playwright[browserName]
  const options = { baseURL: origin, locale: 'nb-NO', timezoneId: 'Europe/Oslo' }
  let context = await engine.launchPersistentContext(folder.path, options)
  try {
    const page = context.pages()[0]
    await page.goto('/')
    await openForm(page)
    await fillForm(page, input, '1')
    await save(page)
    await expect(page.locator('time')).toHaveCount(2)
    await expect(page.locator('time').first()).toHaveAttribute('datetime', input.date)
    await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
    await openForm(page)
    const other = { name: 'Kim Testfører', employee: 'DEMO-102', mentor: 'Ada Eksempel', date: '2027-10-31' }
    await fillForm(page, other, '2')
    await save(page)
    await expect(page.locator('.profile')).toContainText('Kim Testfører · Dag 1')
    await expect(page.locator('.details > div').filter({ hasText: 'Planlagt siste dag' })).toContainText('Dag 2')
    await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
    await expect(page.getByRole('button', { name: /Nora Eksempel.*DEMO-101.*Pågående/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Kim Testfører.*DEMO-102.*Pågående/ })).toBeVisible()
    await page.getByRole('button', { name: /Nora Eksempel/ }).click()
    await expect(page.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
    await expect(page.getByText('Kim Testfører', { exact: false })).toHaveCount(0)
    await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
    await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')

    const assertRestored = async (target: Page) => {
      await expect(target.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
      await expect(target.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
      await expect(target.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
      await expect(target.getByText('Emil Eksempel', { exact: true })).toBeVisible()
      await expect(target.locator('time').first()).toHaveAttribute('datetime', input.date)
      const plan = target.locator('.details > div').filter({ hasText: 'Planlagt siste dag' })
      await expect(plan).toContainText('Dag 1')
      await expect(plan.locator('time')).toHaveAttribute('datetime', input.date)
    }
    const refreshStart = performance.now()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await assertRestored(page)
    const refreshMs = Math.round(performance.now() - refreshStart)
    expect(refreshMs).toBeLessThanOrEqual(5000)
    await context.close()

    const restartStart = performance.now()
    context = await engine.launchPersistentContext(folder.path, options)
    const restored = context.pages()[0]
    await restored.goto('/', { waitUntil: 'domcontentloaded' })
    await assertRestored(restored)
    const restartMs = Math.round(performance.now() - restartStart)
    expect(restartMs).toBeLessThanOrEqual(5000)
    console.log(`${testInfo.project.name}: refresh ${refreshMs} ms, normal lukking/gjenåpning inkl. nettleserstart ${restartMs} ms, 2 løp × 1 dag, origin ${origin}`)

    await restored.addInitScript(() => {
      IDBObjectStore.prototype.getAll = () => { throw new DOMException('Lesefeil', 'UnknownError') }
    })
    await restored.reload()
    await expect(restored.getByRole('alert')).toContainText('kunne ikke leses fra det lokale lageret')
    await expect(restored.getByText('Det er ingen lagrede løp', { exact: false })).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('åpningsfeil, skriveprøve og nyere schema sperrer registrering', async ({ browser }) => {
  const cases = [
    { code: 'open', message: 'Det lokale lageret kan ikke åpnes' },
    { code: 'upgradeBlocked', message: 'En annen fane blokkerer åpning av lageret' },
    { code: 'write', message: 'Skriveprøven for lokalt lager mislyktes' },
    { code: 'metadata', message: 'støtter ikke formatet i det lokale lageret' },
  ]
  for (const scenario of cases) {
    const context = await browser.newContext({ baseURL: origin })
    try {
      const page = await context.newPage()
      if (scenario.code === 'metadata') {
        await page.goto('/')
        await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toBeVisible()
        await page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('tide-kjorevurdering')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('meta', 'readwrite')
            tx.objectStore('meta').put({ schemaVersion: 999 }, 'schema')
            tx.oncomplete = () => resolve()
            tx.onabort = () => reject(tx.error)
          })
          db.close()
        })
      } else {
        await page.addInitScript(code => {
          if (code === 'open') {
            IDBFactory.prototype.open = () => { throw new DOMException('Sperret', 'SecurityError') }
          } else if (code === 'upgradeBlocked') {
            const open = IDBFactory.prototype.open
            IDBFactory.prototype.open = function (name, version) {
              const request = open.call(this, name, version)
              queueMicrotask(() => request.dispatchEvent(new Event('blocked')))
              return request
            }
          } else {
            const put = IDBObjectStore.prototype.put
            IDBObjectStore.prototype.put = function (value, key) {
              if (key === 'write-probe') throw new DOMException('Skriveprøve', 'QuotaExceededError')
              return put.call(this, value, key)
            }
          }
        }, scenario.code)
      }
      await page.goto('/')
      await expect(page.getByRole('alert')).toContainText(scenario.message)
      await expect(page.getByRole('button', { name: 'Opprett løp' })).toHaveCount(0)
      await expect(page.getByText('Lagret på denne enheten', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Det er ingen lagrede løp', { exact: false })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible()
    } finally {
      await context.close()
    }
  }
})

test('320/360/390/768/1280 CSSpx og 200 % tekst uten horisontal registreringsrulling', async ({ page }) => {
  await page.goto('/')
  const widths = [320, 360, 390, 768, 1280]
  const checkLayout = async () => {
    for (const width of widths) {
      for (const fontSize of ['100%', '200%']) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(size => { document.documentElement.style.fontSize = size }, fontSize)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        const controls = await page.locator('input, select, button, .error-panel a').evaluateAll(elements => elements.map(el => {
          const box = el.getBoundingClientRect()
          return { width: box.width, height: box.height, left: box.left, right: box.right }
        }))
        for (const control of controls) {
          expect(control.left).toBeGreaterThanOrEqual(8)
          expect(control.right).toBeLessThanOrEqual(width - 8)
          expect(control.width).toBeGreaterThanOrEqual(44)
          expect(control.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
  }
  await expect(page.getByRole('button', { name: 'Opprett løp' })).toBeVisible()
  await checkLayout()
  await openForm(page)
  await page.getByRole('button', { name: 'Opprett løp' }).click()
  await expect(page.getByRole('heading', { name: 'Opplysninger som må rettes' })).toBeVisible()
  await checkLayout()
  await fillForm(page, { ...input, name: 'Eksempel'.repeat(14) })
  await save(page)
  await checkLayout()
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('button', { name: /EksempelEksempel/ })).toBeVisible()
  await checkLayout()
})
