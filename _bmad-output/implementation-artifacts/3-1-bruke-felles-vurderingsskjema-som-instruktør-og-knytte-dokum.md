---
title: "Story 3.1 – Bruke felles vurderingsskjema som instruktør og knytte dokumentasjon til riktig sjåfør"
type: feature
story_key: 3-1-bruke-felles-vurderingsskjema-som-instruktør-og-knytte-dokum
status: in-review
baseline_commit: c31ef182dc295bd93b3533c57f2aea90225f0922
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 3
story: "3.1"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2"]
approvedSource: ../planning-artifacts/story-3-1-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/instructor-extension.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/instructor-extension.md"
---

# Story 3.1 – Bruke felles vurderingsskjema som instruktør og knytte dokumentasjon til riktig sjåfør

Instruktør velger eller oppretter en stabil lokal sjåførreferanse og kan bruke hele det eksisterende vurderingsløpet med korrekt faglig rolle fra oppretting til slutt-PDF.

## Akseptansekriterier

<frozen-after-approval>

**AC-3.1-01 – Åpne instruktørinngangen og opprette sjåfør uten løp**

**Gitt** lastet app, fungerende lokalt lager og instruktør som aktiv simuleringsrolle,
**Når** instruktør åpner S11 og oppretter en ny sjåfør med fiktivt navn og ansattnummer,
**Så** opprettes én stabil lokal sjåførreferanse og en lesbar dokumentasjonsoversikt, uten at et vurderingsløp, en første dag eller et teknisk-/linjedokument må opprettes,
**Og** tomme/rene blanktegn i påkrevde felt avvises med norsk feltfeil uten delvis lagring. Registreringen er et valggrunnlag for dokumentasjon, ikke bekreftet opplæring eller en produksjonskonto,
**Og** oversikten skiller tom, lastende og feilet tilstand. Ingen data gir tilgjengelig opprettingshandling; åpnefeil gir nytt forsøk og fremstilles ikke som tomt lager,
**Og** visningen tilbyr funksjoner som faktisk er levert. Denne storyen krever ingen tomme dokumenter, døde handlinger eller brukerbeskjeder om fremtidige storynumre for teknisk-/linjeskjemaene (FR-23, AD-2/14/15, UX-DR24).

**AC-3.1-02 – Velge samme sjåfør uttrykkelig uten automatisk sammenslåing**

**Gitt** flere lokale sjåførreferanser og dokumentasjon som allerede peker på dem,
**Når** instruktør søker/velger sjåfør eller oppretter en kandidat med samme navn/ansattnummer som en eksisterende,
**Så** velges en konkret stabil sjåfør-ID uttrykkelig; like feltverdier er ikke grunnlag for automatisk personmerge, omkobling eller overskriving av eksisterende dokumenter,
**Og** mulige like registreringer skilles med forståelig dokument-/datokontekst eller registreringsbetegnelse, og brukeren kan velge eksisterende eller uttrykkelig opprette ny. Appen hevder ikke ekstern identitetskontroll,
**Og** oppretting av ny vurdering for en valgt sjåfør bruker samme stabile referanse og kopierer riktig identitetsgrunnlag til vurderingens egne felt/snapshots. Valg av en annen sjåfør i oversikten flytter ikke et eksisterende løp,
**Og** gammel/låst dokumentasjon vises med sin historiske identitet, ikke med nyere indeksverdier. Ingen generell personaladministrasjon, profilsammenslåing eller masseomkobling innføres (FR-23, AD-6/14).

**AC-3.1-03 – Opprette instruktørvurdering med samme skjema og fast kontekst**

**Gitt** valgt sjåfør i S11,
**Når** instruktør oppretter et nytt vurderingsløp i instruktørkontekst,
**Så** opprettes løp/første dag etter tidligere opprettingsregler med valgt sjåførreferanse, faktisk instruktørnavn og en fast faglig kontekst som vises tydelig før lagring,
**Og** eksisterende 22 kriterier, rekkefølge og godkjent hjelpeversjon brukes. Det opprettes ett faglig svarsett per dag, ikke både fadder- og instruktørsvar eller et kopiert kriteriesett,
**Og** normal/kort startplan, unike/stigende datoer, én førvurdering, 22 + 44 × registrerte dager og maksimum fem gjelder som for det eksisterende vurderingsløpet,
**Og** etter oppretting endrer ikke rollebytte eller navigasjon vurderingskontekst eller sjåførkobling. En eksisterende faddervurdering konverteres ikke til instruktørvurdering ved å åpne instruktørflaten (FR-20/23, AD-7/8/14).

