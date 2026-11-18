---
title: "Story 2.2 – Laste ned komplett sluttdokumentasjon som PDF"
type: feature
story_key: 2-2-laste-ned-komplett-sluttdokumentasjon-som-pdf
status: in-review
baseline_commit: 04a6821bea8053e8cff9b76afab6899d6354fc02
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 2
story: "2.2"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1"]
approvedSource: ../planning-artifacts/story-2-2-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 2.2 – Laste ned komplett sluttdokumentasjon som PDF

Begge roller kan laste ned den fullstendige, frosne dokumentasjonen for et kvittert avsluttet løp. Filen kan åpnes og leses uavhengig av appen.

## Akseptansekriterier

<frozen-after-approval>

**AC-2.2-01 – Kontrollere lukket og komplett dokumentgrunnlag før eksport**

**Gitt** et valgt løp og et forsøk på PDF-eksport via UI eller applikasjonsport,
**Når** dokumentgrunnlaget hentes,
**Så** tillates normal eksport bare fra kvittert lukket ClosureSnapshot etter Story 2.1, med kjent pdfLayoutVersion; åpne, ufullstendige og Under oppfølging-løp avvises også når alle hittil opprettede dager er låst,
**Og** felles dokumentkontroll verifiserer eksakte kriterie-ID-er, 22 + 44 × antall opprettede dager, nødvendige bekreftelser og fullstendig dokumentgrunnlag før fil tilbys. Dupliserte/fremmede ID-er kan ikke passere med riktig antall alene,
**Og** oppdaget ufullstendighet stopper normal nedlasting med forståelig feil og identifiserte mangler. Hvis en teknisk diagnostikkfil likevel produseres, får hver side «UFULLSTENDIG – IKKE ENDELIG DOKUMENTASJON» og mangler oppgis uten å hevde bekreftelser som ikke finnes,
**Og** dette innfører ingen utkast-PDF-funksjon. PDF-adapteren gjør ingen egen faglig godkjenning eller ny validering av låst historikk etter nyere regler (FR-18, NFR-5, AD-1/7/10/11).

**AC-2.2-02 – Levere en faktisk, selvstendig fil fra riktig snapshot**

**Gitt** gyldig eksportgrunnlag og sjåfør eller fadder som aktiv rolle,
**Når** brukeren velger Last ned PDF,
**Så** lager lokal PDF-adapter med vedtatt @react-pdf/renderer en faktisk PDF-Blob med application/pdf som kan lagres og åpnes uten appen,
**Og** genereringen bruker det valgte løpets frosne snapshot og layoutversjon, ikke levende skjermfelter, nyere globale profiler eller en ny sammenslåing av åpne løpsdata. Ved rolle-/løpsskifte mens generering pågår må ferdig fil ikke presenteres som tilhørende et annet løp,
**Og** skjermdump eller bare nettleserens utskriftsdialog oppfyller ikke leveransen. Filen inneholder tekst og nødvendige innebygde ressurser for selvstendig lesing,
**Og** begge roller får samme komplette faginnhold etter begge avslutningsvalgene. Overlevering, HR-opplasting og kopi til sjåfør skjer manuelt utenfor appen (FR-15/17/19, NFR-6, AD-9/10/11).

**AC-2.2-03 – Bevare alt faginnhold, avsendere og separate bekreftelser**

**Gitt** et avsluttet løp med én til fem opprettede dager,
**Når** snapshotet gjengis i PDF,
**Så** inngår fiktiv identitet/tilhørighet, alle øktopplysninger og dager kronologisk, alle 22 historiske kriterietekster, én førvurdering og hver dags separate sjåfør-etter-/faddersvar,
**Og** alle egne relevansbegrunnelser, separate avgjørelser og avslagskommentarer, øvrige kommentarer, egenevalueringer på faktisk dag, oppfølgingsbehov/planhendelser, valgfri konklusjon, valgt Godkjent/Oppfølgingsbehov og faktisk avsluttende fadder/tid bevares. Ingen tekst forkortes til et sammendrag,
**Og** «Førvurdering bekreftet av [sjåførnavn]» vises én gang for utgangspunktet og «Ettervurdering bekreftet av [sjåførnavn]» / «Fadderens del bekreftet av [faddernavn]» per faktisk dag. Eventuell gjentatt førreferanse merkes som samme historiske bekreftelse. Fadderbytte bevarer alle faktiske bekreftende navn og hvilken del/dag de tilhører,
**Og** sjåførens bekreftelse fremstilles ikke som godkjenning av fadders meninger. Uenighet bevarer begge perspektiver; sen utvidelse bevarer tidligere og eventuell ny egenevaluering på sine dager. Frivillig tom/skippet evaluering og tom konklusjon er gyldig og får ikke oppdiktet innhold (FR-17, AD-6/7/8/10/11).

