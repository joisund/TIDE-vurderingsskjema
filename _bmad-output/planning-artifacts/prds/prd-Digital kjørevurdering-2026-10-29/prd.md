---
title: "PRD: Digital kjørevurdering"
status: draft
created: 2026-10-29
updated: 2026-10-29
amendment: "Avstemt med eksplisitte UX-beslutninger 2026-10-29; tidligere sluttkontroll gjelder eldre baseline."
---

# PRD: Digital kjørevurdering

Revidert under UX 2026-10-29. Denne versjonen innarbeider prosjekteiers senere beslutninger i [UX-loggen](../../ux-designs/ux-Digital%20kjørevurdering-2026-10-29/.memlog.md). Den tidligere [sluttkontrollen](finalization-report.md) dokumenterer ferdigstillingen før disse endringene; den er ikke kjørt på nytt eller omskrevet. Status er derfor utkast til oppdatert kravgrunnlag, ikke ny formell ferdigstilling eller godkjenning for produksjon.

## Formål og produktmål

V1 er en mobiltilpasset webapp/PWA med fiktive data som viser et helt fadderløp: egenvurdering, faddervurdering, samtale, separate bekreftelser og samlet PDF. Den skal også fungere i nettleser på større skjermer. Verdien er sammenhengende dokumentasjon for samtale, læring og oppfølging, med enkel avkrysning og synlig hjelp til vurderingspunktene.

Ved endelig avslutning lastes dokumentasjonen ned og overleveres manuelt til opplæringsansvarlig, som laster den opp i HR-portalen for ressursleder og sjåfør. Dette er en demonstrasjon; produksjonsbruk er ikke godkjent. Originalskjemaet gir kriterier og inspirasjon til utskrift. Skjemadetaljer og UX-føringer står i [addendumet](addendum.md).

## Brukere og arbeidsflyt

**Sjåfør** fyller én førvurdering før første dag, ettervurdering hver dag og frivillig egenevaluering første og planlagt siste dag. **Fadder** registrerer egne vurderinger og kommentarer gjennom dagen, behandler relevansvalg, planlegger utvidelse, bekrefter egen del og avslutter løpet. **Opplæringsansvarlig/dokumentmottaker** håndterer PDF utenfor appen. V1 simulerer arbeidsdelingen med rollebytte på én enhet; dette er ikke produksjonsautorisasjon.

Opprett løp og første økt → sjåfør fyller, bekrefter og låser førvurderingen før kjøring → daglig arbeid, der fadder kan redigere eget utkast underveis → sjåfør fyller ettervurdering, eventuell frivillig egenevaluering og bekrefter egen del → fadder fullfører og bekrefter sin del → dagen låses. Løpet fortsetter til planlagt siste dag, eventuelt med utvidelse innen fem dager, før fadder eksplisitt avslutter perioden. Sjåføren godkjenner aldri fadderens meninger.

På delt enhet fylles førvurderingen ved oppmøte. Tilgang på egen enhet dagen før første skift er en senere utvidelse. Detaljerte brukerreiser finnes i UX; fiktive eksempler skal ikke fremstilles som intervjufunn.

## Begreper og tilstander

| Begrep | Betydning |
| --- | --- |
| Fadderløp | Én sjåførs sammenhengende periode, én førvurdering, daglige økter og én endelig avslutning. |
| Økt | Dagens 22 sjåfør-etter-svar og 22 faddersvar, øktopplysninger og kommentarer. Første dag har også periodens 22 før-svar. |
| Førvurdering | Sjåførens engangsvurdering før første dag; låst utgangspunkt for perioden. |
| Utkast | Ubekreftet innhold som kan lagres og redigeres. Eksisterende låste deler forblir låst. |
| Bekreftet økt | Dagens nødvendige innhold er lagret, begge roller har bekreftet egen del og dagen er permanent låst. |
| Ubesvart | Manglende svar, aldri et valgbart eller gyldig svar. |
| Ikke relevant | Begrunnet relevansvalg; sjåførens valg behandles separat av fadder. |
| Planlagt siste dag | Styrer tilbudet om sluttegenevaluering. Fadder velger ny siste dag ved utvidelse i V1. |
| Under oppfølging | Åpent løp med beslutning om flere dager innen samlet femdagersgrense. |
| Avsluttet | Permanent lukket med Godkjent eller Oppfølgingsbehov; ingen nye dager. |

