import { seedPilot } from './pilot-accounts.ts'
import { pilotDatabaseFile } from './pilot-config.ts'
import { TestDriveStore } from './test-drive-store.ts'

const [command, address] = process.argv.slice(2)
if (command !== 'seed' && (command !== 'mailbox' || !address?.endsWith('@pilot.test'))) {
  console.error('Bruk «npm run pilot:seed» eller «npm run pilot:mailbox -- adresse@pilot.test».')
  process.exit(1)
}

const store = new TestDriveStore(pilotDatabaseFile())
try {
  if (command === 'seed') {
    seedPilot(store)
    console.log('Fiktive pilotroller og avdelinger er registrert.')
  } else {
    const messages = store.database.prepare(`
      SELECT kind, value, created_at, expires_at FROM pilot_mailbox WHERE email = ? AND expires_at > ? ORDER BY id DESC
    `).all(address!, Date.now())
    for (const message of messages) {
      const time = new Date(Number(message.created_at)).toLocaleString('nb-NO')
      const label = message.kind === 'code' ? 'Engangskode' : 'Invitasjon'
      console.log(`${time} · ${label} · ${message.value}`)
    }
    if (!messages.length) console.log('Ingen gyldige meldinger for denne adressen.')
  }
} finally {
  store.database.close()
}