**AC-2.2-04 – Gjengi det godkjente liggende og stående oppsettet**

**Gitt** komplett dokumentgrunnlag og godkjent DESIGN/PDF-referanse,
**Når** dokumentet komponeres,
**Så** er første side A4 liggende med oppsummeringsfelt øverst og progresjonsmatrise med 22 kriterier i rader, én førkolonne og to vurderingskolonner per faktisk dag i kronologisk rekkefølge; fem dager gir elleve vurderingskolonner,
**Og** side 2 og videre sider er A4 stående med kommentarer, relevansbegrunnelser/avgjørelser, evalueringer, planhistorikk, Konklusjon og faktiske bekreftelser. Korte representative data følger det godkjente prinsippet med to sider; mer innhold fortsetter på flere stående sider uten fast sidegrense,
**Og** svarfyll er OK #CDECCD, Kan bli bedre #FFF0A6 og Ikke relevant #F6C0BF med tekst #333333 og rutenett #9A9A9A. Tekst/symbolforklaring bevarer betydningen uten farge; rød Ikke relevant fremstilles som gyldig begrunnet svar,
**Og** bekreftelsesfeltene bruker vanlige tekstnavn: sjåfør til venstre, fadder til høyre og ekstra fadder i midten når aktuelt. Flere faktiske avsendere bevares ved behov over flere felt/sider; ingen felles, håndtegnet eller identitetsverifisert signatur oppfinnes (FR-19, UX-DR23, AD-11).

**AC-2.2-05 – Bruke lokal Noto Sans og bevare godkjent profil**

**Gitt** PDF-adapterens font- og profilressurser,
**Når** PDF bygges for første gang og senere genereres,
**Så** brukes vedtatt Noto Sans fra statiske TTF-filer bare i PDF, med nødvendige varianter og innebygging for dokumentets tekst. Konkrete filers utgivelse, kilde, lisens og hash dokumenteres før berørt bygg,
**Og** faktisk Noto Sans-render kontrolleres mot godkjent komposisjon; historiske PDF-skisser med annen font er layoutreferanser, ikke en begrunnelse for å hoppe over ny kontroll,
**Og** original logo brukes med uendrede proporsjoner og vedtatte profilflater/tokens. Eksisterende systemfont og skjermdesign beholdes,
**Og** punkthjelp og tilhørende hjelpesymboler utelates fra PDF/utskrift uten å fjerne faktisk brukerinnhold eller tegn fra kommentarer (FR-19, UX-DR6/19/23, AD-2/11).

**AC-2.2-06 – Gjengi lange tekster og alle sider uten tap**

**Gitt** korte data, et komplett femdagersløp, norsk/svensk tekst med æøå/åäö, én kommentar på 10 000 tegn og flere lange kommentarer/begrunnelser/evalueringer,
**Når** alle genererte sider renderes og sammenlignes med snapshotet,
**Så** finnes hele teksten søkbart og lesbart i dokumentet, uten klipping, overlapping, manglende tegn eller tap ved sideskift. Ingen lang tekstblokk tvinges samlet til én side,
**Og** sidetall og nødvendige gjentatte tabell-/deloverskrifter bevares; avsender, dag og vurderingsdel kan fortsatt forstås når tekst fortsetter over sider,
**Og** alle sider inspiseres visuelt, inkludert den liggende matrisen med elleve vurderingskolonner, stående fortsettelsessider og gråtoneutskrift. Tekstuttrekk kontrolleres mot kildeinnhold, ikke bare første side eller totalt antall svar,
**Og** testlengden innfører ingen ny produktgrense for fritekst. Søkbarhet og fornuftig leserekkefølge prøves uten å hevde PDF/UA-, PDF/A- eller e-signatursertifisering (FR-19, NFR-5, AD-11/12).

**AC-2.2-07 – Tillate ny nedlasting og feilrettet forsøk uten å endre løpet**

