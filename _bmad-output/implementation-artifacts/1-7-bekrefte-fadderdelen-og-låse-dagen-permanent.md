---
title: "Story 1.7 – Bekrefte fadderdelen og låse dagen permanent"
type: feature
story_key: 1-7-bekrefte-fadderdelen-og-låse-dagen-permanent
status: in-review
baseline_commit: 4c312f0eb45457694e024234d77f31e74461a10e
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 1
story: "1.7"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"]
approvedSource: ../planning-artifacts/story-1-7-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.7 – Bekrefte fadderdelen og låse dagen permanent

Fadder kontrollerer hele dagen og bekrefter egen del. Vurderinger, øktopplysninger og dagens oppfølgingsvalg blir permanent skrivebeskyttet i samme kvitterte transaksjon.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.7-01 – Kontrollere sjåførbekreftelser og eksakt svargrunnlag**

**Gitt** en eksisterende, ulåst dag med vurderingsinnhold fra Story 1.3–1.5,
**Når** fadder ber om fullføringskontroll eller forsøker sluttbekreftelse,
**Så** kreves periodens kvitterte førbekreftelse og dagens kvitterte sjåfør-etterbekreftelse; fadder kan ikke bekrefte disse på sjåførens vegne,
**Og** førsettet og dagens sjåfør-/faddersett skal ha nøyaktig løpets 22 forventede kriterie-ID-er hver, én per posisjon, med gyldige svar. Antall alene er utilstrekkelig; manglende, fremmede eller dupliserte ID-er avvises,
**Og** kontroller bruker løpets frosne kriterie-/regelgrunnlag og bekreftede svarversjoner, uten å omskrive eller nyvalidere låst historikk etter endret global konfigurasjon,
**Og** manglende sjåførbekreftelse forklares med at sjåføren må fullføre egen del. Fadder kan fortsatt redigere eget utkast, men ingen dagslås opprettes (FR-5/11/12, AD-6/7/9).

**AC-1.7-02 – Kreve aktuell relevansbehandling og gyldige obligatoriske begrunnelser**

**Gitt** dagens låste sjåfør-ettersvar og fadders egne svar/avgjørelser fra Story 1.5,
**Når** fullføringskontrollen sammenholder innholdet,
**Så** krever hvert gjeldende sjåfør-Ikke relevant en separat bekreftet/avslått behandling som peker på riktig ettersvar-ID og den låste answerRevision. Ubehandlet eller foreldet behandling er en mangel,
**Og** avslag krever gyldig A10-kommentar, og fadders eget Ikke relevant krever egen A10-begrunnelse; ren bekreftelse av sjåførens valg krever ikke en ny egen begrunnelse,
**Og** dag-1-arv behandles én gang via ettersvaret. Et punkt som ikke er Ikke relevant krever ikke en oppfunnet relevansbehandling,
**Og** Kan bli bedre, begrunnet Ikke relevant og gyldig dokumentert avslag er fullverdige registreringer som ikke i seg selv blokkerer låsing. Sjåførens svar bevares, uten retur, overskriving, automatisk faglig godkjenning eller felles svar (FR-6/7/12, AD-7).

**AC-1.7-03 – Kreve komplette øktopplysninger og dagens oppfølgingsvalg**

**Gitt** øktfeltene fra Story 1.2 og planen fra Story 1.6,
**Når** dagslåsing forsøkes,
**Så** kreves sjåførnavn, ansattnummer, gjeldende faddernavn, dato, minst én buss, linjer og både inn-/ut-tid i gyldig HH:mm. En ubrukt buss 2 er ikke en mangel, og skift over midnatt får ikke en ny regel om ut-tid >= inn-tid,
**Og** dagens eget Ja/Nei-oppfølgingsvalg må være registrert. Ja krever gyldig oppfølgingstype og eventuelt gyldig ekstra-antall/avledet plan; Nei krever ingen skjulte Ja-felt,
**Og** plan og aktiv beslutning valideres etter AD-8s ramme, historikk og femdagersgrense; allerede lagret tillegg anvendes ikke på nytt ved bekreftelse,
**Og** faktisk skrevet tekst og berørt innhold skal være kvittert før bekreftelse. Frivillig egenevaluering, konklusjonstekst og øvrige frie kommentarer kreves ikke som tekstinnhold for dagslåsing (FR-3/8/11/12/16, AD-3/6/8).