| Løpets tilstand | Nye dager | Sjåførens innsyn | Normal PDF |
| --- | --- | --- | --- |
| Pågående | Ja, innen fem dager | Egne vurderinger | Nei |
| Under oppfølging | Ja, innen fem dager | Egne vurderinger; fadder gir tilbakemelding | Nei |
| Avsluttet, begge utfall | Nei | Hele skjemaet, varig lesetilgang | Samlet sluttdokumentasjon |

Videreføring og endelig avslutning er forskjellige handlinger. Avsluttet løp kan aldri gjenåpnes, og fullt innsyn trekkes ikke tilbake. Avbrytelse av en bekreftelsesdialog endrer ingen tilstand.

## Funksjonelle krav

### Fadderløp, økter og oversikt

**FR-1 – Opprette fadderløp.** Opprett og gjenfinn løp for en fiktiv sjåfør med tilknyttet fadder. Løp skilles tydelig i oversikten. Bekreftende faddernavn bevares historisk selv om senere dager har annen fadder.

**FR-2 – Én økt per dag, maksimalt fem dager.** Én økt per kalenderdato i samme løp; duplikatforsøk leder til eksisterende økt uten overskriving. Normalt tre ordinære dager, kortere ved retur/lånesjåfør. Oppfølging fortsetter med nye dagnumre i samme løp, maksimalt fem dager totalt. Dagnummer teller registrerte dager, ikke sammenhengende kalenderdager. Dag 6 avvises med forklaring. Tidligere økter kan leses; bare ubekreftet innhold redigeres. Ingen ny førvurdering dag 2–5.

**FR-3 – Øktopplysninger.** Sjåførnavn, ansattnummer, faddernavn, dato, buss, linjer, inn-tid og ut-tid er obligatoriske. Bruk feltnavnet «Ansattnummer» og bare fiktive verdier i V1. Minst én buss kreves; buss 2 fylles bare hvis den er brukt. Begge tidsfelt bruker HH:mm, uten sekunder. Mangler skal forklares ved riktig bekreftelsesteg.

Dag 1 låses sjåføridentitet (navn og ansattnummer), dato og kobling til økt/løp med førbekreftelsen. Dag 2–5 låses disse ved sjåførens etterbekreftelse. Endringer av overordnede profiler/løp må aldri omkoble eller omskrive låst historikk. Gjeldende faddertilknytning er separat fra denne identitetslåsen: fadder kan byttes underveis, også midt i skiftet, frem til fadders endelige dagsbekreftelse. Faktisk bekreftende faddernavn lagres historisk og omskrives aldri av senere bytte.

Buss og linjer fylles/redigeres av fadder frem til dagslåsing; sjåfør kan lese dem. Inn- og ut-tid kan begge roller fylle og endre frem til skiftet avsluttes/dagen låses. Fadder må fullføre manglende tider og kan registrere dem fra skiftdata ved dagens slutt; ingen automatisk skiftintegrasjon inngår.

**Implementeringstolkning av trinnvis fullføring:** Navn, ansattnummer, gjeldende faddernavn og dato kreves ved opprettelse og sjåførbekreftelse. Buss, linjer og begge tider må være komplette før fadders endelige dagsbekreftelse. Manglende tider skal ikke blokkere sjåførens etterbekreftelse når fadder skal fullføre dem senere. Dette fordeler de besluttede obligatoriske feltene mellom eksisterende steg; det er ikke en ny brukerbeslutning om flere felter eller nytt obligatorisk innhold.
**FR-4 – Roller og historikk.** Vis aktiv rolle, sjåfør og riktig dag. Rollebytte skal aldri kopiere eller overskrive svar. Sjåføren leser egne vurderinger og egenevalueringer underveis; fadder ser hele skjemaet og sammenholder perspektivene. Faddervurderinger og kommentarer skjules i sjåførvisningen frem til endelig avslutning. Begge avslutningsutfall gir varig fullt innsyn, inkludert konklusjon. Historikk viser utvikling uten krav om tallscore/statistikk. Skjuling i demoen er ikke produksjonsautorisasjon.