**Gitt** et kvittert avsluttet løp og gjentatt nedlasting, avbrutt lagring eller teknisk genereringsfeil,
**Når** brukeren forsøker igjen eller åpner løpet på nytt,
**Så** brukes samme frosne kilde og støttede pdfLayoutVersion og gjengis samme faginnhold, navn, bekreftelser og konklusjon; byteidentiske filer loves ikke,
**Og** feil vises som PDF-feil med nytt forsøk. Den endrer ikke lukket status, innsyn, historikk eller låser, og krever ingen nye faglige bekreftelser,
**Og** manglende font-/layoutstøtte eller ugyldig snapshot gir en kontrollert feil fremfor stille bruk av en annen dokumentversjon. Ingen databasesletting eller gjenåpning brukes som løsning,
**Og** generering kjøres utenfor lagringstransaksjonen; midlertidige filressurser ryddes etter bruk. Minnebruk og genereringstid måles på faktisk telefon før eventuell worker velges, uten å innføre et nytt ytelsesløfte (FR-14/19, AD-3/10/11/13).

**AC-2.2-08 – Generere lokalt ved avtalt nettbrudd**

**Gitt** lastet app, fungerende lokalt lager og kvittert avsluttet løp,
**Når** et nettbrudd på 60 sekunder inntreffer og PDF lastes ned,
**Så** er PDF-motor, valgte fontfiler, logo og øvrige nødvendige ressurser allerede lastet lokalt før registrering ble åpnet, og filen kan genereres uten nettverksavhengighet,
**Og** registreringsstartens ressurskontroll er utvidet til disse ressursene; feil ved nødvendig lasting gir tydelig feil/nytt forsøk uten å simulere en komplett start eller slette data,
**Og** innhold sendes ikke til en ekstern dokumenttjeneste, CDN, analyse eller HR-system. Bare fiktive data brukes i prøvegrunnlaget,
**Og** normal gjenåpning følger AD-4s vedtatte betingelser på samme origin/profil/enhet med bevart lager. Dette bestiller ikke service worker eller kaldstart uten nett (FR-10, NFR-3/6, AD-2/4/11).

**AC-2.2-09 – Gjøre PDF-handlingen tilgjengelig og prøve faktisk mobillesing**

**Gitt** S10 etter avslutning med begge roller og begge konklusjonsvalg,
**Når** handling, generering, feil og nytt forsøk brukes på AD-12s vedtatte bredder/nettlesere/enheter,
**Så** har Last ned PDF forståelig navn, indigo primærstil, tastatur-/skjermleserbetjening og tekstlig genererings-/feilstatus. Status formidles uten unødvendig fokusflytt, og skjermtastatur/sticky innhold/forstørrelse skjuler ikke handling eller fokus,
**Og** lagring/nedlasting og åpning prøves på faktisk iPhone/Safari, Android/Chrome og Windows Edge/Chrome samt installert variant etter testplanen; automatisert WebKit likestilles ikke med fysisk iPhone-prøve,
**Og** lagret PDF åpnes uten appen i vanlig iOS-/Android-leser og minst én uavhengig desktopleser. Lesbarhet, tekstsøk, korrekt faginnhold og innebygde tegn/font prøves,
**Og** faktiske OS-/nettleser-/build-/skjermleser-/PDF-leserversjoner og eventuelle testgap registreres. Webflaten følger WCAG 2.2 AA-målet, vedtatte 320/360/390/768/1280 CSSpx, 200 % tekst/400 % zoom og relevante VoiceOver/TalkBack/NVDA-prøver (NFR-1/2/5, UX-DR18/20/21/22, AD-12).

**AC-2.2-10 – Verifisere hele V1-løpet frem til komplett fil**

**Gitt** integrasjonen av de tidligere storyene og PDF-adapteren,
**Når** løp med én, to, tre og fem dager gjennomføres fra oppretting til nedlastet fil etter testplanen,
**Så** bekreftes henholdsvis 66/110/154/242 vurderingsposisjoner med eksakte ID-er og sammenligning av fulltekst, historiske avsendere, bekreftelser, relevansavgjørelser, evalueringer, planhendelser og konklusjon mellom lagret kilde og PDF,
**Og** prøvene omfatter begge avslutningsvalg, fadderbytte, dag-1-arv, nytt daglig relevansvalg, dokumentert avslag og fadders eget Ikke relevant, ett sett evaluering i ett-dagsløp, sen planutvidelse med bevart evaluering og tomme frivillige felt,
**Og** sperret eksport før avslutning, manipulert/ufullstendig dokumentgrunnlag, genereringsfeil, gjentatt nedlasting, langt innhold og nettbrudd prøves med uendrede historiske låser. Ren installasjon med låste avhengigheter, typekontroll/bygg og relevante adapter-/nettleserprøver fullføres,
**Og** faktisk utførte prøver og gjenstående gap dokumenteres. Godkjent story/dokumentkontroll regnes ikke som utførte app- eller PDF-tester, og nye produksjonsroller, integrasjoner eller publisering inngår ikke (NFR-5/6, AD-7/10/11/12/13).

