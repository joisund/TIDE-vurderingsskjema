---
title: "Story 2.1 – Avslutte perioden og åpne fullt innsyn"
type: feature
story_key: 2-1-avslutte-perioden-og-åpne-fullt-innsyn
status: in-review
baseline_commit: 8bd1c09b1db7c42130c9839f0386280b75df18bc
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 2
story: "2.1"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"]
approvedSource: ../planning-artifacts/story-2-1-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 2.1 – Avslutte perioden og åpne fullt innsyn

Fadder kan avslutte perioden med en uttrykkelig konklusjon. En frosset, komplett dokumentkilde gir begge roller samme lesetilgang etter kvittert lukking.

## Akseptansekriterier

<frozen-after-approval>

**AC-2.1-01 – Fylle Konklusjon med frivillig tekst og uttrykkelig valg**

**Gitt** et åpent løp og fadder som aktiv rolle,
**Når** fadder åpner avslutningsflaten for å avslutte en ferdig periode,
**Så** samles feltene under «Konklusjon»: valgfritt fritekstfelt først, deretter påkrevd Godkjent / Oppfølgingsbehov rett under, uten forhåndsvalg eller automatisk avledning fra vurderingssvar,
**Og** tom konklusjonstekst er gyldig og har ikke A10-minimum. Faktisk skrevet tekst lagres som utkast, kan gjenåpnes og redigeres frem til periodens avslutning, også etter siste dagslås,
**Og** faddertekst/valg skrives bare av fadderrollen; sjåfør kan ikke godkjenne på fadders vegne. «Utfall» brukes ikke som ord i grensesnittet, og gruppen inngår i fullt skjema etter avslutning fremfor en privat fagrapport,
**Og** konklusjonsutkast følger tidligere stories med autosave, sann lagringsstatus og flush før rolle-/ruteskifte. En frivillig tekst kan ikke ignoreres som ulagret fordi den kan være tom (FR-8/9/15, AD-4/6/9).

**AC-2.1-02 – Kreve minst én dag og alle opprettede dager bekreftet**

**Gitt** et forsøk på Avslutt perioden gjennom UI eller applikasjonskommando,
**Når** fullføringskontrollen kjøres mot siste løpsrevisjon,
**Så** kreves minst én opprettet dag, og hver opprettet dag skal være kvittert og permanent låst etter Story 1.7; en tom dagliste eller en uferdig dag kan ikke passere eller utelates,
**Og** periodens ene førbekreftelse, daglige sjåfør-/fadderbekreftelser, riktige svarsett og dokumentgrunnlag skal foreligge. Mangler identifiserer berørt dag/del og fører til riktig tilgjengelig kontroll uten å åpne låst innhold for endring,
**Og** valgt Godkjent/Oppfølgingsbehov og faktisk avsluttende faddernavn skal foreligge, og berørt innhold skal være kvittert. Tom frivillig tekst, Kan bli bedre eller gyldig dokumentert avslag er ikke avslutningsmangler,
**Og** kravet gjelder alle faktisk opprettede dager. Ubrukte planlagte dager kreves ikke opprettet som et nytt sluttvilkår; avslutning endrer heller ikke allerede låst evaluering eller planhistorikk for å tilpasse dem (FR-15, AD-6/10).

**AC-2.1-03 – Varsle permanent lukking og fullt sjåførinnsyn før bekreftelse**

**Gitt** oppfylt sluttkontroll og fadders valgte konklusjonsstatus,
**Når** avslutningsdialogen åpnes,
**Så** vises rolle, faktisk avsluttende faddernavn, dato, valgt Godkjent/Oppfølgingsbehov og konsekvensen «Ingen flere dager kan legges til. Sjåføren får tilgang til hele skjemaet»,
**Og** det er tydelig at perioden lukkes permanent og konklusjonen låses, mens videre tiltak etter avslutning ligger utenfor det avsluttede løpet,
**Og** bare en uttrykkelig bekreftelseshandling sender CloseRun. Avbryt/lukk/Escape oppretter ingen avslutning og utvider ikke innsyn eller eksportadgang,
**Og** utfylte eller lagrede felter, siste dagslås og oppfølgingsbehov avslutter aldri løpet automatisk (FR-13/15/16, AD-6/10).

**AC-2.1-04 – Bygge en komplett, frosset dokumentkilde**