### Vurderinger, relevans og egenevaluering

**FR-5 – Alle kriterier.** Behold de 22 kriteriene og rekkefølgen i addendumet. Ett svar per vurderingspunkt: OK, Kan bli bedre eller begrunnet Ikke relevant. Ingen forhåndsvalgte OK-svar. Førvurderingens 22 svar fullføres og låses én gang før første dag. Hver dag har 22 etter-svar fra sjåfør og 22 faddersvar. Det gir 66 svar inklusive førvurderingen dag 1 og 44 nye svar per senere dag; perioden har 22 + 44 × antall dager. Gjentatt visning av førvurderingen er historisk referanse, ikke ny registrering.

**FR-6 – Begrunnet Ikke relevant med separat fadderavgjørelse.** Ikke vurdert finnes ikke som alternativ. Begge rollers eget Ikke relevant-valg krever forklaring i popup; ett ord eller noen få tegn er ikke nok. På dag 1 videreføres sjåførens Ikke relevant fra førvurderingen låst med opprinnelig begrunnelse til ettervurderingen. Det kan ikke fjernes eller endres etter kjøring, og fadder behandler det videreførte valget én gang. Øvrige dag-1-punkter besvares etter kjøring. Fra dag 2 vurderer sjåføren relevans på nytt hver dag; nye Ikke relevant-valg krever egen begrunnelse. Tidligere låste svar endres aldri.

Fadder bekrefter eller avslår sjåførens Ikke relevant med separat avgjørelse. Avslag krever egen kommentar. Ingen retur, overskriving, konfliktstatus eller ny sjåførbekreftelse skal opprettes. Ren bekreftelse av sjåførens begrunnelse er separat behandling, ikke krav om en ny egen begrunnelse. Fadder kan også selv velge Ikke relevant ved manglende vurderingsgrunnlag, med egen popup-begrunnelse. Fadders eget svar og behandling av sjåførens valg skal fremgå separat; ikke utled ett felles svar eller automatisk Kan bli bedre av et avslag.

Behandlingen gjelder konkret sjåførsvar og begrunnelse. Endres disse før sjåførbekreftelse, er tidligere behandling utdatert og må gjentas for gjeldende innhold. Fadders egne utkast beholdes. Ubehandlet eller foreldet relevansbehandling blokkerer sluttbekreftelse; gyldig dokumentert avslag gjør det ikke.

A10 er avklart: Minst to ord og ti tegn i begge rollers egne Ikke relevant-begrunnelser og fadders påkrevde avslagskommentar. Trim start/slutt og slå sammen sammenhengende blanktegn til ett mellomrom før telling; tegnantallet inkluderer enkle mellomrom. Token med bare tegnsetting teller ikke som ord. «Ingen rygging» og «Ingen billettering» skal godtas. Dette er lengdekontroll, ikke faglig kvalitetskontroll.

**FR-7 – Kommentar og tilbakemelding underveis.** Fadder kan registrere og redigere egne svar og kriteriekommentarer gjennom dagen frem til bekreftelse, også før sjåførens ettervurdering er ferdig. Kommentar kan åpnes på alle 22 vurderingspunkter uavhengig av valgt svar, også OK og ubesvart. Kommentar er frivillig bortsett fra påkrevd relevansavslag/egen relevansbegrunnelse. Sjåføren har ikke generelle kriteriekommentarer, bare begrunnelse ved Ikke relevant; egenevaluering er en egen funksjon. Vis hver avsender tydelig. Fadder har ansvar for muntlig tilbakemelding underveis. Kan bli bedre og dokumentert uenighet blokkerer ikke i seg selv låsing.