</frozen-after-approval>

## Code Map

- Bruk `RunApplication.readClosureSnapshot(runId)` i `app/src/application/run-application.ts` og `validateClosureSnapshot` fra `app/src/domain/closure.ts`. Versjon 1 har `history` med faktiske registrerte dager og ett førsett, `conclusion` og historisk `closedBy`. Frosset `documentVersion` og `pdfLayoutVersion` styrer kjent dokumentkilde. Gjenbruk samme kontroll for korrekt kriterie-/dagsdekning, frosne dokumentversjoner og bekreftelser. Last kilde for det eksplisitt valgte løpet. Beregn det ferdige dokumentet utenfor IndexedDB-transaksjonen.
- Integrer PDF-adapter med `@react-pdf/renderer` og den frosne layoutversjonen. Bruk [godkjent PDF-referanse](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-pdf.html) og original lokal logo. Utvid `app/src/bootstrap/start.ts` og etablert `prepare` med lokale PDF-ressurser. Begge fontene må være lastet og registrert og motoren klar før registrering åpnes. Bruk eksisterende oppstartsfeil og nytt forsøk.
- Vis Last ned PDF og tekstlig status på den integrerte S10-flaten med `ClosedHistory` i `app/src/ui/DayHistory.tsx` og aktivt løpsvalg i `app/src/ui/App.tsx`. Gjenbruk etablert feil-/retry-mønster, og knytt ferdig fil til gyldig aktiv kilde ved rolle-/løpsskifte eller avbrutt visning. Rydd midlertidige filressurser etter bruk og bevar kvittert lukket tilstand.
- [Overleveringen](overlevering-lokal-implementering.md) dokumenterer låst motorforprøve, Noto Sans v2.014 og OFL med SHA256, kontroll av 242 matriseposisjoner, Poppler og ubrutt 10 000-tegnstekst. `.cache/pdf-preflight` inneholder de lokale forprøvene. Gjenbruk verifisert grunnlag og kontroller den faktiske eksporten separat.

## Tasks & Acceptance

- [x] Legg til autoritativ eksportport for komplett lukket snapshot med kjent layoutversjon. Test avvisning av åpne, korrupte og ufullstendige kilder.
- [x] Generer en nedlastbar PDF-Blob med én liggende A4-matrise og stående detaljsider. Gjengi alle faktiske dager, historiske avsendere og separate tekster uten tap. Kontroller profil, Noto Sans, gråtone og søkbar tekst.
- [x] Integrer lokale ressurser før registrering og tilgjengelig nedlasting/feil/nytt forsøk. Prøv frakoblet 60 sekunder, flere forsøk, avbrutt generering og riktig løp ved navigasjon.
- [ ] Gjennomfør én-, to-, tre- og femdagersløp til faktisk PDF. Sammenlign innhold i nedlastede filer mot hvert snapshot, render hver side og sjekk lange og ubrutte tekster. Prøv åpning på faktiske lesere/enheter og noter versjoner og eventuelle gap.

## Design Notes

Første side bærer oppsummeringen og matrisens 22 × opptil 11 celler. Stående sider bærer detaljene, med nok sammenheng til å forstå dag, avsender og del ved sideskift. Ta vare på hele originalteksten. Tilnærming til linjebryting i visningskopien må også prøves med ubrutte token, norske/svenske tegn og tekst som går over flere sider.

## Verification

- Kjør ren låst installasjon, bygg/typekontroll, lint, Node-prøver og nettleserprøver. Last ned faktiske filer i Chromium, Firefox og WebKit, med 60 sekunder offline og prøvd feilgjenoppretting.
- Bruk `pdfinfo` og `pdftoppm` til å kontrollere format og rendere alle sider. Den lokale verktøypakken har verifisert `pdfplumber` for tekstuttrekk og tegnplassering og `pypdf` for innebygde TrueType-fonter. Inspiser normal og gråtone. Prøv faktiske mobil-/desktoplesere og installert variant etter godkjent testplan. Registrer utført og gjenstående verifisering med versjoner.

## Implementation Notes