**Gitt** et fullført løp og gjeldende avslutningsopplysninger,
**Når** ClosureSnapshot bygges og kontrolleres før avslutning,
**Så** inneholder det fiktiv identitet/tilhørighet, alle opprettede dager kronologisk med øktopplysninger, løpets 22 kriterier/tekst/rekkefølge, én førvurdering med opprinnelig bekreftelse og hver dags etter-/faddersvar med separate bekreftelser,
**Og** egne relevansbegrunnelser, separate fadderavgjørelser med avslagskommentarer, øvrige kommentarer, alle egenevalueringer med faktisk dag/planversjon, aktive/historiske oppfølgingsbeslutninger og planhendelser bevares med sine faktiske avsendere,
**Og** valgfri konklusjon, valgt status, faktisk avsluttende actor/navn/rolle/tid, kriterie-/regelversjoner og frosset pdfLayoutVersion inngår. Verdiene kommer fra løpets historiske data, ikke nyere globale profiler eller kriterier,
**Og** kontrollen verifiserer nøyaktig kriterie-ID-dekning, 22 + 44 × antall dager, nødvendige bekreftelser og sammenheng i dokumentgrunnlaget, uten ny faglig validering av låst historikk etter endrede globale regler. Et ufullstendig grunnlag stopper vellykket avslutning og kan ikke gi et lukket, delvis dokument (FR-15/17, AD-7/10/11).

**AC-2.1-05 – Lukke hele løpet i én atomisk transaksjon**

**Gitt** gyldig, kvittert innhold, riktig aktiv fadderrolle, commandId og forventet revisjon,
**Når** CloseRun utføres,
**Så** leses siste aggregat, og rolle/låser/revisjon/fullføringskrav kontrolleres igjen i samme readwrite-transaksjon som valgt status, frivillig konklusjon, avsluttende actor/tid, ClosureSnapshot og lukket lifecycle skrives,
**Og** det utføres ikke nettverkskall eller PDF-generering som kan la transaksjonen utløpe. Avsluttende tidspunkt lagres som ISO 8601 UTC og vises lokalt, uten påstand om verifisert tidsstempel/e-signatur,
**Og** «Avsluttet», fullt innsyn og eksportadgang avledes først fra kvittert lukket snapshot etter transaksjonens complete. UI åpner ikke innsyn optimistisk mens lagring pågår,
**Og** begge valgene Godkjent og Oppfølgingsbehov gir samme permanente lukking og varige fulle innsyn. Under oppfølging som tidligere status overstyrer ikke et nå lukket løp; lagrede planhendelser bevares (FR-11/15, AD-3/6/8/10).

**AC-2.1-06 – Gi begge roller varig fullt skjema fra samme snapshot**

**Gitt** et kvittert avsluttet løp med enten Godkjent eller Oppfølgingsbehov,
**Når** sjåfør eller fadder åpner historikk/fullt skjema etter rollebytte, navigasjon eller normal gjenåpning,
**Så** får begge varig lesetilgang til hele skjemaet fra samme ClosureSnapshot, inklusive fadders vurderinger/kommentarer, separate relevansavgjørelser, planhistorikk og konklusjon,
**Og** sjåførens egne bekreftelser vises som bekreftelse av egne deler. Fadders meninger eller avslag fremstilles ikke som godkjent av sjåfør, og historiske før-/etter-/fadderbekreftelser beholder faktisk del/dag/navn,
**Og** sen utvidelse viser både tidligere og eventuell ny egenevaluering på faktiske dager; ingen ny global profil-/regel-/hjelpeversjon endrer det avsluttede innholdet,
**Og** før kvittert avslutning beholdes AD-9s begrensede sjåførinnsyn. Rollebytte rydder fortsatt forrige model/dialog/DOM og leser riktig løp/snapshot (FR-4/8/15, AD-9/10).

**AC-2.1-07 – Avvise alle endringer som ville gjenåpne eller omskrive avsluttet løp**

**Gitt** et kvittert lukket løp,
**Når** noen forsøker å opprette nye dager, endre plan, svar, kommentarer, relevansbehandling, konklusjon, valgt status eller historiske identitets-/bekreftelsesfelt,
**Så** avvises mutasjonen i applikasjons-/domenelaget også fra gammel skjerm/fane, profil-/løpsendring eller annen simuleringsrolle,
**Og** nye commandId-er eller forsøk på Fortsett med oppfølging gjenåpner ikke løpet. Lagrings-/genereringsfeil etter avslutning gir heller ingen slik rettingsvei,
**Og** begge avslutningsvalg stenger for nye dager også om færre enn fem er brukt. Videre oppfølgings-/kjøretreningsbehov håndteres utenfor dette løpet,
**Og** tidligere daglige låser består, og innholdet i ClosureSnapshot holdes uforanderlig som kilde for senere eksport. Ingen angre-, gjenåpnings- eller administrativ rettingsfunksjon innføres (FR-2/14/15/16, AD-6/10).

