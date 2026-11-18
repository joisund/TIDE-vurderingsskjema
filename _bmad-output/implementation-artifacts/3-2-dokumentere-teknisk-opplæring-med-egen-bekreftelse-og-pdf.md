---
title: "Story 3.2 – Dokumentere teknisk opplæring med egen bekreftelse og PDF"
type: feature
story_key: 3-2-dokumentere-teknisk-opplæring-med-egen-bekreftelse-og-pdf
status: in-review
route: dispatch
review_loop_iteration: 0
baseline_commit: 7db33e1a943a0d107f55b32090d2ce50384ad3f3
created: 2026-11-18
epic: 3
story: "3.2"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "3.1"]
approvedSource: ../planning-artifacts/story-3-2-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/instructor-extension.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/instructor-extension.md"
  - "_bmad-output/planning-artifacts/instructor-source-inventory.md"
  - ".cache/instructor-source/grunnkurs-kildekontroll.md"
---

# Story 3.2 – Dokumentere teknisk opplæring med egen bekreftelse og PDF

Sjåfør fører den tekniske gjennomgangen av valgt buss for sin lokale sjåførreferanse. Instruktør kontrollerer den kvitterte utfyllingen, bekrefter egen gjennomgang og kan laste ned den frosne sjekklisten.

## Akseptansekriterier

<frozen-after-approval>

**AC-3.2-01 – Opprette eget teknisk dokument for valgt sjåfør**

**Gitt** instruktørrollen eller sjåførrollen i egen uttrykkelig valgt sjåførkontekst fra Story 3.1,
**Når** Teknisk opplæring opprettes fra dokumentoversikten med instruktørnavn, busstype og opplæringsdato,
**Så** opprettes ett selvstendig teknisk dokument med documentId, stabil driverRef, dokumenttype, revisjon og Utkast, og kandidatnavn/fiktivt ansattnummer kopieres til dokumentets eget identitetsgrunnlag,
**Og** sjåførkobling, instruktørnavn, busstype og gyldig kalenderdato kreves ved oppretting. Dato lagres som YYYY-MM-DD i Europe/Oslo; blanke påkrevde felt avvises med konkret feltfeil uten halv oppretting,
**Og** dokumentet kan opprettes og gjenfinnes uten vurderingsløp, linjeskjema, kjørte linjer eller andre bekreftelser. Flere tekniske dokumenter for samme sjåfør/dato er tillatt; samme dato er ikke en automatisk duplikatnøkkel,
**Og** instruktør kan forberede dokumentets hodeopplysninger, mens punktene starter tomme til sjåføren fyller ut. Sjåfør kan bare opprette/fylle for egen valgt sjåførreferanse. Ingen tomme vurderingsløp opprettes som omvei, og dokumentet kan ikke flyttes til en annen sjåfør (FR-21/23, AD-14/15).

**AC-3.2-02 – Fryse riktig 52-punktsmal og kjøretøymerknader**

**Gitt** den visuelt gjennomgåtte tekniske kilden og dens oppgitte Volvo-/busstypekontekst,
**Når** dokumentet opprettes,
**Så** fryses mal-ID/versjon, tittel/kjøretøykontekst, punkttekster, merknader, grupper og rekkefølge med nøyaktig 52 unike punkter fordelt 13/13/14/12 etter kildens grupper 1–4,
**Og** stabile punkt-ID-er er T1-01–T1-13, T2-01–T2-13, T3-01–T3-14 og T4-01–T4-12 i [kildeoversiktens](instructor-source-inventory.md) respektive rekkefølge. Manglende, fremmede og dupliserte ID-er avvises selv ved totalt 52,
**Og** kildepunktets merknader om blant annet luker, Valeo, retarder og sikkerhetsutstyr følger riktig punkt som lesbar fagtekst i skjema og PDF. De er dokumentinnhold for denne kjøretøymalen, ikke universelle råd eller ordre om systemhandlinger/integrasjon,
**Og** kildens avdelingsnavn gjeninnføres ikke som fast produktavdeling. Malen generaliseres ikke automatisk til andre kjøretøymerker. Senere globale malendringer bytter ikke innhold i et eksisterende dokument eller innfører nye krav i dets historikk (FR-21, AD-13/15).