**AC-3.1-04 – Håndheve instruktørens faglige ansvar gjennom eksisterende kommandoer**

**Gitt** et vurderingsløp med fast instruktørkontekst,
**Når** sjåfør eller instruktør registrerer og bekrefter egne deler,
**Så** bruker instruktør den samme faglige plassen for egne svar/kommentarer, behandling av sjåførrelevans, plan, dagsbekreftelse og avslutning som fadder bruker i fadderkontekst. Domene-/applikasjonsreglene gjenbrukes uten en egen kopi i UI eller PDF,
**Og** sjåfør beholder før-/etter-/evalueringsdeler og separate låser. Instruktør kan ikke bekrefte på sjåførens vegne, og en faglig bekreftelse er ikke sjåførens godkjenning av instruktørens mening,
**Og** aktiv faglig rolle må passe vurderingskonteksten ved hver skrive-/bekreftelseskommando, også direkte kall, gamle faner og dialoger. Feil faglig rolle avvises uten nye svar, kvitteringer, låser eller endret kontekst,
**Og** A10, dag-1-arv, ny daglig relevans, versjonsbundet separat behandling, frivillige evalueringer, erstatning av planbeslutning og alle fullførings-/feltlåser beholdes. Rollebytte kan ikke opprette en ekstra faglig bekreftelse av samme del (FR-20, AD-3/5/6/7/8/9/14).

**AC-3.1-05 – Vise korrekt faglig rolle og bevare riktig innsyn ved bytte**

**Gitt** instruktørvurdering, faddervurdering og sjåførvisning på samme enhet,
**Når** rolle, sjåfør, vurdering eller dag skiftes,
**Så** viser profilhode, faglige feltnavn, mangler og dialoger faktisk kontekst/rolle/navn/dag. Instruktørkontekst bruker Instruktør, mens eksisterende fadderkontekst beholder Fadder,
**Og** sjåfør får egne vurderinger/evalueringer, tillatte øktfelt og gjeldende planlagt siste dag underveis; faglig innhold, avgjørelser og begrunnet planhistorikk skjules frem til kvittert avslutning,
**Og** riktig faglig rolle kan lese hele den aktuelle vurderingen etter samme kontrakt som før. Feil kontekstrolle gir ingen skriveadgang eller gjenbruk av forrige faglige visningsmodell; nødvendig rollevalg vises forståelig,
**Og** berørt utkast flushes før skiftet, som avbrytes ved feil som ville miste innhold. Etter vellykket skifte ryddes gammel model/dialog/felttilstand/DOM før ny visning; hurtig tilbake-navigasjon lekker ikke annen sjåførs eller skjult faglig innhold (FR-4/20/23, AD-4/9/14).

**AC-3.1-06 – Bevare faktiske roller i bekreftelser, avslutning og PDF**

**Gitt** bekreftelser i instruktørkontekst og tidligere fadderbekreftelser,
**Når** del/dag/periode bekreftes og historikk eller slutt-PDF åpnes,
**Så** bevares faktisk actor-ID/navn/rolle/dag/tid som historisk kilde; instruktørens faglige bekreftelse vises som «Instruktørens del bekreftet av [navn]», og sjåførens egne bekreftelser beholder sine egne etiketter,
**Og** tidligere faddernavn/roller og «Fadderens del bekreftet av …» ommerkes ikke. Senere rolle-/sjåførvalg eller global profil endrer ikke historiske snapshots,
**Og** Konklusjon, eksplisitt Godkjent/Oppfølgingsbehov, minst én og alle opprettede dager låst, atomisk CloseRun, permanent lukking og begge rollers varige fulle innsyn/PDF gjenbrukes i instruktørkontekst. Bekreftelse av faglig del avslutter ikke automatisk perioden,
**Og** PDF bruker støttet snapshot-/layoutversjon og faktisk historisk rolle med samme godkjente liggende/stående komposisjon og Noto Sans. Ukjent versjon gir kontrollert feil, ikke levende rolleetiketter eller omskriving av gammel filkilde. Ingen av de to tilleggsskjemaene kreves for å laste ned denne vurderings-PDF-en (FR-15/17/19/20, NFR-5, AD-10/11/14/16).