**FR-8 – Frivillige oppsummeringer.** Etter avkrysning første og planlagt siste dag tilbys sjåføren egenevaluering med tre styrker, tre utviklingsområder og dato. Den eies av sjåføren, kan hoppes over og låses sammen med sjåførens etterbekreftelse den dagen. Tomme frivillige felt er ikke mangler. Ved ett-dagsløp vises ett felles frivillig feltsett, ikke to separate evalueringer.

Ved sen utvidelse beholdes tidligere bekreftet egenevaluering låst på sin dag. Ny frivillig egenevaluering tilbys på ny planlagt siste dag og låses med den dagens sjåførbekreftelse. Den erstatter ikke historikken. Fadder har en egen valgfri konklusjon siste dag, redigerbar frem til periodens endelige avslutning og låst ved avslutning. Avslutningsflaten samler dette under «Konklusjon»: fritekst først, deretter det obligatoriske valget «Godkjent» / «Oppfølgingsbehov» rett under. Ordet «utfall» brukes ikke i grensesnittet. Den inngår i skjema/PDF og fullt sjåførinnsyn; den erstatter ikke valgt avslutningsutfall. Fremtidige endringer i frivillighetskravet skal gjelde nye registreringer uten å gjøre låst historikk ugyldig. Ingen administrasjonsskjerm for regelendring kreves i V1.

### Utkast, nettbrudd og gjenopptakelse

**FR-9 – Lagring og lagringsstatus.** Svar, kommentarer, opplysninger, planer og evalueringer skal kunne lagres og gjenåpnes. Skill mellom lagring pågår, lagret og mislyktes, og forklar hva lagret betyr på enheten. Vis aldri lagret før mekanismen har bekreftet resultatet. Gjentatt forsøk skal ikke duplisere data.

[ASSUMPTION A4: Automatisk lagring foreslås innen to sekunder etter siste inntasting/valg, med synlig nytt forsøk ved feil. Lagret arbeid foreslås bevart ved oppfrisking og normal gjenåpning i samme nettleserprofil/enhet, men ikke ved sletting av nettleserdata, privat nettlesing eller enhetsbytte. Betingelsene fastsettes i arkitektur.]

**FR-10 – Kortvarig nettbrudd.** Ved nettbrudd i åpen økt vises forståelig status og tidligere lagret arbeid bevares uten omstart av økten. Ulagret innhold omtales aldri som lagret. Arkitektur avgjør om videre inntasting lagres lokalt eller må vente, og grensesnittet skal vise dette. Kald oppstart uten nett er ikke et V1-krav.

**FR-11 – Feil ved bekreftelse.** Bekreftelse blokkeres mens berørt innhold er ulagret. Ved førbekreftelse lagres svar, begrunnelser, identitet/dato/tilhørighet og bekreftelse samlet før etterregistrering åpnes. Ved sjåførens etterbekreftelse lagres dagens svar, eventuell egenevaluering og relevante feltlåser samlet. Ved dagslåsing lagres resten av innholdet, faddernavn og bekreftelse samlet. Avbrudd skal gi gjenopprettbart utkast eller fullført lås, aldri halvlagret bekreftelse. Eksisterende låser oppheves ikke. Vis faktisk lagret tilstand før nytt forsøk.

### Bekreftelse, planlegging og avslutning

**FR-12 – Kontroll før bekreftelse.** Hver rolle bekrefter egen del; ingen bekrefter på vegne av andre. Førvurderingen krever 22 gyldige svar, begrunnelser og låst identitet/dato før etterregistrering åpnes. Før dagslåsing skal periodens førvurdering være bekreftet, dagens 44 svar være gyldige, sjåførens etterdel være bekreftet, relevansbehandling gjelde siste bekreftede sjåførsvar, alle påkrevde begrunnelser/kommentarer og obligatoriske felt foreligge og alt være lagret. Forklar mangler og før brukeren til rett felt. Frivillige evalueringer/kommentarer er ikke mangler.