**AC-3.2-03 – La sjåføren registrere egen gjennomgang og kjøretøyrelevans**

**Gitt** sjåførrollen i riktig sjåførkontekst og et teknisk utkast med 52 punkter som ved start er Ikke gjennomgått,
**Når** sjåføren fyller ut og krysser av mens instruktøren går gjennom punktene,
**Så** lagres sjåførens føring som ett entydig innhold per punkt: Ikke gjennomgått, Gjennomgått eller Gjelder ikke busstypen. Vanlig avkrysning betyr dokumentert gjennomgang, ikke OK/mestring/bestått,
**Og** Gjelder ikke busstypen krever sjåførens egen ikke-tomme forklaring etter trimming. Ett ord kan være tilstrekkelig; ingen to-ord-/ti-tegnsterskel, vurderingsskala, fadderavgjørelse eller sjåfør-relevansarv brukes,
**Og** ingen punktstatus er forhåndsvalgt eller utledet fra busstype, instruktørens gjennomgang eller andre dokumenter. Avbryt i relevansdialogen bevarer forrige gyldige punktinnhold. Punktendringer registrerer faktisk sjåfør/rolle og gjeldende dokumentrevisjon,
**Og** sjåføren kan endre egne punktstatuser/begrunnelser helt frem til instruktørens dokumentbekreftelse. Inaktiv begrunnelsestekst beholdes som utkast uten å vises som gjeldende unntak. Instruktøren kan ikke krysse av på sjåførens vegne; ingen Kryss av alle-funksjon innføres (FR-21, UX-DR25).

**AC-3.2-04 – Skille sjåførens utfylling fra instruktørens kontroll og bekreftelse**

**Gitt** teknisk dokument for en bestemt sjåfør,
**Når** instruktør, sjåfør eller fadder åpner eller forsøker å endre/bekrefte det,
**Så** kan sjåføren i egen sjåførkontekst fylle og rette punkter, begrunnelser og ubekreftede hodeopplysninger. Instruktør kan forberede/rette hodeopplysninger, lese sjåførens føring og veilede, men har ikke skriverett til sjåførens punktstatuser eller begrunnelser,
**Og** bare instruktør kan utføre den endelige dokumentbekreftelsen etter den enkelte sjåførens gjennomgang og fullførte, lagrede utfylling. Sjåføren kan ikke bekrefte på instruktørens vegne og får ingen separat underskrift, innsending eller foreløpig lås påtvunget,
**Og** begge kan lese hele det aktuelle tekniske dokumentet fra utkast til bekreftet status. DriverRef kan ikke flyttes til en annen person; ubekreftede identitetsrettelser omskriver ikke andre dokumenter. Fadderrollen og feil sjåførkontekst får ingen tilgang gjennom dokumentets porter,
**Og** applikasjonskommandoene håndhever felt-/rolleansvar også ved omgåtte knapper, gammel visning og rollebytte. Flush og ryddet model/dialog/DOM beholdes. Teknisk sjåførinnsyn endrer ikke innsyn i et pågående vurderingsløps skjulte faglige innhold (FR-21/23/24, AD-4/9/14/15, UX-DR24/25).

**AC-3.2-05 – Bevare sjåførens utkast og gjenoppta riktig skjema**

**Gitt** et teknisk utkast med sjåførens avkrysninger, skrevet begrunnelse eller redigerte hodeopplysninger,
**Når** innhold endres, rolle/dokument skiftes eller appen normalt gjenåpnes,
**Så** brukes lokal autosave med straks ulagret status, mål om complete innen to sekunder etter siste input og flush-forsøk minst hver to sekunder under kontinuerlig skriving. Lagret gjelder bare sist kvitterte revisjon,
**Og** rolle-/ruteskifte fra sjåfør til instruktør flushes først og avbrytes ved feil som ville miste input. Instruktørvisningen leser faktisk kvittert dokument; den bruker ikke et gammelt eller ulagret skjermbilde som ferdig gjennomgang. Feil bevarer ulagret input i åpen visning uten falsk kvittering,
**Og** dokumentlisten viser Teknisk opplæring, busstype/dato og Utkast/Bekreftet for valgt sjåfør. «Klar for instruktørbekreftelse» er en avledet beskjed fra fullført og kvittert sjåførutfylling, ikke en ny signatur, lagret sluttstatus eller automatisk lås. Ny punktendring gir straks ulagret status og ny kontroll før bekreftelse,
**Og** riktig dokumenttype/documentId/rolle gjenopprettes uten runId eller nytt vurderingsløpsvalg. Ingen automatisk sletting, serverkø eller synk innføres; bevarings-/kaldstart-/profil-/enhetsgrenser følger AD-4 (NFR-3, AD-2/3/4/13/15).

