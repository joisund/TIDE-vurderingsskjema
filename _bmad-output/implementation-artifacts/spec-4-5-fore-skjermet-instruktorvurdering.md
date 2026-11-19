---
title: 'Story 4.5 – Føre en skjermet instruktørvurdering underveis'
type: 'feature'
created: '2026-11-20'
story_key: 4-5-fore-skjermet-instruktorvurdering
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 2175cd69ac3800cea77e0d5b4fb49f621bec3c7a
context: ['_bmad-output/implementation-artifacts/epic-4-context.md', '_bmad-output/implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Den tildelte instruktøren dokumenterer egne kriteriesvar, kommentarer og samlet resultat underveis. Kandidaten får innsyn først når testkjøringen er avsluttet.

## Boundaries & Constraints

Instruktøren disponerer eget svarsett med 22 kriterier og egen revisjon. Per kriterium kan instruktøren velge «OK», «Kan bli bedre» eller «Ikke bestått». Samlet resultat er et menneskelig, uttrykkelig valg mellom «Bestått», «Med forbehold» og «Nei». Skjerming håndheves i serverens svar, også når et skjermbilde eller en gammel fane er åpen.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| Førdelen levert, etterdelen ikke levert | Instruktøren lagrer kommentarer og vurdering | Egne data kvitteres uavhengig av kandidatens revisjon |
| Instruktørdelen lagret | Kandidaten åpner løp, oppfrisker eller spør etter eksport | Egne svar er tilgjengelige. Instruktørsvar, kommentarer, resultat og eksportgrunnlag er skjermet |
| Levering kvittert eller på nytt etter tapt kvittering | Instruktøren leverer samme del | Én låst innsending med faktisk instruktøridentitet |

</frozen-after-approval>

## Code Map

- `app/server/test-drive-store.ts` har Story 4.3s serverautorisasjon i `withAssignment`. Bruk den eksisterende synkrone transaksjonsgrensen. `app/server/test-drive-api.ts` og `app/src/content/test-drive-api.ts` gir API- og svarkontrakten.
- Story 4.4 bruker SQLite-fasene `before`, `driving`, `after`, `closed` og projiserer kandidatens svar bare til kandidaten. Instruktøren får kandidatens fase/status. Legg til instruktørdelen separat.
- Vis samme 22 kriterier som kandidatdelen, med instruktørens svarskala, per-kriterium-kommentar og utfyllende kommentarfelt.

## Tasks & Acceptance

- [x] Legg til instruktørens lagring, feltvalidering, eksplisitt resultat og levering.
- [x] Avgrens serverens svar og eksport til autoriserte roller og kvitterte faser. Samtidig lagring av ulike deler skal bevares.
- [x] Prøv de to faktiske innloggingene, feil kandidat/instruktør, tilgang før avslutning, samtidig skriving, mangelfull vurdering og gjentatt innsending.

Gitt at instruktøren har lagret et tydelig testmerke i en kommentar, når kandidaten gjenåpner samme løp før avslutning, vises ingen instruktørdata i verken siden eller svaret fra serveren.

## Implementation Notes

Instruktøren kan lagre og levere egen del etter at førdelen er levert, både mens kjøringen pågår og i etterfasen. Serveren validerer del og revisjon uavhengig av kandidatens svarrevisjon. Bevar instruktørens ulagrede tekst ved feil og ved gjenlesing på ordinært fokus. Bruk eksisterende oppdatering, håndtering av mistet tilgang, tidsavgrenset skriving og kvitteringsmønster fra kandidatdelen når det gir samme oppførsel. Del om mulig eksisterende statusmeldinger. Når detaljsvar kan ankomme i ulik rekkefølge, skal en eldre instruktørrevisjon heller ikke erstatte en nyere som vises.

Kommentarene skal kunne inneholde linjeskift og norsk tegnsetting. Bruk samme synlige feltgrenser i UI og serveren, med rom for en lang samlet kommentar i etterfølgende PDF. Beregn grensen for JSON-kroppen slik at alle gyldige kommentarfelt kan sendes sammen, også med flerbyte-tegn og JSON-escaping. Behold den eksisterende lavere kroppsstørrelsesgrensen på øvrige endepunkter. Serveren skal bruke den lagrede malens instruktør- og resultatskala for løpet.

Bevar sammenhengen mellom faktisk autentisert instruktør og revisjonen i SQLite. Bruk skjermet rolleprojeksjon. Kandidatens svar trenger ingen instruktørfelt før kvittert avslutning, selv etter at instruktøren har levert.

Bruk lokal Node 26.13 fra `.cache/story-1-1/node-v26.13.0-win-x64` og Playwright-nettleserne i `.cache/playwright`. API og nettleserprøver på Windows krever godkjent lokal loopback. Den fullstendige nettlesersuiten kjøres etter 4.6. Kjør spesifikke API-, nettleser-, type- og byggprøver for denne storyen. Denne storyen forbereder sluttdokumentasjon ved å lagre avsender, svar og kvittering. Selve avslutningen og PDF-eksporten kommer i 4.6.

## Spec Change Log

- 2026-11-20. Gjennomgangen presiserte videre redigering ved tapt kvittering, skjerming etter kontobytte i annen fane og tidlig autorisering for store kropper. Kommentarfeltene har samme grenser på klient og server, 1 000 UTF-16-enheter per kriterium og 12 000 i samlet kommentar. Kroppsgrensen følger løpets lagrede mal og tar høyde for JSON-escaping.

## Review Triage Log

| Funn | Vurdering og belegg | Oppfølging |
| --- | --- | --- |
| Blind 1. Gammel revisjon krever manuell innlasting | Lav. Etter 409 beholder skjemaet lokal tekst og viser det serveren har lagret. Ny vurdering baseres på eksplisitt valgt revisjon. | Behold det synlige valget. Prøv konkurrerende skriving i to økter. |
| Blind 2. Nye valg kaster ventende kvittering | Middels. Ny redigering fjernet den eneste ID-en som kunne kvittere et skrivekall hvis HTTP-svaret var tapt. | Skill ventende kall fra nyere lokal redigering. |
| Blind 3. Gammel fane kan fortsette å vise instruktørdata ved endret økt | Middels. Vanlig gjenlesing beholder formen ved forbigående nettfeil, også hvis en annen fane har byttet økt. | Skjul data når lokal inn- eller utlogging er kvittert i en annen fane. Behold ordinært fokusvern. |
| Blind 4. Valgt kriterium eller resultat kan ikke nullstilles | Lav. Radiofeltene godtar valg og omvalg. Innsending sier uttrykkelig at valget låses. Behov for egne nullstillingsknapper er ikke fastsatt. | Behold eksisterende radiovalg. |
| Blind 5. Fjernet kriteriekommentar er usynlig i konfliktvisningen | Lav. Differansen velger kriteriet, men setter ingen tekst for tom kommentar. | Vis uttrykkelig at lokal kommentar er tom. |
| Blind 6. Skjermleser får ikke feltgrense ved fokus | Lav. Teksten er synlig ved feltene, men er ikke knyttet til `textarea`. | Knytt grensen til feltet. |
| Blind 7. Valideringsfeil peker ikke på manglende felt | Lav. Handlingsområdet viser om svar eller resultat mangler, uten sted i det lange skjemaet. | Vis feltet ved feilet levering. |
| Blind 8. Stor forespørselskropp leses før løpstilgang | Middels. Et vanlig POST-kall valgte høyere parsergrense ut fra sti uten å kontrollere tildelingen først. | Kontroller autentisert instruktør før stor kropp og før transaksjonen. |
| Blind 9. Størrelsesgrensen følger V1 fremfor løpets mal | Middels. Lagring bruker kriteriene fra lagret mal, mens parseren teller fra nåværende kode. | Beregn grensen fra den autoriserte lagrede malen. |
| Blind 10. Konkurrerende instruktørrevisjon er umålt i nettleser | Middels. Én nettleserøkt kan ikke vise faktisk konflikt mellom to skriv. | Prøv eldre lokal tekst og nyere serverversjon sammen. |
| Kant 1. Egen kvittering går tapt ved videre redigering | Middels. Et eget vellykket skriv blir en tilsynelatende fremmed revisjon. | Samme retting som Blind 2. |
| Kant 2. Større historisk mal kan gi 413 | Middels. En lagret versjon kan ha et annet kriteriesett. | Samme retting som Blind 9. |
| Kant 3. API-hjelper setter feil hoder for tom streng | Lav. Hjelperen lager POST av den tomme strengen, men utelater Origin og innholdstype. | Sett POST-hoder også på tom kropp og prøv 400. |
| Kant 4. Kandidaten får ingen sluttvisning i denne storyen | Utenfor storyen. 4.5 har verken avslutningskommando eller kilde. Sluttinnsyn er et krav i 4.6, som har 4.5 som avhengighet. | Behold i 4.6 og verifiser fra begge roller. |
| Verifisering 1. Instruktørens 409-gjenopptaking er uprøvd i nettleser | Middels. API-prøven sier bare at en foreldet revisjon avvises. | Prøv to samtidige instruktørøkter, lokal tekst og valgt lagret versjon. |
| Verifisering 2. Sent skrivesvar kan treffe annen økt | Middels. Eksisterende prøve bruker separate profiler og kan ikke skille en manglende rollevakt i samme profil. | Hold igjen mutasjonssvar over faktisk sesjonsbytte. |
| Verifisering 3. Låst visning kunne utelate samlet kommentar eller svar uten testfeil | Middels. Tidligere test leste kommentaren som redigerbart utkast, men bare deler av låst visning. | Kontroller faktisk svar, samlet kommentar og resultat etter levering. |
| Verifisering 4. Store strømmede kropper er uprøvd | Middels. `fetch` med streng satte fast lengde i tidligere prøver. | Send både gyldig og for stor kropp med chunked overføring i lokal Node-prøve. |

## Verification

2026-11-20 bestod 95 Node-prøver, 12 nettleserprøver i Chromium, Firefox og WebKit, typekontroll og bygg etter retting. Lint hadde de ti eksisterende varslene. Praktisk nettleserprøve før retting bestod også tre tilfeller i installert Edge. Prøvene omfatter separate fiktive innlogginger, skjerming ved lesing og oppfrisking, kontobytte i en annen fane med en ventende respons, samtidig skriving, konflikt og videre redigering etter tapt svar. SQLite-feil rullet tilbake vurdering og kvittering. Streamet forespørsel brukte det konkrete løpets mal og avviste økt som ble avsluttet under innlesing. Fysisk samspill på to enheter samles til slutt.
