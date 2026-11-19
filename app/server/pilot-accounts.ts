import { TestDriveStore } from './test-drive-store.ts'

export function seedPilot(store: TestDriveStore) {
  store.transaction(() => {
    const department = store.database.prepare('INSERT OR IGNORE INTO pilot_departments VALUES (?, ?)')
    department.run('bergen', 'Bergen')
    department.run('stavanger', 'Stavanger')

    const account = store.database.prepare('INSERT OR IGNORE INTO pilot_people VALUES (?, ?, ?, ?)')
    account.run('admin-bergen', 'Siri Eksempel', 'opplaering-bergen@pilot.test', 'administrator')
    account.run('admin-stavanger', 'Sander Eksempel', 'opplaering-stavanger@pilot.test', 'administrator')
    account.run('instructor-bergen', 'Emil Eksempel', 'instruktor-bergen@pilot.test', 'instructor')
    account.run('instructor-bergen-2', 'Emil Eksempel', 'instruktor-bergen-2@pilot.test', 'instructor')
    account.run('instructor-stavanger', 'Ada Eksempel', 'instruktor-stavanger@pilot.test', 'instructor')
    account.run('candidate-1', 'Nora Eksempel', 'kandidat-1@pilot.test', 'candidate')
    account.run('candidate-2', 'Nora Eksempel', 'kandidat-2@pilot.test', 'candidate')

    const grant = store.database.prepare('INSERT OR IGNORE INTO pilot_creation_grants VALUES (?, ?)')
    grant.run('admin-bergen', 'bergen')
    grant.run('admin-stavanger', 'stavanger')

    const instructor = store.database.prepare('INSERT OR IGNORE INTO pilot_instructors VALUES (?, ?)')
    instructor.run('instructor-bergen', 'bergen')
    instructor.run('instructor-bergen-2', 'bergen')
    instructor.run('instructor-stavanger', 'stavanger')
  })
}
