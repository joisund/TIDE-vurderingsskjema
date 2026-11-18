---
title: "Story 1.6 – Planlegge videre oppfølging og siste dag"
type: feature
story_key: 1-6-planlegge-videre-oppfølging-og-siste-dag
status: in-review
baseline_commit: 9f99575f5bf6baf154defe805acd6fe541fe32fb
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 1
story: "1.6"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5"]
approvedSource: ../planning-artifacts/story-1-6-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.6 – Planlegge videre oppfølging og siste dag

Fadder registrerer dagens oppfølgingsbehov, ser konsekvensen for planlagt siste dag og bevarer beslutningshistorikk. Sjåførens tilbud om egenevaluering følger den kvitterte planen.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.6-01 – Registrere dagens behov underveis i fadderdelen**

**Gitt** et åpent løp med opprettet dag og redigerbar fadderdel,
**Når** fadder åpner oppfølgingspunktet, også før sjåførens etterdel er fullført,
**Så** kan fadder registrere et uttrykkelig Ja/Nei-valg om videre oppfølging/flere dager; et ubesvart punkt fremstår som ubesvart og ikke som automatisk Nei,
**Og** bare Ja viser valg mellom antall ekstra fadderdager og «Utvidet kjøretrening før fadderkjøring fortsetter». Nei skjuler detaljene og bidrar med null ekstra dager,
**Og** Ja med ekstra dager krever et positivt heltall innen tilgjengelig planramme, mens Ja uten fullstendig valg forklares som et ufullstendig utkast. Ugyldig/ulagret input presenteres ikke som en ny gjeldende plan,
**Og** gjeldende planlagt siste dag vises som dagnummer i løpet, sammen med virkningen av et gyldig forslag. Dette teller registrerte dager, ikke sammenhengende kalenderdager (FR-16, AD-8, UX-DR10).

**AC-1.6-02 – Erstatte samme ulåste beslutnings effekt uten dobbelttelling**

**Gitt** initialLastDay fra opprettingen og aktive planbeslutninger,
**Når** fadder lagrer eller redigerer dagens oppfølgingsvalg,
**Så** har dagen én stabil FollowUpDecision-ID, og redigering erstatter denne beslutningens aktive valg/antall. Gjeldende plan beregnes ett sted som initialLastDay pluss summen av ekstra dager i aktive beslutninger,
**Og** med initialplan 3 gir samme dags +1 → +2 planlagt siste dag 4 → 5, ikke 6. Andre dagers beslutninger bidrar fortsatt med sin egen aktive effekt,
**Og** Ja → Nei eller bytte fra ekstra dager til kjøretreningsbehov fjerner bare samme ulåste beslutnings tidligere ekstra-dager-effekt når grensene i AC-1.6-03 tillater det. Låste beslutninger og registrert historikk bevares,
**Og** brukerflaten viser den avledede nye planen; den har ingen separat beregning eller direkte totaloverskriving som omgår domeneregelen (AD-1/8, Q7).

**AC-1.6-03 – Håndheve femdagersgrense og verne opprettede/bekreftede dager**

**Gitt** løpets registrerte dager, planbeslutninger og eventuelle sjåførbekreftelser,
**Når** en planendring, inkludert Nei eller bytte av oppfølgingstype, forsøkes gjennom UI eller applikasjonskommando,
**Så** avvises en beregnet siste dag over 5 eller under høyeste opprettede dagnummer uten å endre plan, dager eller historikk,
**Og** reduksjon til en sjåførbekreftet dag som ikke tidligere hadde et siste-dagstilbud avvises; ingen låst evaluering/bekreftelse omskrives for å få reduksjonen til å passe,
**Og** på dag 5 kan det ikke legges til dag 6. Et videre kjøretrenings-/oppfølgingsbehov kan fortsatt dokumenteres uten en utvidelse over grensen,
**Og** den lagrede planen er autoritativ for senere oppretting av neste dag etter nextDayNumber <= plannedLastDay. Denne storyen endrer ikke dagnumre, kalenderdatoer eller sjåfør-/løpstilknytning (FR-2/16, AD-8).

**AC-1.6-04 – Registrere kjøretrening som behov og avlede riktig løpsstatus**

