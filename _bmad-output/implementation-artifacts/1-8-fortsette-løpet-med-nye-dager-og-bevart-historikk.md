---
title: "Story 1.8 – Fortsette løpet med nye dager og bevart historikk"
type: feature
story_key: 1-8-fortsette-løpet-med-nye-dager-og-bevart-historikk
status: in-review
baseline_commit: 586ac47f05b256ce2f771e50b453198df0835e76
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 1
story: "1.8"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"]
approvedSource: ../planning-artifacts/story-1-8-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.8 – Fortsette løpet med nye dager og bevart historikk

Fadder oppretter neste registrerte dag i det samme løpet, og begge roller kan gå mellom datoer og bekreftelser med rett innsyn. Hele det åpne løpet kan fullføres fra én dag til et utvidet femdagersløp.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.8-01 – Opprette neste dag innen gjeldende plan og stigende datoer**

**Gitt** et åpent løp med minst én opprettet dag og gjeldende plan fra Story 1.6,
**Når** brukeren oppretter en ny dag med nødvendige opprettingsopplysninger etter Story 1.1/FR-3,
**Så** får dagen neste fortløpende dagnummer, stabil dags-ID og samme stabile sjåfør-/løpstilknytning. Datoen skal være gyldig YYYY-MM-DD i Europe/Oslo og senere enn siste registrerte dato,
**Og** neste dagnummer må være høyst gjeldende plannedLastDay og høyst 5. Nødvendig, uttrykkelig planutvidelse lagres først eller atomisk sammen med opprettingen etter Story 1.6; oppretting utvider ikke planen automatisk,
**Og** kalenderopphold er tillatt: dagnummer teller registrerte dager. Tilbakedatert innsetting, dag 6 og oppretting i lukket løp avvises uten å omnummerere eller flytte historikk,
**Og** ulåst datoendring bevarer unikhet og rekkefølge mellom eksisterende dager. Oppretting innfører ingen ny regel om at alle tidligere dager må være låst; alle opprettede dager forblir synlige og omfattes senere av periodens avslutningskontroll (FR-2, AD-8).

**AC-1.8-02 – Håndtere duplikatdato og atomisk oppretting uten overskriving**

**Gitt** et forsøk på å opprette en dato som allerede finnes i samme løp, eller to faner som forsøker samtidig,
**Når** kommandoen behandles mot siste aggregat,
**Så** ledes brukeren til den eksisterende dagen uten at nye feltverdier overskriver dens innhold, og uten ekstra dagnummer eller dupliserte svarposisjoner,
**Og** samme commandId/payload returnerer tidligere resultat før revisjonskontroll; endret payload med samme ID avvises. Ved ny kommando med foreldet revisjon lastes faktisk snapshot før brukeren ledes til riktig dag,
**Og** en reell ny dag med egne svarsett og nødvendige snapshots lagres i én readwrite-transaksjon etter rolle-/revisjons-/plan-/datokontroll. Abort gir ingen løsrevet dag, halv oppretting eller halv planutvidelse,
**Og** vellykket oppretting og gjeldende dag vises først ved complete. Ved feil bevares ulagret input for kontroll og nytt forsøk etter de tidligere storyenes lagringskontrakt (FR-2/9/11, AD-3/5/8).

**AC-1.8-03 – Bruke daglige vurderinger uten ny førvurdering eller kopierte svar**

**Gitt** en ny dag 2–5 i samme løp,
**Når** sjåfør/fadder åpner egne daglige deler,
**Så** brukes Story 1.4/1.5s flyter med 22 nye sjåfør-etterposisjoner og 22 nye fadderposisjoner, riktig dag/fase og nøyaktig løpets samme 22 kriterie-ID-er per sett,
**Og** nye svar og dagens oppfølgingsvalg starter ubesvart. Tidligere svar, begrunnelser, avgjørelser, kommentarer og Ja/Nei-valg kopieres ikke inn som nye registreringer; løpets allerede aktive plan beholdes,
**Og** sjåføren vurderer relevans på nytt og begrunner nye Ikke relevant-valg etter A10. Dag-1-arv binder ikke senere dager,
**Og** periodens ene førvurdering med opprinnelig bekreftelse bevares som historisk utgangspunkt. En gjentatt visning merkes som samme førvurdering og skaper ingen nye før-svar eller bekreftelser (FR-5/6, AD-7).

