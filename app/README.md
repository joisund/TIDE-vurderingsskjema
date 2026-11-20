# Digital kjørevurdering

Tide-demonstrasjon med lokale fadderløp og en separat pilot for testkjøring. Bruk fiktive opplysninger. Fadderløp, første registrerte dag og valgt simuleringsrolle lagres i IndexedDB i nettleserprofilen på enheten. Testkjøringen bruker innlogging og felles SQLite-lagring på pilotserveren.

## Kjør appen

Bruk Node.js 26.13.0 og npm 11.20.0. Appen startet fra `create-vite@9.3.3` med malen `react-ts`. Kjør kommandoene i denne mappen.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

For å teste den statiske leveransen, kjør `npm run build` og deretter `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Leveransen ligger i `dist/`. Ved testing på mobil skal filene serveres på en stabil HTTPS-origin. Utviklingsserver, lokal preview og HTTPS-host har hvert sitt lager.

## Pilot for testkjøring

Kjør fra `app` med Node.js 26.13.0. Databasen opprettes i `../.cache/test-drive-pilot/data.sqlite` og gjenbrukes ved restart. Sett eventuelt `PILOT_DB` til en annen `.sqlite`-fil utenfor `dist/` i alle pilotterminalene.

Kandidaten leverer før- og ettervurderingen hver for seg. Instruktøren fører sin vurdering underveis og avslutter når alle tre deler er levert. Begge tildelte roller med aktiv tilgang kan da åpne resultatet og hente samme låste dokument som PDF. Kandidattilgangen kan utløpe eller trekkes tilbake uavhengig av økten. [Fysisk prøve med fiktive identiteter](../_bmad-output/implementation-artifacts/epic-4-manuell-verifisering.md).

```powershell
npm ci
npm run pilot:seed
npm run build
npm run pilot:start
```

Åpne `http://127.0.0.1:4173/testkjoring/` eller bruk **Testkjøring** i appens oversikt. For lokal utvikling kan du etter seeding kjøre `npm run dev:pilot -- --port 5173 --strictPort` og åpne `http://127.0.0.1:5173/testkjoring/`.

| Fiktiv adresse | Tilgang |
| --- | --- |
| `opplaering-bergen@pilot.test` | Opprette og styre kandidattilgang i Bergen |
| `opplaering-stavanger@pilot.test` | Opprette og styre kandidattilgang i Stavanger |
| `instruktor-bergen@pilot.test` og `instruktor-bergen-2@pilot.test` | Eksakt instruktørtildeling i Bergen. Begge vises som Emil Eksempel. |
| `instruktor-stavanger@pilot.test` | Eksakt instruktørtildeling i Stavanger |
| `kandidat-1@pilot.test` og `kandidat-2@pilot.test` | Eksakt kandidattildeling. Begge vises som Nora Eksempel. |

Be om engangskode i nettleseren. Hent nyeste melding for den aktuelle adressen fra den lokale postkassen i en annen terminal. Bruk samme kommando for å hente kandidatens invitasjon. Oppretteren kan også registrere en ny fiktiv kandidat med en adresse som slutter på `@pilot.test`.

```powershell
npm run pilot:mailbox -- opplaering-bergen@pilot.test
npm run pilot:mailbox -- kandidat-1@pilot.test
```

For to fysiske enheter, kjør `pilot:start` på en vert som begge når. Bytt eksempelverdiene til pilotvertens HTTPS-adresse og sertifikatfiler. Sertifikatet må være betrodd på begge enheter. Både UI og API bruker `PILOT_ORIGIN` og nye invitasjoner peker dit.

```powershell
$env:PILOT_BIND = '0.0.0.0'
$env:PILOT_PORT = '4173'
$env:PILOT_ORIGIN = 'https://testkjoring.example.test:4173'
$env:PILOT_TLS_KEY = 'C:\pilot\tls\nøkkel.pem'
$env:PILOT_TLS_CERT = 'C:\pilot\tls\sertifikat.pem'
npm run pilot:start
```

## Prøver

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm exec -- playwright install chromium firefox webkit
npm run test:browser
```

Nettleserprøvene starter lokal preview, bruker egne testprofiler og måler oppfrisking og normal lukking/gjenåpning med to fiktive løp og én dag i hvert. Prøvene kjører også de tre flatene ved 320, 360, 390, 768 og 1280 CSSpx med 100 og 200 prosent rottekststørrelse. 320 CSSpx svarer til tilgjengelig bredde ved 400 prosent zoom på en 1280 px bred visning. Fysisk enhet, nettleserzoom, nett og skjermleser dokumenteres ved egne manuelle prøver.

Kjør pilotprøvene fra `app` med lokal Node 26.13.0. API-prøvene starter en midlertidig loopback-server. Nettleserprøven starter den bygde piloten med en egen database og bruker uavhengige økter for kandidat, instruktør, oppretter og kandidat med samme navn.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = (Resolve-Path -LiteralPath '..\.cache\playwright').Path
node --test tests/test-drive-api.test.ts
npm run build
npm run test:browser -- test-drive.spec.ts
```

Med `TIDE_TEST_DRIVE_PDF_FIXTURE=1` beholder nettleserprøven sluttkilden og tre nedlastede PDF-er per nettlesermotor. Kjør `python tests/pdf/verify-test-drive.py <prøvemappe>` med `pdfplumber` for å kontrollere faktisk innhold, svarkolonner og sidebrudd.

## Versjoner

Build-ID er appversjonen i `package.json` med valgfri overstyring via `VITE_BUILD_ID`. Fadder-, instruktør- og linjeflyt bruker IndexedDB-skjema 8. Testkjøringens SQLite-tabeller og versjonerte dokumentkilder ligger i pilotens database. Gjeldende kriterie-ID-er, regel- og hjelpeversjoner ligger under `src/content/`. Feildiagnostikk i nettleserkonsollen viser feilkode, build og schema.