**AC-1.7-04 – Vise konkrete mangler og et uttrykkelig permanent låsevarsel**

**Gitt** fadder som aktiv rolle på riktig dag,
**Når** fadder åpner kontrollen før sluttbekreftelse,
**Så** vises mangler med kriterium/felt og vei/fokus til riktig sted; mangellisten utelater tomme frivillige felt og gyldig dokumentert uenighet,
**Og** ulagret berørt innhold eller uoppfylte fullføringskrav blokkerer sluttbekreftelse. Oppfylt kontroll viser deretter en dialog med rolle, faktisk bekreftende faddernavn, dato, berørt del og «Dagens vurderinger og kommentarer låses permanent»,
**Og** dialogen forklarer at resterende fadderinnhold, relevansbehandling, øktopplysninger og dagens oppfølgingsregistrering blir skrivebeskyttet; tidligere før-/etterlåser består,
**Og** bare en uttrykkelig bekreftelseshandling går videre. Avbryt, lukk og Escape oppretter ingen bekreftelse, lås eller planendring; utfylte eller lagrede felter bekrefter aldri dagen automatisk (FR-12/13/14, AD-6).

**AC-1.7-05 – Lagre full dagslås og faktisk faddernavn atomisk**

**Gitt** gyldig, kvittert innhold og fadders uttrykkelige bekreftelse mot aktuell revisjon,
**Når** ConfirmMentorDay utføres,
**Så** leses siste aggregat og rolle/låser/revisjon/fullføringskrav kontrolleres igjen i samme readwrite-transaksjon som fadderdel, relevansbehandling, kommentarer, dagens planregistrering, buss/linjer/tider og historisk fadderbekreftelse fryses og lagres,
**Og** faktisk bekreftende fadder-ID/navn, rolle, dato/del og tid lagres som historisk snapshot. Bekreftelsestid lagres som ISO 8601 UTC og vises lokalt; senere fadder-/profilendring omskriver ikke navnet,
**Og** før-/etterbekreftelsene og sjåførens låste egenevaluering bevares uendret. Dagens planbeslutning fryses med samme aktive effekt, uten ny planutvidelse eller duplisering av hendelser,
**Og** dagen vises som bekreftet/låst først ved transaksjonens complete. Navnene betegner faktiske demobekreftelser, uten påstand om identitetsverifisert e-signatur eller sjåførens godkjenning av fadders meninger (FR-11/13/14, AD-3/5/6/8).

**AC-1.7-06 – Håndheve permanent dagslås utover brukerflaten**

**Gitt** en kvittert dagslås,
**Når** svar, begrunnelser, avgjørelser, kommentarer, øktfelt, faddertilknytning eller dagens planbeslutning forsøkes endret,
**Så** avvises mutasjonen på applikasjons-/domenelaget også via gammel redigeringsvisning/fane, rollebytte, refresh/gjenåpning og profil-/løpsendring,
**Og** historikk viser faktisk innhold og separate før-/etter-/fadderbekreftelser med rett del, navn og dato som lesing; ingen angre-, gjenåpnings- eller administrativ rettingsfunksjon tilbys,
**Og** en separat senere løpsutvidelse følger Story 1.6/AD-8 og kan ikke endre den låste dagsregistreringen. Fadderkonklusjon tilhører periodens senere avslutning og får ikke en feilaktig dagslås her (FR-4/8/14/16, AD-6/8).

**AC-1.7-07 – Gjenopprette konsistent tilstand etter feil og gjentatt bekreftelse**

**Gitt** avbrudd før/etter complete, tap av kvittering, dobbeltklikk, kvotefeil eller foreldet bekreftelsesdialog,
**Når** dagsbekreftelse forsøkes og tilstanden gjenåpnes eller forsøket gjentas,
**Så** finnes enten den komplette opprinnelige ulåste fadderdelen med tidligere sjåførlåser eller en full dagslås, aldri halvlagret bekreftelse eller opphevede før-/etterlåser,
**Og** samme commandId/payload returnerer tidligere resultat før revisjonskontroll uten ny bekreftelse. Endret payload med samme ID avvises, og ny kommando med gammel revisjon overskriver ikke siste snapshot,
**Og** ved lagringsfeil vises ingen vellykket lås; ulagret tekst beholdes i den åpne visningen. Faktisk snapshot lastes før nytt forsøk, uten automatisk sammenslåing eller databasesletting,
**Og** 60 sekunders nettbrudd i lastet app med fungerende lokalt lager tillater fortsatt dagsbekreftelse og bevarer kvitterte data/låser. Gjenåpning med nett følger AD-4s betingelser/femsekundersmål; eventuelle schemaendringer bevarer låst innhold/bekreftelser atomisk (FR-9–11/14, AD-3–6/13).