Implementering startet 18. november fra Story 2.1s varige dokumentkilde. R2 har faktisk 1/2/3/5 dager, frosset historikk og åpning i begge roller. PDF- og fontforprøvene brukte fiktive data. Nedlasting fra den faktiske vurderingsappen må prøves separat.

En separat låsfilprøve, basert på appens Story 1.8-låsfil og pakkenes lokale cache i `.cache/pdf-preflight/npm-cache`, la til `@react-pdf/renderer@4.9.0` uten nett og uten å endre versjonen til noen eksisterende låst pakke. Pakken og de 60 nye låste oppføringene ble kun prøvd i en ignorert katalog. En påfølgende ren installasjon fra den kombinerte lokale cachen i `.cache/story-2-2/combined-npm-cache` bestod med 92 installerte pakker og uendrede låste Vite- og React-versjoner. Bruk `npm.cmd install --save-exact --offline --no-audit --cache ../.cache/story-2-2/combined-npm-cache @react-pdf/renderer@4.9.0` fra `app/` ved implementering. Den første isolerte, administrerte Windows-prøven ble stoppet av en pakkefiltillatelse, og samme nettfrie installasjon bestod etter avgrenset godkjenning i annen cache-mappe.

For uavhengig prøve er `.cache/story-2-2/verify-export.py` klargjort til å sammenholde lesbar PDF-tekst, A4-orientering, innebygde Noto Sans-varianter og faktiske økt-/vurderingsfelter fra fiktive nettleserløp. Tilpass matrisens kolonnegrenser og utvid med eksakte celle-, sidetalls- og avsenderkontroller mot den endelige layouten. Kjør også visuell inspeksjon og gråtoneprøve av alle relevante sider.

Det første integrerte kandidatbygget ga faktiske PDF-er fra en full ordinær Edge-flyt for én og fem dager, fra begge roller. Fadderens én-dagsfil var 59 795 byte. Femdagersfilen med lange fiktive tekster var 246 248 byte og ble lastet ned etter 61 874 ms frakoblet uten ressursforespørsler. Farge- og geometrikontroll mot de faktiske lukkede kildene fant samtlige 66 og 242 riktig markerte svarruter. PDF-tekstinnholdet var identisk mellom rollene for éndagsløpet.

Den første filkontrollen avdekket at landskapssiden fikk 580,6 pt høyde for én dag og 589,0 pt for fem dager. A4 krever 595,28 pt. Sidetallet lå over matrisen på første side og utenfor alle stående sider, en planpil ble feildekodet, og den ubrutte 10 000-tegns testteksten fikk 90 ekstra bindestreker. Disse funnene er meldt til implementeringen. Senere kandidater må prøves på nytt før eksport leveres. Bevis fra første kandidat ligger i `../../.cache/story-2-2/candidate-pdfs`.

Andre Edge-kandidat ga faktiske 1/2/3/5-dagersfiler fra ordinær oppretting til lukking og nedlasting, i begge roller. Farge, markør og rekkefølge samsvarte med kilden på 66/110/154/242 posisjoner. Begge roller hadde lik tekst side for side. Alle synlige tegn i prøvene brukte Noto Sans, og begge TrueType-variantene var innebygd. Femdagersfilen i langtesten hadde 11 fysiske A4-sider. Full ubrutt 10 000-tegnstekst, svensk langtekst og konklusjon ble funnet i faktisk tekstuttrekk. Sidetall var på alle sider og under matrisen. Sidene er inspisert i farge og gråtone.

Den ordinære femdagersfilen ble lastet ned etter 61 767 ms frakoblet uten ressursforespørsler. Faktisk fil åpnet i Edges lokale PDF-leser fra disk. En fontfeil ved oppstart ga fungerende nytt forsøk, og en lokal filadressefeil etter generering ga ny nedlasting med uendret avsluttet løp. Layout for kort tredagersfil og dag-/punktkontekst ved ordinære sideskift er under videre kontroll. Første kalde WebKit-eksport frakoblet prøves med klargjort PDF-motor før registrering.


Den korrigerte kandidaten `index-BJNyt2Gd.js` har en lokalt innebygd 24-bit PNG som gjengir nøyaktig originalens 827 × 827 piksler mot hvit papirflate. Kontrollen bekreftet samme farger og proporsjoner på ti sider i en faktisk femdagersfil fra WebKit. Dette fjerner behovet for en ny dekodingsworker under eksport. Første faktiske WebKit-eksport av kort tredagersløp lastet en fil på 63 640 byte etter 60 502 ms frakoblet, uten ressursforespørsler. Poppler og sammenligningen mot lagret kilde bekreftet to A4-sider og alle 154 svarrutene. Implementeringsprøven lastet også den samme 196 402-byte femdagersfilen i Chromium, Firefox og WebKit etter mer enn 60 sekunder frakoblet.

