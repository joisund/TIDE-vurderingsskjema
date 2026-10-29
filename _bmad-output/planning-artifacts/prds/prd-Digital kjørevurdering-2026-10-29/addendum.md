# Skjemagrunnlag og føringer til UX og arkitektur

Oppdatert 2026-10-29 etter uttrykkelige UX-beslutninger. Dette er gjeldende detaljgrunnlag til revidert PRD, ikke en ny formell sluttkontroll. Tidligere finalization-report.md gjelder den eldre PRD-baselinen og er bevart uendret. Beslutningshistorikk ligger i [UX-loggen](../../ux-designs/ux-Digital%20kjørevurdering-2026-10-29/.memlog.md).

## Primærskjema og kriterier

Begge sider i `docs/Eksempel vurderingsskjema.pdf` er rendret og visuelt lest. Side 1 gir 22 kriterier med tydelig adskilte vurderingsperspektiver og kommentarer. Side 2 gir veiledning og første-/sistedagsevaluering med tre styrker, tre utviklingsområder, dato og bekreftelser. Kriterieordlyd nedenfor er uendret fra godkjent addendum, med normaliserte linjebrudd og generisk betegnelse i kriterium 10. Øvrige vurderingskategorier i papirskjemaet er utenfor V1.

| Nr. | Kriterium til demokriteriesettet |
| --- | --- |
| 1 | Korrekt uniform/hygiene |
| 2 | Selvinnsikt / Stress / Nervøsitet |
| 3 | Kundebehandling / service |
| 4 | Matpakke/drikke |
| 5 | Teknisk kunnskap |
| 6 | Betjening av dører på holdeplasser |
| 7 | Billettering |
| 8 | Språk / Kommentarkjøring |
| 9 | Oppstart / daglig kontroll |
| 10 | Feilrapport i rapporteringsappen |
| 11 | Bruk av Sjåførkort |
| 12 | Se-teknikk og VTL §3 |
| 13 | Bruk av microfon |
| 14 | Rygging |
| 15 | Lover: Vikeplikt, forkjørs-vei, farts- og veimerking |
| 16 | Planlegging, tegn, signal og plassering |
| 17 | Samhandling i rundkjøring og kryss |
| 18 | Fartstilpasning og avstand til forankjørende |
| 19 | God flyt i nedoverbakke (utrulling / retarder) |
| 20 | God flyt inn mot og ut fra bussholdeplass |
| 21 | Fart og plassering før, gjennom og etter sving |
| 22 | God flyt over fartsdumper |

Kriterienes rettslige/faglige innhold er transkribert, ikke validert som juridisk veiledning. Hjelpetekster til de 22 punktene forvaltes i den gjeldende UX-hjelpekilden. Hele gjeldende UX-oppsettet er godkjent av prosjekteier.

## Registrering og roller

- Førvurderingen fylles én gang før første dag. Ved delt enhet gjøres dette ved oppmøte. Egen enhet og tilgang dagen før er fremtidig videreføring.
- Hver dag registreres sjåfør etter og fadder etter. Første dag har totalt 66 svar inklusive førvurderingen; senere dager har 44 nye svar. Samlet antall er 22 + 44 × registrerte dager.
- På dag 1 videreføres førvurderingens Ikke relevant låst med opprinnelig begrunnelse. Fadder behandler det videreførte valget én gang. Øvrige dag-1-punkter besvares etter kjøring. Fra dag 2 velges relevans på nytt daglig.
- Fadder kan registrere og redigere egen del gjennom dagen før sjåfør er ferdig. Sluttbekreftelse krever sjåførens nødvendige bekreftelser, gyldige svar/begrunnelser og lagret innhold.
- Begge roller begrunner eget Ikke relevant i popup. Fadder bekrefter eller avslår sjåførens valg separat; avslag krever kommentar, men aldri retur eller endring av sjåførens svar. Ren bekreftelse er ikke et nytt selvstendig relevansvalg. Fadder kan selv velge Ikke relevant med egen begrunnelse.
- Behandling knyttes til det konkrete sjåførsvar og begrunnelse. Endring før sjåførbekreftelse gjør tidligere behandling utdatert; den må utføres på nytt før dagslåsing. Fadders egne utkast beholdes.
- Sjåfør har ikke fritekstkommentar per kriterium utover relevansbegrunnelse. Fadder kan åpne kommentar på alle 22 punkter uavhengig av valgt svar, også OK og ubesvart. Kommentar er frivillig ellers og påkrevd ved avslag. Avsenderne bevares separat i app og PDF.

## Begrunnelsesvalidering – A10 avklart