**Gitt** fadders daglige Ja/Nei og valg av oppfølgingstype,
**Når** kjøretreningsbehov eller et annet gyldig valg lagres,
**Så** lagres kjøretrening som et oppfølgingsbehov med null ekstra dager; gjennomføring og klarsignal håndteres utenfor appen, uten ny treningsøkt, pause-/gjenopptaksfunksjon, rolle eller integrasjon,
**Og** løpsstatus avledes felles: lukket løp er Avsluttet; åpent løp med minst én aktiv Ja-beslutning, også låst Ja eller Ja til kjøretrening, er Under oppfølging; ellers er det Pågående,
**Og** historiske, erstattede Ja-valg gjør ikke alene løpet Under oppfølging. Ja → Nei på eneste aktive ulåste Ja kan gi Pågående, mens et annet aktivt/låst Ja fortsatt gir Under oppfølging,
**Og** et plan-/statusvalg avslutter eller godkjenner ikke perioden og gir ikke fullt sjåførinnsyn eller normal PDF (FR-16/UX-T1, AD-8/9/10).

**AC-1.6-05 – Lagre beslutning, plan og historikk atomisk**

**Gitt** et gyldig oppfølgingsvalg og kommando med aktiv fadderrolle, commandId, runId og expectedRevision,
**Når** endringen lagres mot siste aggregat,
**Så** kontrolleres rolle, revisjon, låser og planbegrensninger i samme readwrite-transaksjon som aktiv beslutning, gjeldende plan/revisjon og en append-only PlanEvent lagres,
**Og** hendelsen bevarer decisionId, gammel/ny siste dag, registrert dag, avsender og commandId. Også registrert kjøretreningsbehov dokumenteres når antall dager er uendret,
**Og** tidligere hendelser endres/slettes ikke når et aktivt valg erstattes; en gammel hendelse anvendes ikke på nytt som et ekstra tillegg,
**Og** ny plan og «Lagret på denne enheten» vises som gjeldende først ved complete. Gyldige endringer bruker autosave-/flush-kontrakten fra tidligere stories med AD-4s tosekundersmål; ufullstendig utkast og lagringsfeil skilles fra en kvittert plan (FR-9/16, AD-3/4/8).

**AC-1.6-06 – Oppdatere frivillig egenevaluering uten tap av tekst eller historikk**

**Gitt** sjåførens ettervurdering og evalueringsflyt fra Story 1.4,
**Når** en planendring kvitteres før sjåførens etterbekreftelse,
**Så** beregnes siste-dagstilbudet etter ny gjeldende planrevisjon, mens førstegangstilbudet på dag 1 beholdes. Ett-dagsløp får fortsatt ett felles feltsett,
**Og** faktisk skrevet tekst slettes ikke når et tilbud flyttes; den bevares på sin dag, og sjåførens fullføring følger not_offered/skipped/submitted-kontrakten i AD-8/Story 1.4,
**Og** ConfirmDriverDay bruker siste planrevisjon; en gammel bekreftelsesdialog kan ikke låse et foreldet tilbud. Faktisk plan lastes og tekst bevares ved revisjonsavvik,
**Og** ved utvidelse etter bekreftet sluttegenevaluering beholdes den låst på opprinnelig dag. På den nye planlagte siste dagen tilbys en ny frivillig evaluering når dagen åpnes. Ingen historisk evaluering flyttes, slettes eller åpnes igjen (FR-8/16, AD-5/6/8).

**AC-1.6-07 – Bevare låst dagsregistrering og tillate separat senere utvidelse**

**Gitt** en dagsplanbeslutning som er frosset ved dagslåsing,
**Når** samme beslutning forsøkes endret fra en ny eller gammel visning/kommando,
**Så** avvises endringen også ved forsøk på Ja → Nei; låst historikk og andre dagers aktive beslutninger forblir uendret,
**Og** senere løpsutvidelse i et fortsatt åpent løp registreres med en ny separat beslutnings-ID og kan bare øke planen innen fem dager. Den redigerer ikke den låste dagsregistreringen og bevarer registrert dag/avsender i planhistorikken etter AD-8,
**Og** et lukket løp avviser alle planendringer og senere utvidelser; verken nye beslutnings-ID-er, profilendring eller rollebytte gjenåpner løpet,
**Og** denne storyen fungerer med ulåst dag fra tidligere stories. Regler for låst dag, senere utvidelse og lukket løp kan prøves med kontrollerte domenetilstander; ConfirmMentorDay, CloseRun og oppretting av videre dager er ikke forutsetninger for at daglig planredigering skal fungere (AD-6/8/10).

**AC-1.6-08 – Håndtere gjentakelser, gamle faner og nett-/lagringsfeil**