Windows-prøver av den korrigerte kandidaten bekreftet nytt forsøk etter font- og filfeil, tastaturnedlasting med bevart fokus, synlig fokus og minst 48 CSSpx på knappen. Edge brukte 320, 360, 390, 768 og 1280 CSSpx og simulert 200 % tekst ved 390 CSSpx. Chromium brukte faktisk 400 % zoom ved 316 CSSpx. En testfeil med eksakt flyttallslikhet ble rettet i det lokale prøveprogrammet før gjentatt utført kontroll.


Regresjonen av den frosne gjennomgangskandidaten bestod i alle tre motorer med 255 nettleserprøver på 7,1 minutter. Det omfatter eksisterende offline-lagrings- og låseprøver og ny avbrutt PDF-nedlasting. Den eksakte gjennomgangskandidaten har egen bygge-ID og lagres i `../../.cache/story-2-2/review-dist`. Faktisk Chrome 157.0.8103.79 lastet ned en komplett todagersfil på 61 789 byte første gang frakoblet uten ressursforespørsler. Edges uavhengige, lokale PDF-leser fant «Sluttmerke ÆØÅ» én gang i den nedlastede femdagersfilen på side 9. Uttrekket viste at svært lange navn fortsatt kan overlappe brødteksten i fortsettelsesoverskriften. Gjennomgangsfunn er sendt til retting. Full regresjon skal gjentas på sluttkandidaten.


Uavhengig Edge-prøve etter første gjennomgangsretting lastet 91 456 byte fra den samme fiktive avsenderkilden som hadde overlapp. Hele avsenderen og hele kommentaren, inklusive begge markørord, kom nå ut i riktig rekkefølge og innenfor A4-sidene. PDF-prøven med to faktiske UTC-tider ved høstens Oslo-klokkeskifte ga 02:30:00 GMT+2 og 02:30:00 GMT+1. Første WebKit-nedlasting etter endring til avbrytbar PDF-strøm bestod etter 60 753 ms uten nettforespørsler. Denne kandidaten hadde en senere typografisk retting før sluttprøven av kort tredagerslayout.

Noto Sans-varianter med dokumentert utgivelse og hash er fortsatt de statiske fontene i det godkjente grunnlaget. Kontrollert Edge-prøve av en fiktiv tekst med manglende tegn fikk forklaring med Unicode-koder og ingen nedlasting. Manglende skriftsupport må ikke gi en komplett fil med endret fagtekst.


## Lokal sluttverifisering