**AC-3.2-06 – Bekrefte først etter den enkelte sjåførens lagrede gjennomgang**

**Gitt** aktiv instruktør som ønsker å bekrefte en bestemt sjåførs tekniske dokument,
**Når** dokumentkontrollen kjøres mot siste lagrede revisjon etter sjåførens utfylling,
**Så** kreves korrekt sjåførkobling/identitetsgrunnlag, instruktørnavn som samsvarer med faktisk bekreftende instruktør, busstype, gyldig dato, nøyaktig malens 52 punkt-ID-er og rent berørt innhold,
**Og** den enkelte sjåførens gjeldende punktføringer skal dekke alle punktene som Gjennomgått eller Gjelder ikke busstypen med ikke-tom begrunnelse, og minst ett punkt skal være Gjennomgått. Ikke gjennomgått, ukjent punktstatus, feil sjåføravsender eller manglende begrunnelse er en konkret mangel. En annen sjåførs ferdige skjema eller en generell kursgjennomgang åpner ikke bekreftelse av dette dokumentet,
**Og** mangellisten viser hva sjåføren må fylle/rette; instruktør får ingen rett til å rette sjåførens punktføring selv. Oppfylt kontroll viser kandidat, faktisk instruktørnavn, busstype, dato og varsel om at hele dokumentet låses. Instruktør bekrefter gjennomgangen og den viste sjåførutfyllingen, ikke en test eller en oppdiktet sjåførsignatur,
**Og** bare uttrykkelig Bekreft teknisk opplæring sender bekreftelsen. Ingen ekstra sjåførbekreftelse/Send inn kreves. Lagring/utfyllingsgrad låser ikke automatisk; Avbryt/lukk/Escape endrer ingenting. Uferdig eller ulagret skjema forblir utkast uten endelig PDF-adgang (FR-21/24, AD-6/15/16, UX-DR27).

**AC-3.2-07 – Fryse sjåførens føring og faktisk instruktørbekreftelse atomisk**

**Gitt** gyldig, kvittert sjåførutfylling, aktiv instruktør og aktuell revisjon,
**Når** ConfirmTechnicalTraining behandles,
**Så** leses siste tekniske aggregat og dokumenttype/ID/rolle/sjåførkobling/lås/revisjon/fullføringskrav valideres på nytt i samme readwrite-transaksjon som Bekreftet, faktisk instruktør-actor/navn/rolle, bekreftelsestid og frosset teknisk eksportgrunnlag lagres,
**Og** eksportgrunnlaget bevarer historisk kandidat/fiktivt ansattnummer/driverRef, sjåfør som faktisk utfyller, instruktør/busstype/opplæringsdato, alle 52 punkttekster/ID-er/grupper/merknader og deres statuser/aktive unntaksbegrunnelser samt mal-/regel-/layoutversjon. Instruktørens bekreftelsestid lagres UTC og vises lokalt, adskilt fra opplæringsdato; ingen sjåførunderskrift eller eget sjåførbekreftelsestidspunkt oppfinnes,
**Og** lås og PDF-adgang vises først ved complete. Hele dokumentet avviser deretter mutasjoner også fra sjåføren, gamle faner, profil-/rollevalg og senere malendringer. En sjåførendring som kvitteres etter at instruktørdialogen ble åpnet gjør dialogen foreldet; ny kontroll kreves før instruktør kan bekrefte,
**Og** ingen retting/gjenåpning av bekreftet dokument innføres. Ny gjennomgang bruker nytt dokument uten gamle kryss. Bekreftelsen påvirker ingen andre sjåførers skjemaer, vurderingsløp, CloseRun, vurderingslåser eller linjeskjema (FR-21/23/24, NFR-4, AD-3/5/6/13/15/16).

**AC-3.2-08 – Laste ned komplett teknisk PDF fra egen bekreftet kilde**