**AC-2.1-08 – Håndtere avbrudd, gjentatte forsøk og nettbrudd uten delvis innsyn**

**Gitt** avbrudd før/etter complete, mistet kvittering, dobbeltklikk, kvotefeil eller foreldet avslutningsdialog,
**Når** faktisk tilstand gjenåpnes og avslutning eventuelt forsøkes igjen,
**Så** finnes enten hele det åpne løpet med tidligere dagslåser og konklusjonsutkast, eller komplett lukket løp med ClosureSnapshot og fullt innsyn, aldri en delvis avslutning eller delvis utvidet tilgang,
**Og** samme commandId/payload returnerer lagret resultat før revisjonskontroll uten ny avslutning. Endret payload med samme ID avvises; nye kommandoer kan ikke omskrive en allerede kvittert avslutning,
**Og** en ny kommando med foreldet revisjon overskriver ikke nyere konklusjon/tilstand. Faktisk snapshot lastes før nytt forsøk, og ulagret tekst beholdes separat uten automatisk sammenslåing eller databasesletting,
**Og** 60 sekunders nettbrudd i lastet app med lokale ressurser og fungerende lager tillater avslutning; normal gjenåpning med nett følger AD-4s mål/betingelser. Eventuelle schemaendringer bevarer avslutningssnapshot og eksisterende låser atomisk (FR-9/10/11/15, AD-3–5/13).

**AC-2.1-09 – Avslutte og lese hele skjemaet tilgjengelig på mobil**

**Gitt** Konklusjon-gruppen, sluttkontrollen, avslutningsdialogen og fullt skjema i S10,
**Når** funksjonene prøves på AD-12s vedtatte nettlesere/bredder/enheter med tekstforstørrelse, tastatur og skjermlesere,
**Så** kan frivillig tekst, påkrevd valg, mangler og permanent lukke-/innsynskonsekvens oppfattes uten farge alene. Vedvarende etiketter, programmatisk feiltilknytning og leserekkefølge følger EXPERIENCE,
**Og** dialogen har forståelig navn, fokusbegrensning, tilgjengelig avbryt/bekreft, Escape uten avslutning og fokus tilbake. Mobilskjermtastatur, sticky innhold og forstørrelse skjuler ikke fokus eller handlinger,
**Og** fullt skjema er lesbart med lange tekster, tydelige avsendere/dager og skrivebeskyttet innhold. DESIGNs systemfont/profil/tokens videreføres på skjerm; ingen ny skriftretning eller privat rapportflate tilføyes,
**Og** alle ressurser til disse flatene er tilgjengelige lokalt før registrering etter AD-2. Faktisk prøvde enheter/versjoner og eventuelle gap registreres, og avslutningsresultat/lagringsstatus formidles uten unødvendig fokusflytt (NFR-1/2/6, AD-2/9/12).

</frozen-after-approval>

## Code Map

- `app/src/domain/run.ts`, `checkMentorDay`, `dayLocks` og etablerte lesekontroller fra 1.7 er grunnlag for løps-/dagslåser og sjekk av alle faktiske opprettede dager. Bruk historisk kriterie-/regelgrunnlag, separate bekreftelser og riktig dagsvisning fra 1.8.
- `baseline.ts`, `driver-day.ts` og `mentor-day.ts` eier svar-/aktørversjoner, egenevaluering og relevansavgjørelser. `follow-up.ts` eier aktive beslutninger og append-only planhendelser. Behold eventuell eldre kjent planbase som den er registrert, med hendelser og avsendere fra verifisert historikk. Utkast til begrunnelser og avslag holdes synlig adskilt fra faktisk valgt svarbegrunnelse og avgjørelse. Den komplette kjeden kan ha flere avsluttende faddernavn på ulike dager. Gjenbruk samme validering av referanser i en felles dokumentkontroll for både avslutning og PDF-porten i Story 2.2.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` har autoritativ rolle-/låse-/revisjonskontroll, kvitteringer, schema og `#mutateRun`. Kontroller konklusjonsutkast, avslutningsgrunnlag og permanent lukking på samme kontrakt. La lukket status, fullt innsyn og eksportgrunnlag bygge på kvittert snapshot.
- `app/src/ui/App.tsx` og tidligere kontroller har aktiv editorflush, konsekvensdialoger, sanne statuser og fokus. Gjenbruk integrert historikk fra 1.8 på [avslutningsflaten](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-avslutning.html) og i fullt, skrivebeskyttet skjema. `DayTimeline` og `DayHistory` fra 1.8 viser kronologi, dagstatus og separate perspektiver. Bruk frosset lesemodell for avsluttet periode og behold rolleavgrensningen for åpne løp. Bygg på tilbakebuffervakten og verifiser annen fane som fullfører avslutning.