**AC-1.7-08 – Vise riktig delstatus og innsyn på tilgjengelige flater**

**Gitt** dagsoversikt, mangelliste, bekreftelsesdialog og låst historikk,
**Når** disse brukes av sjåfør/fadder på AD-12s vedtatte bredder/enheter med tekstforstørrelse, tastatur og skjermlesere,
**Så** kan hver delstatus, mangel og låsekonsekvens oppfattes tekstlig uten å være avhengig av farge; feltfeil er programmatisk koblet, fokus er synlig og ingen registreringsflate krever horisontal rulling,
**Og** dialogen har forståelig navn, fokusbegrensning, tilgjengelig avbryt/bekreft og fokus tilbake ved avbrytelse. Mobilskjermtastatur og forstørrelse skjuler ikke nødvendige handlinger,
**Og** sjåføren beholder sitt avgrensede innsyn underveis, mens fadder kan lese hele skjemaet. Dagslås gir ikke fullt sjåførinnsyn, normal PDF eller automatisk periodeavslutning, selv om alle hittil opprettede dager er låst,
**Og** løpets Pågående/Under oppfølging følger fortsatt den aktive planen fra Story 1.6; dagen og perioden har separate statuser. Faktiske testversjoner/enheter og eventuelle gap registreres (FR-4/14/16, NFR-1/2, AD-9/12).

</frozen-after-approval>

## Code Map

- `app/src/domain/baseline.ts` og `driver-day.ts` eier eksakte svarsett, før-/etterbekreftelser og lagret egenevaluering. `mentor-day.ts` fra 1.5 eier eget faddersett, kriteriekommentarer og behandling bundet til sjåførens svar-ID/revisjon. Bygg en domenevalidering som gjenbruker disse kontrollene og setter dem sammen med daglig planvalg og obligatoriske øktfelt.
- `app/src/domain/day-draft.ts` har `checkDayFields(fields, 'day-lock')` for pliktige øktopplysninger og riktig feltmatrise. `run.ts` har `dayLocks`, `findDay` og `replaceDay`. `follow-up.ts` eier `dailyFollowUp`, `validateSavedPlan` og støtte for separat senere utvidelse. Bruk lagret `mentorConfirmation` som dagens permanente låsegrense. Kontroller alle eksisterende mutasjonsveier, også daglig planendring, for samme lås.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` har `#mutateRun`, rollebundet lesing, `RunReceipt` og kommandoidempotens. Gjenbruk transaksjons- og retry-kontrakten fra `ConfirmDriverDay`, også når lagring lykkes og etterfølgende kontrollesing feiler.
- `app/src/ui/AssessmentForm.tsx` og `App.tsx` har sjåførens kontroll, fokusvei for øktfeil og den aktive editorens flush. `MentorAssessmentForm.tsx` og `use-mentor-draft.ts` har kontroll av vurdering/plan og fokusruting til egen begrunnelse, behandling og oppfølging. Bruk samme autoritative kontrollesing. En ufullstendig lokal oppfølging skal kunne listes som mangel, mens bekreftelse krever kvittert berørt innhold og ren plan. Les endelig kode for fadder-/planflaten før dispatch.
- `app/tests/browser/mentor-day.spec.ts` og `app/tests/follow-up.test.ts` har eldre syntetiske `mentorConfirmation`-fiksturer fra før appen kunne dagslåse. Ved strengere kontroll av lagret dagslås kan disse opprettes gjennom gyldig dagsbekreftelse eller komplett fiktivt grunnlag, med de samme eksisterende kontrollene av låsevern. Ingen tidligere ordinær brukerhandling kunne skrive en fadderbekreftelse.

## Tasks & Acceptance