**AC-1.8-04 – Gjennomføre videre dager og sen utvidelse med riktige låser**

**Gitt** eksisterende daglige flater og kommandoer fra Story 1.2–1.7,
**Når** dag 2–5 utfylles, sjåføren bekrefter egen del og fadder bekrefter dagen,
**Så** gjenbrukes fullførings-/rolle-/lagringsreglene: identitet/dato/tilhørighet låses med sjåførens etterbekreftelse på disse dagene, og resten med fadders dagsbekreftelse,
**Og** gjeldende fadder kan variere mellom og innen ulåste dager, mens tidligere bekreftelser beholder sine faktiske navn. Ingen ny dag eller profilendring opphever tidligere låser,
**Og** ved sen utvidelse etter en låst planlagt siste dag kan fadder i det åpne løpet registrere en separat utvidelse etter Story 1.6 og deretter opprette neste dag. Tilgangen fra dagsoversikten redigerer ikke den låste dagsregistreringen,
**Og** frivillig egenevaluering følger første/gjeldende siste dag, med ett sett ved ett-dagsløp, bevart tidligere låst evaluering ved sen utvidelse og nytt tilbud på ny siste dag. Mellomdager krever ikke et oppfunnet Hopp over-valg (FR-3/8/14/16, AD-6/8).

**AC-1.8-05 – Gjenfinne kronologisk historikk med riktig rolleinnsyn**

**Gitt** et løp med flere bekreftede og eventuelt ubekreftede dager,
**Når** brukeren åpner dagsoversikt eller historikk,
**Så** vises alle opprettede dager kronologisk med faktisk dagnummer/dato, planlagt siste dag og separate delstatuser. Uferdige dager skjules eller utelates ikke lydløst,
**Og** fadder kan lese hele skjemaet og sammenholde perspektivene på tvers av dager. Sjåfør ser egne vurderinger/evalueringer, tillatte øktfelt og gjeldende siste dag underveis, mens fadderinnhold og begrunnet planhistorikk skjules etter AD-9,
**Og** låst innhold vises som lesing, og ubekreftede deler kan åpnes for redigering etter riktig felt-/rollematrise. Valg av en annen dag endrer aldri kobling, svar, navn eller tidligere bekreftelser,
**Og** rolle-/dagsbytte bruker kvittert lagring og rydder forrige model, dialog og DOM. Tilbake-navigasjon eller gjenbruk av felttilstand lekker ikke faddertekst til sjåfør eller svar fra én dag til en annen (FR-1/4/14, AD-6/7/9).

**AC-1.8-06 – Gjenoppta riktig løp/dag med full datamengde og nettbrudd**

**Gitt** fem lagrede løp, hvor ett inneholder fem registrerte dager, med samme origin/profil/enhet og bevart lager,
**Når** brukeren utfører refresh eller lukker/gjenåpner med nett,
**Så** er sist valgte løp/dag, tydelig aktiv rolle og faktisk kvittert innhold/låser lesbare innen AD-4s femsekundersmål uten nytt løpsvalg. Testprofil føres med utstyr, nett og datamengde,
**Og** autosave for alle leverte felttyper måles mot complete innen to sekunder etter siste input; kontinuerlig skriving forsøker flush minst hver to sekunder. En eldre kvittert revisjon vises ikke som lagring av nyere input,
**Og** under 60 sekunders nettbrudd i allerede lastet app kan registrering, lagring og før-/etter-/dagsbekreftelse fortsette med fungerende lokalt lager, uten tap av kvitterte data eller synkduplikater. Nett tilbake følger AD-4s femsekundersgrense etter tilgjengelige ressurser,
**Og** kaldstart/refresh uten nett og slettet/utkastet lager, privat profil eller bytte av origin/profil/enhet omtales etter avgrensningene; åpnefeil fremstilles ikke som tomt lager eller slettede data. Ingen full offline- eller backupgaranti innføres (FR-9–11, NFR-3, AD-3/4).

