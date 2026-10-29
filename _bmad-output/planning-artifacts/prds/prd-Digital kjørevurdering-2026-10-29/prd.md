---
title: "PRD: Digital kjørevurdering"
status: final
created: 2026-10-29
updated: 2026-10-29
---

# PRD: Digital kjørevurdering

Ferdigstilt 2026-10-29 etter BMAD-sluttkontroll. Klar som kravgrunnlag for UX. Avgrensede detaljantakelser er overført til UX og arkitektur med eiere og avklaringstidspunkt; de er ikke automatisk vedtatt ved ferdigstilling.

## Formål og produktmål

Dette dokumentet definerer V1 for UX, arkitektur og senere epics og stories. V1 er en mobiltilpasset webapp/PWA med fiktive data som viser et helt fadderløp: egenvurdering, faddervurdering, samtale, daglig bekreftelse og samlet PDF. Appen skal også fungere i nettleser på større skjermer.

Verdien er sammenhengende dokumentasjon som kan gjenfinnes og brukes i samtalen mellom sjåfør og fadder. Ved avslutning skal dokumentasjonen kunne lastes ned, deles som kopi med den evaluerte og lastes opp manuelt i et HR-system. Demonstrasjonen skal gi grunnlag for videre utvikling; produksjonsbruk er ikke godkjent.

Produktbriefen og prosjekteiers avklaringer 29. oktober 2026 er beslutningsgrunnlaget. Primærskjemaets to sider er visuelt kontrollert. Skjemadetaljer og tekniske føringer er samlet i [addendumet](addendum.md). Merkede antakelser er forslag fra hurtigløpet, ikke brukerbekreftede valg.

## Brukere og arbeidsflyt

**Sjåfør** vurderer seg selv før og etter kjøring og deltar i gjennomgangen. **Fadder** vurderer etter kjøring, kommenterer, bekrefter dagens dokumentasjon og avslutter fadderløpet. **Dokumentmottaker** leser PDF-en uten å bruke appen. V1 demonstrerer rollene med rollebytte på én enhet. Dette er ikke produksjonsautorisasjon.

Arbeidsflyten er: opprett fadderløp → opprett dagens økt → sjåfør fyller ut, bekrefter og låser førvurderingen før kjøring → sjåfør fyller ut ettervurderingen etter kjøring og bekrefter den → fadder vurderer og bekrefter sin del → lås resten av dagen → fortsett ordinære dager eller velg videre oppfølging → avslutt perioden → gi sjåføren fullt innsyn og samlet PDF. Fadder har ansvar for tilbakemelding underveis; sjåføren bekrefter ikke fadderens meninger.

Ved videre oppfølging føres nye dager i ordinært løp; tidligere bekreftede dager skal aldri gjenåpnes. Den detaljerte brukerreisen og skjermrekkefølgen utvikles i UX-fasen. Ingen konstruerte intervjuer eller personaer legges til grunn.

## Begreper og tilstander

| Begrep | Betydning |
| --- | --- |
| Fadderløp | Sammenhengende dokumentasjon for én sjåfør, med én økt per dag og en avsluttende beslutning. |
| Økt | Dagens vurderingsskjema med 22 kriterier, tre vurderingskolonner, øktopplysninger og kommentarer. |
| Sjåfør før / sjåfør etter / fadder etter | De tre separate vurderingene for hvert kriterium. |
| Utkast | En ubekreftet del av økten som kan lagres, gjenåpnes og endres. En økt med låst førvurdering kan fortsatt ha ettervurdering under arbeid. |
| Bekreftet økt | En fullstendig, lagret og permanent låst økt der sjåfør og fadder har bekreftet hver sin del med navn. |
| Ubesvart | Manglende svar. Dette er en tilstand, ikke et valgbart svar, og er aldri OK. |
| Ikke relevant | Sjåførens begrunnede valg om at kriteriet ikke gjelder dagen, videreført til ettervurderingen. Fadder bekrefter eller avslår valget i sin egen del uten å endre sjåførens svar. |
| Under oppfølging | Et fortsatt åpent fadderløp med beslutning om flere dager innen femdagersgrensen. Dette er ikke en avslutning. |
| Avsluttet fadderløp | Perioden er endelig lukket, som godkjent eller med fortsatt oppfølgingsbehov. Ingen nye dager kan legges til. Begge utfall gir fullt innsyn og slutt-PDF. |
| Oppfølgingsdag | En ny dag i samme fadderløp etter at videre oppfølging er besluttet. Ordinært løp er normalt tre dager, kortere ved retur eller lånesjåfør; samlet grense er fem dager. |