**Gitt** en planendring med dobbeltklikk, mistet kvittering, foreldet revisjon, skrivefeil eller nettbrudd i lastet app,
**Når** lagring forsøkes og eventuelt gjentas,
**Så** returnerer samme commandId/payload tidligere resultat før revisjonssjekk uten ny utvidelse eller duplisert PlanEvent. Samme ID med endret payload avvises,
**Og** en ny kommando fra gammel revisjon overskriver ikke en nyere plan; faktisk snapshot lastes og ulagret input beholdes separat for kontroll uten automatisk sammenslåing,
**Og** abort før complete bevarer tidligere beslutning, plan og historikk samlet; gjenåpning etter complete viser hele den nye tilstanden. Ulagrede ønsker omtales ikke som gjeldende plan, og et rolle-/ruteskifte som ville miste input avbrytes,
**Og** 60 sekunders nettbrudd med lastede ressurser og fungerende lokalt lager tillater fortsatte gyldige planendringer uten tap av kvitterte data. Normal gjenåpning med nett følger AD-4s femsekundersmål og betingelser; schemaendringer bevarer eksisterende låser/planhendelser atomisk (AD-3–5/13).

**AC-1.6-09 – Vise planen med riktig innsyn og tilgjengelige betingede felt**

**Gitt** oppfølgingspunktet i fadderdelen og dagsoversikten,
**Når** brukeren ser eller betjener planen i fadder- eller sjåførrollen,
**Så** kan bare fadder registrere planvalg, og fadder kan lese registrerte behov og planhistorikk med faktisk dag/avsender. Sjåfør ser gjeldende planlagt siste dag underveis, men ikke begrunnet planhistorikk eller fadderinnhold før avslutning,
**Og** Ja/Nei, oppfølgingstype, antall ekstra dager, gjeldende/foreslått plan og feltfeil har tydelige navn, tekstlig status og programmatisk tilknytning. Nei-felt som er skjult skal heller ikke ligge i tastaturrekkefølgen,
**Og** rollebytte følger tidligere stories med flush, ryddet model/dialog/DOM og ingen lekkasje gjennom tilbake-navigasjon. Samme felles read model viser riktig Pågående/Under oppfølging/Avsluttet på relevante flater,
**Og** DESIGN/EXPERIENCE og AD-12s bredder, tekstforstørrelse, mobilskjermtastatur, tastatur og skjermlesere prøves uten horisontal registreringsrulling, avkutting eller skjult fokus. Planstatus annonseres uten å flytte fokus; prøvde enheter/versjoner og eventuelle gap registreres (FR-4, NFR-1/2, AD-9/12).

</frozen-after-approval>

## Code Map

- `app/src/domain/run.ts` eier dagsidentitet, rolle og `dayLocks`. `driver-day.ts` har `currentPlan`, `offersEvaluation` og kontroll av tidligere tilbud. Gjenbruk startplanen som planrevisjon 1. Bruk gjeldende plan og kvitterte planrevisjoner til å kontrollere faktisk historisk tilbud der informasjonen finnes. Nye data bevares additivt med tidligere kvitteringer og frosne egenevalueringer.
- `app/src/application/run-application.ts` avleder løpsstatus, aktuell plan og planlagt dato i lesemodellen. Bruk samme domeneavledning på alle flater. Bare fadderens modell får se aktivt valg og historikk med avsender. Behold bare planlagt siste dag/dato og felles status på flater som er synlige for sjåføren underveis.
- `app/src/adapters/indexeddb/run-store.ts` har autoritativ aktørkontroll, `#mutateRun`, snapshotvalidering og idempotente kvitteringer. Bruk én readwrite-transaksjon for aktiv beslutning, plan og ny historikkhendelse. Gjør samme dags ID stabil, og bruk separat ID for en senere utvidelse fra låst dag.
- `app/src/ui/App.tsx` støtter flush av aktiv editor ved navigasjon og rollebytte. Bruk `MentorAssessmentForm.tsx`, `use-mentor-draft.ts`, `use-autosave-deadline.ts` og godkjent fadderskisse for valg, antall, kvittering og feil. Utkast- og beslutningsskriving deler løpets revisjon. Sekvenser planer og vurderingsendringer gjennom samme aktive editors flush, slik at samtidige UI-handlinger ikke gjør hverandre foreldet.

## Tasks & Acceptance