**AC-3.1-07 – Gjenfinne dokumentasjon og bevare eldre data ved utvidelsen**

**Gitt** eksisterende fadderløp med utkast, låste dager og avslutningssnapshots,
**Når** den utvidede modellen åpnes og nødvendig lokal sjåførindeks etableres,
**Så** bevares eksisterende stabile sjåfør-/løps-/dags-ID-er, svar, navn, bekreftelser og låser. Eksisterende vurderinger behandles uttrykkelig som fadderkontekst uten faglig nyvalidering eller ommerking,
**Og** indeksgrunnlag utledes fra løpets stabile kobling/opprettingsidentitet; tidligere dagsnavn og andre historiske snapshots beholdes selv om navnet har variert. Like navn/ansattnumre på ulike ID-er utløser ikke merge,
**Og** motstridende koblingsdata eller ukjent schema gir kontrollert feil fremfor ny personkobling, tomt lager eller databasesletting. Eventuell migrering er atomisk etter AD-13 og endrer ikke eksisterende ClosureSnapshot/pdfLayoutVersion,
**Og** S11 kan gjenfinne vurderinger for valgt sjåfør med type/kontekst/dato/faktisk status. Ingen dokumentstatus avledes fra et annet dokument eller fra en tom dokumentliste (FR-20/23, AD-6/13/14).

**AC-3.1-08 – Lagre sjåførvalg og oppretting med sann kvittering**

**Gitt** ny sjåførreferanse, ny vurdering eller redigerbart vurderingsinnhold,
**Når** oppretting/lagring behandles,
**Så** kontrolleres siste relevante data, actor, identitetskobling, kontekst/låser og revisjon i samme readwrite-transaksjon som endring og kommandoresultat skrives. Ny referanse og vurdering opprettet i én brukerhandling gir ikke en halv kobling ved abort,
**Og** «Lagret på denne enheten», ny oversikt og vellykket oppretting vises først ved complete. Samme commandId/payload returnerer lagret resultat før revisjonskontroll; endret payload med samme ID avvises uten ekstra sjåfør/løp,
**Og** videre utfylling følger AD-4s autosave-/flush-kontrakt med mål om complete innen to sekunder og forsøk minst hver to sekunder ved kontinuerlig skriving; sjåfør-/dokumentvalg må ikke skjule nyere ulagret tekst,
**Og** nødvendig lagring/ressurslasting er kontrollert før registrering. Nye dokumenttyper/lagringsfelter for teknisk-/linjeskjema opprettes ikke som tomme reserver i denne storyen (FR-9/20/23, AD-2/3/4/5/14/15).

**AC-3.1-09 – Bevare kobling, utkast og låser ved feil og nettbrudd**

**Gitt** dobbeltklikk, mistet kvittering, kvotefeil, foreldet revisjon eller 60 sekunders nettbrudd i lastet app med fungerende lokalt lager,
**Når** bruker forsøker oppretting, registrering eller bekreftelse og eventuelt prøver igjen,
**Så** oppstår ingen duplikat fra samme kommando, automatisk merge, endret sjåførkobling eller halv bekreftelse. Kvitterte data/låser bevares, og ulagret input omtales ikke som lagret,
**Og** faktisk snapshot hentes ved revisjonsavvik mens ulagret tekst beholdes separat uten automatisk sammenslåing. Feil som ville miste tekst avbryter relevant rolle-/ruteskifte,
**Og** normal gjenåpning med nett i samme origin/profil/enhet og bevart lager gjenoppretter riktig sjåfør, vurdering/dag og tydelig rolle etter AD-4s femsekundersmål. Testprofilen har minst fem vurderingsløp med ett femdagersløp og sjåførreferansene som trengs; faktisk datamengde/enhet føres,
**Og** oppdatering, nye instruktørvurderinger eller feil/nytt forsøk gjenåpner ikke eldre låste deler. Kaldstart uten nett, slettet lager og enhets-/profilbytte får ingen utvidet garanti (NFR-3/4, AD-3–6/13/14).