Økten går fra førvurdering i utkast til låst førvurdering, deretter ettervurdering og faddervurdering, og til slutt bekreftet og låst dag. Låst førvurdering gjenåpnes aldri. Avbrytelse av en bekreftelsesdialog endrer ingen tilstand.

| Løpets tilstand | Nye dager | Sjåførens innsyn | Normal PDF-eksport |
| --- | --- | --- | --- |
| Pågående | Ja, innen femdagersgrensen | Egne vurderinger | Nei |
| Under oppfølging | Ja, innen femdagersgrensen | Egne vurderinger; fadder gir tilbakemelding underveis | Nei |
| Avsluttet – godkjent | Nei | Hele skjemaet, varig lesetilgang | Samlet sluttdokumentasjon |
| Avsluttet – fortsatt oppfølgingsbehov | Nei | Hele skjemaet, varig lesetilgang | Samlet sluttdokumentasjon med oppfølgingsbehov |

«Fortsett med oppfølging» endrer pågående løp til under oppfølging og bevarer allerede låste dager. «Avslutt perioden» lukker enten et pågående løp eller et løp under oppfølging permanent. Et avsluttet løp kan ikke returnere til en åpen tilstand, og innsynet trekkes ikke tilbake. Tiltak etter endelig avslutning ligger utenfor dette løpet.

## Funksjonelle krav

### Fadderløp, økter og oversikt

**FR-1 – Opprette fadderløp.** Brukeren kan opprette og gjenfinne et fadderløp for en fiktiv sjåfør med tilknyttet fadder. Løpene skal kunne skilles fra hverandre i oversikten. Faddernavnet som bekrefter en økt bevares selv om en senere økt har en annen fadder.

**FR-2 – Én økt per dag, maksimalt fem dager.** Brukeren kan opprette én økt per kalenderdato i samme fadderløp. Forsøk på duplikat skal lede til eksisterende økt uten å overskrive den. Ordinært løp er normalt tre dager, men kan være kortere ved retur eller lånesjåfør. Videre oppfølging fortsetter med neste dagnummer i samme løp, normalt dag 4–5, eventuelt dag 3–5 etter et kortere løp. V1 har maksimalt fem registrerte dager per fadderløp; opprettelse av dag 6 skal avvises med forklaring uten å endre eksisterende dager. Dagnummer teller registrerte dager, ikke sammenhengende kalenderdager. Tidligere lagrede økter skal kunne gjenåpnes for lesing; bare ubekreftede deler kan redigeres. Låst førvurdering forblir skrivebeskyttet selv om resten av økten er uferdig. Prosjekteiers avklaring 2026-10-29 erstatter briefens tidligere føring om å kunne representere dag 1–8.

**FR-3 – Øktopplysninger.** Skjemaet skal ha fiktivt sjåførnavn, fiktiv deltaker-ID, faddernavn, dag/dato, buss 1, buss 2, linje og tidspunkt ut/inn. Felt og kildeavvik beskrives i addendumet. [ASSUMPTION A1: Sjåføridentitet, faddernavn og dato er obligatoriske; buss 1, buss 2, linje og ut/inn er valgfrie i demoen.] Manglende obligatoriske felt skal forklares før bekreftelse. Tomme valgfrie felt vises som «Ikke oppgitt», ikke som manglende vurderinger.

Sjåføridentiteten (deltaker-ID og navnet som dokumenterer bekreftelsen), øktdatoen og koblingen til riktig økt og fadderløp skal låses sammen med førvurderingen. En senere endring av profil eller løpsopplysninger skal ikke knytte den låste vurderingen til en annen person, dato eller økt. Buss 1/buss 2, linje og inn-tid skal kunne fylles ut senere, frem til dagslåsing. UX og arkitektur konkretiserer låsetidspunkt for øvrige øktfelt, inkludert ut-tid og faddertilknytning, uten å svekke den låste identiteten og datoen. Skillet mellom obligatoriske felt og låsetidspunkt skal være uttrykkelig; at et felt kan fylles ut senere betyr ikke i seg selv at det er frivillig.

**FR-4 – Roller og historikk.** Rollebytte skal vise aktiv rolle og riktig økt. Sjåførens to vurderinger og fadderens vurdering skal lagres separat. En rolleendring skal ikke kopiere eller overskrive vurderinger. Sjåføren skal kunne lese egne vurderinger fra flere dager. Fadder skal kunne lese hele skjemaet og sammenholde vurderingene. Under fadderperioden skal fadderens vurderinger og kommentarer ikke vises i sjåførvisningen. Når perioden er fullført, skal sjåføren få lesetilgang til hele skjemaet, inkludert fadderens vurderinger, kommentarer og avslutningsutfall. Historikken skal vise utvikling over dager uten krav om samlet tallscore eller statistikkmodul. Skjuling i demoens sjåførvisning er ikke produksjonsautorisasjon; rollebytte simulerer fortsatt arbeidsdelingen.