- [x] Implementer daglig planvalg og separat senere utvidelse i domenet. Gjenbruk én avledning av plan og løpsstatus. Valider femdagersgrensen, registrerte dager og bekreftet sjåførhistorikk.
- [x] Legg til atomisk lagring av aktiv beslutning, planrevisjon og append-only `PlanEvent`. Håndhev permanent lås og idempotens. Bevar gyldige tidligere poster.
- [x] Vis fadderens Ja/Nei, underfelt, gjeldende/foreslått plan og historikk med korrekt rolleinnsyn og tastatur-/fokushåndtering.
- [x] Koble plan til dagens tilbud om egenevaluering. Gjenta bekreftelse mot riktig revisjon og prøv at tekst før planbytte og låst historisk evaluering bevares.
- [x] Prøv hele lagrings- og rolleflyten i faktiske lokale nettlesere med fiktive data.
- [ ] Prøv fysisk mobil/nettbrett, mobilt skjermtastatur og skjermleser etter AD-12.

## Design Notes

Bevar gjeldende plan separat fra brukerens validerte forslag og ufullstendige input. Tidligere hendelser er historikk, og beregning av planen bruker aktive beslutninger. Både plan og status skal følge den kvitterte tilstanden. Knyt relevant, påkrevd planvalg og dets feltfeil til senere fullføringskontroll.

Bruk [godkjent fadderskisse](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-fadder.html) og reglene i AD-8. Dag 2–5 og låst/lukket tilstand kan verifiseres med kontrollerte domenefiksturer til de har egne ordinære handlinger. Dokumenter faktisk UI-flyt på dagens eksisterende løp.

## Verification

- Kjør bygg/typekontroll, lint, Node-prøver og Playwright i Chromium, Firefox og WebKit. Prøv med fiktive data og faktisk lokal lagring tidligere plan, ny gyldig plan, stale fane, tapt kvittering og 60 sekunder frakoblet.
- Prøv tastatur, tekstforstørrelse og fokus med betingede felt. Registrer fysisk enhets- og hjelpemiddelprøving når den faktisk er utført.

## Implementation Notes

Implementering startet 18. november med kodegjennomgått Story 1.5 som teknisk grunnlag.

Et uavhengig kandidatbygg passerte bygg/typekontroll og praktisk prøve i Edge 157.0.4341.60 ved 316 CSSpx og Chromium ved faktisk 400 % nettleserzoom. Med fiktivt éndagsgrunnlag og startplan tre ble samme dags +1 → +2 registrert som plan dag 3 → 4 → 5. Kjøretreningsbehovet ga null ekstra dager og førte planen tilbake til dag 3. Et etterfølgende Nei gjorde status Pågående. Fire planhendelser hadde riktig avsender. Sjåfør så gjeldende plan uten fadders historikk etter rollebytte og refresh. Følg review og full regresjon før sluttverifikasjon.

Bygg/typekontroll, lint og 42 Node-prøver passerte før review. Seks målrettede Playwright-flyter passerte i Chromium, Firefox og WebKit etter retting av to testharness-race. Nettbrudd passerte etter 60424/60473/60625 ms uten nettverksforespørsler. En uavhengig regresjonsrunde ga 30 av 30 for fadderens registrering og rollegjenoppretting. Utfallet etter kvittert plan men feilet kontrollesing ble reprodusert i Edge. Den gamle fanen viste dag 3 og ulagret status, mens andre fane leste kvittert dag 4 med én hendelse. Den tilstanden inngår i review.

Hele nettlesermatrisen på reviewbygget `story-1.6-20261118-r1` passerte 192 av 192. Nåværende reviewretting gjelder feilsekvenser og eldre planproveniens som første matrise ikke dekket. Se tabellen.

Planlagring kvitterer nå plan, ny hendelse og tilhørende feltstatus i samme transaksjon som aggregatet. Etterfølgende lesefeil tilbyr bare ny lesing. Ved nyere revisjon sammenholdes original hendelses-ID med lagret historikk, og eventuelt annet lokalt fadderutkast beholdes for uttrykkelig sammenligning. Tidligere støttet, historikkløs plan med revisjon over 1 får en eksplisitt, additiv startrevisjon og -dag ved første nye beslutning. Dermed kan siste dag bevares uten å legge til oppdiktede beslutninger eller hendelser. Ordinære nye løp starter replay ved revisjon 1. Tilbakebufferens lokale tilstand ryddes når en påbegynt rolleadopsjon eller navigasjon forlater fadderflaten.