**AC-1.8-07 – Bevare historikken ved oppdatering og avvise ukjent schema**

**Gitt** lagrede løp med både utkast og låste dager,
**Når** en app-/schemaoppgradering åpner lageret,
**Så** kontrolleres build/schema ved oppstart, og nødvendige migreringer er atomiske og bevarer låst faginnhold, historiske bekreftelser og kriterie-/regelversjoner uten ny faglig validering,
**Og** ukjent nyere schema sperres for skriving. Mislykket migrering eller lagringsfeil viser feil/nytt forsøk og sletter ikke databasen eller erstatter den med tomt minnelager,
**Og** versionchange lukker gammel forbindelse; blokkert oppgradering gir reload-beskjed uten automatisk sletting. Ulagret tekst beholdes i åpen visning etter AD-4, og ingen tvungen oppdatering/reload utføres midt i registrering,
**Og** gammel build som ikke forstår lagret schema kan ikke skrive eller brukes som rollback. Lokal diagnostikk inneholder bare feilkode, build/schema og tillatte ikke-personlige ID-er, aldri navn/fritekst. Fremtidig hosting må bevare den vedtatte origin-/ressurskontrakten; ingen publisering inngår her (AD-4/13).

**AC-1.8-08 – Bruke dagsoversikt og historikk i nettleser og installert variant**

**Gitt** epicens leverte arbeidsflater S1–S8 og historikkdelen av S10,
**Når** løpet prøves på AD-12s nettleser-/enhetsmatrise, responsive bredder, portrett/landskap, tekstforstørrelse, tastatur og skjermlesere,
**Så** kan brukeren velge riktig løp/dag, fylle ut og lese historikk uten horisontal registreringsrulling, skjult fokus, avkuttede dialoghandlinger eller tvetydig rolle/dag/fase. Sticky overskrifter og godkjente trefflater beholdes,
**Og** manifest/ikoner er på plass, og installasjonsprøve/registrering/gjenåpning prøves på de vedtatte mobilplattformene ved tilgjengelig HTTPS-testoppsett. Lagringsdeling mellom Safari og installert variant forutsettes ikke,
**Og** alle ressurser til leverte arbeidsflater lastes før registrering åpnes, med lokale profil-/hjelperessurser og uten service worker/CDN/produksjonsinnlogging eller integrasjon. PDF-ressurser føyes til samme kontroll når PDF leveres i Epic 2,
**Og** ren låst installasjon, typekontroll/bygg og relevante domene-/adapter-/nettleserprøver består. Faktiske OS-/nettleser-/build-/skjermleserversjoner føres; manglende fysisk prøve eller versjon er et åpent verifikasjonsgap, ikke et bestått resultat (NFR-1/2/6, AD-1/2/12).

**AC-1.8-09 – Kontrollere hele det åpne løpet før avslutningsfunksjonen tilføyes**

**Gitt** de integrerte brukeroppgavene fra Story 1.1–1.8,
**Når** ett-, to-, tre- og utvidet femdagersløp gjennomføres med fiktive data,
**Så** bevares én førvurdering og henholdsvis 66/110/154/242 logiske svarposisjoner etter 22 + 44 × dager, eksakt kriterie-ID-dekning i hvert sett og separate historiske før-/etter-/fadderbekreftelser,
**Og** prøvene omfatter kalenderopphold, duplikatdato, dag 6, ulovlig datoendring, fadderbytte, begrunnet Ikke relevant/avslag, foreldet relevansbehandling, ugyldige felt, avbrytelse og gamle skriveveier mot låst innhold,
**Og** planendringer før sjåførbekreftelse og sen utvidelse etter låst evaluering bevarer riktig tilbud/tekst/historikk. Dobbeltklikk, tapt kvittering og avbrudd ved oppretting og alle dagslåser gir konsistente tilstander uten nye kopier,
**Og** etter siste dagslås er løpet fortsatt Pågående/Under oppfølging etter AD-8, uten automatisk faglig godkjenning, fullt sjåførinnsyn eller normal PDF. Et domenegrunnlag som er markert lukket avviser nye dager; faktisk periodeavslutning leveres i Epic 2 (FR-1–14/16, AD-3–9).