**AC-3.1-10 – Prøve selvstendig inngang og hele instruktørvurderingen tilgjengelig**

**Gitt** S11 og de gjenbrukte vurderings-/bekreftelses-/historikk-/PDF-flatene,
**Når** brukeroppgaven prøves på AD-12s vedtatte bredder, nettlesere/enheter, tastatur/skjermlesere og forstørrelse,
**Så** kan instruktør opprette/velge sjåfør uten fadderløp, opprette instruktørvurdering og gjennomføre samme ett-/to-/tre-/femdagers vurderingsflyt til korrekt slutt-PDF. Type, faktisk rolle, sjåfør og dag kan oppfattes uten farge alene,
**Og** prøvene kontrollerer samme 66/110/154/242 svarposisjoner, separate sjåfør-/faglige bekreftelser, avslag/planutvidelse, begge avslutningsvalg og uendrede eldre fadderdata. Et rollebytte lager ikke et ekstra faglig svarsett eller en ekstra sjåførbekreftelse,
**Og** S11s nye felt/valg har tilgjengelige navn, programmatisk feiltilknytning, store trefflater, synlig fokus og tekstlig status. 320/360/390/768/1280 CSSpx, 200 % tekst/400 % zoom og skjermtastatur gir ingen horisontal registreringsrulling eller skjulte handlinger; DESIGNs eksisterende tokens og font beholdes,
**Og** ren låst installasjon/typekontroll/bygg og relevante domene-/adapter-/nettleser-/PDF-prøver fullføres ved implementering. Faktiske versjoner/enheter og gap registreres. Ingen teknisk-/linjedokument eller test-/Motimate-integrasjon kreves for å bestå denne storyens brukeroppgave (FR-20/23, NFR-1/2/5/6, AD-12/13/14/16).

</frozen-after-approval>

## Code Map