Minst to ord og minst ti tegn kreves i begge rollers egne Ikke relevant-begrunnelser og fadders påkrevde avslagskommentar. Trim start/slutt og slå sammen sammenhengende blanktegn til ett mellomrom før telling; tegnantallet inkluderer disse enkle mellomrommene. Et token som bare inneholder tegnsetting teller ikke som ord. «Ingen rygging» og «Ingen billettering» skal godtas. Begge terskler må være oppfylt. Mekanisk lengdekontroll er ikke faglig kvalitetskontroll. Den tidligere antakelsen om tre ord/15 tegn gjelder ikke.

## Øktfelt og låsing

| Felt/innhold | Redigering og besluttet lås |
| --- | --- |
| Sjåføridentitet, dato og kobling til økt/løp dag 1 | Låses med sjåførens førbekreftelse. |
| Samme identitets-/tilhørighetsfelt dag 2–5 | Låses med sjåførens etterbekreftelse den dagen. |
| Buss og linjer | Fadder redigerer til dagslåsing; sjåfør leser. Minst én buss kreves; buss 2 bare hvis brukt. |
| Inn- og ut-tid | Begge roller kan fylle og endre til skiftslutt/dagslåsing. Format HH:mm uten sekunder; fadder fullfører manglende tider. |
| Gjeldende faddertilknytning | Kan endres underveis, også midt i skift, frem til fadders endelige dagsbekreftelse. Faktisk bekreftende navn bevares historisk. |
| Sjåførens etterdel og eventuell egenevaluering | Låses med sjåførens etterbekreftelse. |
| Fadders daglige vurderinger og kommentarer | Låses med fadders dagsbekreftelse når fullføringskravene er oppfylt. |
| Fadders valgfrie konklusjon | Redigeres til og låses ved endelig avslutning av perioden. |

A1 er avklart: sjåførnavn, ansattnummer, faddernavn, dato, buss, linjer og begge tider er obligatoriske. Bruk feltnavnet «Ansattnummer» med fiktive verdier. Overordnede profilendringer må aldri flytte låst historikk til ny person, dato eller økt. Gjeldende faddervalg omfattes ikke av sjåføridentitetens før-lås; tidligere bekreftelser bevarer sine faktiske navn.

Implementeringstolkning: identitet, gjeldende faddernavn og dato kreves ved opprettelse/sjåførbekreftelse; buss, linjer og tider kreves før endelig dagslås. Sjåførens etterbekreftelse skal ikke blokkeres av manglende tider som fadder fullfører ved dagens slutt. Dette konkretiserer rekkefølgen, ikke nye obligatoriske brukerkrav. Manuell registrering fra skiftdata innebærer ingen skiftintegrasjon.

## Oppfølging og egenevaluering

Normalt tre dager, eventuelt kortere ved retur/lånesjåfør, maksimalt fem totalt. Én økt per dato. Fadders daglige del har ja/nei om behov for flere dager. Bare ved ja vises antall ekstra dager eller utvidet kjøretrening før fadderkjøring fortsetter. Planen kan endres underveis før sjåførens etterdel er fullført. Ekstra dager holdes innen totalt fem registrerte dager. I V1 velger fadder ny planlagt siste dag; fremtidig ansvar hos opplærings-/fagansvarlig innføres ikke som ny V1-rolle.

Sjåførens egenevaluering tilbys etter avkrysning første og planlagt siste dag, med tre styrker/tre utviklingsområder, og kan hoppes over. Den låses med egen dagsbekreftelse. Ett-dagsløp har ett felles sett, ikke to. Ved sen utvidelse beholdes bekreftet egenevaluering på sin opprinnelige dag og ny frivillig evaluering tilbys på ny siste dag. Fadder har egen valgfri konklusjon med fullt sjåførinnsyn etter avslutning. Den er ikke den separate, utsatte fagrapporten. Avslutningsflaten samler fritekst først og deretter obligatorisk «Godkjent» / «Oppfølgingsbehov» rett under felles overskrift «Konklusjon». Ordet «utfall» fjernes fra grensesnittet.

Videreføring holder løpet åpent uten normal PDF/fullt sjåførinnsyn. Endelig avslutning med valgt Godkjent eller Oppfølgingsbehov lukker permanent; begge gir fullt innsyn og samlet PDF. Det kreves minst én dag, og alle opprettede dager må være ferdige. Ingen automatisk faglig godkjenning, dag 6 eller gjenåpning.

## Mobilvisning og profil

Kategorier står under hverandre med kriterier i rader og tre rubrikker til høyre: OK / Kan bli bedre / Ikke relevant. Ett svar per punkt. Kolonneoverskriftene følger rullingen uten å dekke fokus eller popup, og brytes uten overlapping ved tekstforstørrelse. Dette er én aktiv vurdering om gangen, ikke alle perspektivene i en bred mobilmatrise.

Tydelig spørsmålstegn ved hvert av de 22 punktene åpner én kort sammenhengende beskrivelse, omtrent 1–3 linjer, ved berøring. Oppgaven, hva man ser etter og hva man bør tenke på er innholdsrammer, ikke en fast tredelt mal med overskrifter. Samme korte hjelp skal være nyttig for begge roller i første iterasjon; egen dybdehjelp for fadder er kun mulig senere utvidelse. Synlig hjelp skal invitere til læring; den dempede sammenligningsvarianten er ikke valgt. Symbol og hjelp fjernes fra utskrift/PDF.