### Vurderinger og relevans

**FR-5 – Alle kriterier.** Hver økt skal inneholde de 22 kriteriene i addendumet og tre vurderingskolonner. Ordinære svar er «OK» og «Kan bli bedre». Ingen av dem skal være forhåndsvalgt. Før førvurderingen låses skal alle dens 22 posisjoner være besvart med OK, Kan bli bedre eller Ikke relevant. Sjåførens begrunnelse for Ikke relevant må foreligge før førvurderingen låses; fadderens avgjørelse kan komme senere. Før hele dagen låses skal alle 66 vurderingsposisjoner ha gyldige svar, og sjåførens nødvendige begrunnelser og fadderens avgjørelser om relevans med påkrevde kommentarer skal foreligge.

**FR-6 – Begrunnet Ikke relevant med separat fadderavgjørelse.** «Ikke vurdert» skal ikke finnes som svaralternativ. Sjåføren kan velge «Ikke relevant» før kjøring og må skrive en forklarende begrunnelse før førvurderingen kan bekreftes. Ett ord eller noen få tegn er ikke tilstrekkelig. Sjåførens valg og begrunnelse låses med førvurderingen og videreføres til egenvurderingen etter kjøring; sjåføren skal ikke skrive begrunnelsen på nytt.

Fadder ser sjåførens begrunnelse og velger «Bekreft Ikke relevant» eller «Avslå Ikke relevant». Avgjørelsen tilhører fadderens del og endrer aldri sjåførens valg, begrunnelse eller bekreftelser. Ved avslag må fadder skrive en egen kommentar som forklarer uenigheten og registrere sin egen vurdering som OK eller Kan bli bedre. Ved bekreftelse blir fadderens vurdering Ikke relevant; egen kommentar er frivillig dersom fadder bare er enig, men kan legges til for utdyping. Avgjørelsen sendes ikke i retur til sjåføren. Det skal ikke opprettes en konfliktstatus, et korrigeringskrav eller en ny sjåførbekreftelse.

| Situasjon | Resultat |
| --- | --- |
| Sjåfør velger Ikke relevant uten tilstrekkelig begrunnelse | Førvurderingen forblir utkast. Appen forklarer kravet og peker på begrunnelsen. |
| Fadder bekrefter valget | Begge sjåførvurderinger og faddervurderingen viser Ikke relevant. Sjåførens begrunnelse og fadderens bekreftelse bevares; eventuell utdyping vises separat. |
| Fadder avslår valget | Sjåførens før-/ettervurdering og begrunnelse forblir uendret. Fadderens avslag, egen vurdering og påkrevde kommentar lagres separat. Uenigheten er dokumentert, ikke sendt tilbake eller blokkert som uløst konflikt. |

Ubehandlet relevansvalg blokkerer fadderens bekreftelse og dagslåsing. Både bekreftelse og avslag er gyldig behandling når nødvendige felt er utfylt. Et avslag skal ikke automatisk bli Kan bli bedre eller bety at hele fadderløpet er underkjent. Innsyn følger FR-4: fadder formidler tilbakemelding underveis, og sjåføren får hele dokumentasjonen ved endelig avslutning.

[ASSUMPTION A10: Foreslått minstekrav er minst tre ord og minst 15 tegn som ikke er blanktegn, med minst én bokstav i hvert tellende ord. Dette gjelder sjåførens begrunnelse og fadderens påkrevde avslagskommentar. Rene mellomrom, tegnsetting eller tall alene teller ikke som ord. Terskelen er et mekanisk vern mot ettordssvar og svært korte svar, ikke en automatisk kontroll av forklaringens faglige kvalitet. Nøyaktig terskel fastsettes med prosjekteier i UX.]

**FR-7 – Kommentar og tilbakemelding underveis.** Fadder kan skrive kommentar per kriterium. Egen kommentar er obligatorisk ved avslag på Ikke relevant, ellers frivillig. Sjåførens begrunnelse og fadderens kommentar skal vises med tydelig avsender og aldri slås sammen eller erstatte hverandre. Fadder har selv ansvar for å formidle egne meninger underveis. I faddervisningen skal de tre vurderingene kunne sammenholdes uten at uenighet overskrives. Sjåføren bekrefter egenvurderingene, ikke fadderens vurderinger; appen skal ikke kreve en felles godkjenning av fadderens tilbakemelding. «Kan bli bedre» og et dokumentert avslag på Ikke relevant er gyldige svar og blokkerer ikke i seg selv dagslåsing.