Etter retting passerte 15 målrettede Node-prøver og 27 Playwright-prøver. Ytterligere ni nettleserprøver av skrive-/leseutfall passerte på siste byggevariant. Frossen kopi `story-1.6-20261118-r2` bestod bygg/typekontroll, lint, alle 47 Node-prøver og 204 nettleserprøver i Chromium, Firefox og WebKit. Planen ble endret og lagret etter 60439/60547/60656 ms frakoblet uten nettverksforespørsler. Den uavhengige Edge-prøven bekreftet kvittert dag 4 etter etterfølgende lesefeil med én historikkhendelse før og etter ny lesing. Planvirkning 3 → 4 → 5 → 3, status og rolleinnsyn bestod på nytt i Edge ved 316 CSSpx og i faktisk 400 %-zoom i Chromium. En separat, ordinær Edge-flyt fra nyopprettet løp nådde 66 unike kvitterte svar, to sjåførlåser, begrunnet relevansavslag, frivillig tekst, økt over midnatt og kvittert Nei før dagslåsen. Senere utvidelse er verifisert gjennom applikasjon og IndexedDB med kontrollert låst dag. Fysisk enhets-/hjelpemiddelverifikasjon og ordinær flerdagsflyt står åpne.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Kvittert skriving får feilstatus ved senere lesefeil eller nyere revisjon (blind gjennomgang) | Medium. Skill kvittert skriving fra presentasjon av nyeste plan. Prøv begge sekvenser med faktisk lagring. |
| Endret form kan retry en eldre uavklart plan (blind gjennomgang) | Medium. Sperr planfeltene synlig og gjenoppta eksakt forespørsel. Bevar andre utkast. |
| Første oppfølging forkorter eldre plangrunnlag (blind gjennomgang) | Medium. Bevart eldre startrevisjon og -dag er et dokumentert utgangspunkt for nye hendelser, med opprinnelig startplan urørt. |
| Dag 1 kan miste gyldig tidligere siste-dagstilbud (blind gjennomgang) | Medium. Kontroller faktisk opprinnelig plan og kjent tilbud, og bevar låst evaluering. |
| Replay tolker manglende første hendelse som eldre plangrunnlag (blind gjennomgang) | Medium. Valider eksplisitt lagret historikkstart og sammenhengende hendelser. |
| Konflikt kan få ny planvirkning uten synlig forslag (blind gjennomgang) | Medium. Vis ny planvirkning eller konkret feil før uttrykkelig nytt forsøk. |
| Fokus forsvinner når Lagre/Forkast fjernes (blind gjennomgang) | Medium for tastatur. Gjenopprett relevant fokus og prøv begge handlinger. |
| Mangellenke kan peke på sperret planfelt (blind gjennomgang) | Medium for tastatur. Vis mangeltekst uten lenke ved sperret redigering. |
| Separat senere utvidelse er bare domeneprøvd (blind gjennomgang) | Dekningsgap. Prøv autoritativ kommando, låst fikstur, egen ID, historikk og replay i adapteren. |
| Sen førstegangslagring forkorter historikkløs plan (kanttilfeller) | Medium. Samme bevaring av tidligere oppgitt arkitektursnapshot. |
| Nyere revisjon etter vellykket skriving får falsk avvisning (kanttilfeller) | Medium. Bekreft original hendelse i nyere historikk og avklar lokale endringer separat. |
| Planinndata endres mens tidligere kommando venter (kanttilfeller) | Medium. Samme synlige sperre og forsøk med identisk kommando. |
| Sparsom beslutningsliste kan passere lagringskontroll (kanttilfeller) | Medium. Avvis tomme posisjoner og prøv adapterlesing. |
| Hendelse kan tilhøre dag utenfor plan på hendelsestidspunktet (kanttilfeller) | Medium. Kontroller dagnummer mot historisk plan. |
| Ugyldig planlenke i IndexedDB er uprøvd (verifikasjon) | Dekningsgap. Bygg lagret hendelsesrekkefølge med feil tidligere siste dag. |
| Yngre lagret plan validerer ikke tidligere falskt tilbud i eksisterende prøve (verifikasjon) | Dekningsgap. Prøv kjent mellomrevisjon mot korrupt evalueringsproveniens gjennom adapter. |
| Kontroller mangler for ufullstendig plan er uprøvd (verifikasjon) | Dekningsgap. Prøv lenke til manglende antall og bevart valg. |
| Kvittert eldre plan forkortes ved null-dagers behov (verifikasjon) | Medium. Gjenskapt med historikkløs revisjon 2. Prøv bevart plan og ny korrekt historikk. |
| Misvisende status etter etterfølgende lesefeil (verifikasjon) | Medium. Gjenskapt i Edge med fullført `readwrite` og sperret `readonly`. Prøv korrekt kvittering og ny lesing uten dobbel historie. |