**FR-13 – Bekreftelse av egen del og tydelig låsevarsel.** Førbekreftelse før første dag varsler at svarene ikke senere kan endres. Daglig etterbekreftelse varsler hvilke sjåførsvar, felt og eventuell egenevaluering som låses. Fadders endelige popup varsler ettertrykkelig at resten av dagen låses permanent. Alle dialoger identifiserer rolle, navn, dato og del. Avbryt/lukk gir ingen bekreftelse. Utfylte felt alene er ikke bekreftelse.

**FR-14 – Permanent låsing.** Bekreftet innhold er skrivebeskyttet ved rollebytte, gjenåpning, oppfrisking og gammel redigeringsvisning. Ingen angre-, gjenåpne- eller administrativ rettingsfunksjon inngår. Dagslåsing omfatter resterende vurderinger, relevansbehandling, kommentarer og øktopplysninger med historiske navn. Fadderkonklusjon tilhører avslutningen og låses etter FR-8/15. Dette er funksjonsregler i demoen, ikke manipulasjonssikker lagring eller identitetsverifiserte signaturer.

**FR-15 – Endelig avslutning av perioden.** Når minst én økt er opprettet og alle opprettede økter er bekreftet, kan fadder velge Avslutt perioden med Godkjent eller Oppfølgingsbehov. Begge lukker permanent for nye dager og gir fullt innsyn/PDF. Uferdige dager kan ikke utelates lydløst. Ingen forhåndsvalgt eller automatisk faglig godkjenning ut fra OK-antall.

Dialogen viser utfall, permanent lukking og fullt sjåførinnsyn. Utfall, valgfri konklusjon og avsluttende faddernavn lagres samlet før avslutningen vises som vellykket. Avbrudd gir åpent gjenopprettbart utkast eller komplett avslutning, aldri delvis utvidet innsyn. Gjentatt forsøk skaper ikke flere avslutninger. Tiltak etter avslutning ligger utenfor løpet.

**FR-16 – Videre oppfølging før endelig avslutning.** Fadders del har hver dag et ja/nei-valg om behov for flere dager. Bare ved ja vises videre valg: antall ekstra dager eller utvidet kjøretrening før fadderkjøring fortsetter. Fadder kan registrere dette underveis før sjåførens etterbekreftelse. Ved ekstra dager velger fadder antall og ny planlagt siste dag innen maksimalt fem registrerte dager totalt. Planen styrer tilbud om sluttegenevaluering; den avslutter eller godkjenner aldri løpet automatisk. Nei skjuler de betingede valgene og registrerer ikke en utvidelse.

Videreføring gir status Under oppfølging og fortløpende nye dager i samme løp, uten å åpne historikk. Bevar oppfølgingsbehov og planendringer med dag/avsender. Ingen fullt innsyn eller normal PDF før endelig avslutning. På dag 5 kan løpet ikke utvides til dag 6; avslutningsutfallet kan fortsatt være Oppfølgingsbehov. Fullversjonens planleggingsansvar hos opplærings-/fagansvarlig er senere scope. Utvidet kjøretrening er et registrert behov før fadderkjøring fortsetter, ikke en ny approlle, treningsmodul eller integrasjon. **UX-T1 er avklart:** V1 registrerer utvidet kjøretrening kun som oppfølgingsbehov. Gjennomføring og klarsignal for videre fadderkjøring håndteres utenfor løsningen, primært i samtale med opplæringsansvarlig. Ingen egen gjennomføringsregistrering, klarsignal-, pause- eller gjenopptaksfunksjon innføres i V1. Femdagersgrensen er fortsatt gjeldende.

### PDF og overlevering

**FR-17 – Nedlastbar sluttdokumentasjon.** Avsluttet løp gir faktisk PDF-fil, ikke bare utskriftsvisning. Innhold: fiktiv identitet, alle økter kronologisk med opplysninger, alle 22 kriterier, én historisk førvurdering med bekreftelse, hver dags sjåfør-etter-/faddersvar med egne bekreftelser, begrunnelser, separate relevansavgjørelser/kommentarer, øvrige kommentarer, egenevalueringer, valgfri fadderkonklusjon, oppfølgingsbehov/planendringer og endelig utfall/avsluttende fadder.