**FR-8 – Frivillige oppsummeringer.** Etter første og siste dag skal det være plass til tre styrker og tre utviklingsområder, med tilhørende dato. Alle disse tekstfeltene er frivillige i V1. Tomme felt skal ikke blokkere avslutning eller gi inntrykk av mangelfull vurdering. Kravet om frivillighet skal kunne endres senere uten ombygging av vurderingsflyten; en administrasjonsskjerm for dette inngår ikke. Senere kravendringer skal gjelde nye registreringer, ikke gjøre historisk bekreftede registreringer ugyldige.

[ASSUMPTION A3: Førstedagsoppsummeringen redigeres frem til første økt bekreftes. Sluttoppsummeringen redigeres frem til fadderløpet avsluttes, som en egen avslutningsopplysning uten å endre siste dags låste økt. Ved et løp på én dag beholdes begge oppsummeringene som separate, frivillige feltsett.]

### Utkast, nettbrudd og gjenopptakelse

**FR-9 – Lagring og lagringsstatus.** Vurderinger, kommentarer, øktopplysninger og oppsummeringer skal kunne lagres og gjenåpnes. Appen skal skille mellom lagring pågår, lagret og lagring mislyktes, og vise hva «lagret» betyr på denne enheten. «Lagret» skal ikke vises før lagringen er bekreftet av den valgte lagringsmekanismen. Gjentatt lagringsforsøk må ikke duplisere økter eller svar.

[ASSUMPTION A4: Utkast lagres automatisk senest to sekunder etter at brukeren slutter å skrive eller velger et svar, under normale forhold. Ved feil finnes et synlig valg for å forsøke lagringen på nytt. Arbeid som har fått status «Lagret», skal overleve oppfrisking og normal lukking/gjenåpning i samme nettleserprofil på samme enhet. Nettleserdata som slettes, privat nettlesing og bytte av enhet omfattes ikke av denne garantien.]

**FR-10 – Kortvarig nettbrudd.** Ved bortfall av nett i en allerede åpnet økt skal appen vise forståelig status og bevare tidligere lagret arbeid. Brukeren skal ikke måtte begynne økten på nytt. Ulagrede endringer skal aldri omtales som lagret. Arkitekturen avgjør om videre inntasting kan lagres lokalt eller må vente; dette skal fremgå i brukerflaten. En kald oppstart uten nett er ikke et V1-krav.

**FR-11 – Feil ved bekreftelse.** Ingen bekreftelse skal lykkes mens de berørte endringene er ulagret. Ved låsing av førvurderingen skal dens svar, begrunnelser, låste sjåføridentitet, øktdato, kobling til økt/fadderløp og bekreftelse lagres samlet før ettervurderingen åpnes. Ved avbrudd er førvurderingen enten et gjenopprettbart utkast eller fullstendig låst; den skal aldri fremstå som låst med manglende svar. Ved dagslåsing skal øvrig innhold, bekreftelser og navn lagres samlet. Et avbrudd her skal ikke oppheve den allerede låste førvurderingen. Ved ny åpning skal faktisk lagret tilstand vises før brukeren kan forsøke igjen.

### Daglig bekreftelse og avslutning

**FR-12 – Kontroll før bekreftelse.** Sjåføren bekrefter førvurderingen før kjøring, og ettervurderingen etter kjøring. Fadder bekrefter sin egen del. Ingen rolle kan bekrefte på vegne av den andre. Førvurderingens 22 svar og sjåføridentitet/dato må være lagret før førvurderingen kan låses. Ettervurderingen er utilgjengelig for registrering inntil dette er gjennomført. Før hele dagen låses skal alle tre vurderingsdeler være bekreftet, alle 66 posisjoner besvart, alle Ikke relevant-valg ha sjåførbegrunnelse og være bekreftet eller avslått av fadder med påkrevde kommentarer, obligatoriske identifikasjonsfelt være utfylt og alt være lagret. Appen skal forklare mangler og føre brukeren til de ubekreftede feltene. Frivillige kommentarer og oppsummeringer skal ikke regnes som mangler.