</frozen-after-approval>

## Code Map

- `app/src/domain/run.ts` har stabil løps-/dagsidentitet, `runDays`, `findDay`, `replaceDay`, `isCalendarDate` og `dayLocks`. Bruk gjeldende plan fra 1.6 og de eksisterende dato-/låsegrensene i `day-draft.ts`. `updateDayDraft` kontrollerer allerede stigende dato på begge sider av valgt dag. En ny dags sjåførsnapshot må ta utgangspunkt i faktisk registrert identitet for samme sjåfør-ID, også hvis et navn ble korrigert på dag 1.
- `baseline.ts`, `driver-day.ts` og `mentor-day.ts` har forventede kriterie-ID-er og stabile fase-/dagssvar. Bruk ett historisk førsett fra dag 1 og separate daglige sett. Bevar alle frosne bekreftelser og avsendere gjennom valg og oppgradering.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` har autoritativ rolle, session selection, `#mutateRun`, støtte for gjenåpning og sperre ved ukjent eller endret schema. Følg samme kvitteringskontrakt for oppretting/valg av dag og håndter den foreskrevne duplikatdatoen uten feltoverskriving.
- `app/src/ui/App.tsx` har dagsoversikt, backend-bundet rolle-/editorflush, vurderingsnavigasjon og vern ved Chromiums tilbakebuffer. Bygg tidslinje og delstatuser på disse mønstrene. Utvid vernet til historikkflater som kan vise fadderinnhold før avslutning. Bruk endelige plan-/låseflater fra 1.6–1.7 når grunnlaget oppdateres før dispatch.
- `app/index.html` og Vite kan laste lokale ikon-/manifestressurser. Følg AD-2s statiske origin-/ressurskrav. Legg praktiske lager- og plattformobservasjoner i verifikasjonen, med eget skille mellom nettleser og installert variant.

## Tasks & Acceptance

- [x] Opprett dag atomisk med stabil ID, nøyaktige nye svarposisjoner, gyldig stigende kalenderdato og gjeldende plan. Håndter duplikat, gammel fane, rolleveksling, abort og avbrutt kvittering.
- [x] Vis kronologisk dagsoversikt med delstatuser, dagsvalg og bevart historikk. Fadder kan se begge perspektiver, og sjåførens lesemodell beholder avtalt innsyn underveis.
- [x] Verifiser datoendring, sen utvidelse, varierende faddernavn og eksisterende bekreftelser, samt daglige vurderinger uten ny førvurdering og uten arv utenfor dag 1.
- [ ] Lever manifest/ikoner for vedtatt installert variant og verifiser faktisk ressurslasting og lagerkontrakt. Oppgi faktisk installasjonsstatus og resterende HTTPS-/enhetsprøver.
- [ ] Gjennomfør korte/ordinære/utvidede løp med fiktive data. Mål autosave, refresh, normal gjenåpning og 60 sekunder frakoblet i avtalt dataprofil. Prøv installasjon, reflow, tastatur og skjermlesere på tilgjengelig utstyr.

## Design Notes

Ny oppretting innen planen trenger bare data for den nye dagen. Tidligere ulåste dager kan fortsatt velges, og senere periodeavslutning kontrollerer alle opprettede dager. Bruk den eksplisitte planutvidelsen fra 1.6. Bevar dagnummer og kronologi ved avvisning. Bruk [testprotokollen](nettbrett-testprotokoll-2026-11-20.md) når faktisk enhet og samme HTTPS-origin er tilgjengelig.

Prøv ny dag mens førlås ennå mangler. Dagen og dens egne tomme posisjoner må kunne opprettes uten å åpne ettervurderingen for registrering. Eksisterende integritetskontroll i `driver-day.ts` må skille tomme posisjoner ved oppretting på dag 2–5 fra faktisk skriving før førlås. Ingen falske sjåførbekreftelser eller arvesvar oppstår.

## Verification