**Gitt** Bekreftet teknisk dokument og aktiv instruktør eller sjåfør i riktig sjåførkontekst,
**Når** Last ned PDF velges,
**Så** genererer lokal PDF-adapter en faktisk selvstendig application/pdf-fil fra dokumentets egen kvitterte kilde og støttede layoutversjon. Et vurderingsløp, CloseRun, linjedokument eller bestått test kreves ikke,
**Og** dokumentkontrollen verifiserer alle 52 forventede punkt-ID-er, faktiske statuser, metadata, aktive begrunnelser, kildemerknader, sjåfør som utfyller og faktisk instruktørbekreftelse. Ingen 22 + 44 × dager-formel eller fadderbekreftelse brukes på sjekklisten,
**Og** egen A4 stående sjekkliste-layout viser kandidat/fiktivt ansattnummer, instruktør, busstype, dato, fire grupper i kildeorden og lesbare punktstatuser. Gjelder ikke busstypen vises med hele begrunnelsen; signaturfeltet er vanlig tekst «Teknisk opplæring bekreftet av [instruktørnavn]» med rolle/tid. Sjåfør identifiseres som utfyller, uten å fremstille utfyllingen som medsignatur eller verifisert e-signatur,
**Og** alle punkttekster, faglige kildemerknader og bekreftelsesopplysninger kommer med uten klipping. Bruk godkjent profil/logo og lokal Noto Sans; lange tekster flyter over flere sider med sidetall og nødvendige gjentatte gruppe-/kolonneoverskrifter. PDF åpnes uten appen, og ingen sending/opplasting utføres (FR-21/24, NFR-5/6, AD-11/16).

**AC-3.2-09 – Sperre feil eksport og gi nytt forsøk uten endring**

**Gitt** teknisk utkast, ufullstendig/ukjent eksportgrunnlag, PDF-feil eller gjentatt nedlasting,
**Når** generering eller nytt forsøk kjøres,
**Så** sperres normal eksport av utkast og ufullstendig dokument med forståelig feil/mangler. Hvis en teknisk diagnostikkfil likevel produseres, merkes hver side «UFULLSTENDIG – IKKE ENDELIG DOKUMENTASJON» uten oppdiktede bekreftelser; ingen utkast-PDF-funksjon innføres,
**Og** feil viser tilgjengelig nytt forsøk og bevarer alle dokumentdata/låser/innsyn. Gjentatt nedlasting gjengir samme frosne faginnhold uten nye bekreftelser eller krav om byteidentiske filer,
**Og** riktig dokumenttype/ID knyttes til genereringen slik at et løps-/sjåfør-/dokumentskifte underveis ikke presenterer ferdig fil som et annet dokument. Ukjent mal-/layoutversjon eller manglende font gir kontrollert feil, ikke stille nytolking eller databasesletting,
**Og** generator/font/logo er lastet lokalt før registrering. I lastet app med fungerende lager kan registrering, instruktørbekreftelse og PDF fungere under 60 sekunders nettbrudd; nett-/PDF-generering holdes utenfor lagringstransaksjonen. Ingen kald offline-startgaranti utvides (FR-24, NFR-3/4/5, AD-2/4/11/15/16).

**AC-3.2-10 – Håndtere gjentatte kommandoer, gamle faner og avbrudd**

**Gitt** dobbeltklikk, mistet kvittering, gammel dialog/fane, skrive-/kvotefeil, en sjåførendring etter åpnet instruktørdialog eller prosessavbrudd før/etter complete,
**Når** oppretting, lagring eller ConfirmTechnicalTraining utføres og eventuelt gjentas,
**Så** gir samme commandId/payload lagret resultat før revisjonskontroll uten ekstra dokument/bekreftelse. Endret payload med samme ID og ny kommando med foreldet revisjon avvises etter den etablerte kontrakten,
**Og** faktisk tilstand er enten det tidligere utkastet eller komplett bekreftet dokument med hele kilden; aldri halv lås, falsk kvittering, endret sjåførkobling eller delvis åpnet eksport. Ved avvik hentes faktisk snapshot mens ulagret tekst beholdes separat uten automatisk merge,
**Og** kommandoer med feil dokumenttype/ID kan ikke skrive i et vurderingsløp, et linjedokument eller et annet teknisk dokument. Schema-/lagringsfeil sletter ikke databasen; gamle låste data bevares atomisk, og diagnostikk inneholder ikke navn/fritekst,
**Og** normal gjenåpning med nett på samme origin/profil/enhet med bevart lager viser riktig teknisk dokument og kvittert innhold/lås etter AD-4s femsekundersmål. Testprofilen omfatter fem vurderingsløp, ett med fem dager, og fem tekniske dokumenter med alle 52 punkter; enhet/nett/faktisk datamengde registreres (AD-3/4/5/13/15).