Tide-logo og profil er autorisert. Prosjekteier har godkjent hele gjeldende skjermskisses visuelle uttrykk som standard for V1, inkludert font, farger, avstander, logoplassering og valgt synlig punkthjelp. Dette er godkjent produktutforming, ikke dokumentasjon på at systemfonten er offisiell Tide-profilfont. Eksakte tokens dokumenteres i [DESIGN.md](../../ux-designs/ux-Digital%20kjørevurdering-2026-10-29/DESIGN.md). Bruk original logo uten endrede proporsjoner. Reelle person-, avdelings- og interne opplysninger gjeninnføres ikke.

## Bekreftelser, PDF og lagring

Bekreftelsesdialog viser rolle, navn, dato, berørt del og permanent låsekonsekvens. Avbryt/lukk endrer ingenting. Brukeren skal kunne rette feil før bekreftelse; ingen etterfølgende administrativ retting inngår.

Slutt-PDF bevarer én førvurdering med opprinnelig bekreftelse, alle daglige svar og separate bekreftelser, relevansbegrunnelser/-avgjørelser, kommentarer, evalueringer med faktiske dager, fadderkonklusjon, oppfølgingsbehov/planendringer med avsender og endelig utfall. Gjentatt førvurdering er historisk referanse. Ingen felles relevanskonklusjon eller påstand om at sjåfør godkjenner fadders meninger. Navn er ikke en identitetsverifisert signatur.

PDF kan lastes ned gjentatte ganger med samme låste innhold og overleveres manuelt til opplæringsansvarlig for HR-opplasting. Ingen automatisk sending eller integrasjon. Lange tekster må fortsette uten kutting; sidetall og tabelloverskrifter bevares. Første side skal være liggende med oppsummeringsfelt øverst og en kronologisk vurderingsmatrise inspirert av dagens fadderskjema, slik at progresjon kan sammenlignes side ved side. OK er grønt, Kan bli bedre gult og Ikke relevant rødt; tekst/symbol følger fargen. Ikke relevant er fortsatt et gyldig svar, ikke automatisk underkjenning.

Side 2 skal være stående for kommentarer/relevansbegrunnelser, egenevaluering og uttrykkelig godkjenning. Signaturformede felt viser vanlige tekstnavn fra faktiske bekreftelser: sjåfør venstre, fadder høyre, ekstra fadder i midten når aktuelt. Bevar del/rolle og historisk avsender; ingen håndtegnet eller identitetsverifisert signatur påstås. Ved større tekstmengde brukes videre sider uten kutting. Det tidligere femsiders PDF-forslaget er avvist, ikke et godkjent format.

Ingen teknisk stakk er valgt. Lagring må bevare sammenhengende innhold og bekreftelsesstatus, også ved avbrudd, og håndheve lås utover UI-knapper. Gjenåpning viser faktisk lagret tilstand. Ulagrede endringer kan ikke bekreftes eller omtales som lagret. A4/A8 om mekanisme, tidsmål og nettbrudd er fortsatt åpne; full offlinebruk loves ikke. Historiske kriterier, krav og bekreftende navn må bevares ved senere regel-/profilendringer.

## Videre planlegging

A4, A7 og A8 følger til ansvarlig UX-/arkitekturarbeid med eiere i PRD. A1, A3 og A10 er nå avklart. Hele gjeldende UX-oppsettet er godkjent, inklusive fadderdel, Konklusjon og revidert PDF. Hjelpetekstene følger gjeldende UX-hjelpekilde. Den skal fortsatt være kort, situasjons- og kjøretøytilpasset, ikke absolutte råd som tilsidesetter skilting, forhold eller kjøretøyinstruks. To enheter, egne planleggingsroller og privat fagrapport er senere utvidelser. Opplæringsansvarligs forhåndsutfylling av sjåførnavn, ansattnummer, faddernavn og dato tilhører fullversjonen, ikke V1. Tre epics er kun et foreløpig mål; endelig nedbrytning følger UX og arkitektur.

## Utvidet kjøretrening – UX-T1 avklart

V1 registrerer utvidet kjøretrening kun som oppfølgingsbehov. Gjennomføring og klarsignal for videre fadderkjøring håndteres utenfor løsningen, primært i samtale med opplæringsansvarlig. Ingen gjennomføringsregistrering, klarsignal-/gjenopptaksfunksjon, ny approlle, treningsmodul eller integrasjon innføres. Avsluttede løp gjenåpnes ikke, og samlet maksimum på fem dager står ved lag. Denne avklaringen og UX-godkjenningen finaliserer ikke PRD-workflowen.