**FR-13 – Bekreftelse av egen del og tydelig låsevarsel.** Sjåførrollen skal ha en egen bekreftelse som låser førvurderingen før kjøring. Dialogen skal tydelig opplyse at disse svarene ikke kan endres senere, heller ikke mens resten av dagen fortsatt er under arbeid. Etter kjøring bekrefter sjåføren ettervurderingen, og fadder bekrefter faddervurderingen. Fadderens endelige popup skal ettertrykkelig varsle at resten av dagen låses permanent. Alle dialoger skal identifisere rolle, navn og dato og beskrive hvilken del som låses. Avbryt eller lukk dialogen skal ikke registrere bekreftelse. Utfylte felt alene skal aldri regnes som bekreftelse.

Førvurderingen forblir låst ved rollebytte, oppfrisking og senere registrering. Sjåførens ettervurdering låses ved egen bekreftelse; fadderens bekreftelse fullfører dagslåsingen når FR-12 er oppfylt. Verken sjåfør eller fadder skal kunne endre en allerede bekreftet del. Nøyaktig visuell utforming bestemmes i UX.

**FR-14 – Permanent låsing.** Førvurderingens låsing omfatter også identitet, dato og tilhørighet etter FR-3. Før- og ettervurdering med tilhørende sjåførbekreftelse er skrivebeskyttet etter hver sin bekreftelse. Etter endelig dagsbekreftelse skal vurderinger, relevans, kommentarer, øktopplysninger og begge bekreftende navn være skrivebeskyttet. Rollebytte, gjenåpning, oppfrisking og direkte navigasjon til en gammel redigeringsvisning skal ikke gi redigeringsadgang. Ingen gjenåpne-, angre- eller administrativ rettingsfunksjon inngår i V1. Dette er en funksjonsregel i demoen, ikke et løfte om manipulasjonssikker lagring eller identitetsverifisert signatur.

**FR-15 – Endelig avslutning av perioden.** Når alle opprettede økter er bekreftet, kan fadder velge «Avslutt perioden» med utfallet «Godkjent» eller «Fortsatt oppfølgingsbehov». Begge utfall lukker løpet permanent: Ingen nye dager, ingen gjenåpning og ingen endring av tidligere registreringer. Fortsatt oppfølgingsbehov betyr at behovet dokumenteres for håndtering utenfor det avsluttede løpet, ikke at appen åpner for flere dager. Ingen uferdige dager skal kunne utelates lydløst for å omgå fullføringskravet. Et løp uten økter kan ikke avsluttes.

Avslutningsdialogen skal vise valgt utfall og forklare at perioden lukkes, at ingen flere dager kan legges til, og at sjåføren får fullt innsyn. Appen skal ikke beregne eller forhåndsvelge faglig godkjenning ut fra antall OK-svar. Utfallet skal være synlig i historikk og PDF.

Avslutningsutfall, sluttoppsummering og avsluttende faddernavn skal lagres samlet før avslutningen vises som vellykket, innsyn utvides eller PDF tilbys. Ved avbrudd skal løpet enten fortsatt være åpent med gjenopprettbart utkast til avslutning, eller fullstendig avsluttet med alle opplysninger. Tidligere låste deler og dager skal ikke påvirkes. Gjentatt forsøk skal ikke opprette flere avslutninger. Test avbrudd etter siste bekreftelsesklikk.

**FR-16 – Videre oppfølging før endelig avslutning.** Fadder kan velge «Fortsett med oppfølging» mens løpet fortsatt er åpent, dagens registrering er bekreftet og færre enn fem dager er registrert. Løpet får status «Under oppfølging». Nye dager legges til samme løp med fortløpende dagnummer og samme vurderings- og bekreftelsesregler. Tidligere låste dager og beslutningen om oppfølging bevares. Det opprettes ikke et eget oppfølgingsløp.

Videreføring gir verken sjåføren fullt innsyn eller tilgang til normal PDF-eksport. Fadder formidler tilbakemelding underveis. Først endelig avslutning etter FR-15 gir fullt innsyn og én samlet slutt-PDF. Femdagersgrensen gjelder ordinære dager og oppfølgingsdager samlet. På dag 5 er videreføring utilgjengelig; fadder kan avslutte som godkjent eller med fortsatt oppfølgingsbehov, uten automatisk godkjenning og uten dag 6.

### PDF og overlevering