**AC-3.2-11 – Bruke og kontrollere hele den selvstendige tekniske oppgaven**

**Gitt** S11/S12/S14 og et teknisk dokument uten vurderingsløp eller linjeskjema,
**Når** hele oppgaven fra oppretting via gjennomgang til bekreftet PDF prøves etter den vedtatte testplanen,
**Så** fungerer flater ved 320/360/390/768/1280 CSSpx, portrett/landskap, 200 % tekst/400 % zoom, tastatur, skjermlesere og mobilskjermtastatur uten horisontal registreringsrulling, skjult fokus eller avkuttede handlinger,
**Og** avkrysning har minst 44×48 px trefflate og tilgjengelig navn med riktig punkt/dokument; tekstlige statuser skiller Ikke gjennomgått fra Gjennomgått og Gjelder ikke busstypen. Dialoger/feil/mangelliste og lagringsstatus følger godkjent fokus-/avbrytelses-/feiltilknytningsmønster,
**Og** prøver omfatter alle punkter gjennomgått, blandet gjennomgang/gyldige kjøretøyunntak, manglende unntaksgrunn, uferdig punkt, bare kjøretøyunntak, sjåførens registrering under instruktørgjennomgang, instruktørforsøk på å endre sjåførpunkter, sjåførforsøk på instruktørbekreftelse, uferdig annet sjåførskjema, rollebytte med ulagret input, sjåførendring etter åpnet instruktørdialog, feil sjåfør/rolle/type, endret busstype før kontroll, avbrytelse, låst dokument og nytt separat dokument. Alle PDF-sider/fulltekst sammenlignes med frosset kilde, inklusive lange begrunnelser på 10 000 tegn, flere lange tekster og æøå/åäö uten ny produktgrense,
**Og** ren låst installasjon/typekontroll/bygg og relevante domene-/adapter-/nettleserprøver gjennomføres ved implementering, med faktiske iPhone/Android/Windows-/skjermleserversjoner og uavhengige PDF-lesere etter AD-12. Manglende prøve er et dokumentert gap, ikke bestått. Fadder-/instruktørvurderinger og deres lukkede PDF-kilder påvirkes ikke (NFR-1–6, AD-12/13/15/16).

</frozen-after-approval>

## Code Map

- [Originalkontrollen av grunnkursmalens side 1](../../.cache/instructor-source/grunnkurs-kildekontroll.md) har de 52 punktene, gruppene og kjøretøymerknadene i kilderekkefølge. Kontroller mot original og godkjent inventar før malversjonen fryses.
- Gjenbruk stabil sjåførreferanse og dokumentoversikt fra 3.1. Følg AD-15s eget dokumentaggregat, rolleport, kommando og kvittering. S11 ligger i app/src/ui/InstructorOverview.tsx og app/src/ui/App.tsx. Bruk driverregisteret, kanoniske nøkler og den aktive sesjonens sjåførvalg i app/src/adapters/indexeddb/run-store.ts. Avgrens sjåførdokumenter etter stabil referanse, og la historisk navn ligge i dokumentgrunnlaget. Hold teknisk dokument utenfor RunAggregate. Legg baselinen inn etter den verifiserte 3.1-commiten.
- Gjenbruk kvittert autosave, feltkontroll, bekreftelsesdialog, rollevakt og tilbakebuffer. Skill registrering, lesing og instruktørbekreftelse gjennom samme kommando- og lesekontrakt som relevant for dette dokumentet.
- Gjenbruk den lokale PDF-motoren, ressursklargjøringen, Noto Sans og den delte dokumentporten fra 2.2/3.1. Teknisk eksport bygger på den kvitterte, frosne 52-punktskilden og dens egen layout. Gjenbruk oppstartens lokale PDF-ressurser, pdfBlobFromStream i app/src/adapters/pdf/pdf-stream.ts og mønsteret for avbrytbar Blob-nedlasting. Prøv den tekniske filen uavhengig fra samme forberedte nettlesermotor, og prøv samtidig at eldre vurderings-PDF fortsatt åpner med uendret innhold.

