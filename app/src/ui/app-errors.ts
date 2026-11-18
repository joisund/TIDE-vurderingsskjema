import { AppError } from '../domain/run.ts'
import type { ErrorCode } from '../domain/run.ts'

const messages: Record<ErrorCode, string> = {
  validation: 'Rett manglene i skjemaet og prøv igjen.',
  invalid_command: 'Opprettingsforsøket har ugyldige identifikatorer. Last inn gjeldende tilstand og prøv på nytt.',
  invalid_content: 'Appens vurderingsgrunnlag kunne ikke lastes. Åpne en oppdatert versjon av appen.',
  wrong_role: 'Velg fadderrollen for å opprette et løp.',
  stale: 'Løpsoversikten eller den aktive rollen er endret i en annen fane. Last inn gjeldende tilstand før du prøver igjen.',
  command_conflict: 'Opprettingsforsøket samsvarer ikke med det tidligere forsøket. Gå til løpsoversikten og sjekk om løpet allerede er lagret.',
  run_missing: 'Det valgte løpet kunne ikke finnes. Last inn løpsoversikten på nytt.',
  day_missing: 'Den valgte dagen kunne ikke finnes i løpet.',
  baseline_required: 'Ettervurderingen åpner når førvurderingen er bekreftet.',
  locked: 'Feltet er låst og kan ikke endres.',
  storage_open: 'Det lokale lageret kan ikke åpnes. Sjekk at nettleseren tillater lagring for dette nettstedet, og prøv igjen.',
  storage_read: 'Løpsopplysningene kunne ikke leses fra det lokale lageret. Prøv igjen.',
  storage_write: 'Det lokale lageret kan ikke skrives til. Sjekk nettleserens lagringstillatelse og ledig plass, og prøv igjen.',
  storage_blocked: 'En annen fane blokkerer åpning av lageret. Lukk de andre fanene med appen og prøv igjen.',
  schema_changed: 'Det lokale lageret er endret av en annen appfane. Last inn den nyeste appversjonen på nytt.',
  unsupported_schema: 'Den åpne appversjonen støtter ikke formatet i det lokale lageret. Åpne en appversjon som støtter lageret.',
  resource_load: 'Appens ressurser kunne ikke lastes. Sjekk nettforbindelsen og prøv igjen.',
}

export function explain(error: unknown) {
  return messages[error instanceof AppError ? error.code : 'storage_open']
}

export function copyForStartup(error: unknown) {
  if (error instanceof AppError && error.code === 'storage_write') {
    return 'Skriveprøven for lokalt lager mislyktes. ' + messages.storage_write
  }
  return explain(error)
}