- Frosset bygg story-2.2-20261118-r5, index-G5MM-LLe.js, SHA-256 B338D4219CD2DBD459D2D1D6AD9AD0C2956932F1F1FD0BC5368EDC32903C2E33. Ren låst installasjon fra lokal cache bestod med 92 pakker. Typekontroll, bygg og 59 Node-prøver bestod. Lint avsluttet uten feil med fem Fast Refresh-advarsler i PDF-komponeringen. Vite meldte om JS-pakke på 1,645 MB minifisert og 582 kB gzip.
- Windows Edge 157.0.4341.60, Windows 26H2 build 26300.9974. Ordinære 1/2/3/5-dagersløp ble gjennomført fra oppretting til fil for begge roller i r4. Eksakte PDF-kilder, markører, farger, oppfølging, låser og lesbar tekst ble sjekket. R5 lastet de samme fire kildene på nytt. Hver A4-sides innholdsstrøm, geometri og lesbare tekst samsvarte eksakt med kontrollen fra r4.
- Langt femdagersløp ga en liggende A4-side med 242 ruter og ni stående A4-sider. Fullt felt på ti tusen ubrutte tegn, øvrig norsk/svensk tekst og alle historiske bekreftelser var med. Alle ti sider var inspisert i farge og gråtone. Én-, to- og kort tredagersfil fikk to A4-sider. Tredagersfilen med flere registrerte merknader fikk tre. Lesbar tekst var lik fra fadder og sjåfør for hvert løp.
- Ordinær Edge-flyt ga første femdagersfil etter 61 186 ms frakoblet uten ressursforespørsler. Første PDF på r5 i WebKit 26.5 kom etter 60 823 ms uten ressursforespørsler. Frosset kort tredagersfil var 63 820 byte, og den faste artefaktkontrollen bekreftet to A4-sider og alle 154 ruter. Faktisk Windows Chrome 157.0.8103.79 lastet todagersfil frakoblet på gjennomgangskandidaten.
- Femdagersfil fra r5 åpnet direkte fra disk i Edges egen PDF-leser. Vanlig søk fant særnorsk avslutningstekst i kandidatfilen. En særskilt 160-tegns søkestreng som går over visuelle linjeskift fikk ingen treff i Edge. Eksakt faglig tekst var bevart i uttrekket når visuelle linjeskift ble tatt med i sammenligningen.
- Kontrollert fontfeil og lokal filadressefeil ga nytt forsøk. Korrupsjonsprøve viser hva som mangler fra det frosne dokumentet. Ukjente glyfer som de godkjente Noto Sans-filene ikke dekker avvises med forklaring og uten å røre lagret historikk. Lang fadderidentitet, UTC-avvik ved klokkeskifte, fast A4-geometri og kanonisk PDF-rekkefølge ble prøvd.
- Faktisk Chromium-zoom 400 % ved 316 CSSpx og Edge-breddene 320/360/390/768/1280 samt simulert 200 % tekst bestod på gjennomgangskandidater. NVDA 2026.3.1 i Edge på r5 leste «Last ned PDF», knapp, og «PDF-filen er klar». Faktisk tastaturnedlasting beholdt fokus.
- Ren r5-preview på 127.0.0.1:4183 åpnet registreringsknappen etter 797 ms i Edge. Begge PDF-fonter og øvrige appressurser kom fra samme lokale origin.
- Sluttregresjon bestod med 264 av 264 nettleserprøver på 7,2 minutter. Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5 lastet faktiske PDF-filer under den faste 60-sekundersprøven. Etterkontroll av hvert av de tre fil/kilde-parene bekreftet riktig A4-format, alle 66 vurderinger, felttekster og separate bekreftelser.
- Fysisk iPhone/Safari, Android/Chrome og Lenovo/Brave, mobil PDF-lesing, installert variant, VoiceOver/TalkBack og telefonmåling av minne og genereringstid gjenstår. Fast HTTPS-origin og samme profil skal brukes til enhetsprøven. Storyen blir stående i review til obligatoriske kontroller er utført.

## Spec Change Log

## Review Triage Log