## Tasks & Acceptance

- [x] Bekreft original mal, 13/13/14/12 punkter, historiske merknader og egen dokumentkilde med valgt sjåfør.
- [x] Implementer sjåførens status og begrunnelse, autosave og korrekt lesemodell. Vis avledet klarstatus fra kvittert individuell gjennomgang.
- [x] Implementer instruktørens sluttkontroll, permanente bekreftelse, låste historikk og ny dokumentregistrering etter lukking.
- [x] Generer og kontroller faktisk lokal PDF med alle 52 punkter, merknader, begrunnelser og riktige avsendere fra frosset kilde.
- [ ] Prøv begge roller, mobil, hjelpemidler, tilbakebuffer, nettbrudd, transaksjonsfeil og planlagt fristdekning.

## Verification

- Prøv dokumentoppretting for fiktiv sjåfør uten andre dokumenter. Kontroller alle fire grupper, ett relevant og ett irrelevant tilfelle, mangler og bortfall av klarstatus når et svar endres.
- Prøv atomisk bekreftelse, stale, falskt klart utkast, tapt kvittering, gammel fane og 60 sekunder frakoblet. Kontroller faktisk frosset kilde og ny dokument-ID for neste gjennomgang.
- Generer en faktisk PDF, les alle tekstfeltene uavhengig av appen, inspiser alle sider med lange tekster, og registrer fysisk utstyr og resterende prøver.

### Utført på PC

- Ren låst, frakoblet installasjon la inn 92 pakker. Node 26.13.0 og npm 11.20.0 bygde sluttkandidaten `story-3.2-20261118-final`. JavaScript i `index-BjfFM7Cx.js` har SHA-256 `0C9EDB01E2B6E313FCB4E5707FDAC482D5EF5A20CB88C9CDA0F469EE2E10851F`. Typekontroll, bygg, lint og alle 73 Node-prøver passerte. Lint meldte åtte varsler, blant annet for Fast Refresh og effekter i teknisk visning. Vite meldte om størrelsen på hovedbundelen.
- Full nettleserregresjon på første gjennomgangsbygg ga 282 av 282. Sluttbygget ga 287 av 288 i Chromium, Firefox og WebKit. Én eldre førvurderingsprøve fikk `net::ERR_NO_BUFFER_SPACE` før appen ble lastet i Chromium. Samme uendrede prøve bestod fire av fire isolerte repetisjoner med samme sluttbygg. Alle nye tekniske nettleserprøver passerte.
- Fiktiv ordinær Edge-flyt prøvde 52 gjennomgåtte punkter og en blandet føring med ett ettordsunntak og to begrunnelser på 10 000 tegn. Begge roller lastet ned alle ni stående A4-sidene, med samme sideinnhold, riktige avsendere, ekte sidetall og lesbar forside. Poppler-raster er kontrollert i farge og gråtone. Edges innebygde leser åpnet filen fra disk og fant slutten av én lang begrunnelse én gang. `app/tests/pdf/verify-technical.py` kontrollerte dessuten begge faktiske PDF-er fra Chromium, Firefox og WebKit på det frosne sluttbygget. Alle seks filer hadde komplett kildetekst, aktive begrunnelser og bekreftelse.
- Edge på sluttbygget opprettet og låste uten vurderingsløp. Det bevarte ulagret input ved avbrutt lagring og avvist rollebytte, avviste foreldet kontroll etter endring i annen fane, fullførte gjenforsøk etter avbrutt bekreftelse og lastet ned etter en injisert Blob-feil. Faktiske tekniske filer fra begge roller passerte etter 60 047 ms uten nettforespørsler i WebKit på sluttbygget. Firefox på rettet gjennomgangsbygg gjorde det samme etter 60 018 ms.
- Windows 26H2, Edge 157.0.4341.60 og lokal testorigin. Fem løp, ett med fem dager, og fem bekreftede tekniske dokumenter med 260 punkter gav 886 517 byte serialisert prøveinnhold. Oppdatering tok 550 ms, kald gjenåpning av samme profil 1620 ms. Ett selvstendig teknisk dokument på sluttbygget ble gjenåpnet på 1047 ms.
- Faktisk schemaoppgradering 4 → 5 åpnet fem eldre vurderingsløp på 545 ms. Sjåførreferanser, løp, historikk og kvitteringer ble kontrollert før og etter. Gammel fane fikk kontrollert skrivesperre. Bruken av en egen teknisk dokumenttabell lar behandlede tekniske dokumentfeil vises uten å sperre den eldre vurderingsflyten.
- Rettet gjennomgangsbygg passerte ekte Chromium-tilbakebuffer i oppretting og lagret dokument. Gamle felt var borte fra DOM også ved `pageshow.persisted`, og uttrykkelig gjenopptakelse viste opprettingsutkastet. Første klikk virket i isolert vedvarende Firefox. Vanlig Ctrl+1 i Edge kontrollerte fortsatt rolle på den eldre vurderingen. En ugyldig teknisk kilde fikk egen feilmelding. To gyldige dokumenter og eldre instruktør-PDF var lesbare. Edge prøvde eksplisitt forkasting etter konflikt i to faner med bevart råtekst frem til forkasting.
- Faktiske PC-prøver med Edge i 320/360/390/768/1280 CSSpx, portrett og landskap, simulert 200 % tekst og faktisk 400 % Chromium-zoom ved 316 CSSpx passerte. NVDA 2026.3.1 leste navngitt avkryssing, feltfeil, relevansdialog og lagringsstatus i Edge. Disse prøvene gjelder de testede skjermene og kandidatene. Fysisk Lenovo Pad, Android Chrome, iPhone Safari, mobilskjermtastatur, mobilskjermlesere, installert variant og telefonmålinger står åpne. Storyen forblir i review.

