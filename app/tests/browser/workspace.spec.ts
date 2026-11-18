import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdtempDisposableSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lockedRun, readSavedRun, writeSavedRun } from './saved-run-fixture.ts'

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

async function pauseDayResult(page: Page, property: 'oncomplete' | 'onabort') {
  await page.addInitScript(property => {
    const original = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, property)!
    Object.defineProperty(IDBTransaction.prototype, property, {
      ...original,
      set(handler: (event: Event) => void) {
        original.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'holdDayResult')) {
            Reflect.deleteProperty(window, 'holdDayResult')
            Reflect.set(window, 'releaseDayResult', () => {
              Reflect.deleteProperty(window, 'releaseDayResult')
              handler.call(this, event)
            })
          } else handler.call(this, event)
        })
      },
    })
  }, property)
}

async function holdNextDayResult(page: Page) {
  await page.evaluate(() => Reflect.set(window, 'holdDayResult', true))
}

async function waitForHeldDayResult(page: Page) {
  await expect.poll(() => page.evaluate(() => typeof Reflect.get(window, 'releaseDayResult'))).toBe('function')
}

async function releaseDayResult(page: Page) {
  await page.evaluate(() => Reflect.get(window, 'releaseDayResult')())
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
    await expect(page.getByLabel('Dato', { exact: true })).toHaveValue(input.date)
    await expect(page.locator('time')).toHaveCount(1)
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
    await page.getByLabel('Buss 1').fill('507')
    await page.getByLabel('Inn-tid').fill('06:10')
    await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
    await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')

    const assertRestored = async (target: Page) => {
      await expect(target.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
      await expect(target.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
      await expect(target.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
      await expect(target.getByText('Emil Eksempel', { exact: true })).toBeVisible()
      await expect(target.getByRole('group', { name: 'Buss 1' })).toContainText('507')
      await expect(target.getByLabel('Inn-tid')).toHaveValue('06:10')
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
        const controls = await page.locator('input, select, button, .error-panel a, .field-check summary, .field-check a').evaluateAll(elements => elements.map(el => {
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
  await page.getByText('Kontroller øktfeltene').click()
  const missingBus = page.getByRole('link', { name: 'Oppgi minst én buss.' })
  await expect(missingBus).toBeVisible()
  await checkLayout()
  await missingBus.press('Enter')
  await expect(page.getByLabel('Buss 1')).toBeFocused()
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('button', { name: /EksempelEksempel/ })).toBeVisible()
  await checkLayout()
})

test('øktfeltene viser ansvar, skiller bekreftelseskrav og beholder ufullstendige tider', async ({ page }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await expect(page.getByLabel('Sjåførnavn')).toHaveValue(input.name)
  await expect(page.getByLabel('Ansattnummer')).toHaveValue(input.employee)
  await expect(page.getByLabel('Faddernavn')).toHaveValue(input.mentor)
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue(input.date)
  await expect(page.getByLabel('Dato', { exact: true })).toHaveAccessibleDescription(/sjåførbekreftelse og dagslåsing/)
  await expect(page.getByLabel('Buss 2')).toHaveAccessibleDescription(/Valgfri når Buss 1 er fylt ut/)
  await expect(page.getByLabel('Inn-tid')).toHaveAccessibleDescription(/HH:mm.*dagslåsing/)
  await page.getByText('Kontroller øktfeltene').focus()
  await page.keyboard.press('Enter')
  const control = page.locator('.field-check')
  await expect(control.getByText('Øktfeltene som kreves ved sjåførens etterbekreftelse er utfylt.')).toBeVisible()
  await expect(control.getByRole('link')).toHaveCount(4)
  const missing = control.getByRole('link', { name: 'Oppgi minst én buss.' })
  await missing.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Buss 1')).toBeFocused()
  await expect(page.getByLabel('Buss 1')).toHaveAccessibleDescription(/Oppgi minst én buss/)
  await page.getByLabel('Buss 1').fill('301')
  await page.getByLabel('Linjer').fill('4, 12')
  await page.getByLabel('Inn-tid').fill('23:')
  await page.getByLabel('Ut-tid').fill('00:30')
  await expect(page.getByLabel('Inn-tid')).toHaveAccessibleDescription(/formatet HH:mm/)
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.reload()
  await expect(page.getByLabel('Inn-tid')).toHaveValue('23:')
  await page.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(page.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')
  await expect(page.getByRole('group', { name: 'Buss 1' })).toContainText('301')
  await expect(page.getByRole('group', { name: 'Buss 2' })).toContainText('Tomt felt')
  await expect(page.getByRole('group', { name: 'Linjer' })).toContainText('4, 12')
  await expect(page.getByRole('group', { name: 'Faddernavn' })).toContainText(input.mentor)
  await expect(page.getByRole('textbox', { name: 'Linjer' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Inn-tid' })).toBeEditable()
  await page.getByLabel('Inn-tid').fill('23:45')
  await page.getByText('Kontroller øktfeltene').click()
  await expect(control.getByRole('link')).toHaveCount(0)
  await expect(control.getByText('Øktfeltene som kreves ved dagslåsing er utfylt.')).toBeVisible()
  await expect(page.getByText('Ikke bekreftet', { exact: true })).toBeVisible()
  await expect(page.getByText('Åpen for registrering', { exact: true })).toBeVisible()
})

test('gyldig lagret dato består ved ugyldig innskriving og lagres når den er korrigert', async ({ page }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page, input, '1')
  await save(page)
  const date = page.getByLabel('Dato', { exact: true })
  await date.fill('2027-02-29')
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('Endringene er ikke lagret. Prøv igjen.')
  await expect(date).toHaveValue('2027-02-29')
  await expect(date).toHaveAccessibleDescription(/gyldig dato/)
  await expect(page.locator('time')).toHaveAttribute('datetime', input.date)
  await date.fill('2028-02-29')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.locator('time')).toHaveAttribute('datetime', '2028-02-29')
  await page.reload()
  await expect(date).toHaveValue('2028-02-29')
})

test('eldre kvittering merker aldri nyere tekst lagret', async ({ page }) => {
  await page.addInitScript(() => {
    const complete = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      ...complete,
      set(handler: (event: Event) => void) {
        complete.set!.call(this, (event: Event) => {
          if (this.objectStoreNames.contains('commands') && Reflect.get(window, 'holdDayComplete')) {
            Reflect.set(window, 'releaseDayComplete', () => {
              Reflect.deleteProperty(window, 'releaseDayComplete')
              handler.call(this, event)
            })
          } else handler.call(this, event)
        })
      },
    })
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(() => Reflect.set(window, 'holdDayComplete', true))
  const routes = page.getByLabel('Linjer')
  await routes.fill('Første')
  const hasReceipt = () => page.evaluate(() => typeof Reflect.get(window, 'releaseDayComplete') === 'function')
  await expect.poll(hasReceipt).toBe(true)
  await routes.fill('Nyere')
  await expect(page.getByRole('status')).toHaveText('Lagrer …')
  await page.evaluate(() => Reflect.get(window, 'releaseDayComplete')())
  await expect.poll(hasReceipt).toBe(true)
  await expect(page.getByRole('status')).toHaveText('Lagrer …')
  await expect(routes).toHaveValue('Nyere')
  await expect(routes).toBeFocused()
  await page.evaluate(() => Reflect.get(window, 'releaseDayComplete')())
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(routes).toBeFocused()
  await page.reload()
  await expect(routes).toHaveValue('Nyere')
})

test('automatisk lagring fullfører innen to sekunder og forsøker flush under kontinuerlig inntasting', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    const timing = { commits: [] as number[], inputs: [] as number[] }
    Reflect.set(window, 'autosaveTiming', timing)
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'runs') this.transaction.addEventListener('complete', () => timing.commits.push(performance.now()))
      return put.call(this, value, key)
    }
    document.addEventListener('input', event => {
      if ((event.target as HTMLElement).id === 'day-field-routes') timing.inputs.push(performance.now())
    })
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  const timing = () => page.evaluate(() => Reflect.get(window, 'autosaveTiming') as { inputs: number[]; commits: number[] })
  const routes = page.getByLabel('Linjer')
  await routes.fill('4')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  const isolated = await timing()
  expect(isolated.commits).toHaveLength(1)
  const quietMs = Math.round(isolated.commits[0] - isolated.inputs[0])
  expect(quietMs).toBeLessThanOrEqual(2000)
  await routes.pressSequentially('1234567890123456789012', { delay: 125 })
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  const continuous = await timing()
  const firstFlushMs = Math.round(continuous.commits[1] - continuous.inputs[1])
  const finalMs = Math.round(continuous.commits.at(-1)! - continuous.inputs.at(-1)!)
  expect(firstFlushMs).toBeLessThanOrEqual(2000)
  expect(continuous.commits[1]).toBeLessThan(continuous.inputs.at(-1)!)
  expect(finalMs).toBeGreaterThanOrEqual(0)
  expect(finalMs).toBeLessThanOrEqual(2000)
  console.log(`${testInfo.project.name}: transaksjonscomplete etter enkeltinput ${quietMs} ms, første flush under skriving ${firstFlushMs} ms, siste input ${finalMs} ms`)
})

test('synlig fane kan lagre innen fristen selv når nettleseren forsinker autosave-tidsuret', async ({ page }) => {
  await page.addInitScript(() => {
    const setTimer = window.setTimeout
    window.setTimeout = function (handler, delay, ...args) {
      if (delay === 350 && Reflect.get(window, 'delayAutosaveTimer')) {
        Reflect.set(window, 'autosaveTimerWasDelayed', true)
        return setTimer(handler, 6000, ...args)
      }
      return setTimer(handler, delay, ...args)
    }
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(() => Reflect.set(window, 'delayAutosaveTimer', true))
  const start = performance.now()
  await page.getByLabel('Ut-tid').fill('01:20')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten', { timeout: 2000 })
  expect(performance.now() - start).toBeLessThanOrEqual(2000)
  expect(await page.evaluate(() => Reflect.get(window, 'autosaveTimerWasDelayed'))).toBe(true)
  await page.reload()
  await expect(page.getByLabel('Ut-tid')).toHaveValue('01:20')
})

test('kvotefeil avbryter rollebytte og abort avbryter navigasjon med utkastet intakt', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const fault = this.name === 'runs' && Reflect.get(window, 'dayWriteFault')
      if (fault === 'quota') throw new DOMException('Kvote', 'QuotaExceededError')
      const request = put.call(this, value, key)
      if (fault === 'abort') request.addEventListener('success', () => this.transaction.abort())
      return request
    }
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(() => Reflect.set(window, 'dayWriteFault', 'quota'))
  await page.getByText('Kontroller øktfeltene').click()
  const role = page.getByLabel('Simuleringsrolle')
  await page.getByLabel('Buss 1').fill('202')
  await role.selectOption('sjåfør')
  await expect(page.getByRole('alert')).toHaveText('Endringene er ikke lagret. Prøv igjen.')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  await expect(role).toHaveValue('fadder')
  await expect(page.getByLabel('Buss 1')).toHaveValue('202')
  await page.evaluate(() => Reflect.deleteProperty(window, 'dayWriteFault'))
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.getByLabel('Linjer').fill('7, 14')
  await role.selectOption('sjåfør')
  await expect(role).toHaveValue('sjåfør')
  await expect(page.locator('.field-check')).not.toHaveAttribute('open')
  await expect(page.getByRole('group', { name: 'Linjer' })).toContainText('7, 14')
  await expect(page.getByRole('group', { name: 'Buss 1' })).toContainText('202')

  await page.evaluate(() => Reflect.set(window, 'dayWriteFault', 'abort'))
  const end = page.getByLabel('Ut-tid')
  await end.fill('18:00')
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('alert')).toHaveText('Endringene er ikke lagret. Prøv igjen.')
  await expect(page.getByRole('heading', { name: 'Dagsoversikt' })).toBeVisible()
  await expect(end).toHaveValue('18:00')
  await page.evaluate(() => Reflect.deleteProperty(window, 'dayWriteFault'))
  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await end.fill('18:30')
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await page.getByRole('button', { name: /Nora Eksempel/ }).click()
  await expect(end).toHaveValue('18:30')
})

test('foreldet fane viser lagrede verdier for riktig løp og venter på uttrykkelig nytt forsøk', async ({ page, context }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.locator('.profile')).toContainText('Nora Eksempel')
  await other.getByLabel('Buss 1').fill('88')
  await other.getByLabel('Linjer').fill('Nyere linjer fra annen fane')
  await expect(other.getByRole('status')).toHaveText('Lagret på denne enheten')
  await other.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await openForm(other)
  await fillForm(other, { ...input, name: 'Kim Testfører', employee: 'DEMO-102' })
  await save(other)
  await page.getByLabel('Buss 1').fill('99')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  const saved = page.getByRole('region', { name: 'Lagrede opplysninger for dag 1' })
  await expect(saved).toContainText('Nora Eksempel')
  await expect(saved).toContainText('88')
  await expect(saved).toContainText('Nyere linjer fra annen fane')
  await expect(saved).not.toContainText('Kim Testfører')
  await expect(page.getByLabel('Buss 1')).toHaveValue('99')
  await expect(page.getByLabel('Linjer')).toHaveValue('')
  await expect(other.getByLabel('Buss 1')).toHaveValue('')
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.getByLabel('Buss 1')).toHaveValue('99')
  await expect(page.getByLabel('Linjer')).toHaveValue('Nyere linjer fra annen fane')
  await expect(other.locator('.profile')).toContainText('Kim Testfører')
  await other.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await other.getByRole('button', { name: /Nora Eksempel/ }).click()
  await expect(other.getByLabel('Buss 1')).toHaveValue('99')
  await expect(other.getByLabel('Linjer')).toHaveValue('Nyere linjer fra annen fane')
})

test('konfliktkvittering beholder felt som endres tilbake til forrige lokale verdi mens den venter', async ({ page, context }) => {
  await pauseDayResult(page, 'oncomplete')
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  const routes = page.getByLabel('Linjer')
  await routes.fill('B')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  const other = await context.newPage()
  await other.goto('/')
  await other.getByLabel('Linjer').fill('X')
  await expect(other.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.getByLabel('Buss 1').fill('99')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  await holdNextDayResult(page)
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(page.getByRole('heading', { name: 'Dag 1 · Øktopplysninger' })).toBeFocused()
  await waitForHeldDayResult(page)
  await routes.fill('Y')
  await routes.fill('B')
  await releaseDayResult(page)
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(routes).toHaveValue('B')
  await expect(routes).toBeFocused()
  await page.reload()
  await expect(routes).toHaveValue('B')
  await expect(page.getByLabel('Buss 1')).toHaveValue('99')
})

test('en dato korrigert under skriving lagres automatisk etter eldre valideringsavvisning', async ({ page }) => {
  await pauseDayResult(page, 'onabort')
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  const date = page.getByLabel('Dato', { exact: true })
  await holdNextDayResult(page)
  await date.fill('2027-02-29')
  await waitForHeldDayResult(page)
  await date.fill('2028-02-29')
  await releaseDayResult(page)
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(date).toHaveValue('2028-02-29')
})

test('kommando-ID-konflikt gir en ny ID ved uttrykkelig forsøk med samme innhold', async ({ page }) => {
  await page.addInitScript(() => {
    const get = IDBObjectStore.prototype.get
    IDBObjectStore.prototype.get = function (key) {
      const result = get.call(this, key)
      if (this.name === 'commands' && Reflect.get(window, 'injectCommandCollision')) {
        const collision = Reflect.get(window, 'collisionId') ?? key
        Reflect.set(window, 'collisionId', collision)
        if (key === collision) {
          Object.defineProperty(result, 'result', {
            get: () => ({ schemaVersion: 1, data: { fingerprint: 'annet tidligere innhold' } }),
          })
        }
      }
      return result
    }
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(() => Reflect.set(window, 'injectCommandCollision', true))
  const bus = page.getByLabel('Buss 1')
  await bus.fill('77')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await page.reload()
  await expect(bus).toHaveValue('77')
})

test('delvis låst konflikt lar brukeren beholde redigerbare endringer og har gjenstående fokusmål', async ({ page }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await writeSavedRun(page, lockedRun(await readSavedRun(page)))
  await page.getByLabel('Dato', { exact: true }).fill('2027-03-29')
  const bus = page.getByLabel('Buss 1')
  await bus.fill('81')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  const storedDate = page.getByRole('group', { name: 'Dato', exact: true })
  await expect(storedDate).toContainText('2027-03-29')
  const retry = page.getByRole('button', { name: 'Lagre mine endringer' })
  await expect(retry).toBeDisabled()
  await page.getByRole('button', { name: 'Bruk lagrede verdier i låste felt' }).click()
  await expect(page.getByRole('heading', { name: 'Lagrede opplysninger for dag 1' })).toBeFocused()
  await expect(storedDate).toContainText('28.03.2027')
  await expect(bus).toHaveValue('81')
  await retry.click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  await expect(page.getByRole('heading', { name: 'Dag 1 · Øktopplysninger' })).toBeFocused()
  await page.reload()
  await expect(storedDate).toContainText('28.03.2027')
  await expect(bus).toHaveValue('81')
})

test('rolle, navigasjon og nøyaktig konfliktlesing kan gjenåpne lukket lager uten ressursinnlasting', async ({ page, context }) => {
  await pauseDayResult(page, 'onabort')
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open
    IDBFactory.prototype.open = function (name, version) {
      const request = open.call(this, name, version)
      request.addEventListener('success', () => Reflect.set(window, 'appStorage', request.result))
      return request
    }
  })
  const close = () => page.evaluate(() => {
    const db = Reflect.get(window, 'appStorage') as IDBDatabase
    db.close()
    db.dispatchEvent(new Event('close'))
  })
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(() => { HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Ressursprøve')) })
  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await openForm(other)
  await fillForm(other, { ...input, name: 'Kim Testfører', employee: 'DEMO-102' })
  await save(other)
  await other.getByLabel('Simuleringsrolle').selectOption('sjåfør')
  await expect(other.getByLabel('Simuleringsrolle')).toHaveValue('sjåfør')

  await holdNextDayResult(page)
  const bus = page.getByRole('textbox', { name: 'Buss 1' })
  await bus.fill('47')
  await waitForHeldDayResult(page)
  await close()
  await releaseDayResult(page)
  const comparison = page.getByRole('region', { name: 'Lagrede opplysninger for dag 1' })
  await expect(comparison).toContainText(input.name)
  await expect(comparison).not.toContainText('Kim Testfører')
  await close()
  await page.getByRole('button', { name: 'Gjenoppta som fadder' }).click()
  await expect(page.getByRole('heading', { name: 'Lagrede opplysninger for dag 1' })).toBeFocused()
  await expect(bus).toHaveValue('47')
  await page.getByRole('button', { name: 'Lagre mine endringer' }).click()
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  const role = page.getByLabel('Simuleringsrolle')
  await close()
  await role.selectOption('sjåfør')
  await expect(role).toHaveValue('sjåfør')
  await expect(page.getByRole('group', { name: 'Buss 1' })).toContainText('47')
  await close()
  await page.getByRole('button', { name: 'Til løpsoversikten' }).click()
  await expect(page.getByRole('heading', { name: 'Løpsoversikt' })).toBeVisible()
  await close()
  await page.getByRole('button', { name: /Nora Eksempel/ }).click()
  await expect(page.getByRole('group', { name: 'Buss 1' })).toContainText('47')
})

test('nyere lagringsskjema forklares uten at det ulagrede øktfeltet skjules', async ({ page }) => {
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  await page.evaluate(async () => {
    const request = indexedDB.open('tide-kjorevurdering')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ schemaVersion: 999 }, 'schema')
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  })
  const routes = page.getByLabel('Linjer')
  await routes.fill('47')
  await expect(page.getByRole('alert')).toContainText('Åpne en appversjon som støtter lageret.')
  await expect(page.getByRole('alert')).toContainText('Kopier ulagret tekst')
  await expect(page.getByRole('status')).toHaveText('Ulagrede endringer')
  await expect(routes).toHaveValue('47')
})

test('bevarer kvitterte øktfelt gjennom 60 sekunder frakoblet og gjenopptar innen fem sekunder', async ({ page, context }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await openForm(page)
  await fillForm(page)
  await save(page)
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.bringToFront()
  await context.setOffline(true)
  const offlineStart = performance.now()
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  await page.getByLabel('Buss 1').fill('512')
  await page.getByLabel('Linjer').fill('11, 21')
  await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  for (const [field, value] of [['Buss 2', '902'], ['Inn-tid', '23:05'], ['Ut-tid', '01:20']]) {
    await page.waitForTimeout(20_000)
    await page.getByLabel(field).pressSequentially(value)
    await expect(page.getByRole('status')).toHaveText('Lagret på denne enheten')
  }
  await expect(page.getByText('Uten nett', { exact: true })).toBeVisible()
  expect(requests).toEqual([])
  await context.setOffline(false)
  const offlineMs = Math.round(performance.now() - offlineStart)
  expect(offlineMs).toBeGreaterThanOrEqual(60_000)
  await expect(page.getByText('Nett tilkoblet', { exact: true })).toBeVisible({ timeout: 5000 })
  const start = performance.now()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.profile')).toContainText('Nora Eksempel · Dag 1')
  await expect(page.getByLabel('Buss 1')).toHaveValue('512')
  await expect(page.getByLabel('Buss 2')).toHaveValue('902')
  await expect(page.getByLabel('Linjer')).toHaveValue('11, 21')
  await expect(page.getByLabel('Inn-tid')).toHaveValue('23:05')
  await expect(page.getByLabel('Ut-tid')).toHaveValue('01:20')
  const refreshMs = Math.round(performance.now() - start)
  expect(refreshMs).toBeLessThanOrEqual(5000)
  console.log(`${testInfo.project.name}: ${offlineMs} ms frakoblet uten nettverksforespørsler, refresh ${refreshMs} ms på ett løp med én dag ved ${origin}`)
})