- [x] Legg til samlet mangelsjekk for sjåførbekreftelser, eksakte svarsett, behandling, øktopplysninger og aktivitetens oppfølgingsvalg. Gyldig uenighet og tom frivillig tekst kan følge en låst dag.
- [x] Implementer `ConfirmMentorDay` med gjentatt autoritativ validering og atomisk historisk fadderbekreftelse. Lås hele dagen permanent etter complete og bevar sjåførens tidligere låser og planens aktive effekt.
- [x] Vis konkret mangelliste og eksplisitt låsedialog. Ha vei til riktig felt, navn og dato, avbrytelse, rollevern og entydig status. Bevar sjåførens begrensede innsyn.
- [x] Prøv hele dag 1 i nettleser med fiktive data. Dekningsprøver inkluderer eldre faner, mangler, tapt kvittering, plan uten dobbelttelling, eier/rolle, låsevern for eksisterende mutasjoner og 60 sekunder frakoblet.
- [ ] Fullfør faktisk fysisk mobil-/nettbrettprøving, skjermtastatur og resterende AD-12-skjermleserprøve.

## Design Notes

En kvittert fadderbekreftelse er endelig for den registrerte dagen. Utkast og dialoger skal vernes ved feil. En separat senere, uttrykkelig utvidelse bruker den eksisterende planhandlingen fra 1.6. Dag og periode har separate statuser, og underveis vises fortsatt bare de godkjente utsnittene per rolle. Vis bekreftelsens dato og faktiske navn fra snapshot.

## Verification

- Kjør bygg/typekontroll, lint, Node-prøver og Playwright i Chromium, Firefox og WebKit. Fyll dag 1 med 66 logiske svarposisjoner og prøv mangler, gyldig uenighet, historisk avsender, rollebytte, to skrivevinduer, abort/replay, nettbrudd og gjenåpning med faktisk IndexedDB.
- Kontroller tastatur, fokusretur, status og reflow. Registrer fysisk nettbrett- og hjelpemiddelprøving når det er utført.

## Implementation Notes

Implementering startet 18. november med kodegjennomgått Story 1.6 som teknisk grunnlag.

Før review passerte bygg/typekontroll, lint, 48 Node-prøver og 12 målrettede nettleserprøver i Chromium, Firefox og WebKit. Prøvene dekket dag 1 og 2, transaksjonsabort, gjentatt kommando og lesefeil etter kvittering. Alle tre motorene bekreftet etter minst 60 sekunder frakoblet og gjenåpnet lagret lås. Første femsekundersassert startet etter refresh. Målingen skal omfatte selve innlastingen i sluttprøven. En tidlig WebKit-prøve lastet siden på nytt før fadderrollen var skiftet. Etter at prøven ventet på kvittert rolle, passerte den. En uavhengig Edge 157.0.4341.60-prøve opprettet et fiktivt løp, lagret 66 unike svar, brukte Escape i låsedialogen, bekreftet fadderdelen deretter og verifiserte alle tre historiske låser, uendret plan og åpent løp etter refresh. Samme ordinære flyt passerte i Chromium ved 400 % faktisk zoom (1264 → 316 CSSpx), også uten horisontal rulling i låsedialogen.

Første fulle matrise på frosset `story-1.7-20261118-r1` ga 207 av 207 med Playwright 1.62.0, Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5 under Windows 26H2 26300.9974. Separate kantprøver reproduserte bekreftelse med gammelt tidspunkt etter kjent abort og en gammel låsedialog som kom tilbake fra faktisk Chromium-tilbakebuffer. Reviewretting og ny matrise følger. Fysisk utstyr, mobilens skjermtastatur og skjermlesere står åpne for denne storyen.

Etter reviewretting bestod begge uavhengige kantprøver på et nytt byggegrunnlag. Etter kjent abort og Escape lagret Edge den nye, uttrykkelige bekreftelsen med faktisk prøvetid 14:00 UTC. Chromium gjenopprettet dokumentet fra tilbakebuffer med `pageshow.persisted`, beholdt den lagrede låsen og åpnet ingen gammel bekreftelsesdialog. Forsøk med uavklart tilstand må nå lese faktisk lagret dag før ny skriving. Lagret råtekst er tydelig merket utkast i låst fadderlesing, med egne avgrensede felt i tillegg til bekreftet innhold.