Bruk «Førvurdering bekreftet av [sjåførnavn]» én gang for periodens utgangspunkt og «Ettervurdering bekreftet av [sjåførnavn]» / «Fadderens del bekreftet av [faddernavn]» per dag. Gjentatt referanse til førvurderingen merkes historisk, ikke som ny bekreftelse. Ved avslag bevares begge perspektiver uttrykkelig. Ved sen utvidelse beholdes både tidligere og ny egenevaluering med faktiske dager/bekreftelser. Sjåførbekreftelse er ikke godkjenning av fadderens meninger; navn er ikke identitetsverifisert signatur.

**FR-18 – Bare avsluttet dokumentasjon i normalflyten.** Eksport sperres for ufullstendige, pågående og under-oppfølging-løp, selv om alle hittil opprettede dager er bekreftet. Hvis teknisk feil likevel produserer ufullstendig PDF, merk hver side «UFULLSTENDIG – IKKE ENDELIG DOKUMENTASJON», vis mangler og ikke hev bekreftelser som mangler. Dette bestiller ingen utkast-PDF-funksjon.

**FR-19 – Lesbarhet og gjentatt nedlasting.** Første side er liggende og inspirert av dagens fadderskjema: oppsummeringsfelt øverst, kriterier i rader og vurderingene kronologisk ved siden av hverandre for å vise progresjon. OK markeres grønt, Kan bli bedre gult og Ikke relevant rødt, alltid med tekst/symbol som gjør svaret forståelig uten farge. Rød Ikke relevant betyr fortsatt et gyldig begrunnet svar, ikke automatisk feil eller underkjenning.

Side 2 er stående med kommentarer, relevansbegrunnelser, egenevaluering og uttrykkelig godkjenning. Bekreftelser vises i signaturformede felt med vanlige tekstnavn: sjåfør til venstre, fadder til høyre og ekstra fadder i midten når aktuelt. Navnene skal komme fra faktisk lagrede bekreftelser og vise hvilken del hver person bekreftet; layouten innebærer ikke håndtegnet eller identitetsverifisert e-signatur eller at sjåfør godkjenner fadders meninger. Flere sider tillates når tekstmengden krever det. PDF har sidetall, kronologiske dager, gjentatte tabelloverskrifter ved sideskift og fullstendige lange tekster uten kutting/overlapping. Den åpnes uten appen. Feil gir nytt forsøk uten endring/gjenåpning; gjentatt generering gjengir samme låste innhold. Manuell overlevering til opplæringsansvarlig, HR-opplasting og kopi til sjåfør skjer utenfor appen. Punkthjelp og hjelpesymboler utelates fra PDF/utskrift.

## Kvalitetskrav og akseptanse

| ID | Krav og måling |
| --- | --- |
| NFR-1 | Mobilregistrering uten horisontal rulling, også brukbar på større skjerm. Kategorier under hverandre, kriterier i rader og tre svarkolonner OK / Kan bli bedre / Ikke relevant. Overskriftene følger rullingen. [ASSUMPTION A7: Test ved 360/1280 CSS-piksler og minst iOS-, Android- og skrivebordsnettleser; matrise ikke vedtatt.] |
| NFR-2 | Lesbar tekst; status ikke bare farge; tastatur, tydelig fokus og avbrytbare dialoger. Ved tekstforstørrelse brytes overskrifter uten overlapping og dekker ikke fokus. Tydelig spørsmålstegn ved hvert av de 22 punktene åpner én kort sammenhengende beskrivelse på omtrent 1–3 linjer, uten fast tredelt overskriftsmal. Samme hjelp er nyttig for sjåfør og fadder i V1; innholdet handler relevant om oppgaven, observasjon og refleksjon. Hjelpen fjernes i utskrift; fagtekst er til prosjekteiers kontroll. |
| NFR-3 | Null tap av data vist som Lagret ved avtalt nettbruddtest, oppfrisking og normal gjenåpning. [ASSUMPTION A8: 60 sekunders brudd og gjenopptakelse innen fem sekunder på samme enhet/profil med bevart lagring; må avklares.] |
| NFR-4 | Låst innhold kan ikke endres via støttet navigasjon, gammel redigeringsvisning eller endring av profil/løp. Arkitekturen håndhever reglene utover knapper. |
| NFR-5 | PDF kontrolleres mot lagrede 22 + 44 × antall dager, alle bekreftelser, relevansavgjørelser, evalueringer, konklusjon, planendringer og utfall. Visuell kontroll av sideskift/lange tekster og komplett femdagersløp. |
| NFR-6 | Kun fiktive persondata. Ingen automatisk sending eller HR-integrasjon. Tide-profil og original logo er uttrykkelig autorisert; reelle person-, avdelings- eller interne opplysninger gjeninnføres ikke. |

