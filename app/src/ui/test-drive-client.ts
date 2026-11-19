import { testDriveApiPath } from '../content/test-drive-api.ts'

const messages: Record<string, string> = {
  invalid_input: 'Kontroller opplysningene i skjemaet og prøv igjen.',
  invalid_expiry: 'Velg et tidspunkt for utløp som er frem i tid.',
  invalid_code: 'Koden er feil, brukt eller utløpt. Kontroller koden eller be om en ny.',
  invalid_instructor: 'Velg en instruktør som tilhører avdelingen.',
  candidate_conflict: 'Kontroller kandidatens navn og e-postadresse. Adressen er allerede registrert med andre opplysninger.',
  department_forbidden: 'Du har ikke opprettingsfullmakt for denne avdelingen.',
  run_unavailable: 'Testkjøringen er ikke tilgjengelig for denne innloggingen.',
  not_found: 'Testkjøringen er ikke tilgjengelig for denne innloggingen.',
  request_conflict: 'Opprettingen er allerede registrert med andre opplysninger. Se oversikten.',
  sign_in_required: 'Økten er utløpt. Logg inn på nytt.',
  server_error: 'Pilotserveren kunne ikke behandle henvendelsen. Prøv igjen.',
}

export class PilotRequestError extends Error {
  readonly status: number

  constructor(status: number, code: string) {
    super(messages[code] ?? 'Henvendelsen kunne ikke fullføres. Prøv igjen.')
    this.status = status
  }
}

export async function pilotRequest<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${testDriveApiPath}${path}`, {
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    cache: 'no-store',
    signal,
  })
  if (!response.headers.get('content-type')?.startsWith('application/json')) {
    throw new Error('Testkjøring krever tilkobling til pilotserveren.')
  }
  const value = await response.json()
  if (!response.ok) throw new PilotRequestError(response.status, value.error)
  return value as T
}

export function pilotMessage(error: unknown) {
  if (error instanceof PilotRequestError) return error.message
  return 'Kunne ikke koble til pilotserveren. Prøv igjen.'
}