Frossent sluttbygg `story-1.7-20261118-r2` bestod bygg/typekontroll, lint, 48 Node-prøver og alle 210 nettleserprøver på tre motorer. Dagen ble bekreftet etter 60 sekunder frakoblet, og faktisk lås ble lesbar 68/169/306 ms etter start av refresh i Chromium/Firefox/WebKit. En separat Edge-prøve på sluttbygget verifiserte alle 66 svar, nye bekreftelsestider, tidligere bekreftelser, uendret plan, gjenåpnet lås og rolleskjerming. Også faktisk Chromium-tilbakebuffer og 400 % zoom passerte igjen. NVDA 2026.3.1 i Edge 157.0.4341.60 leste den faktiske låsedialogens navn, fiktive fadder, dato, dag, uttrykkelig låsevarsel og hvilke arbeidsdeler som fryses. Øvrig skjermleserflyt og fysisk mobil-/nettbrettprøving gjenstår.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Ny bekreftelse kan skrive mens forrige utfall er ukjent (blind gjennomgang) | Medium. Les faktisk dag før ny skriving. Bevar kommando-ID ved fortsatt uavklart utfall. |
| Andre mangellenker stopper lydløst ved ufullstendig plan (blind gjennomgang) | Medium. Gi beskjed og fokuser planforutsetningen. Bevar utkast. |
| Råtekst kan forsvinne fra løpende visning ved lås (blind gjennomgang) | Medium. Forklar at lagret erstatningsutkast er adskilt fra de valgte, låste begrunnelsene, og behold det i lagret tilstand. |
| Tilbakebuffer gjenoppretter gammel bekreftelsesdialog ved samme rolle (blind gjennomgang) | Medium. Reprodusert med `pageshow.persisted` og en faktisk kvittert lås i annen fane. Adopter autoritativ lås og unngå gammel dialog. |
| Kontrollert åpen dag mister fokus når gjenopprettingsknappen fjernes (blind gjennomgang) | Medium for tastatur. Vis kontrollresultat med fokus på en stabil handling. |
| Fullføringssjekk kan telle ufullstendig sett som komplett (blind gjennomgang) | Medium internt. Sjekk nøyaktige frosne svar-ID-er i selve kontrollen, også uten adapterens forhåndsvalidering. |
| Fremtidig endring av den globale A10-implementasjonen kan påvirke eksisterende arkiv (blind gjennomgang) | Lav for denne endringen. Den eneste aktive, vedtatte regelen er A10-v1 og løpets lagrede kriteriesnapshot brukes. Bevar den faste regelen. En senere regel må ha egen versjonsidentitet. |
| Tid ble bare målt etter refresh (blind gjennomgang) | Dekningsgap. Start klokken før refresh og stopp etter at faktisk lås er lesbar. |
| Flere mangler i samme prøvedata kan maskere en enkelt fjernet sperre (blind gjennomgang) | Dekningsgap. Fjern nødvendige felt og bekreftelser én om gangen. |
| Plattformer og hjelpemidler er delvis prøvd (blind gjennomgang) | Dokumentert gap. Eksakte desktop-/motorversjoner er ført. Fysisk og faktisk skjermleserprøve for dagslåsen står åpen. |
| Hjelp kan åpnes samtidig med kontroll som kan vise låsedialog (kanttilfeller) | Medium. Sperr gjensidig samtidig dialogåpning og test at fokus og ett dialognavn bevares. |
| Fersk bekreftet dag kan fokusere gammel mangelliste (kanttilfeller) | Medium for tastatur. Bruk synlig, kvittert lås som fokusmål. |
| Aktiv mangellenke treffer avbrutt ruteskifte uten forklaring (kanttilfeller) | Medium. Samme fokusvei til uavklart plan før ny navigasjon. |
| Ingen isolert negativ prøve for etterbekreftelse eller oppfølging (verifikasjon) | Dekningsgap. Fjern dem separat fra øvrig komplett dag. |
| Lagret, påstått lås med ubesvart mentorpunkt er uprøvd (verifikasjon) | Dekningsgap. Prøv kontrollert adapterfeil ved gjenåpning. |
| Manuell verifisering etter tapt kvittering er uprøvd (verifikasjon) | Dekningsgap. Kontroller lagret lås, korrekt fokus og ingen ny bekreftelseskommando. |
| Dagsoversiktens lås og historisk faddernavn er uprøvd i nettleser (verifikasjon) | Dekningsgap. Prøv én åpen og én låst dag i begge roller. |
| Planutkast blokkerer velformet lenke til manglende øktfelt (verifikasjon) | Medium. Eksplisitt forklaring og fokus uten tap av planutkast. |
| Nytt uttrykkelig forsøk kan lagre avbrutt forsøks tidspunkt (uavhengig Edge-prøve) | Medium. Konkret fiktiv tidsprøve 13:00 → 14:00 UTC. Nullstill gammel kommando etter avbrytelse av verifisert abort. |