| Funn | Vurdering | Bevis og håndtering |
| --- | --- | --- |
| B1. Tegndekning | high | FontKit bekrefter manglende glyfer, og E4 verifiserte faktisk tap. Rett stille tap og bruk lokal dekning der det er mulig innenfor fontkontrakten. Patch. |
| B2. Fast topp med lang avsender | high | Faktisk Edge-eksport blandet avsender og kommentar på side 3 ved y105–125 pt. Bruk flytende full avsender og avgrenset gjentatt kontekst. Patch. |
| B3. Udelelig kort kommentar med lang etikett | high | Modellen begrenser ikke avsendernavn. Innpakking avgjøres av kommentarlengde alene selv om etiketten tar mer enn en side. La samlet blokk kunne deles. Patch. |
| B4. Omstokket kriterierekkefølge | high | Innholdsvalidering krever alle ID-er, men ikke rekkefølge. Gruppene kan gjentas og eksporten får feil ordning. Bruk kanonisk rekkefølge etter ID med uendret historisk tittel. Patch. |
| B5. Dokumentfeil ved oppstart | medium | Den eksisterende samlede lagringslesingen kan stoppe hele oversikten, og den nye detaljerte dokumentfeilen forsvinner i generisk tekst. Gjør den konkrete dokumentfeilen synlig i kontrollert oppstarts-/åpnefeil. Regional isolering av ellers uleselige arkivposter er eldre felles lagringsatferd. Patch og avgrenset defer. |
| B6. PDF-strøm uten feil-/avbruddssti | high | Kilden for låst motor lytter etter data og end i toBlob, men ikke error. Etter en uoppgjort Promise kan ny nedlasting heller ikke startes. Gjør strømmens feil og signal/rydding eksplisitte. Patch. |
| B7. Overlappende ressursstart | high | Felles femsekundersgrense kan slippe neste forsøk etter at gammelt fontarbeid har passert abortkontrollen. Sent Font.clear kan da fjerne nye ressurser. Del aktiv klargjøring og isoler opprydding. Patch. |
| B8. Søk over visuell bryting av ubrutt token | medium | Kontrollprogrammet ignorerer whitespace og kan derfor ikke bevise søk over sidelinjer. Edges faktiske filvisning fant «Sluttmerke ÆØÅ» ett sted. Et faktisk søk etter 160 sammenhengende tegn fra 10 000-tegnsfeltet, lenger enn én visuell linje, viste «Ingen resultater». Prøv igjen på sluttkandidaten og dokumenter leserens faktiske resultat. Patch for eventuell ekstra tekstendring. |
| B9. Fast dokumentkontroll | medium | Node-testen bytter ut renderer og den faste nettleserprøven bare ser filheader. Lokale kildesammenligninger er reelle, men ligger i ignorert cache. Bevar en gjenkjørbar faktisk filkontroll i prosjektets verifiseringsflyt. Patch. |
| B10. Fysisk installasjon og mobil PDF-leser | high | Krever faktisk Android/iPhone, respektive skjermlesere og installert variant. Playwright dekker bare motorene. Åpent obligatorisk akseptkriterium. |
| B11. Tvetydig Oslo-tid | medium | Lokal 02:30 gjentas ved overgangen fra sommertid; PDF skriver begge samme. Inkluder soneforskyvning ved historisk tid. Patch. |
| E1. Langt avslutternavn i fast topp | high | Konklusjon og kommentarer bruker samme faste høyde med variabel full avsender. Edge-filen reproduserer overlapp i samme kode. Del rot med B2. Patch. |
| E2. Kort felt med avsender over sidehøyde | high | Navn har ingen lengdegrense, og elementet kan være wrap=false selv ved flere tusen tegn i etiketten. Del rot med B3. Patch. |
| E3. Matrise vokser utenfor A4 | high | Uavhengig prøve målte høyde 788,49 pt ved omstokking og 1495,02 pt med ugyldig lang kriterietittel. Kanonisk gruppering retter første. Kontroller og avvis kontrollert layout som ikke kan holde den kjente A4-malen uten tap. Patch. |
| E4. Manglende glyfer i gyldig tekst | high | En faktisk fil ga skadet ekstraksjon av Li-navn og emoji. Del rot med B1, med bevis på faktisk gjengivelse. Patch. |
| E5. Segmenter ved innlasting | medium | Instansiering på modulnivå før appmontering gir ubehandlet feil hvis Intl.Segmenter mangler. Et eldre lokalt miljø skal kunne nå startfeil eller fungere med lokal reserve. Patch. |
| E6. Foreldet klargjøring rydder nyere fonter | high | Abort stopper ikke fontlasting/warmup etter registrering. Samme rot som B7. Patch. |
| E7. Uoppgjort PDF holder handling opptatt | high | Knappen frigjøres først i finally, og abortsignal stopper bare kildeuttaket. Samme rot som B6. Patch. |
| V1. Fast test skiller ikke matrisens roller | medium | Node ser bare kildeport, nettleser ser bare PDF-signatur og begge faser har samme testdata. Egen kilde-/artefaktkontroll skal bruke ulike verdier. Samme testområde som B9. Patch. |
| V2. Oppstartsfeil for nødvendig PDF-font | medium | Fast prøve av stilark/logo dekker ikke PDF-font. Midlertidig probe demonstrerte porten. Flytt ett fontfeil-/retrytilfelle inn i eksisterende oppstartstester. Patch. |
| V3. Fast nettbruddstest genererer ikke PDF | medium | Nåværende 60-sekundersprøve kobler på nett før PDF. Legg faktisk første nedlasting og null ressursforespørsler inn før den kobler til. Patch. |
| V4. Avbrudd etter påbegynt rendering | medium | Fast rollebytte slipper lagringslesingen først etter rollemontasje. Den tester ikke aktiv renderer. Legg til hold og avbrudd etter renderstart der det kan injiseres uten produksjonstestkroker. Patch. |
| V5. Detaljert korrupsjonsfeil i nettleser | medium | Fast prøve av Blob-feil kan bestå selv med fjernet detaljgren. Prøv korrupt lagret snapshot innenfor kjent åpen historikk og eksisterende arkiv. Patch. |
| R1. Felles sortering endret historisk rekkefølge i appen | high | Uendret nettleserprøve på r4 forventet kriterium 22 først i et frosset grunnlag. Chromium og Firefox viste kriterium 22 sist. Den felles grupperingen følger nå inputrekkefølgen, mens PDF sorterer en kopi før gruppering. Uendret smal prøve bestod i alle tre motorer, og reversert kilde/PDF beholdt to A4-sider og riktig historisk tittel. Full r5-regresjon bestod med 264/264. Patch. |