## Tasks & Acceptance

- [x] Lagre frivillig konklusjon og eksplisitt Godkjent/Oppfølgingsbehov som fadderutkast. Bruk autoritativ flush og lesemodell med avtalt innsyn.
- [x] Kontroller hvert faktisk opprettet dagsgrunnlag og bygg et komplett versjonert `ClosureSnapshot`. Kontroller struktur og historiske referanser. Bevar frosne tekster, avsendere, plan og bekreftelser.
- [x] Implementer `CloseRun` atomisk og vis eksplisitt permanent konsekvens i dialog, inkludert fullt sjåførinnsyn. Prøv begge valg, avbrytelse, feil, replay, gammel fane og nettbrudd.
- [x] Vis fullt historisk skjema etter kvittert lukking, med samme snapshot for begge roller. Forsegl alle endringsveier og prøv gjenåpning av det lukkede løpet til lesing.
- [ ] Kjør reell nettleserflyt med fiktive data, alle bekreftelser, fadderbytte, lange tekster, riktig fokus og faktisk hjelpemiddel-/utstyrsdekning.

## Design Notes

Snapshotet er dokumentkilden for Story 2.2 og inneholder frosset layoutversjon fra første støttede PDF-oppsett. Verifiser grunnlaget før lukking. Fullføringslisten omfatter opprettede dager og respekterer godkjent tidlig avslutning. All tekst beholdes i historisk form. Bruk AD-10 og AD-11 til grensesnitt mot eksport. Frivillighet for konklusjonstekst og separat påkrevd konklusjonsvalg skal være tydelig.

## Verification

- Kjør bygg/typekontroll, lint, Node-prøver og Playwright i Chromium, Firefox og WebKit. Prøv langt og tomt utkast, alle låser, eksakte ID-er og dokumentdekning, begge konklusjonsvalg og innsyn før/etter kvittering.
- Prøv 60 sekunder frakoblet, abort og gjenopptakelse med samme datagrunnlag. Registrer faktisk tastatur, reflow, skjermleser og utstyrsprøving.

## Implementation Notes

Implementering startet 18. november fra 1.8s kodegjennomgåtte flerdagsbygg. Det bestod 54 Node-prøver og 234 nettleserprøver. Lokal schema- og rollehistorikk er verifisert med fiktive data. Fysiske nettbrett-/mobilprøver fra Epic 1 står i review.

Forprøven i faktisk Edge 157.0.4341.60 avsluttet med Godkjent etter én låst dag av en tredagersplan og tom oppsummering. Det utvidede femdagersløpet ble avsluttet med Oppfølgingsbehov etter 60 381 ms i nettbruddsforløpet, lengre fiktiv svensk/norsk tekst og et eget avsluttende faddernavn. Ordinære skjermhandlinger ga 66 og 242 unike svarposisjoner. Begge roller leste samme innhold. Gjeldende låste dag og avsluttet tilstand kom tilbake på henholdsvis 919 og 1002 ms etter lukking av Edge-profilen. Det avsluttede løpet beholdt historiske avsendere, tekster fra alle registrerte dager og konklusjonen.

En lokal forprøve migrerte database fra schema 2 til 3 på identisk origin og profil. Alle fiktive løpsresultater, sesjonsdata og kommandokvitteringer var identiske. Den eldre fanen fikk skrivefeil og beholdt sitt ulagrede skjema.

NVDA 2026.3.1 leste det faktiske kandidatvarselet i Edge med valgt Oppfølgingsbehov, avsluttende faddernavn og dato, permanent lukking og sjåførens fulle innsyn. Escape ga fokus tilbake til «Kontroller avslutning». Etter kvittering leste NVDA overskriften «Hele skjemaet». Prøvene gjentas på sluttbygget etter kodegjennomgang.

