---
title: 'Story 4.6 – Avslutte testkjøring og eksportere resultatet'
type: 'feature'
created: '2026-11-20'
story_key: 4-6-avslutte-testkjoring-og-eksportere-resultatet
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 0c32ccc05abd9cd7417c76d3c963c284bde1a4aa
context: ['_bmad-output/implementation-artifacts/epic-4-context.md', '_bmad-output/implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Testkjøringen avsluttes på en kvittert og låst versjon. Kandidaten og instruktøren kan lese resultatet og laste ned en egen testkjørings-PDF med alle tre perspektiver.

## Boundaries & Constraints

I piloten avslutter den tildelte instruktøren uttrykkelig etter kvittert før-, etter- og instruktørdel. Innsyn åpnes etter serverens kvittering, med eksisterende tidsavgrenset løpstilgang. Avslutning fryser faglig innhold, mal, faktiske avsendere, aktivt tidspunkt og resultat. Tide fastsetter endelig innsyn og oppbevaring før reell bruk.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| En del mangler | Instruktør forsøker å avslutte | Vis mangler og behold skjermet innsyn |
| Tre deler levert | Instruktør avslutter, eventuelt med retry | Én låst dokumentkilde og avtalt innsyn for begge |
| Ferdig løp med lange kommentarer | Last ned PDF fra hver rolle og prøv igjen | Lesbar komplett fil fra samme kilde, uten endringer i løpet |

</frozen-after-approval>

## Code Map

- Bruk Story 4.4/4.5s låste deler, aktør- og revisjonskontroll. `app/server/test-drive-store.ts` har synkron `withAssignment`, `candidateAssessment(driveId, part)` og `instructorAssessment(driveId)`. Instruktørdata er `answers`, `comments`, `overallComment`, `result`, `revision`, `submittedAt` og autentisert `authorId`. Åpne sluttinnsyn ved én transaksjon.
- `app/src/ui/TestDriveApp.tsx` har revisjonsvern, serveravslag, utløp, oppdatering og tilbakekomst fra sidehurtigbuffer i `RunDetail`. Bevar disse grensene ved innsyn og eksport.
- `app/src/ui/RunPdfDownload.tsx` har gjenbrukbar `PdfDownload` med avbrytelse ved sidebytte og naturlig nytt forsøk. `app/src/adapters/pdf/renderer.tsx` gir logo, innlastede Noto Sans-fonter, ressursfeil og filgenerering. Bruk en egen testkjøringslayout og autorisert, frosset kilde. Behold PDF-avhengigheten dynamisk på testkjøringens inngang, og bruk eksisterende hjelpere for kontrollert tekstbryting der det passer.

## Tasks & Acceptance

- [x] Implementer bekreftelseshandling, mangelliste, atomisk avslutning og serverautorisert sluttvisning.
- [x] Implementer faktisk PDF med 22 kriterier, begge kandidatkolonner, instruktørkolonne, faglige kommentarer og samlet resultat. Lange kommentarer skal kunne brytes over sider. Vis eksportfeil uten å endre frossen kilde.
- [x] Verifiser PDF-innhold fra begge roller, likt innhold etter ny innlogging, manglende tilgang, avbrutt avslutning og regresjon av eksisterende moduler.
- [x] Samle en presis manuell prøve for to fysiske enheter med fiktive data, innlogging, innsyn, lagring, utløp og lokalt lagret PDF. Se [fysisk sluttprøve](epic-4-manuell-verifisering.md).

Gitt en kvittert avslutning og gyldig tilgang, når begge brukere gjenåpner løpet og laster ned PDF, får de samme frosne faglige innhold. En bruker med utløpt eller tilbakekalt løpstilgang får avslag også på eksport.

## Implementation Notes

Lagre én autoritativ og versjonert dokumentkilde i SQLite med referanse til løpet, versjonert malinnhold, faglige svar, kommentarer, resultat, navn og referanser for faktiske aktører og kvitteringstidspunkter. Bruk `POST /api/testkjoring/runs/:id/close` med tomt JSON-objekt. Frigjør sluttinnsyn og flytt løpets fase sammen med innsettingen av dokumentkilden i samme transaksjon. Les den lagrede kilden ved senere gjenåpning. Ved gyldig gjentakelse skal samme kilde og tidspunkt returneres, også etter restart. Løpsnavn, hodeopplysninger, avdelingsnavn og faglige avsendere i den avsluttede visningen og i PDF skal komme fra den frosne kildeversjonen.

Kontroller tildelt identitet og tilgang også ved eksplisitt forespørsel om PDF-kilde. Bruk `GET /api/testkjoring/runs/:id/export-source`. Returner `409 run_not_closed` for en tildelt aktiv bruker før avslutning, og `404 run_unavailable` ved manglende løpstilgang. Oppdater forventningen fra 4.5s kode der eksportkallet manglet. Kandidaten får avslag ved utløp og tilbakekall, også når en tidligere innloggingsøkt er aktiv. Ved eksport fra åpen side brukes en nylig autorisert kilde. Skjult, utløpt eller avvist løpsvisning skal avbryte en pågående lokal eksport. Håndter feil fra lasting av PDF-ressurser eller generering uten å oppdatere sluttversjonen. Hold de 22 kriteriene, alle tre svarskalaene og kommentarer lesbare med kontrollerte sidebrudd, også ved flere sider fri tekst.

Lagre minst én faktisk nettleserfil fra hver rolle som lokal testartefakt. Bruk en opt-in miljøvariabel og testens `outputPath` der det passer med eksisterende PDF-prøver. Kontroller tekstuttrekk, alle kriterier og svarrekkefølge, norsk tegnsetting, en kommentar som går over sideskift og samme faglige innhold etter ny økt. Render også sidene til bilde for kontroll av kolonneinnhold og sidebrudd. Bruk lokal Node 26.13 fra `.cache/story-1-1/node-v26.13.0-win-x64` og Playwright-nettleserne i `.cache/playwright`. Kjør målrettede prøver før review. Hele regresjonssuiten og den fysiske testprotokollen i `epic-4-manuell-verifisering.md` følges opp av hovedagenten etter review. Rapporter konkrete navn på avslutningshandlinger og eksportknapp, samt sti til lokale prøvefiler.

## Spec Change Log

- 2026-11-20. Gjennomgangen presiserte eksport av frosne tekster med tegn utenfor PDF-skriften. Testkjørings-PDF viser Unicode-kodene for slike tegn. Den autoritative kilden og sluttvisningen beholder teksten. Linjeskift og innrykk tilpasses sider i PDF-en uten å endre lagret tekst. Eksport har en tidsgrense for hele forsøket, og modulfeil har en egen handling for ny sideinnlasting.

## Review Triage Log

| Funn | Vurdering og belegg | Oppfølging |
| --- | --- | --- |
| Blind 1. Låst tekst kan stanse alle senere PDF-uttak | Middels. Noto Sans mangler blant annet U+1F44D. En gyldig innsendt vurdering kunne få en varig eksportfeil. | Behold teksten i kilden. Vis eksplisitt kodepunkt for tegn PDF-skriften mangler. |
| Blind 2. Nytt forsøk tar ikke ny nettleserimport etter modulfeil | Middels. Chromium gjenbruker en avvist import i samme dokument. Kilden består, men PDF-handlingen gjentar feilen. | Vis en egen handling for sideinnlasting når PDF-modulen ikke kan lastes. |
| Blind 3. Blanklinjer kan produsere flere tomme innholdssider | Middels. Ubegrenset whitespace i lovlig fritekst deltar i sideberegningen. | Komprimer lange blanklinjerekker bare ved PDF-oppsett. |
| Blind 4. Mange tabulatorer kan havne utenfor PDF-margen | Middels. Tidligere omskriving ga en lang serie mellomrom og hyfener i utdraget. | Bryt sammenhengende horisontalt mellomrom i PDF-oppsettet. Prøv start og slutt i samme kommentar. |
| Blind 5. Kandidaten mister fokus når oppdatering viser sluttresultat | Lav. Knappen avmonteres når resultatdelen erstatter den. | Flytt fokus etter bevisst statusoppdatering. |
| Blind 6. Tidspunkt for kvittering varierer med enhetens tidssone | Middels. HTML brukte lokal tidssone, mens PDF viste Europe/Oslo. | Bruk Oslo-tid med avvik for frosne kvitteringer i begge flater. |
| Blind 7. Eksportlesing kan vente på en skrivelås ved tilgangsutløp | Middels. `BEGIN IMMEDIATE` var i bruk også for PDF-kilden. Kontrolltidspunktet var bestemt før ventingen. | Bruk en konsistent lesetransaksjon og fersk tid ved autentisering og tildelingskontroll. |
| Blind 8. Oversikten leser alle vurderinger for å vise tre navn | Middels. Ett stort JSON-dokument og en ekstra spørring per avsluttet oppføring var unødvendig på ordinært fokus. | Les frosne sammendragsfelt i oversiktsspørringen. |
| Blind 9. Standardnettleserprøven sjekker PDF-format fremfor faginnhold | Middels. En ombytting i PDF-matrisen passerer filgrafen, men gir feil i tekstverifikatoren. | Verifiser faktisk filinnhold med den eksisterende opt-in-konvensjonen i dette byggets sluttkontroll. |
| Blind 10. Tre låste deler prøves ikke med skriving etter avslutning | Middels. Ordinær avslutningsprøve testet bare lesing og gjentatt avslutning. | Prøv nye skriveforespørsler, eksakt gjentatt innsending og uendret sluttkilde. |
| Kant 1. Ustøttede tegn gjør frossen PDF umulig | Middels. Både navn og fritekst kan lagres med tegn uten glyfer. | Samme retting som Blind 1. |
| Kant 2. Modul eller font kan bli hengende uten ny prøve | Middels. Tidsgrense omfattet kilde-GET, men ikke alle eksportsteg. | Avgrens hele forsøket. Prøv timeout og deretter ny nedlasting. |
| Kant 3. Feilet oppstart kan lekke testressurser | Lav. Ny prøve satte i gang ressurser før opprydding var registrert. | Legg opprydding ved anskaffelse. |
| Verifisering 1. Innholdet i PDF må kontrolleres som egen kommando | Middels. Standardkommandoen har samme oppdeling som andre PDF-prøver. | Kjør verifikatoren på faktiske filer fra alle motorene. En bredere endring av testverktøy ligger utenfor storyen. |
| Verifisering 2. Sluttvisningen teller rader uten å kontrollere svarenes plass | Middels. En ombytting av kandidat- og instruktørkolonnene kan gi rett radantall. | Bekreft synlig før-, etter- og instruktørsvar på samme kriterium. |
| Verifisering 3. Oversikten og detaljene kan være uenige om historiske navn | Middels. Navneendringen ble prøvd i detalj og eksport, mens oversiktens frosne felt var uprøvd. | Verifiser frosne oversiktsfelt etter omstart. |
| Verifisering 4. Sent åpent detaljsvar kan forstyrre sluttvisningen | Middels. Tidligere prøver forsinket svar innen åpne faser. Fjernet sluttvern kunne passere. | Slipp et ekte etterfasesvar etter kvittert avslutning. |
| Verifisering, øvrig. Gyldig Unicode skaper varig PDF-feil | Middels. Fontkit bekreftet manglende glyfer for blant annet U+1F642 og U+674E. | Samme retting som Blind 1. |

## Verification

2026-11-20 bestod 96 Node-prøver, typekontroll og bygg. Lint hadde ti eksisterende varsler. Fem pilotprøver bestod i installert Edge. En ekte HTTP 503 ved lasting av PDF-modulen ble fulgt av ny sideinnlasting, ny moduladresse med HTTP 200 og vellykket nedlasting i Chromium, Firefox, WebKit og Edge. Prøvene dekket også avbrutt avslutning, tapt avslutningskvittering, sent svar fra før avslutning, tilbakekall midt i eksport og utløp etter avslutning.

Hele `npm run test:browser` bestod med 336 av 336 prøver på sluttbygget i Chromium, Firefox og WebKit, med fadderløp, instruktørdager, teknisk opplæring og linjeopplæring. Kjøretid var 22,3 minutter. SQLite-piloten svarte på HTTPS med validert sertifikat, 401 for anonymt arbeidsområde og 200 etter fiktiv innlogging.

Faktisk tekstuttrekk av sluttbygget bestod for 39 PDF-er. Det var tolv testkjørings-PDF-er fra fire nettlesere, 21 linje-PDF-er og seks tekniske PDF-er. Testkjørings-PDF-ene viste alle 22 kriterier, tre svarkolonner, resultat, kvitteringer og hele den lange kommentaren over fire sider. Kandidat, instruktør og kandidat i ny økt fikk identiske Edge-filer målt med SHA-256. De fire Edge-sidene ble også visuelt kontrollert. En ekstra Edge-prøve viste lange hodefelter, matrise på egen side og et fiktivt testord på 990 tegn innenfor papirmargen. Tre historiske linje-PDF-sider var pikselidentiske før og etter oppgradering til sluttbygget i samme nettleserorigin. Den fysiske prøven står åpen.