**FR-17 – Nedlastbar sluttdokumentasjon.** Et avsluttet fadderløp skal gi en faktisk nedlastbar PDF-fil. En utskriftsvisning alene oppfyller ikke kravet. PDF-en skal inneholde fiktiv sjåføridentitet, dag/dato og relevante øktopplysninger, alle 22 kriterier med tre vurderinger per dag, sjåførens relevansbegrunnelser, fadderens bekreftelser eller avslag med separate kommentarer og egne vurderinger, øvrige kommentarer, eventuelle første-/sistedagsoppsummeringer og avslutningsutfall. Hver bekreftet dag skal vise «Førvurdering bekreftet av [sjåførnavn]», «Ettervurdering bekreftet av [sjåførnavn]» og «Fadderens del bekreftet av [faddernavn]». Avslutningen skal identifisere bekreftende fadder. Bekreftelsene gjelder hver sin del og skal ikke fremstilles som at sjåføren har godkjent fadderens vurderinger. Ved avslag på Ikke relevant skal PDF-en uttrykkelig vise både sjåførens uendrede valg og fadderens avslag; den skal ikke presentere én felles relevanskonklusjon. Navngitt bekreftelse er ikke en håndtegnet eller elektronisk identitetsverifisert signatur. PDF-en representerer hele perioden ved dens ene, endelige avslutning: alle ordinære dager og oppfølgingsdager, oppfølgingsbeslutningen dersom den finnes, og det endelige utfallet. Sjåføren får varig lesetilgang til fullstendig skjema ved denne avslutningen, også ved utfallet fortsatt oppfølgingsbehov.

**FR-18 – Bare avsluttet dokumentasjon i normalflyten.** Normal eksport skal være utilgjengelig for ufullstendige løp, pågående løp og løp under oppfølging, også når alle hittil registrerte dager er bekreftet. Hvis en feil eller særskilt teknisk visning likevel produserer en PDF med ufullstendig innhold, skal den merkes «UFULLSTENDIG – IKKE ENDELIG DOKUMENTASJON» på hver side, vise manglende felt og aldri hevde at ubekreftet innhold er bekreftet. Dette er et vern mot misvisende dokumentasjon, ikke en bestilling på en egen utkast-PDF-funksjon.

**FR-19 – Lesbarhet og gjentatt nedlasting.** PDF-en skal ordne dagene kronologisk, vise sidetall og gjenta relevante tabelloverskrifter ved sideskift. Lange kommentarer skal ikke kuttes eller overlappe annet innhold. Den skal kunne åpnes uten appen. Feil ved generering eller nedlasting skal gi mulighet til å prøve igjen uten å endre eller gjenåpne bekreftet innhold. Gjentatt generering skal gjengi de samme vurderingene og bekreftelsene. Kopi til sjåfør og HR-opplasting håndteres manuelt utenfor appen.

## Kvalitetskrav og akseptanse

Testene skal bruke fiktive data, et ordinært tredagersløp utvidet til fem dager, et kortere løp med videre oppfølging, ulike faddere, lange kommentarer og minst ett «Ikke relevant»-kriterium. Forsøk på dag 6 skal avvises uten å endre historikken.

| ID | Krav og måling |
| --- | --- |
| NFR-1 | Registreringsflyten skal fungere uten horisontal rulling på mobil og være brukbar på større skjerm. [ASSUMPTION A7: Test ved 360 CSS-piksler og 1280 CSS-piksler; nettlesermatrise fastsettes i arkitektur og omfatter minst én iOS- og én Android-nettleser samt skrivebord.] |
| NFR-2 | Knapper, valg, feil og lagringsstatus skal ha lesbar tekst; status skal ikke formidles bare med farge. Bekreftelsesdialogen skal kunne betjenes med tastatur, ha tydelig fokus og gi brukeren kontroll over avbrytelse. Dette er konkrete V1-krav, ikke en påstand om sertifisert tilgjengelighet. |
| NFR-3 | Null tap av data som er vist som «Lagret» ved avtalt nettbruddtest, oppfrisking og normal gjenåpning. [ASSUMPTION A8: Test et 60-sekunders nettbrudd i åpen økt og gjenoppta lagret arbeid senest fem sekunder etter at nett og app igjen er tilgjengelige. Test på samme enhet/nettleserprofil, med bevart nettleserlagring.] |
| NFR-4 | Ingen bekreftet økt skal kunne endres gjennom appens støttede navigasjon eller lagringsoperasjoner. Test både vanlig redigering og forsøk fra en gammel, fortsatt åpen redigeringsvisning. Arkitekturen må håndheve regelen utover en deaktivert knapp. |
| NFR-5 | PDF-testen skal kontrollere alle 66 vurderinger per dag mot lagret innhold, alle bekreftelser og avslutningsutfallet, samt visuelt kontrollere sideskift og lange kommentarer. PDF-en fra femdagersløpet skal være komplett. |
| NFR-6 | Bare fiktive personopplysninger skal brukes i demo og testdata. Demoen skal ikke sende dokumentasjon til HR-system eller mottaker automatisk. Identifiserende virksomhetsopplysninger fra tidligere grunnlag skal ikke gjeninnføres. |