På det frosne sluttbygget `story-2.1-20261118-r2` fullførte ordinær Edge-flyt ett, to, tre og fem dager med 66/110/154/242 unike posisjoner. Godkjent ble prøvd med tom konklusjon og én dag av tre planlagte. Oppfølgingsbehov ble prøvd med lang tekst, eget avsluttende faddernavn og fem låste dager. Begge roller leste samme historiske vurderinger etter kvittering.

Avbruddsprøven beholdt åpent løp og konklusjonsutkast før complete. Lesefeil etter varig commit åpnet deretter én kvittert avslutning. I femløpsprofil med schema 3 ble perioden avsluttet etter 60 667 ms fra nettbruddets start uten nye ressursforespørsler. Refresh til riktig dag, rolle og lås tok 297 ms, og gjenåpning i ny browserprosess med samme profil tok 1033 ms. Faktisk oppgradering 2 → 3 bevarte datagrunnlag og sperret eldre fane.

Faktisk Chromium-tilbakebuffer bevarte separat ulagret konklusjon da en annen fane både avsluttet og byttet rolle. Fadder kunne gjenoppta lokal tekst og uttrykkelig åpne lagret tilstand. NVDA 2026.3.1 i Edge 157 leste navn, dato, valgt konklusjon, permanent lukking og sjåførinnsyn. Escape ga riktig fokusretur, og «Hele skjemaet» ble lest etter vellykket avslutning. Ved faktiske 400 % nettleserzoom, fem testbredder og simulert 200 % tekst ble 10 000 ubrutte tegn i fullt skjema prøvd uten horisontal rulling.

Avsluttende faddernavn foreslås fra siste registrerte dag. Fadder kan skrive korrekt navn i avslutningsflaten, og historiske dagsbekreftelser bevares. Dialogen viser Oslo-dato, ber om ny kontroll ved datobytte og kvitterer faktisk UTC-tidspunkt for uttrykkelig bekreftelse. Fysisk mobil/nettbrett, mobilskjermlesere og skjermtastatur står åpne.

Bygg, typekontroll, lint og alle 57 Node-prøver bestod på r2. Full første nettleserkjøring på r2 ga 251/252. Den eksisterende WebKit-prøven av synlig tastaturfokus i oppfølgingsplanen ved 200 % tekst fikk viewport-andel 0 én gang. Den samme prøven bestod 8/8 omkjøringer på det eksakte r2-bygget. Forrige fullregresjon på reviewbygget var 246/246. Første r2-avvik er beholdt som testobservasjon. Faktisk fysisk nettbrettprøve av fokus og skjermtastatur er fortsatt åpen.

Fastslåtte reviewfunn er rettet og verifisert, inklusive korrekt historisk A10-sti, Oslo-midnatt, felt og fokus, korrupt historikk, kommandoavvisning etter lukking og de atomiske schema-/lagringsreglene. Status er fortsatt review for fysisk mobil/nettbrett og den resterende hjelpemiddelmatrisen.

## Spec Change Log

## Review Triage Log