### Suksessmål og motmål

- **SM-1:** Gjennomfør tredagersløp og utvidelse til fem på mobil, med én førvurdering, daglige etter-/fadderdeler, rollebytte og korrekt slutt-PDF. Prøv også kortere ordinært løp og ett-dagsløp.
- **SM-2:** Manglende svar, begrunnelse, påkrevd kommentar, gyldig relevansbehandling eller lagring blokkerer riktig bekreftelse. Avbryt låser aldri. Kan bli bedre/gyldig avslag blokkerer ikke.
- **SM-3:** Lagret arbeid gjenopprettes; låste dager bevares ved utvidelse. Sen utvidelse beholder gammel egenevaluering og tilbyr ny på ny siste dag.
- **SM-4:** Roller bekrefter bare egen del. Sjåfør ser ikke fadderinnhold underveis, men hele skjemaet etter avslutning. Test foreldet relevansbehandling etter endret sjåførutkast.
- **SM-5:** Førvurderingen låses én gang. Dag-1 Ikke relevant videreføres låst med begrunnelse og én fadderbehandling; fra dag 2 kan relevans velges på nytt uten endring av historikk.
- **SM-6:** Fadder kan arbeide og planlegge utvidelse før sjåfør er ferdig. Femdagersgrense og eksplisitt avslutning håndheves; begge utfall gir varig fullt innsyn/PDF og avviser nye dager.
- **SM-7:** Test bekreftet og avslått sjåførrelevans samt fadders eget Ikke relevant med egen begrunnelse. PDF bevarer avsender og uenighet. Grensetester følger A10: to ord og ti normaliserte tegn, med «Ingen rygging» og «Ingen billettering» som gyldige eksempler.
- **SM-8:** Identitet/dato/tilhørighet låses med førbekreftelse dag 1 og etterbekreftelse dag 2–5. Fadder redigerer buss/linjer til dagslåsing; begge roller redigerer inn-/ut-tid i HH:mm. Sjåfør kan bekrefte etterdelen før manglende tider er fullført, mens fadders dagslås krever alle obligatoriske felt. Test fadderbytte underveis og bevaring av faktisk bekreftende navn. Egenevaluering låses med sjåførens etterdel, konklusjon med endelig avslutning.
- **SM-C1:** Rask utfylling oppnås ikke med forhåndsvalgt OK, automatisk faglig godkjenning eller skjult uenighet. OK-antall/godkjente løp er ikke suksessmål.
- **SM-C2:** Fullføringskontroll tvinger ikke frem frivillig tekst eller OK når kriteriet ikke er relevant.

## Avgrensning og videre utvikling

V1 inkluderer vurderingsløp, oppfølging/planlagt siste dag, bekreftelser/låsing, utkast, nettbruddhåndtering, punkthjelp og nedlastbar PDF. Ikke inkludert: reelle ansattdata, produksjonsinnlogging, administrasjonsportal, full offlinebruk, enhetssynkronisering, direkte utsending, HR-integrasjon, andre vurderingskategorier eller appbutikkpublisering.

