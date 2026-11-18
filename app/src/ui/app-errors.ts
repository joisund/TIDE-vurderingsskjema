import { AppError } from '../domain/run.ts'
import { ClosureSnapshotError } from '../domain/closure.ts'
import type { ErrorCode } from '../domain/run.ts'

const messages: Record<ErrorCode, string> = {
  validation: 'Rett manglene i skjemaet og prøv igjen.',
  invalid_command: 'Opprettingsforsøket har ugyldige identifikatorer. Last inn gjeldende tilstand og prøv på nytt.',
  invalid_content: 'Appens vurderingsgrunnlag kunne ikke lastes. Åpne en oppdatert versjon av appen.',
  wrong_role: 'Velg rollen som hører til denne vurderingen, og prøv igjen.',
  stale: 'Løpsoversikten eller den aktive rollen er endret i en annen fane. Last inn gjeldende tilstand før du prøver igjen.',
  command_conflict: 'Opprettingsforsøket samsvarer ikke med det tidligere forsøket. Gå til løpsoversikten og sjekk om løpet allerede er lagret.',
  run_missing: 'Det valgte løpet kunne ikke finnes. Last inn løpsoversikten på nytt.',
  day_missing: 'Den valgte dagen kunne ikke finnes i løpet.',
  baseline_required: 'Ettervurderingen åpner når førvurderingen er bekreftet.',
  locked: 'Feltet er låst og kan ikke endres.',
  day_limit: 'Maksimalt fem dager er registrert.',
  plan_required: 'Planen må utvides før neste dag kan opprettes.',
  driver_reference_missing: 'Sjåførregistreringen finnes ikke i det lokale lageret. Velg sjåfør på nytt.',
  driver_identity_required: 'Kontroller sjåførnavn og ansattnummer på dag 1 før du oppretter neste dag.',
  storage_open: 'Det lokale lageret kan ikke åpnes. Sjekk at nettleseren tillater lagring for dette nettstedet, og prøv igjen.',
  storage_read: 'Løpsopplysningene kunne ikke leses fra det lokale lageret. Prøv igjen.',
  storage_write: 'Det lokale lageret kan ikke skrives til. Sjekk nettleserens lagringstillatelse og ledig plass, og prøv igjen.',
  storage_blocked: 'En annen fane blokkerer åpning av lageret. Lukk de andre appfanene og last inn appen på nytt, eller prøv igjen her.',
  schema_changed: 'Det lokale lageret er endret av en annen appfane. Last inn den nyeste appversjonen på nytt.',
  unsupported_schema: 'Den åpne appversjonen støtter ikke formatet i det lokale lageret. Åpne en appversjon som støtter lageret.',
  resource_load: 'Appens ressurser kunne ikke lastes. Sjekk nettforbindelsen og prøv igjen.',
  technical_document_missing: 'Det tekniske dokumentet finnes ikke for valgt sjåfør. Åpne dokumentoversikten på nytt.',
  technical_version: 'Denne versjonen av malen, dokumentreglene eller PDF-oppsettet støttes ikke.',
  technical_points: 'Sjekklisten samsvarer ikke med de 52 punktene i Volvo-malen.',
  technical_incomplete: 'Den tekniske opplæringen mangler gyldige opplysninger. Kjør dokumentkontrollen på nytt.',
  technical_instructor: 'Skriv navnet på instruktøren som bekrefter. Det må samsvare med instruktørnavnet i dokumentet.',
  line_document_missing: 'Linjeoversikten finnes ikke for valgt sjåfør. Åpne dokumentoversikten på nytt.',
  line_version: 'Denne versjonen av linjemalen, dokumentreglene eller PDF-oppsettet støttes ikke.',
  line_template: 'Linjeoversikten samsvarer ikke med de 26 linjene i malen.',
  line_history: 'Den bekreftede linjehistorikken er ufullstendig eller samsvarer med feil versjon.',
  line_source_missing: 'Den valgte bekreftede historikkversjonen finnes ikke.',
  line_incomplete: 'De valgte registreringene mangler gyldige opplysninger. Kontroller utvalget på nytt.',
  line_instructor: 'Skriv navnet på instruktøren som bekrefter.',
  line_clock: 'Klokka på enheten viser et tidspunkt før den lagrede historikken. Kontroller klokka og prøv igjen.',
  line_revision_limit: 'Linjeoversikten har nådd grensen for revisjoner. Den lagrede historikken kan fortsatt leses.',
}

export function explain(error: unknown) {
  if (error instanceof ClosureSnapshotError) return `Det lagrede dokumentgrunnlaget kunne ikke leses. ${error.detail}`
  return messages[error instanceof AppError ? error.code : 'storage_open']
}

export function copyForStartup(error: unknown) {
  if (error instanceof AppError && error.code === 'storage_write') {
    return 'Skriveprøven for lokalt lager mislyktes. ' + messages.storage_write
  }
  return explain(error)
}