## Implementation Notes

Det godkjente storygrunnlaget er verifisert ordrett med elleve AC. Originalmalen er kontrollert visuelt. Lokal kildekontroll er også tilgjengelig som forventede 52 punkter, 26 linjer og linje 30-merknad i .cache/instructor-source/forventede-grunnkursrader.json. Den kan sammenlignes med ferdig mal og faktisk eksport når storyen er gjennomførbar. Implementering følger avhengighetene i sprinten.

Kandidaten bruker et separat teknisk dokumentlager i IndexedDB schema 5, med valgt sjåfør og dokumenttype i sesjonen, kvittering ved complete og samme lokale PDF-motor som vurderingene. Mal, innhold og bekreftelse fryses per teknisk dokument. To PDF-layoutfeil er rettet etter faktisk rasterkontroll. Den siste Edge-eksporten før formell review har synlige sidetall og avstand på forsiden. Begge tillatte roller fikk samme innhold med alle 52 punkter, ett ettordsunntak og to aktive begrunnelser på 10 000 tegn.

## Spec Change Log

## Review Triage Log

| Funn | Vurdering | Belegg og håndtering |
| --- | --- | --- |
| B1. Utkastkonflikt kan stenge all navigasjon | high | Flush stopper navigasjon, og «Forkast» leser via samme kontekstkrav som konflikten oppstod fra. Ved byttet valgt dokument, sjåfør eller rolle må forkast eksplisitt åpne faktisk kvittert arbeidsflate. Rettes. |
| B2. Gammel unntaksdialog kan gjenåpnes | medium | `canFill` avmonterer dialogen i konflikten uten å nullstille dialogtilstanden. Nye dialoger skal lese gjeldende utkast etter eksplisitt gjenoppretting. Rettes. |
| B3. Låst skjerm og eksport kan avvike | high | Skjerm leser ytre `header` og `points`, mens PDF leser validert snapshot. Låst skjerm skal vise samme frosne innhold eller presis feil for dokumentet. Rettes. |
| B4. Ugyldig teknisk dokument stopper arbeidsflaten | high | Oppslag av alle tekniske dokumenter for valgt sjåfør validerer i den delte lesingen. Én ugyldig rad kan dermed blokkere et ellers lesbart vurderingsløp. Avgrens feilen til dokumentet og behold data. Rettes. |
| B5. To gyldige like dokumentrader kan ikke skilles | medium | Busstype, dato og status kan være like for ulike documentId-er. Oppgi en tydelig dokumentreferanse, også for hjelpemidler. Rettes. |
| B6. Gjentatt kontroll fokuserer ikke manglene | medium | `setChecked(true)` endrer ikke avhengighetene ved samme revisjon. Gjenta fokusflytting hver gang en fullført kontroll finner mangler. Rettes. |
| B7. Synlig redigeringsknapp har annet tilgjengelig navn | medium | Et unntak endrer visuell tekst, mens aria-label beholder «Gjelder ikke busstypen». Inkluder aktiv synlig handlingsetikett og punktnavn. Rettes. |
| B8. Skjermleser skiller ikke avkrysset tilstand og aktivt unntak under tabbing | medium | Ikke gjennomgått og unntak har begge uavkrysset kontroll. Knytt gjeldende tekststatus og aktiv årsak til punktkontrollen. Rettes og prøves. |
| B9. Tegn utenfor vedtatt fontdekning kan lagres | medium | Begge Noto Sans-filene mangler blant annet U+1F68D og U+1F642. Felles eksportmotor har samme eksplisitte, ikke-destruktive bokstavkontroll som i 2.2. Bredere fontdekning er et felles eksportproblem. Registreres som gjenstående uten å avvise nye tegn i registreringen. |
| B10. Kodebasens nettleserprøve leser ikke faktisk PDF-innhold | medium | PDF-signatur og filnavn passerer selv ved bortfall av en hel rad. Uavhengig kontroll er allerede kjørt lokalt, og den gjentas identisk fra kodebasens testartefakter. Rettes. |
| E1. Konfliktforkasting leser med foreldet adresse | high | Samme konkret reproduksjonsvei som B1. En eksplisitt forkasting må kunne lese og ta i bruk faktisk aktive dokument også ved feil kontekst. Rettes. |
| E2. Lagringskommando godtar ugyldig array/primitiv | medium | Tomme arrays og truthy primitive verdier uten egne nøkler passerer feltkontroll og kan forbruke revisjoner. Krev gyldig objektform før lesing og lagring. Rettes. |
| E3. Gyldig utkast kan inneholde tegn utenfor de lokale fontene | medium | Fontkontroll viste U+674E og U+1F600 uten dekning. Den etablerte PDF-feilveien beholder lås og data. Bredere appomfattende dekning registreres med B9. |
| V1. Vedvarende basisprøve mangler for schema 4 | medium | Den separate Edge-prøven bevarte fem vurderingsløp, sjåførindeks, kvitteringer og to PDF-typer. En app-test med eksisterende sjåfør i schema 4 skal dekke oppgraderingsgrenen og teknisk oppretting med bevart referanse. Rettes. |
| V2. Nedlastingsprøve kan passere ved bortfall av faginnhold | medium | Faktiske ni A4-sider er kontrollert uavhengig med begge 10 000-tegns begrunnelser. Kodebasen får en kjørbar kontroll som oppdager tapt punkt, merknad, langtekst eller bekreftelse i de faktiske nedlastingene. Rettes sammen med B10. |
| V3. Feilet autosave ved rollebytte mangler vedvarende prøve | medium | Rotprøven avbrøt kommandoen ved IndexedDB-skriving, så råtekst ble beholdt og ny rolle stanset. Samme feilvei skal prøves i kodebasens nettleserregresjon. Rettes. |
| V4. Fokusregresjon ved to uendrede kontroller | medium | `checked` og `saved.issues` ligger stabile ved andre kontroll. Utvid fokusprøven med en identisk ny kontroll etter B6-retting. |
| R1. Råtekst blir liggende i DOM ved tilbakebuffer | high | Ekte Chromium-tilbakebuffer med `pageshow.persisted` bevarte skjult råtekst i et inputfelt etter bytte til fadder i annen fane. Behold utkast lokalt i React-tilstand og fjern gamle skjemakontroller fra DOM til riktig kontekst er bekreftet. Rettes. |
| R2. Første klikk i Firefox kan forsvinne | medium | Isolert vedvarende Firefox-profil sendte `pointerdown` og første vindusfokus, men aldri `click`. Den synkrone rollevakten avmonterte den klikkede knappen. Ny ordinær fane og andre klikk passerte. Behold vaksomhet ved reell retur fra bakgrunn og bevar første klikk før første vindusfokus. Rettes. |