| Gjennomgang | Funn | Vurdering og rute | Bevis |
| --- | --- | --- | --- |
| Blind 1 | Manglende navn eller valg gir ingen umiddelbar fokusflytting eller opplesing | medium · patch | `review` setter synlige feilstater og returnerer. Fokus blir på kontrollknappen, under de nye feltfeilene. |
| Blind 2 | Manglende øktfelt åpner generell faddervurdering | medium · patch | `checkClosureDays` taper feltnøkkelen, mens `showAssessmentScreen` allerede kan fokusere riktig felt på riktig dag. |
| Blind 3 | Uforenlig navn i låst bekreftelse kommer til irreversibel dialog | medium · patch | Adapterens opprinnelige lesing verifiserer navnets form, mens likhet med låst identitet først kontrolleres inne i `closeRun`. Feltet kan ikke rettes fra dialogen. |
| Blind 4 | Gjennomgått dato og kvittert dato kan avvike ved midnatt | medium · patch | Dialogen formaterer egen klokke. Kommandoen tar ny UTC-tid ved klikk. Avvis bekreftelse som er datomessig foreldet i Oslo og be om ny sluttkontroll. |
| Blind 5 | Låst førarv kan stoppe daglig ettervurdering med dagens A10-krav | high · patch | Lesenormen tillater gyldig historisk begrunnelse. `AssessmentForm`, lagring av egenevaluering og `confirmDriverDay` bruker fortsatt sjekken for ny tekst på det skrivebeskyttede arvesvaret. |
| Blind 6 | Framtidige kriterie-/feltendringer krever bevaring av v1-validering | low · avvist | Nåværende 22 ID-er er uttrykkelig fast versjon 1 i domenet, og v1 er eneste dokument-/layoutversjon. Ingen endret fagversjon finnes i denne leveransen. En framtidig versjon må bevare den gjeldende valideringsporten. |
| Blind 7 | Migreringssuiten prøver schema 1, men mangler versjon 2 | medium · patch | Faktisk Edge 2 → 3 passerte med uendrede data. Den varige adapterprøven skal fange regresjon i samme oppgraderingssti. |
| Blind 8 | Ingen ekte uferdig dag 2 med gyldig lagret konklusjon i CloseRun-prøven | medium · patch | Dagens relevante Node-prøve bruker komplett kort løp og syntetisk manglende første dag. Ny prøve må avvise faktisk uferdig dag mot riktig revisjon. |
| Blind 9 | Mangler mistet, allerede kvittert avslutning i standardsuiten | medium · patch | Abort før fullføring og replay etter kjent resultat er prøvd. Root har særskilt lesefeil etter durable commit. Legg eksplisitt gjenoppretting etter manglende kvittering inn i målrettet prøve. |
| Blind 10 | Ordinære skriveveier til låst skjema er ikke prøvd etter en ekte periodestengning | medium · patch | Gjeldende prøve bruker bare konklusjon, avslutning, dagoppretting og planutvidelse. Prøv nye ellers gyldige økt-, vurderings-, relevans- og bekreftelseskommandoer mot kvittert avslutning. |
| Kant 1 | Tilbakebuffer kan lese ferdig avslutning før opprinnelig callback | false · avvist | Den separate lesingen gjøres gjennom autoritativ IndexedDB-transaksjon mot samme berørte lagre. Den kan bare få en komplett validert avslutning etter varig commit. Gjenoppretting trenger å virke også om opprinnelig callback mangler. |
| Kant 2 | Dialogen kan ligge åpen over Oslo-midnatt | medium · patch | Dato og kommando bygges uavhengig. Bruk kvittert kommandoform med faktisk tid eller tilby ny gjennomgang med oppdatert bekreftelsesdato. |
| Kant 3 | Foreldet bekreftelse kan gi fokus til dokumentkroppen | medium · patch | `adoptClosureState` forsøker å fokusere før React har fjernet den gamle modalens fokusvakt. Flytt fokus når erstattet editor er montert. |
| Kant 4 | En utvidelseshendelse kan få en dato ulik sin låste kilde | medium · patch | `validateSavedPlan` sjekker gyldig kalenderdato og riktig dag-ID. Utvidelseshendelser forutsetter bekreftet dag med uforanderlig dato, så en alternativ dato må avvises. |
| Kant 5 | Separat lesing etter gjenopptakelse kan forbigå venting på opprinnelig svar | false · avvist | Innholdet kommer fra en selvstendig lesetransaksjon som ser sist kvitterte hele snapshot. Før durable complete finnes ingen lukket kilde som denne stien kan åpne. |
| Verifikasjon 1 | Versjon 2 mangler fra automatisk migreringsmatrise | medium · patch | Parameteriser eksisterende prøve og kontroller alle tre stores og schema, som i faktisk Edge-prøve. |
| Verifikasjon 2 | Test kan ikke skille frosset snapshot og nåværende ytre løpsfelt | medium · patch | Begge har identisk kommentar i positive fixtures. Varier et ytre lagerfelt i test og verifiser samme frosne kommentar i begge roller. |
| Verifikasjon 3 | Ugyldig snapshot er bare prøvd med validator direkte | medium · patch | Skriv avvik inn i adapterfixture og la normal åpning og dokumentport påvise feilen. |
| Verifikasjon 4 | Mangellinken for dag 2 er ikke prøvd med dag 1 valgt | medium · patch | Eksisterende nettleserprøve bekrefter advarsel for dag 1 via dagsoversikt. Prøv faktisk navigering og fokus til manglende felt på dag 2. |
| Verifikasjon 5 | Kort historisk begrunnelse uten dagens A10 mangler i varig prøve | medium · patch | Uavhengig snapshotprøve godtok strukturelt lesbar kort tekst. Legg inn en eldre låst førgrunn og arvesvar, fullfør ettervurderingen og bevar teksten etter lukking. |