### Suksessmål og motmål

- **SM-1:** En testbruker gjennomfører et tredagers fadderløp på mobil og en variant med oppfølging til dag 5, med rollebytte, bekreftelse per dag og korrekt slutt-PDF. Alle FR-1–FR-19 som gjelder normalflyten skal demonstreres. Et kortere ordinært løp med oppfølging fra dag 3 prøves også.
- **SM-2:** I negative tester skal manglende svar, manglende eller for kort sjåførbegrunnelse, ubehandlet relevansvalg, manglende påkrevd avslagskommentar og ulagret innhold blokkere bekreftelse i alle prøvde tilfeller. Avbrytelse av dialogen skal aldri låse dagen. Valg av «Kan bli bedre» skal ikke i seg selv blokkere.
- **SM-3:** Alle lagrede svar og kommentarer bevares i gjenopprettingstesten, og alle låste dager forblir uendret når ny oppfølging legges til.
- **SM-4:** Test at sjåfør ikke kan bekrefte fadderens del eller se fadderens vurderinger underveis i sjåførvisningen. Etter fullført periode skal hele skjemaet være lesbart for sjåføren, og PDF-en skal skille mellom begge parters bekreftelser. Dagen skal ikke låses når en bekreftelse mangler eller gjelder utdaterte svar.
- **SM-5:** En bekreftet førvurdering kan ikke endres etter at ettervurderingen åpnes, heller ikke ved rollebytte, gjenåpning eller gammel redigeringsvisning. Ufullstendig førvurdering skal ikke åpne ettervurderingen.
- **SM-6:** Videreføring etter dag 3 skal beholde låste dager, holde fullt innsyn/PDF sperret og tillate dag 4–5. Endelig avslutning, også med fortsatt oppfølgingsbehov, skal gi fullt innsyn/PDF og avvise nye dager. Test også endelig avslutning før dag 5 og vedvarende innsyn etter gjenåpning av appen.
- **SM-7:** Prøv både bekreftet og avslått Ikke relevant. Avslag med egen faddervurdering og tilstrekkelig kommentar skal tillate dagslåsing uten retur, redigering av sjåførens svar eller ny sjåførbekreftelse. Kontroller at PDF-en bevarer begge perspektiver og riktig avsender. Ettordssvar og svært korte begrunnelser skal avvises; grensetester følger den avklarte terskelen i A10.
- **SM-8:** Etter låsing av førvurderingen skal forsøk på å endre sjåføridentitet, øktdato eller tilhørighet avvises, også via endring av overordnede profil-/løpsopplysninger. Senere utfylling av buss, linje og inn-tid skal lykkes før dagslåsing uten å endre førvurderingens innhold eller tilhørighet, og avvises etter dagslåsing.
- **SM-C1:** Rask utfylling skal ikke oppnås med forhåndsvalgte OK-svar, automatisk faglig godkjenning eller ved å skjule uenighet og mangler. Antall OK-svar og antall godkjente løp er ikke suksessmål.
- **SM-C2:** Streng fullføringskontroll skal ikke tvinge frem innhold i frivillige oppsummeringer eller tvinge brukeren til å velge OK når et kriterium ikke er relevant.

## Avgrensning og videre utvikling

V1 inkluderer fadderløp, nye oppfølgingsdager etter flagget behov, daglig låsing, utkast, nettbruddhåndtering og nedlastbar PDF. V1 inkluderer ikke reelle ansattdata, produksjonsinnlogging, administrasjonsportal, full offlinebruk, synkronisering mellom enheter, direkte utsending, HR-integrasjon, andre vurderingskategorier eller appbutikkpublisering.

Senere skal sjåfør og fadder kunne bruke hver sin enhet. Arkitekturen skal derfor skille rolle, økt og lagring og vurdere stabile identifikatorer, historiske kriterier og historiske krav. Mulig mobilapp eller Power Apps er en føring for vurdering, ikke en lovet konvertering. Teknisk stakk, lagringsmekanisme og distribusjon velges i arkitekturfasen.

Permanent låsing betyr at feil må oppdages før bekreftelse. V1 tilbyr ingen etterfølgende retting av gamle dager. Krav til korrigering av reell dokumentasjon og identitetskontroll må vurderes på nytt før eventuell produksjonsbruk.

## Overlevering til UX og arkitektur

PRD-en er kravgrunnlaget for UX. Produktvalgene om femdagersgrense, separate bekreftelser og låsing, relevans, videreføring, endelig avslutning og innsyn er avklart. UX skal konkretisere skjermflyt, feltregler, dialoger og lesbar mobilvisning innenfor disse kravene. Arkitektur følger etter UX; epics og stories følger etter arkitektur. Tre epics er et foreløpig planleggingsmål, ikke en besluttet inndeling.