En separat rapport til fagansvarlig uten sjåførinnsyn er utsatt; den er ikke fadders konklusjon og innføres ikke i V1. Senere to-enhetsbruk, tilgang dagen før og planleggingsroller krever videre identitets-/tilgangsarbeid. Opplæringsansvarligs forhåndsutfylling av sjåførnavn, ansattnummer, faddernavn og dato ønskes i fullversjonen, ikke V1. Mer dyptgående hjelp bare for fadder er også en mulig senere utvidelse. Mobilapp/Power Apps skal vurderes, men ingen stakk, konvertering eller produksjonstilkobling er valgt. Permanente låser betyr at feil må oppdages før bekreftelse; reell dokumentretting vurderes før produksjon.

## Overlevering til UX og arkitektur

[UX-kontraktene](../../ux-designs/ux-Digital%20kjørevurdering-2026-10-29/EXPERIENCE.md) konkretiserer flyt, dialoger og mobilvisning; DESIGN.md eier visuell identitet. Arkitektur følger UX, deretter epics/stories. Tre epics er fortsatt kun et foreløpig planleggingsmål.

| ID | Gjeldende status og eier |
| --- | --- |
| A1 | Avklart i UX: obligatorisk navn/ansattnummer/faddernavn/dato/buss/linjer/inn-/ut-tid. Begge roller kan redigere tider; fadder fullfører mangler. Fadderbytte tillates til endelig dagsbekreftelse. Trinnvis validering beskrives som implementeringstolkning i FR-3. |
| A3 | Avklart i UX: sjåfør eier egenevaluering, låsing med etterbekreftelse, én evaluering ved ett-dagsløp, historikk beholdes ved sen utvidelse. Konklusjon låses ved avslutning. |
| A4 | Åpent: lagringsbetingelser og foreslått tosekundersmål. Arkitekt/prosjekteier før lagringsløsning. |
| A7 | Åpent: testbredder/nettlesere og tilgjengelighetsmål. UX/arkitekt før implementeringsplan. |
| A8 | Åpent: nettbruddtest og foreslått femsekundersmål. Arkitekt/prosjekteier før lagringshistorier. |
| UX-T1 | Avklart: V1 registrerer bare oppfølgingsbehov. Kjøretrening og klarsignal håndteres utenfor appen, primært i samtale med opplæringsansvarlig. |
| A10 | Avklart i UX: minst to ord og ti normaliserte tegn; tell enkle mellomrom, ikke tegnsetting alene som ord. |

A2/A5/A6/A9 er avklarte produktvalg, tilpasset de senere uttrykkelige beslutningene om engangs-førvurdering og daglig relevans. Ingen avklaring gjenstår om frivillighet, separate bekreftelser, permanent låsing, femdagersgrense eller innsyn ved avslutning. Hele gjeldende UX-oppsettet er godkjent av prosjekteier, inklusive vurderingsskjema, egenevaluering, fadderdel, Konklusjon og revidert PDF-oppsett. Hjelpetekstene følger den gjeldende hjelpekilden; ingen generelle, absolutte kjøreregler utledes her. Denne UX-godkjenningen er ikke en ny formell ferdigstilling av PRD-workflowen. Gjeldende skjermskisses visuelle uttrykk er godkjent som standard for V1, inkludert font, farger, avstander, logo og tydelig punkthjelp; DESIGN.md dokumenterer verdiene. Dette betyr ikke at systemfonten er offisiell Tide-profilfont.

## Kilder

- [UX-beslutningslogg](../../ux-designs/ux-Digital%20kjørevurdering-2026-10-29/.memlog.md), senere uttrykkelige brukerbeslutninger 2026-10-29.
- [Produktbrief](../../briefs/brief-kjorevurdering-2026-10-28/brief.md), opprinnelig PRD-logg `.memlog.md` og historisk sluttkontroll; nyere beslutninger går foran.
- `docs/Eksempel vurderingsskjema.pdf`, to sider visuelt kontrollert. Normalisert/anonymisert kriterietekst finnes i addendumet.
- `docs/skjemagrunnlag.md` er omskrevet alternativ; `docs/plattform-og-gjenbruk.md` er arkitekturinnspill, ikke vedtatt stackvalg.