- Kjør ren låst installasjon, bygg/typekontroll, lint, Node-prøver og Playwright i Chromium, Firefox og WebKit. Før separate resultater for manifest, layout, datasett, schema og faktisk lagrings-/gjenåpningsmåling.
- Prøv ett, to, tre og fem registrerte dager via ordinære handlinger. Verifiser nøyaktig 66/110/154/242 svarposisjoner med riktig versjon/dag/fase og separate historiske bekreftelser. Prøv fem lagrede løp med ett femdagersløp og behold ordinær profil ved gjenåpning.

## Implementation Notes

Implementering startet 18. november med kodegjennomgått Story 1.7 som teknisk grunnlag.

Nye dager får eksplisitte tomme etter- og faddersett også før kvittert førlås. Den tidligere leseren avviser en slik tilstand, så IndexedDB bruker schema 2. En uavhengig Edge 157.0.4341.60-prøve brukte et reelt låst schema 1-løp fra det frosne 1.7-bygget. Samme origin og profil åpnet schema 2 med identisk fagdatasnapshot, session og tidligere kommandoresultater. En eldre, fortsatt lastet fane fikk ikke skrevet og beholdt sitt ulagrede skjema. Ingen data ble opprettet gjennom den eldre fanen.

Kandidatmanifestet ble lest i en ordinær isolert Chromium 151.0.7922.34-profil på lokal sikker kontekst. `Page.getInstallabilityErrors` rapporterte ingen feil. De lokale PNG-ikonene var faktisk 192 × 192 og 512 × 512 og samsvarte med deklarasjonene. Ressursprøven observerte samme origin og ingen service worker. Faktisk installasjon, fysisk mobil/nettbrett og stabil HTTPS på målenheten står åpne.

Den første fullstendige Edge-prøven brukte ordinære skjermhandlinger og fiktive profiler. Ett, to, tre og fem registrerte dager ga 66, 110, 154 og 242 unike besvarte posisjoner, én førvurdering og historisk riktig avsender og dato på hver dagslås. Femdagersløpet startet med plan én, utvidet med fire og beholdt egenevaluering fra den opprinnelige siste dagen i tillegg til den nye siste dagen. Samme isolerte Edge-profil med fem lagrede løp hentet dag 5, faktisk dagslås og aktiv sjåførrolle på 197 ms ved refresh og 1453 ms fra ny browserprosess. Dette er kandidatmålinger 18. november på Windows, med samme lokale origin og lagring. Sluttbygget må måles separat etter review.

Kandidatens ren låste installasjon, bygg, typekontroll, lint og 54 Node-prøver passerte. 12 målrettede nettleserprøver passerte på de tre motorene. Den fulle regresjonen avdekket selektorer som nå finner både historikkdato og planlagt dato, samt både dag-1-kontekst og forklaringen om samme førvurdering. De krever oppdaterte avgrensninger og ny kjøring. Kodegjennomgang pågår.