### Antakelser og utsatte detaljer

Sluttkontrollen fant ingen åpne forhold som blokkerer UX. A1, A3, A4, A7, A8 og A10 utsettes uttrykkelig til ansvarlig UX-/arkitekturarbeid, med eier og tidspunkt nedenfor. Disse er forslag, ikke brukerbekreftede tallgrenser eller implementeringsklare detaljregler. En ferdigstilt PRD gjør dem ikke automatisk vedtatt. Avklaring skal dokumenteres før berørte stories og akseptansetester fastsettes.

A1/A3/A10 gjelder felt- og dialogdetaljer som UX skal utforme. A4/A7/A8 gjelder test- og lagringsbetingelser som arkitektur skal konkretisere sammen med UX og prosjekteier. Ingen av dem endrer den avklarte statusmodellen, hvem som bekrefter, permanent låsing eller innsynsreglene.

| ID | Forslag i hurtigløpet | Eier og tidspunkt |
| --- | --- | --- |
| A1 | Forslag til obligatoriske øktfelt; UX/arkitektur fastsetter også låsetidspunkt for øvrige felt. Identitet, dato og tilhørighet er besluttet låst med førvurderingen; buss, linje og inn-tid kan utfylles frem til dagslåsing. | Prosjekteier og UX/arkitektur, før feltregler fastsettes. |
| A2 (avklart) | Sjåfør begrunner Ikke relevant; fadder bekrefter eller avslår, med egen kommentar ved uenighet. Ingen retur eller overskriving av sjåførens svar. | Bekreftet av prosjekteier 2026-10-29; FR-6/FR-7. Minstelengdens tallverdi er separat A10. |
| A3 | Første oppsummering låses med første dag; siste oppsummering med avslutningen. | Prosjekteier og UX, før bekreftelsesflyten fastsettes. |
| A4 | Automatisk lagring innen to sekunder, gjenåpning på samme enhet og oppgitte avgrensninger. | Arkitekt med prosjekteier, før lagringsløsning godtas. |
| A5 (avklart) | Videreføring holder løpet åpent. Endelig avslutning lukker for nye dager og gir varig fullt innsyn og samlet slutt-PDF, uansett utfall. | Bekreftet av prosjekteier 2026-10-29; innarbeidet i FR-4 og FR-15–FR-18. |
| A6 (avklart) | Sjåfør bekrefter egen del og fadder sin. Fullt skjema gjøres tilgjengelig for sjåføren ved fullført fadderperiode. | Bekreftet av prosjekteier 2026-10-29; tidligere antakelse om bare fadder er erstattet. |
| A7 | Testbredder og minimum nettlesermatrise. | UX og arkitekt, før implementeringsplan. |
| A8 | Nettbruddtest og mål om fem sekunders gjenopptakelse. | Arkitekt med prosjekteier, før lagringshistorier fastsettes. |
| A9 (avklart) | Førvurderingen bekreftes og låses separat før kjøring; ettervurdering åpnes først etter denne låsingen. | Bekreftet av prosjekteier 2026-10-29; innarbeidet i FR-5 og FR-11–FR-14. |
| A10 | Minst tre ord og 15 tegn som ikke er blanktegn i begrunnelser/påkrevde avslagskommentarer. | Prosjekteier og UX, før feltvalidering fastsettes. |

Ingen åpne spørsmål om «Ikke vurdert», obligatoriske avkrysninger, daglig låsing eller frivillige oppsummeringer gjenstår. Nye krav til obligatoriske oppsummeringer må gjelde fremtidige registreringer; eksisterende bekreftelser skal fortsatt kunne leses på sine opprinnelige vilkår.

## Kilder

- [Produktbrief](../../briefs/brief-kjorevurdering-2026-10-28/brief.md) og [tilleggsnotat](../../briefs/brief-kjorevurdering-2026-10-28/addendum.md).
- Prosjekteiers avklaringer i denne samtalen 2026-10-29, dokumentert i `.memlog.md`.
- `docs/Eksempel vurderingsskjema.pdf`, to sider visuelt kontrollert 2026-10-29. Kriterier og felter gjengis med nødvendige anonymiseringer i addendumet.
- `docs/skjemagrunnlag.md` er et omskrevet alternativ og overstyrer ikke primærskjemaet.
- `docs/plattform-og-gjenbruk.md` er innspill til arkitektur; ingen stakk er valgt.