- `app/src/domain/run.ts` og de faglige delene eier identiteter, roller, svar, plan og låser. Gjenbruk samme 22 kriterier og samme faglige plass i begge faste kontekster. Før en aktiv faglig rolle kan skrive, må den samsvare med den lagrede løpskonteksten. Spor domeneportene i `day-draft.ts`, `create-day.ts`, `mentor-day.ts`, `follow-up.ts` og `closure.ts`. `run.ts` eier `Role`, låst bekreftelse og grunnregler.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` eier autoritativt valg, transaksjoner og kvitteringer. Viderefør eksisterende stabile ID-er. Bygg en minimal lokal referanseoversikt etter AD-14 og bevar eldre fadderløp, frosset innhold og kommandoresultater. Sjekk både autoritativ sesjonsrolle i adapteren og fast kontekst i hver faglige kommando. Kontroller at gjenbruk av gamle read models, kvitteringer og tilbakebuffervakter følger samme rolle.
- `app/src/ui/App.tsx` og eksisterende vurderingsflater eier rute- og rollebytte, flush, historikk og status. Sjekk faglige etiketter, optimistisk editor-tilstand i `use-mentor-draft.ts`, historikk og de nye avslutningskontrollene. `RunPdfDownload` sitter i `ClosedHistory` og stoppes ved endret valg, rolle eller navigasjon. Behold samme avbrudd og nytt forsøk når oppslaget utvides.
- La historikk og eksport lese faktisk historisk rolle fra støttet snapshot. `ClosureSnapshot.history` er den frosne kilden fra Story 2.1. `readClosureSnapshot` henter den gjennom applikasjonsporten, og `ClosedHistory` leser den på skjerm. `app/src/application/run-pdf.ts` leser autoritativt snapshot med valgt løps-ID, og `app/src/adapters/pdf/renderer.tsx` velger støttet layout. `closure-document.tsx` komponerer matrise, avsendere, bekreftelsesfelter og planhistorikk. Hold versjon 1 som frosset fadderkilde. Velg en støttet, eksplisitt versjon for ny instruktørkontekst. Gjenbruk samme komponering, oppstartsressurser og PDF-typografi. La rolle i den historiske dokumentkilden styre språk og korrekte avsendere i hele dokumentet.

## Tasks & Acceptance

- [x] Lever S11 med eksplisitt valg av stabil sjåfør, selvstendig oppretting og lokalt dokumentinnsyn. Vis tom, lastende og feilet tilstand.
- [x] Migrer eller les eldre fadderløp med bevart dokument-, identitets- og historikkgrunnlag. Bevis at like verdier på ulike stabile ID-er forblir ulike registreringer.
- [x] Opprett instruktørløp i fast kontekst for valgt sjåfør. Gjenbruk domene-/applikasjonsregler og verifiser skrive- og innsynsgrenser ved direkte kall, gamle faner og tilbake-navigasjon.
- [x] Verifiser rolle, avsender og riktig historisk etikett gjennom vurdering, frys, gjenåpning og faktisk PDF. Prøv samtidig eldre fadderløp i samme lager.
- [ ] Kjør bygg, lint, relevante Node-/browserprøver, lagringsvern, uavhengig PDF-kontroll og tilgjengelighetsprøver med faktisk utstyr.

## Verification

- Prøv hele instruktørforløpet for 1, 2, 3 og 5 dager. Bekreft 66/110/154/242 unike svarposisjoner, egne låser, begge avslutningsvalg og faktisk instruktørnavn/rolle i slutt-PDF. Sammenlign en eldre lukket fadder-PDF fra samme origin før og etter oppgradering.
- Prøv uteblitt kvittering, abort, stale, feil rolle, ikke-tilgjengelig lagring, 60 sekunder frakoblet og normal gjenåpning med fem løp. Registrer faktisk testutstyr, nettleser og eventuelle utestående mobil-/hjelpemiddelprøver.

## Implementation Notes

Godkjent storygrunnlag er klargjort med ti uendrede AC. En avgrenset Edge-prøve i den lokale cachen åpnet fire lukkede fiktive løp på schema 3 med like referansefelt og fire separate stabile ID-er. Et femte fiktivt løp ga et åpent utkast og faktiske lagringskvitteringer. Edge lastet også ned den eldre femdagers-PDF-en. Kontrollkilden med samme stabile ID og motstridende identitet åpnet i gamle schema 3. Ved oppgradering skal den nye migreringen gi kontrollert feil, uten at gamle poster eller kvitteringer endres. Bruk den samme origin-/profilprøven mot ferdig 3.1 for å sammenligne data og PDF før og etter migrering. Implementering startet fra den kodegjennomgåtte PDF-leveransen. Den frosne PC-bygningen for den tidligere vurderingsflyten beholdes i .cache/story-2-2/verified-dist-r5 for sammenligning og samme-origin-oppgradering.


Uavhengig applikasjonsprøve mot den foreløpige 3.1-adapteren verifiserte selvstendig sjåføroppretting, gjentatt kommando med samme kvittering, avvisning av endret kommando og ulike stabile ID-er for to identiske fiktive feltsett. Et instruktørløp beholdt eksplisitt sjåførkobling og fast kontekst. Aktiv fadder ble avvist ved direkte lesing av dokumentgrunnlag og ved økt-, dag-, fag-, relevans-, plan-, dagslås- og avslutningskommandoer. Stale instruktørkommando etter rollebytte ble avvist. Injisert transaksjonsabort etter opprettet referanse etterlot hverken løp, referanse eller kvittert resultat. Gjentatt gyldig kommando ble utført én gang. Prøven brukte fake-indexeddb. Faktisk nettleser, brukerflyt og frossen sluttkandidat prøves separat.


Edge 157.0.4341.60 prøvde ordinær oppretting av sjåfør uten løp, blankfelt og programmatisk feilfokus, eksplisitt duplikat og kald gjenåpning av samme sjåfør/rolle på 1765 ms. Ordinære 1, 2, 3 og 5 instruktørdager ga faktiske PDF-er fra begge tillatte roller. Uavhengig PDF-kontroll bekreftet 66, 110, 154 og 242 vurderingsmarkører, Noto-basert lesbar tekst, A4-format, historiske instruktører og to separate faser for sjåfør. Femdagersfilen hadde 11 sider og ble lastet ned etter 61 028 ms frakoblet uten ressursforespørsler. Samme profil med fem løp hentet siste dag, rolle og lås etter 695 ms ved refresh og 1708 ms ved kald gjenåpning. Dette var en tidlig kandidat. Sluttprøver må gjentas på frosset endelig bygg.

Samme-origin-oppgradering fra den committede PDF-versjonen kjørte schema 3 → 4 med fire avsluttede løp og ett åpent utkast. Samtlige fem referanser, løps- og dags-ID-er, øktopplysninger, låser, frosne kilder, aktører og eksisterende kvitteringer ble bevart. Edge gjenåpnet valgt dag på 1610 ms. Den gamle fanen beholdt eget utkast og kunne ikke skrive. Ved internkonsistente eldre løp med motstridende navn for samme sjåfør-ID ble hele migreringen avbrutt, og schema 3 og alle data/kvitteringer bestod uendret. Den gamle PDF-ens ti A4-sider og lesbare tekst var identiske. Første sides interne strøm var omdelt, med identisk render ved 144 dpi. Side 2–10 hadde identiske strømmer.

Første brede regresjon ga 258/264 fordi to tidligere prøver feilet i alle motorer. Andre profiltekst brukte samme CSS-klasse som dagsteksten, og gjenopprettingsknappen satte Fadder før brukeren uttrykkelig valgte rollen. Disse er rettet i kandidaten. NVDA leste opprettingsknapp, fokusert feltfeil og «Lagrer …». Første versjon leste ikke ferdigmeldingen ved flytting til oversikten, selv om den var synlig. Live-regionen er flyttet til en varig node og skal prøves med faktisk NVDA igjen. Tidlig kandidat lekket lokalt S11-utkast da ekte Chromium-tilbakebuffer gjenopptok en gammel instruktørfane etter aktivt rollebytte i en annen. Funnet er under retting og skal gjentas uavhengig. Edge bestod fem bredder og simulert 200 % tekst på S11.


Den formelle r2-regresjonen ga 272/273 bestått. WebKit mistet viewport-fokus i den samme eldre 200 %-prøven som tidligere hadde et enkelt avvik. Åtte isolerte gjentakelser på identisk bygg bestod. 400 % faktisk Chromium-zoom bestod ved 316 CSSpx på S11. Ekte tilbakebuffer skjulte fiktiv lokal råtekst i begge opprettingsskjermer og lot instruktør hente samme tekst tilbake uttrykkelig. Faktisk NVDA leste instruktøroppretting, feil ved sjåførnavn og kvittert «Lagret på denne enheten» etter rettingen av live-regionen.

Alle 11 sider i den frakoblede femdagersfilen er rendret og inspisert i farge og gråtone. WebKit 26.5 genererte første faktiske instruktørfil som sjåfør etter 60 061 ms frakoblet. Filkontrollen bekreftet alle 242 ruter, hele teksten og historiske instruktørroller. Faktisk 3 → 4-migrering og eldre PDF før/etter bestod også på r2 med 1615 ms gjenåpning.

Etter tre gjennomgangslag behandles konkrete resterende funn. Faktisk Edge reproduserte tom side ved «Opprett neste dag» og «Utvid planen» etter rollebytte i annen fane. Rollebytte i faktisk instruktørlåsedialog viste en gjentatt dokumentlesefeil uten egnet rollegjenopptakelse. Gjennomgangens rettede lagerkode bestod deretter fire særskilte Node-prøver av kanonisk ID, IDB-nøkkel, eksplisitt referanse og atomisk ny dag/aktiv sjåfør. De avsluttende nettleser- og reviewrettingene skal prøves på det ferdige bygget før commit.


## Lokal sluttverifisering

- Frosset bygg story-3.1-20261118-final, asset index-BzyjXG4w.js, SHA-256 DE7302136DD5A9C2129A7327406100337EDA1A1B257950A722B3F8B9023588B1. Bygg, TypeScript og 67 Node-prøver bestod. Lint bestod med de fem dokumenterte Fast Refresh-advarslene i PDF-komponeringen.
- Full nettleserregresjon med Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5 ga 275 av 276 på 7,4 min. Den eldre WebKit-prøven ved 200 % tekst gjentok ett viewport-avvik. Alle 16 isolerte repetisjoner passerte på samme frosne sluttbygg. Egne målrettede tester av 3.1 passerte i alle tre motorer. Gjenstående målenheter føres fortsatt separat.
- Ordinært Edge-løp med dagslås, permanent avslutning og PDF fra instruktør og sjåfør passerte på sluttbygget. Begge éndagersfiler ga to A4-sider og 66 verifiserte svarposisjoner i faktisk fil. Kald gjenåpning av den profilen viste samme dag og lås på 2056 ms.
- Første femdagersfil i WebKit som sjåfør ble lastet etter 60 049 ms frakoblet. Den faktiske filen beholdt 242 ruter, 11 A4-sider, full langtekst og historiske instruktørroller. Tidligere ordinære Edge-filer omfattet 1/2/3/5 dager, begge roller og begge utfall. PDFsidenes historiske felt og bekreftelser ble sammenlignet mot de frosne kildene.
- Samme-origin Edge-oppgradering schema 3 → 4 på sluttbygget bevarte fem løp, gamle aktører, kvitteringer, alle stabile referanser og uendret fulltekst, visning og A4 i den gamle tisidersfilen. Gjenåpning 2085 ms. Indekskontroll med eldre UUID-felter i store bokstaver bevarte frosne kilde-ID-er og gjenåpnet etter 1618 ms. Motstridende referanse aborterte atomisk i den uavhengige reviewprøven. Gammel fane kunne beholde utkast, men fikk ikke skrevet i oppgradert schema.
- Faktisk Edge ved 320/360/390/768/1280 CSSpx og simulert 200 % tekst og faktisk Chromium 400 % ved 316 CSSpx passerte S11. Sluttbygget prøvd med faktisk NVDA 2026.3.1 i Edge på Windows 26H2. Hjelpemiddelet leste «Opprett sjåfør», feltfeilen for blankt navn med riktig fokus og «Lagret på denne enheten» etter commit.
- Faktisk Edge over to faner på sluttbygget bevarte både dagutkast og planvalg og lot instruktør sende dem én gang etter rollegjenopptakelse. En stale låsedialog lot riktig instruktør gjenoppta, uten ukvittert lås. Ekte Chromium-tilbakebuffer skjulte råtekst i begge S11-skjemaer, og eksplisitt gjenopptakelse ga original tekst tilbake. Vanlig fanefokus er også dekket med utløst visibilitychange i faktisk nettleser. Windows PickerHost hindret det separate fysiske klikket for denne ene fanefokusprøven. Den fysiske varianten må derfor prøves separat.
- Ordinær lokal preview på 127.0.0.1:4184 åpnet registrering etter 760 ms i Edge, og rollevalget åpnet S11. Fysisk mobil med skjermtastatur, faktisk VoiceOver/TalkBack, installert variant og avtalte enhetsprøver gjenstår. Story beholder review-status.

## Spec Change Log

## Review Triage Log

| Funn | Vurdering | Bevis og håndtering |
| --- | --- | --- |
| B1. Utkast i dags-/planform kan forsvinne ved rollebytte i annen fane | high | Innsending av en gammel kommando gir stale. Begge formene leser deretter blokkert workspace og kaller rå setView. Formen avmonteres fordi selected mangler, mens skjerm og skjult rollevalg består. Behold utkast bak konkret rollegjenopptakelse. Patch. |
| B2. Lagret dag og valgt sjåfør kan peke på ulike personer | high | Dagskommandoens samme transaksjon skriver selection, men beholder session.driverId fra annen fane. Bekreftet med to sjåførreferanser i faktisk adapterprøve. Skriv begge valgene atomisk i instruktørkontekst. Patch. |
| B3. Ulike bokstavstørrelser på én UUID | high | Driveroppretting ser bare opp eksakt nøkkel. To casings av samme UUID kunne skrives med ulik identitet. Migrering sammenligner allerede små bokstaver. Bruk kanonisk lagringsnøkkel og behandle konflikter uten å omskrive stabile historiske ID-felt. Patch. |
| B4. Nøkkelavvik kan gi en ubrukelig oppføring i S11 | high | Workspace validerer bare payload-IDs fra getAll, mens selectDriver leser IDB-nøkkelen. Feillagt rad ble vist og deretter avvist ved valg. Kontroller faktisk nøkkel i samme transaksjon. Patch. |
| B5. Vanlig fane i forgrunnen beholder gammel faglig visning | medium | Det er bare BFCache-eventene som kjører den nye rollekontrollen. Fane uten navigasjon kan vise gammel instruktørmodell etter rollebytte i annen fane. Kontroller tilbake til faktisk synlig instruktørvisning, gjenbruk skjerming og behold eksisterende fadderopprettingsflyt. Patch. |
| B6. Dagsbekreftelse får ingen rollehandling etter stale | high | readStored gir ingen latest når valgt løp sperres. Dialogen markeres uavklart og «Kontroller lagret tilstand» gjentar sperret lesing. Vis riktig, eksplisitt rollegjenopptakelse og behold utkast. Patch. |
| B7. Fast migreringsprøve mangler frosset versjon 1 | medium | Tidlige faktiske Edge-prøver har bevart versjon 1 og kvitteringer. De faste migrationstestene bruker åpent eller daglåst grunnlag uten frosset kilde. Legg et avsluttet versjon 1-løp og tilhørende aktører/valg/kvitteringer til eksisterende prøve. Patch. |
| B8. Fast instruktørprøve mangler nettbrudd og femløpsprofil | medium | Ordinær Edge-prøve utførte kontrakten med 61 028 ms uten nett, 695 ms refresh og 1708 ms ved kald gjenåpning. Fast prøve har én dag og går på nett. Bevar gjenkjørbar fremgangsmåte for tung prøve og bruk en smal offline-eksportkontroll i fast instruktørprøve. Patch. |
| B9. Påstått manglende verifisering av fler­dags-PDF | false | Den uavhengige kontrollen lastet allerede PDF for 1/2/3/5 fra ordinære løp i begge roller. Sjekk av faktisk fil dekket 66/110/154/242 ruter, 11 A4-sider i langtesten, lesbar fulltekst og faktisk bekrefter i alle spalter. Alle 11 sider er inspisert i farge og gråtone. |
| B10. Sjåførens fil prøves bare via filnavn i fast test | medium | Filnavnet er felles fra løps-ID og dato og kan være identisk for ulikt innhold. Lagre begge artefaktene og bruk den eksisterende uavhengige filkontrollen på begge. Patch. |
| E1. Tom side etter rolleendring ved ny dag eller utvidelse | high | Både onWorkspace og onComplete kan få blocked i App. Roten er samme som B1 og må også gi rollegjenopptakelse ved tapt etterlesing. Patch. |
| E2. Driver-ID kan registreres med flere casings | high | Samme direkte adapterreproduksjon som B3. Kanonisk indeks trengs for lesing, skriving og migrerte data. Patch. |
| E3. Instruktørkommando uten eksplisitt sjåfør kan opprette begge poster | high | Adapter tillater instruktørkontekst med useExistingDriver av. Den nye referansegrenen kan derfor passere gjennom en direkte kommando. Krev gyldig, eksplisitt referanse til eksisterende sjåfør, med kontroll i skriveporten. Patch. |
| E4. S11 viser gammel dokumentliste under ny lasting | medium | selectDriver med pending hindrer klikk, men synlig tidligere dokumentinnhold har ingen angivelse av ny lasting. Vis tydelig ventetilstand og gammel dokumentasjon først dersom valget feiler og den fortsatt er aktiv. Patch. |
| V1. Fast PDF-prøve kan passere ved feil skjematittel/rolle i ferdig fil | medium | Separat Python-kontroll finnes. Fast nettleserprøve verifiserer kilde og filnavn, men ikke begge nedlastinger. Samme testområde som B10. Dokumenter og gjennomfør kontrollen av begge filer. Patch. |
| V2. Lukket gammel fadderkilde mangler i fast migreringsprøve | medium | En endring av frosset historikk ville ikke blitt oppdaget der. Samme testområde som B7. Patch. |
| V3. Direkte motsatt rollevern er ikke prøvd | medium | canReadAssessment er symmetrisk i koden. Dekning for fadder på instruktørløp finnes. Prøv motsatt rolle på eldre/aktuell fadder og direkte kildeuttak. Patch. |
| V4. Søkeregistreringer har like søkefelt i eksisterende test | medium | To identiske verdier gir to treff selv med filtrering fjernet. Prøv annet navn/nummer og null treff i eksisterende S11-test. Patch. |
| V5. Innholdsbærende replay etter rollebytte er ikke prøvd | medium | Adapteren sjekker rollestatus før returen når kvitteringen inneholder event eller confirmation. En endring i denne grenen vil kunne passere dagens tester. Prøv stale og senere identisk replay for faglig dagslås og plan. Patch. |