Npm rapporterte fem høye varsler via den eksisterende utviklingskjeden Vite → picomatch 4.0.7. Pakken er merket som utviklingsavhengighet i låsfilen, og Vites sluttbygg er statiske filer. Den publiserte meldingen oppgir foreløpig ingen patchet versjon. Behold vedtatt lokal Vite-versjon og kjør frossent preview på loopback. [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

I det frosne `story-1.8-20261118-r3` bestod bygg, typekontroll, lint og 54 Node-prøver. Kontrollene av faktiske flerdagsløp, kvittert dagslås og korrekt historikk ble gjentatt i Edge 157.0.4341.60. Gjenåpning med nett tok 1116 ms, 1531 ms og 989 ms for henholdsvis ett, to og tre dager. I femløpsprofilen med 242 posisjoner i hovedløpet tok refresh 194 ms og gjenåpning 859 ms. På den samme profilen ble øktfelt og alle tre dag-1-bekreftelser kvittert i 60 007 ms nettbrudd uten forespørsler. Nettstatus kom tilbake på 12 ms.

Uavhengig prøve av faktisk Chromium-tilbakebuffer viste at rollebyttet i annen fane skjulte opprettingsfeltene. Uttrykkelig gjenopptakelse hentet samme dato og faddernavn. En separat retur etter ny dag i annen fane beholdt lokalt dag 1-valg og oppdatert tidslinje. Samme-origin-migrering fra 1.7 og manifest- og ikonprøven ble gjentatt på r3. Chromium ved faktisk 400 % zoom fra 1264 til 316 CSSpx fullførte to dager og åpnet historikkens vurderingspunkter med tastatur uten horisontal rulling.

NVDA 2026.3.1 i Edge leste feltnavn, påkrevd/ugyldig status og de faktiske feilmeldingene for dato og faddernavn i «Opprett neste dag». Etter gyldig lagring fikk overskriften «Dagsoversikt» fokus og ble lest for dag 2. Mobil VoiceOver/TalkBack, fysisk nettbrett/installert variant, skjermtastatur og samme HTTPS-origin står utestående.

Sluttmålingen av lagring etter enkeltinput dekket 23 faktiske transaksjonskvitteringer for øktfelt, før-/etter-/faddersvar, begrunnelsesutkast, frivillig evaluering, kriteriekommentar, avslagsutkast, relevansavgjørelse og planvalg. Tidsrommet var 42–428 ms på PC.

Den fulle r3-suiten bestod samtlige 234 nettleserprøver (Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5). De langvarige prøvene bekreftet ren gjenåpning under fem sekunder og kvittert registrering og låsing under 60 sekunder frakoblet. Første flush ved vedvarende skriving i øktfeltene skjedde etter 1503/1558/1564 ms. Ved 320/360/390/768/1280 CSSpx og simulert 200 % rottekst i Edge ved 390 CSSpx hadde opprettingsskjema, tidslinje og åpen historikk ingen horisontal rulling. Faktisk 400 % nettleserzoom ble prøvd separat.

Storyen står i review etter kodegjennomgang og lokal verifisering. De utestående fysiske enhets- og hjelpemiddelprøvene gjør at akseptkriteriene for installert variant og full plattformdekning fortsatt står åpne.

## Spec Change Log

## Review Triage Log

| Gjennomgang | Funn | Vurdering og rute | Bevis |
| --- | --- | --- | --- |
| Blind 1 | Testene antar én dato på dagsoversikten | medium · patch | Regresjonskjøringen viser to `time`-elementer fra tidslinje og planfelt. Avgrens og prøv begge. |
| Blind 2 | To kontekstlinjer gir testfeil i førvurdering | medium · patch | Regresjonskjøringen finner både historisk navn/dato og den nye beskjedteksten med `main .context`. |
| Blind 3 | Ekstra valglagring kan overstyre nyere fane | medium · patch | Oppretting skriver allerede sesjonsvalg atomisk. Etterlesing med `select` utfører en ny lagring. |
| Blind 4 | Stale-skjema kan fremdeles tilby umulig ny dag | medium · patch | Nyeste plan hentes, men skjema gjør ingen ny tilgjengelighetsvurdering før «Prøv igjen». Duplikatdato skal fortsatt kunne åpnes. |
| Blind 5 | Opprettings-/utvidelsesflaten kan gjenbruke gammel rolle fra tilbakebuffer | high · patch | Vaktlisten i `App` dekker bare historikk, faddervurdering og dagsoversikt. Begge nye skjemaer viser rolle- og handlingsdata før ny sjekk. |
| Blind 6 | Evaluering som bare har lagret valg forsvinner fra historikk | medium · patch | Visningen betinger seks tekstfelt eller låst beslutning. `AssessmentForm` har eksplisitt visning av lagret utkastvalg og bevart tidligere tilbud. |
| Blind 7 | Lagrede fadderutkast mangler i historikk | medium · patch | Lesemodellen inneholder separate `reasonDrafts` og `rejectionDrafts`, brukt av den låste faddervisningen. Historikken skal vise dem med utkastmerking. |
| Blind 8 | Tilbakebuffer mister aktiv historikkontroll | medium · patch | `!roleRestore` avmonterer historikk ved `pagehide`. Samme rolle/dag utløser ingen overskriftsfokus når kontrollene kommer tilbake. |
| Blind 9 | Vedlikeholdt nettleserforløp stopper før dag-2-lås | medium · patch | Kandidatprøve gikk gjennom alle registrerte dager i Edge. Automatisert ordinær dag 2 med faktisk dagslås beskytter de nye daglige flatene i regresjon. |
| Blind 10 | Vedlikeholdt ytelsestest bruker to enkeltdagsløp | low · avvist | Femløpsprofil med full femdagersflyt kjøres separat med faktisk Edge, og de korte transaksjons-/gjenåpningsprøvene beholdes i suiten. Flere minutter repetert komplett registrering i standardsuiten er unødvendig for målingen. |
| Blind 11 | Mangler feilstier i eget utvidelsesskjema | medium · patch | Eksisterende kvitteringsprøve går via dagsplanredigeringen. Test ny form ved abort og varig commit etterfulgt av lesefeil. |
| Kant 1 | Sen utvidelse unngås fra låst dag når planen har plass til videre dager | medium · patch | AC-1.6-07 og eksisterende kode aksepterer separat utvidelse fra bekreftet dag i åpent løp innen fem. Visningen strammer dette med likhet til gjeldende planlagt siste. |
| Kant 2 | Valget kan endres igjen etter kvittering | medium · patch | Den andre `select` skjer etter atomisk `finish`, og nyere annet valg har ingen revisjonskontroll ved etterlesing. |
| Kant 3 | Avvist navigasjon beholder editor med gamle feltlåser | medium · patch | `setView` uten remontering etterlater `DayDraftForm` med state fra gammel `initial` når guard avbryter ruten. |
| Kant 4 | Manglende aktiv rollekontroll ved tilbakebuffer på nye skjemaer | high · patch | Skjemaene er fraværende fra `guardedScreen`. Bevar lokal input mens vakt og ny rolle kontrolleres. |
| Kant 5 | Rollebytte mellom første sjekk og mislykket flush kan vise gammel faddermodell | high · patch | Koden sjekker ny rolle bare inne i den vellykkede flush-grenen. Feilet flush kan fjerne vakt og vise gamle bekreftelsesnavn. |
| Kant 6 | Utkast fra låst dagsvurdering mangler | medium · patch | `MentorAssessmentForm` viser bevart utkast med særskilt etikett. Historikken har tilsvarende data, men viser bare valgte faglige verdier og faktiske avgjørelser. |
| Verifikasjon 1 | Ugyldig tidligere ettersvar i schema 2 prøves ikke | medium · patch | Positiv test bruker tomme posisjoner. Fjernes verdirevisjonskontrollen, vil tidligere ettersvar kunne lastes uten at eksisterende test fanger det. |
| Verifikasjon 2 | Eget utvidelsesskjema mangler feilet etterlesing | medium · patch | Ny handling ble bare prøvd med vellykket lesing. Prøv lagret plan og én hendelse ved feilen og ny åpning. |
| Verifikasjon 3 | Historikkprøven kan passere med forvekslet før-/etterperspektiv | medium · patch | Nåværende sjekker for kommentar, plan og evaluering leser ingen svarverdier. Prøv ett punkt med avvikende verdier og riktig begrunnelse for hver rolle. |
| Verifikasjon 4 | Ingen regresjonsprøve av oppdatert dagsoversikt i tilbakebuffer | medium · patch | Tidligere prøver dekker faddereditor eller rollebytte i historikk. Prøv ny dag i annen fane og bevart lokalt dagsvalg. |
| Verifikasjon 5 | Kvittert utvidelse viser gammel plan ved lesefeil | medium · patch | `executeFollowUp` returnerer riktig `receipt.plan.lastDay`, mens panelet bygger på forrige `day.plannedLastDay`. |
| Verifikasjon 6 | Datoassertjoner finner flere elementer | medium · patch | Faktisk feillogg viser både tidslinje og planfelt. |
| Verifikasjon 7 | Opprinnelig førkontekst-test finner flere linjer | medium · patch | Faktisk feillogg i alle tre motorer viser singulær `main .context` løst til to elementer. |
