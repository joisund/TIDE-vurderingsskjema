---
title: 'Story 4.3 – Opprette en testkjøring med individuell tilgang'
type: 'feature'
created: '2026-11-19'
story_key: 4-3-opprette-testkjoring-med-individuell-tilgang
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 22fe7b0469fc1819c840f43b3196f69751d2eaf3
context: ['_bmad-output/implementation-artifacts/epic-4-context.md', '_bmad-output/implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Testkjøring er en egen modul med delt serverlagring. En bruker med opprettingsfullmakt kan invitere én kandidat uten Tide-konto og tildele én instruktør. Begge bruker separat pålogging fra hver sin enhet.

## Boundaries & Constraints

Bygg en kjørbar pilot med fiktive identiteter og samme serverhåndhevede adgang for alle testforløp. Verifiser ekstern e-postidentitet med engangskode. Registrer fullmakter som avgrenset tilgang per avdeling. Tide fastsetter reelle administratorer, identitetsleverandør og driftsmiljø før produksjonsbruk.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| Bruker har opprettingstillatelse for avdeling | Opprett og inviter | Ett løp, eksplisitt kandidat/instruktør, invitert kandidat trenger ikke ansattnummer |
| Lenke videresendes | Ny bruker logger inn | Ingen adgang uten rett identitet og tildeling |
| Kandidattilgang utløper eller trekkes tilbake | Kandidat med etablert økt leser eller skriver | Serveren avslår neste henvendelse, og historikken består |

</frozen-after-approval>

## Code Map

- `app/src/main.tsx` er React-inngangen. Bruk en egen rute og gjenbruk typografi og komponentmønstre. Den eksisterende simuleringsrollen gjelder i den lokale V1-appen.
- `app/vite.config.ts` og `app/package.json` skal gi en normal startmåte for komponent og lokalt API. Node 26.13.0 ble verifisert med `node:sqlite`.
- Skill serverens autentisering og løpstilgang fra kandidatskjemaet. Tillatelse til å opprette et løp gir ingen faglig lesetilgang. Alle senere faglige endepunkt skal bruke samme adgangskontroll.
- Legg den delte kildemalen i `app/src/content/` og serverkoden i `app/server/`. Bruk samme versjonerte kriterier i kandidatvisning, instruktørvisning og databasegrunnlag. PDF for testkjøring kommer i 4.6.

## Tasks & Acceptance

- [x] Legg til egen mal med stabile kriterie-ID-er og kildens metadata samt persistent serverlagring med testbare transaksjoner.
- [x] Implementer bekreftet e-post og ekte serverøkter. Isoler fiktiv e-postlevering til testmiljøet. Utløp, engangsbruk og antall forsøk prøves.
- [x] Bygg mobiltilpasset inngang, liste og opprettingsskjema med avdelingsfullmakt, eksakt tildeling, utløp og tilbakekall. Ved gjentatt oppretting etter tapt kvittering gjenbrukes samme løp.
- [x] Verifiser gjenåpning etter restart, ulike roller og avdelinger, duplikate navn, bruker uten tildeling, utdatert invitasjon, tilbakekall med aktiv økt og at en administrator ikke automatisk kan lese vurderingen.

Gitt to testpersoner med samme visningsnavn, når den ene autentiseres med den inviterte adressen, kan vedkommende bare åpne egne tildelte testkjøringer. Videresendt URL gir ingen faglig tilgang. Brukerens eksisterende økt gir ingen tilgang etter løpets utløpsdato.

## Implementation Notes

Bruk persistent SQLite fra Node 26.13 uten ny kjøretidsavhengighet. Løpet får stabil kandidat-ID, valgt instruktør, avdeling, utløp og statusfelt. Opprettere har egne avdelingsfullmakter. Bruk `POST` med JSON og kontrollert origin for skrivemetoder, serverøkt i cookie, fasefiltrerte svar og `Cache-Control: no-store` på API-svar. Antall innloggingsforsøk og utløp av engangskode testes. Piloten leverer koder til en lokal postkasse for fiktive identiteter. Oppretting og innlogging ligger til rette for en senere tilkobling til valgt Tide-innlogging eller godkjent e-postadapter.

Et normalt startpunkt for fysisk pilot skal servere UI og API på samme origin. Standardkonfigurasjon bruker loopback. Testløpets inngang `/testkjoring/` skal kunne nås fra appens brukergrensesnitt og gjennom direkte invitasjonslenke. Oppstart, seed av fiktive roller og postkassen skal dokumenteres med nøyaktig kommando.

Bruk lokal Node 26.13 og `.cache/playwright` som i Story 4.1–4.2. Prosjekteier har godkjent nettleserprøving i økten. Gjør ingen push eller deploy under denne storyen. Fysisk prøve samles til slutt. 4.4–4.6 leverer faseoverganger, vurderingsskjema og PDF.

`TestDriveStore.withAssignment` er autorisasjons- og transaksjonsgrensen for tildelte deltakere. Kandidatens tilgangsfrist gjelder bare kandidaten. Tildelt instruktør beholder egen tilgang etter utløp og tilbakekall. `pilot:seed`, `pilot:start` og `pilot:mailbox` gir kjørbar lokal pilot med kontrollerte fiktive adresser. Skjemaets kildemal fryses per versjon i SQLite. HTTPS-serveren støtter lokalt angitte sertifikatfiler.

## Spec Change Log

## Review Triage Log

| Funn | Dom og håndtering |
| --- | --- |
| Blind review · Database under Vite `public` | Høy. `public` kopieres til statisk output. Avvis både denne stien og `dist`, også via løste aliaser. |
| Blind review · Økter kolliderer mellom pilotporter | Middels. Nettlesercookies skiller på vert og sti, men ikke port. Gi hver originport eget cookienavn. |
| Blind review · Nådd kodekvote erstatter brukbart challenge | Middels. Nytt ID uten kode overskriver innloggingen. Gi samme kvoterespons for kjent og ukjent adresse, og behold tidligere challenge. |
| Blind review · Ubegrenset innlogging på ulike adresser | Middels. Grense per adresse hindrer ikke vekst fra mange adresser. Avgrens til pilotdomenet og innfør samlet budsjett. |
| Blind review · Oversikten gjenleses ikke etter retur | Middels. Gammel oversikt kan vise tilgang som er trukket tilbake. Gjenles etter fokus eller gjenoppretting. |
| Blind review · Identiske kort ved like navn | Lav. Stabil identitet er riktig i lageret, men kortene skiller ikke løp med samme navn og fase. Vis løpsreferanse eller dato. |
| Blind review · Usikker skapekvittering kan låse skjemaet | Middels. Gjentatt feil holder bruker på retry-visningen. Gi en trygg retur og behold den opprinnelige kommandoen. |
| Blind review · Lokal utløpstid kan normaliseres usynlig | Middels. Ikke-eksisterende lokal klokketid må avvises. Akseptert lokal tid vises med offset. |
| Blind review · Asynkron transaksjonsjobb kan kvitteres tidlig | Middels. Nåværende kall er synkrone, men kontrakten for senere faser tillater Promise. Gjør synkron kontrakt eksplisitt og verifiser. |
| Blind review · Transporttesten bruker bare HTTP | Middels verifikasjonsgap. Uavhengig CLI-prøve har kjørt faktisk HTTPS med test-CA og kontrollert cookieattributter. Fysisk oppsett med eget sertifikat samles til slutt. |
| Blind review · Testkjøringslenke uten pilotserver | Lav. Vanlig statisk vert kan bare tilby de lokale skjemaene. Pilotstart og riktig origin står i appens oppstartsveiledning. Normal pilotinngang prøves. |
| Edge case · Åpen detalj passerer utløp | Middels. API avviser neste forespørsel, men ordinær detaljvisning trenger også lokal utløpskontroll. Aktivt tilbakekall verifiseres ved neste forespørsel eller retur til fanen. |
| Edge case · Database i publiserte filer | Høy. Samme årsak som `public`-funnet over. |
| Edge case · Gammelt tilbakekall endrer utløpt status | Middels. SQL setter tilbakekall uten å ta hensyn til utløpt frist. Behold utløpt status. |
| Edge case · Sommertidens sprang og gjentatte klokkeslett | Middels. Samme tidsnormalisering som over. Vis faktisk offset og avvis sprang. |
| Edge case · Siste challenge kan mangle kode | Middels. Samme kodekvoteårsaken som over. |
| Verification gap · Gjenoppretting prøves ikke etter tilbakekall | Middels. Hard reload beviser ikke BFCache-grenen. Utvid eksisterende Playwright. |
| Verification gap · Vanlig suite går utenom HTTPS-oppstart | Middels. Bruk uavhengig faktisk CLI-/TLS-prøve i storyens leveransebevis uten å kreve systemsertifikat for hver nettleserprøve. |
| Verification gap · Gjenåpning bruker bare kjent malversjon | Middels. Lag en særskilt versjon i SQL-fixturen og verifiser frosset kriterium. |
| Verification gap · Bare verifiseringsgrense, ingen kodeforespørselsgrense prøvd | Middels. Legg til fast klokke og verifiser cap/reset. |
| Verification gap · Vite pilotmodus prøves utenfor standardkommandoene | Lav verifikasjonsgap. Faktisk `dev:pilot` ble startet og UI, API og postkasse ble prøvd. Gjentas i leveransebevis hvis inngangen endres. |
| Verification gap · Gjenopprettet side kan vise gamle detaljer før sjekk | Middels. Skjul gammel detalj under persisted restore og behold normal redigering ved vanlig fokus. |

## Verification

- Produksjonsbygg, typekontroll og lint bestod. Alle **92 Node-prøver** bestod etter retting, med ni egne API-/SQLite-prøver for blant annet kodekvote, portisolerte økter, ulik malversjon, transaksjonsrollback, filplassering og utløp.
- Playwright bestod i Chromium, Firefox og WebKit på gjennomgått kode. Flyten dekket separate roller, smal visning, tapt skapekvittering, identiske kandidatnavn, mislykket kodeforespørsel, eksplisitt UTC-offset, tilbakekall ved gjenopprettet side, deadline og instruktørinnsyn.
- Egen HTTP-prøve viste at SQLite kan gjenåpnes med etablerte økter, at samme oppretting gir samme dokument, og at utløp eller tilbakekall sperrer kandidaten mens instruktørtilgangen består. Separat faktisk HTTPS-oppstart med validert testsertifikat ga `Secure`, `HttpOnly` og `SameSite=Strict`.
- Begge dokumenterte oppstartsmåter og pilotpostkassen er røykprøvd. Før gjennomgangsrettingene bestod også 43 eksisterende Chromium-prøver for arbeidsområde, teknisk opplæring og linjer. Samlet regresjon gjentas på fullstendig Epic 4.
- Fysisk test med to enheter og pilotens endelige HTTPS-adresse gjenstår til sluttprøven. Tide må godkjenne produksjonsidentitet og fullmakter før bruk med reelle kandidater.
