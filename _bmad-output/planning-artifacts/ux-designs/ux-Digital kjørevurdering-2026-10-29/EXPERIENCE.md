---
name: Digital kjørevurdering
status: final
created: 2026-10-29
updated: 2026-10-29
sources:
  - .memlog.md
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/prd.md
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/addendum.md
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/finalization-report.md
  - ../../../../docs/Eksempel vurderingsskjema.pdf
---

# Digital kjørevurdering – brukeropplevelse

## Foundation

Mobiltilpasset webapp/PWA med støtte for større skjerm. V1 er en intern demonstrasjon med fiktive data og rollebytte på én enhet. Rollebyttet simulerer arbeidsdeling; det er ikke produksjonsautorisasjon. Ingen UI-system eller teknisk stakk er valgt. [DESIGN.md](DESIGN.md) er referansen for visuell identitet, inkludert `{colors.tide-gronn}` for profilens positive logo.

Nyeste brukeravklaringer i [.memlog.md](.memlog.md) styrer kontrakten. Prosjekteier har godkjent hele oppsettet. [reconcile-prd.md](reconcile-prd.md) dokumenterer avstemmingen mot PRD; eldre sluttkontroller beholdes som historikk.

Arbeidet er et sammenhengende fadderløp med normalt tre, eventuelt færre, ordinære dager og maksimalt fem dager totalt. Førvurdering fylles og bekreftes kun før første dag. Sjåførens ettervurdering og fadders vurdering er separate for hver dag. Fadder kan arbeide i sin del gjennom dagen; sluttbekreftelse krever at sjåførens nødvendige deler er ferdige.

Tilgang dagen før på egen enhet, egne roller for opplæringsansvarlig/fagansvarlig og en separat rapport uten sjåførinnsyn er fremtidige utvidelser. V1 har ingen slik rapport, automatisk utsending eller HR-integrasjon.

## Information Architecture

Tabellen definerer funksjonelle flater og inngangene mellom dem. Flater uten egen mock bygges fra disse tabellene og de godkjente komponentene. Registreringsflaten bruker prosjekteiers vertikale avkrysningsmatrise med tre svarkolonner og overskrifter øverst.

| ID / flate | Inngang og oppgave | Rolle / flyt |
| --- | --- | --- |
| S1 Løpsoversikt | Åpne appen; opprett eller gjenfinn riktig fadderløp. | Demoens roller; F1, F6 |
| S2 Dagsoversikt | Åpne løp; se registrerte dager, status, planlagt siste dag og opprett dagens økt. | Begge med rolleavhengig innsyn; F1–F6 |
| S3 Øktopplysninger | Opprett eller åpne økt; identitet, dato, fadder, buss, linje og tider. | Tillatt redigering etter feltregler; F1, F2 |
| S4 Førvurdering | Første dags oppstart; sjåførens 22 svar og separat bekreftelse. Senere leses periodens låste utgangspunkt. | Sjåfør skriver, fadder leser; F1 |
| S5 Ettervurdering | Hver dag etter kjøring; 22 egne svar og daglig relevans. | Sjåfør; F3 |
| S6 Fadderdel | Tilgjengelig gjennom dagen; egne 22 svar, kommentarer, relevansbehandling, daglig oppfølgingspunkt og planlagt siste dag. | Fadder; F2, F4 |
| S7 Egenevaluering | Etter avkrysning første og planlagt siste dag; frivillige styrker og utviklingsområder, eller hopp over. | Sjåfør skriver; F3, F5 |
| S8 Bekreftelse og mangler | Fra egen vurdering; kontroller mangler, varsle om låsing og bekreft riktig del. | Rollen bekrefter bare egen del; F1, F3, F4 |
| S9 Avslutning | Etter fullførte dager; valgfri fadderkonklusjon og eksplisitt utfall/avslutning. | Fadder; F5 |
| S10 Historikk og PDF | Fra dagsoversikt; les historikk med gjeldende innsyn. Etter avslutning: fullt skjema og nedlastbar PDF. | Begge etter avslutning; F6 |

Begrunnelsesdialogen er en popup over S4/S5/S6. Den er ikke en egen navigasjonsdestinasjon. Oppfølging planlegges fra S6 og vises på S2. Manuell overlevering og HR-opplasting skjer utenfor appen og får ingen egen V1-flate.

[Godkjent visuell vurderingsskjerm](mockups/key-vurdering.html) viser matrisen og punkthjelp A som V1-standard. Systemfont, fargebruk, luft og logo er vedtatt og løftet til DESIGN.md. Mocken er fortsatt statisk og implementerer ikke lagring, relevansbehandling eller låsing.

## Voice and Tone

Bruk direkte, norsk arbeidsspråk. Skill lagring fra bekreftelse og avslutning fra behov for mer oppfølging. Tekstene nedenfor angir ordlyd og hensikt for brukerbeskjeder; teknisk lagringssted fylles inn etter arkitekturvalget.

| Situasjon | Tekstretning |
| --- | --- |
| Lagret utkast | «Lagret» med konkret forklaring av lagringssted når arkitekturvalget er gjort. |
| Ikke lagret | «Endringene er ikke lagret. Prøv igjen.» Ikke lov brukeren at ulagret arbeid er bevart. |
| Manglende svar | «Du har ubesvarte vurderingspunkter.» Vis hvilke og gå til dem. |
| Ikke relevant | «Begrunn hvorfor dette ikke er relevant.» Bruk kriteriets navn som kontekst. |
| Fadder venter på sjåfør | «Du kan fortsette å fylle ut. Sjåføren må bekrefte sin del før dagen kan låses.» |
| Egenevaluering | «Egenevaluering – frivillig» og «Hopp over». |
| Førvurderingslås | «Disse svarene låses og kan ikke endres senere.» Vis identitet og første dato. |
| Dagslås | «Dagens vurderinger og kommentarer låses permanent.» Vis rolle, navn og dato. |
| Avslutning | «Ingen flere dager kan legges til. Sjåføren får tilgang til hele skjemaet.» Vis valgt konklusjon. |
| Fem dager brukt | «Maksimalt fem dager er registrert. Eventuelt videre oppfølgingsbehov dokumenteres ved avslutning.» |

«Kan bli bedre» og «Ikke relevant» er fullverdige svar, ikke feilmeldinger. Dokumentert uenighet skal ikke omtales som en uløst konflikt eller automatisk underkjenning.

## Component Patterns

Detaljerte feltregler: [Begrunnelsesminimum (A10)](#avklart-minimum-for-begrunnelser-a10) og [øktfelt (A1)](#avklarte-øktfelt-a1). UX-R1 gjelder låst relevans på dag 1 og nytt valg fra dag 2; UX-P1 gjelder én felles egenevaluering ved ett-dagsløp.

Visuell utforming står i DESIGN.md. Komponentene deler navn på tvers av dokumentene. Registrering bruker `{typography.criterion.fontSize}` tekst og `{components.matrix.columns}` grid. Kontroller bruker minst `{components.choice.min-height}` treffhøyde, punkthjelp `{components.help-trigger.width}` × `{components.help-trigger.height}`. Tekst og dimensjoner kan vokse ved brukerens forstørrelse.

| Komponent | Oppførsel |
| --- | --- |
| Profilhode | Vis aktiv rolle, sjåfør og dag. Rollebytte skifter innsyn og arbeidsflate uten å kopiere svar. |
| Løpsoversikt | Opprett/gjenfinn løp og vis tilstand. Tom oversikt gir vei til oppretting. |
| Dagsoversikt | Åpne riktig dag; samme dato fører til eksisterende økt. Avvis dag 6 og nye dager i avsluttet løp uten å endre historikken. |
| Øktopplysninger | Sjåførnavn, ansattnummer, faddernavn, dato, minst én buss, linjer samt inn-/ut-tid er obligatoriske før dagslåsing. Buss og linjer er fadders redigeringsansvar. Begge roller kan fylle og endre tider i timer/minutter frem til dagslåsing; fadder fullfører eventuelle mangler ved dagens slutt. Fadder kan endres underveis. Dag 1 låses sjåføridentitet/dato/tilhørighet med førbekreftelsen; dag 2–5 med sjåførens etterbekreftelse. Ingen endring av fadder skal omskrive historisk bekreftende navn. |
| Vurderingspunkt | Ett eksplisitt svar per kriterium/vurdering; ingen forhåndsvalg. Sjåfør får ikke generelt kommentarfelt. Fadder kan endre egen ubekreftede vurdering gjennom dagen. |
| Punkthjelp | Spørsmålstegn ved hvert vurderingspunkt åpner hjelp ved trykk og tastaturaktivering. Hjelp endrer ingen svar, kan lukkes og utelates fra utskrift/PDF. Tydelig variant A er valgt for at hjelpen skal oppdages og invitere til læring. Hvert punkt får én kort sammenhengende beskrivelse, omtrent 1–3 linjer, uten faste overskrifter. Samme tekst skal være nyttig for sjåfør og fadder; mer dyptgående fadderhjelp er en mulig senere utvidelse. [Godkjente hjelpetekster](help-texts-draft.md) gir kort, felles hjelp for alle 22 punkter. |
| Begrunnelsesdialog | Krev forklaring ved eget valg av Ikke relevant for begge roller. Minst to ord og ti tegn etter trimming og normalisering av mellomrom, inkludert ett mellomrom mellom ord; se avklart A10 nedenfor. Samme regel gjelder fadders avslagskommentar. Avbryt skal ikke bekrefte valget eller låse noe. |
| Relevansbehandling | Ikke relevant valgt før første dag videreføres med begrunnelsen og kan ikke fjernes eller endres i ettervurderingen dag 1. Fadder bekrefter eller avslår det videreførte valget i sin del, uten å endre sjåførens svar. Avslag krever egen kommentar. Egen faddervurdering og behandling av sjåførens relevans er adskilt informasjon. Fra dag 2 velger sjåføren relevans på nytt hver dag; nye Ikke relevant-valg krever popup-begrunnelse og fadderbehandling. |
| Fadderkommentar | Hvert av de 22 vurderingspunktene har en tilgjengelig «Kommentar»-handling uavhengig av valgt svar. Åpner punktets kommentarfelt; redigerbart gjennom dagen til egen bekreftelse. Kommentar er frivillig ellers, påkrevd ved relevansavslag. Fadders egen Ikke relevant-begrunnelse kreves separat. Handlingen navngis med kriteriet for skjermleser og formidler åpen/lukket tilstand. |
| Oppfølgingsplan | Fadder svarer Ja/Nei hver dag og kan registrere behov underveis før sjåførens ettervurdering. Nei skjuler detaljfeltene. Ja viser enten antall ekstra fadderdager innen maksimalt fem totalt, eller «Utvidet kjøretrening før fadderkjøring fortsetter». Ved ekstra dager avledes ny planlagt siste dag fra gjeldende plan; det er ikke et direkte valg av nytt totalt dagnummer. Registrering låser ikke dagen og gir ikke fullt innsyn/PDF. Utvidet kjøretrening registreres bare som oppfølgingsbehov i V1. Gjennomføring og klarsignal avklares utenfor løsningen, primært i samtale med opplæringsansvarlig; se avklart UX-T1. |
| Egenevaluering | Sjåføren fyller tre styrker og tre utviklingsområder frivillig. Tilbys etter avkrysning første og planlagt siste dag; utvidelse flytter siste-dagstilbudet. Tomme felt og «Hopp over» blokkerer ikke. Egenevalueringen låses sammen med sjåførens egen dagsbekreftelse. Ett-dagsløp har én felles egenevaluering, ikke to. Ved senere utvidelse beholdes den på sin dag og ny frivillig egenevaluering tilbys på ny siste dag. |
| Fadderkonklusjon | Én gruppe med overskriften «Konklusjon»: valgfritt fritekstfelt først, så påkrevd valg «Godkjent» / «Oppfølgingsbehov» rett under. Ingen forhåndsvalg. Teksten inngår i fullt skjema og PDF og kan redigeres frem til endelig avslutning. Gruppen er ikke den fremtidige private rapporten. Ordet «utfall» brukes ikke i grensesnittet. |
| Lagringsstatus | Vis pågår/lagret/mislyktes etter faktisk resultat. Gi nytt forsøk uten duplisering. Ulagret innhold blokkerer relevant bekreftelse. |
| Mangelliste | Vis relevante mangler med vei til rett felt. Skill ubesvart fra et gyldig Ikke relevant-svar. Ikke list frivillig egenevaluering som mangel. |
| Bekreftelsesdialog | Vis eksakt del som låses og permanent konsekvens. Avbryt/lukk gjør ingen bekreftelse. En allerede låst del kan aldri redigeres eller bekreftes på nytt med nye svar. |
| Avslutningsdialog | Bare når alle opprettede dager er fullført. Vis valget «Godkjent» / «Oppfølgingsbehov» fra Konklusjon sammen med konsekvensen av permanent avslutning. Ordet «utfall» vises ikke. Avslutning, valgt status og avslutningsopplysninger lagres samlet før innsyn/PDF åpnes. |
| Historikkvisning | Vis egne svar underveis for sjåfør; hele skjemaet for fadder. Etter avslutning får sjåfør varig fullt innsyn, også ved fortsatt oppfølgingsbehov. |
| PDF-handling | Tilby faktisk fil etter endelig avslutning. Genereringsfeil gir nytt forsøk uten å gjenåpne løpet. Ingen automatisk sending. |

Fadders behandling av sjåførens relevansvalg knyttes til det konkrete svaret og begrunnelsen som ble behandlet. Endrer sjåføren disse før egen bekreftelse, blir tidligere behandling utdatert og må utføres på nytt for gjeldende svar. Tidligere behandling skal aldri fremstå som godkjenning av en ny begrunnelse. Fadders egne vurderinger og kommentarer beholdes som utkast. Sluttbekreftelse kontrollerer behandlingen mot sjåførens bekreftede versjon.

Et løp uten registrerte og bekreftede dager kan ikke avsluttes. Kravet om at alle opprettede dager er ferdige innebærer minst én fullført dag, ikke at en tom liste er tilstrekkelig.

### Avklart minimum for begrunnelser (A10)

Begge rollers egne Ikke relevant-begrunnelser og fadders påkrevde avslagskommentar skal ha **minst to ord og minst ti tegn**. Trim innledende/avsluttende blanktegn og normaliser sammenhengende blanktegn til ett mellomrom før telling. Tegnantallet inkluderer det ene mellomrommet mellom ord. Tomme eller rene tegnsekvenser er ikke ord; lengdekontrollen vurderer ikke faglig kvalitet. Fadder vurderer om forklaringen er meningsfull.

«Ingen rygging» har to ord og 13 normaliserte tegn; «Ingen billettering» har to ord og 18 tegn. Begge skal passere. En tekst med ett ord skal avvises selv om den har ti tegn; to ord med færre enn ti tegn skal også avvises. Feilteksten skal forklare det konkrete minstekravet uten å kreve lengre fritekst enn vedtatt. Det tidligere forslaget om tre ord og 15 tegn gjelder ikke.

### Avklarte øktfelt (A1)

Før dagslåsing kreves sjåførnavn og ansattnummer, faddernavn, dato, buss, linjer, inn-tid og ut-tid. «Buss» betyr minst én buss; en ubrukt buss 2 skal ikke behandles som mangel. Demoen bruker fiktive ansattnumre, ikke reelle personaldata. Linjer kan dokumentere mer enn én linje på samme dag.

Begge roller kan registrere og endre inn-/ut-tid i format HH:mm frem til dagslåsing. Tider kan føres fra skiftopplysninger ved dagens slutt; ingen automatisk skiftintegrasjon inngår. Fadder må fullføre tider og øvrige øktopplysninger som mangler før egen sluttbekreftelse. Manglende inn-tid eller andre felt som fadder skal fullføre, skal ikke blokkere sjåførens egen etterbekreftelse når sjåførens nødvendige svar, begrunnelser og identitet/dato er på plass.

Fadder kan byttes underveis, også midt i skiftet. Hver bekreftelse beholder navnet til personen som faktisk bekreftet, uavhengig av senere tilknytning. Sjåføridentitet, dato og tilhørighet låses fortsatt med førbekreftelsen dag 1 og med etterbekreftelsen dag 2–5. I fullversjonen ønskes navn, ansattnummer, fadder og dato forhåndsutfylt av opplæringsansvarlig; V1 har fortsatt fiktive data og rollebytte.

## State Patterns

| Flate | Tom / lasting | Arbeid og fokus | Feil, avbrudd og sperret tilstand |
| --- | --- | --- | --- |
| S1 | Ingen løp: opprett nytt. Ved lasting: vent på faktisk lagret tilstand. | Valgt løp og rolle er entydige. | Feil ved åpning viser nytt forsøk; ikke vis tom oversikt som om data var slettet. |
| S2 | Ingen dager: opprett første. | Plan og delstatuser oppdateres etter lagring. | Duplikatdato leder til eksisterende dag. Dag 6/avsluttet løp avvises med forklaring. |
| S3 | Nye felt er tomme, ikke fabrikkert utfylt. | Feltetikett og fokus følger redigerbarhet. | Påkrevde felt forklares. Låst identitet/dato/tilhørighet kan ikke omkobles. |
| S4 | 22 ubesvarte ved start. | Utkast frem til separat førbekreftelse. | Mangler/lagringsfeil blokkerer. Etter låsing: bare lesing, også ved gammel redigeringsvisning. |
| S5 | Hver dags svar er egne registreringer; ingen automatisk OK. | På dag 1 videreføres Ikke relevant fra førvurderingen som låst svar med begrunnelse. Andre punkter besvares etter kjøring. Fra dag 2 vurderer sjåføren relevansen på nytt hver dag. | Før første førbekreftelse er etterregistrering sperret. Etter egen bekreftelse er dagens svar låst. |
| S6 | Fadder kan begynne før sjåfør er ferdig. | Egne svar, kommentarer og plan kan endres gjennom dagen. | Sluttbekreftelse venter på sjåfør, fullstendige egne svar, relevansbehandling og lagring. |
| S7 | Tomt er gyldig. | Fyll frivillig eller hopp over. | En lagringsfeil ved faktisk skrevet tekst skal ikke skjules fordi feltene er frivillige. Egenevalueringen låses ved sjåførens dagsbekreftelse; frivillige tomme felt blokkerer ikke. |
| S8 | Vis fullføringsstatus etter innlasting. | Fokus på dialog; tilbake til kontrollen ved avbrytelse. | Ingen halvlagret lås. Etter avbrudd lastes faktisk tilstand før nytt forsøk. |
| S9 | Statusvalget er ubesvart; konklusjonsteksten kan være tom. | Vis valgt konklusjonsstatus og konsekvens før avslutning. | Uferdige dager og ulagret innhold blokkerer. Avbrudd gir åpent utkast eller helt avsluttet løp, aldri mellomtilstand. |
| S10 | Historikk lastes etter faktisk tilgang. | Lesing og nedlasting. | Sjåførens fadderinnsyn/PDF sperres underveis. PDF-feil gir nytt forsøk; historikk forblir låst. |

Felles nettbruddregel: Bevar tidligere lagret arbeid og vis sann lagringsstatus. Fortsatt inntasting/lokal lagring avhenger av arkitektur; full offlinebruk og kald oppstart uten nett er ikke lovet. Ingen bekreftelse utføres mens berørt innhold er ulagret. Etter oppfrisking, rollebytte eller gjenåpning skal låsing fortsatt gjelde.

### Rolle- og låsematrise

| Objekt | Hvem skriver / når | Låsing | Sjåførens innsyn |
| --- | --- | --- | --- |
| Førvurdering | Sjåfør kun før første dag | Ved egen førbekreftelse | Egne svar hele perioden |
| Daglig ettervurdering og begrunnelse | Sjåfør etter kjøring; dag 1 har låst videreføring av førvurderingens Ikke relevant | Øvrige svar ved egen etterbekreftelse | Egne svar hele perioden |
| Daglig faddervurdering, kommentarer og behandling | Fadder gjennom dagen | Ved fadders sluttbekreftelse, etter sjåførens nødvendige deler | Etter periodens endelige avslutning |
| Første identitet/dato/tilhørighet | Opprettes før førbekreftelse | Sammen med førvurderingen; aldri flytt låst historikk | Egne opplysninger |
| Identitet/dato/tilhørighet dag 2–5 | Riktig dag og person må bevares | Ved sjåførens bekreftelse av dagens ettervurdering | Egne opplysninger |
| Buss og linjer | Fadder fyller og redigerer; minst én buss og linjer er obligatoriske | Ved dagslåsing | Egne øktopplysninger, kun lesing |
| Inn-tid og ut-tid | Begge roller kan fylle/endre; fadder fullfører mangler, timer/minutter | Ved dagslåsing | Sjåfør kan lese og fylle tidene frem til dagslåsing |
| Faddertilknytning | Fadder kan endres underveis i skiftet | Dagens faktiske bekreftende faddernavn bevares ved dagsbekreftelse; historiske bekreftelser endres aldri | Etter gjeldende rolleinnsyn |
| Oppfølgingsplan | Fadder underveis i åpent løp | Historiske låste dager endres ikke; plan gjelder videre løp | Sjåfør får riktig tilbud om sluttoppsummering; detaljert plansynlighet er åpen |
| Egenevaluering første/siste dag | Sjåfør, frivillig | Sammen med sjåførens egen dagsbekreftelse | Egen tekst |
| Fadderkonklusjon | Fadder skriver konklusjonsteksten siste dag. Teksten er frivillig og redigerbar frem til avslutning | Ved periodens endelige avslutning | Etter avslutning, også i PDF |
| Avslutning og utfall | Fadder når alle opprettede dager er bekreftet | Permanent og samlet | Varig fullt skjema |

### Hva betyr fullført?

Førvurderingen har 22 svar én gang. Hver dag har 22 sjåfør-etter-svar og 22 faddersvar. Dag 1 har dermed 66 svar totalt inkludert førvurderingen; senere dager har 44 nye svar. Perioden har 22 + 44 × antall dager. Dette er en avledning av brukerbeslutningen, ikke et nytt krav om å kopiere førvurderingen. Alle nødvendige relevansbegrunnelser, fadderavgjørelser, påkrevde kommentarer og bekreftelser må også være på plass. Et gyldig avslag blokkerer ikke i seg selv; ubehandlet relevans gjør det.

## Vedvarende kolonneoverskrifter

Kolonneoverskriftene OK / Kan bli bedre / Ikke relevant følger rullingen øverst i registreringsflaten. Raden har ugjennomsiktig bakgrunn og skal ikke dekke fokusert felt eller popup. Ved tekstforstørrelse brytes overskriftene uten overlapping. I utskrift brukes ordinære tabelloverskrifter uten fast skjermposisjon.

## Interaction Primitives

- Trykk/klikk velger svar. Tastatur skal gi samme tilgang uten handlinger som bare finnes ved hover.
- Valg av Ikke relevant åpner popup; kriterium og rolle følger med. Tilbake/avbryt bekrefter verken relevans eller dag.
- Før låsing skal brukeren kunne gå tilbake til manglende eller feil utfylte rader i den vertikale matrisen. Spørsmålstegn åpner punkthjelp uten å velge et vurderingssvar.
- Bekreftelse krever en eksplisitt handling. Utfylt skjema, lagring, rollebytte og oppsummering er ikke bekreftelse.
- Ingen sveipegest, animasjon eller automatisk fremdrift er nødvendig for de besluttede oppgavene. Slike valg er ikke fastsatt.
- Roller kan ikke endre hverandres svar. Fadder kan planlegge flere dager uten å vente på sjåførens ettervurdering.

## Accessibility Floor

PRD krever lesbar tekst, status utover farge, tastaturbetjente bekreftelsesdialoger, tydelig fokus og kontroll over avbrytelse. Kontrast og visuelle mål håndteres i DESIGN.md; dette er ingen sertifisering.

- Knytt hvert svarvalg til kriterium, rolle og vurderingsfase; skjermleser må kunne skille samme kriterium på forskjellige dager.
- Bevar naturlig leserekkefølge og fokus ved navigasjon, validering og rollebytte. Feil beskrives ved feltet og kan finnes fra mangellisten.
- Dialog åpner med forståelig navn, holder fokus i dialogen og returnerer fokus til utløseren ved avbrytelse. Tastatur skal kunne nå både tilbake og bekreft.
- Lagringsstatus må kunne oppfattes uten å flytte fokus fra tekstfeltet; unngå at gjentatte lagringsmeldinger avbryter innskriving.
- Tekstforstørrelse skal ikke skjule svar, begrunnelse eller dialoghandlinger. Ingen horisontal rulling i mobilregistreringen.
- De tre kolonneoverskriftene må kunne brytes ved tekstforstørrelse uten overlapping. Hver valgkontroll har kriterium og svaralternativ i sitt tilgjengelige navn, også når overskriftene er utenfor skjermen. Punkthjelpens tilgjengelige navn inkluderer vurderingspunktet, for eksempel «Hjelp om rygging».
- Manglende svar, Ikke relevant og Kan bli bedre skal være tekstlig forskjellige. Obligatoriske begrunnelser og frivillig egenevaluering må også skilles.
- Trefflater følger de godkjente minimumsmålene `{components.choice.min-width}` × `{components.choice.min-height}` for svar og `{components.help-trigger.width}` × `{components.help-trigger.height}` for hjelp. Faktisk svarkolonne er 52 px bred. Fokus bruker `{components.focus-ring.width}` ring i `{colors.focus}` med `{components.focus-ring.offset}` avstand; teksten ved feil bruker `{colors.error-ink}` med programmatisk feltkobling. Skjermleser-/zoomtest og øvrig nettlesermatrise følger A7 før bygging.

## Key Flows

Navnene under er fiktive illustrasjoner av prosjekteiers beskrevne arbeidsflyt, ikke personaer eller intervjufunn. Nora er sjåfør, Emil fadder og Alex dokumentmottaker/opplæringsansvarlig. FR-navnene beholdes som kildehenvisninger; nyere avvik står i kildeavstemmingen.

### F1 – Oppstart og engangs-førvurdering

Dekker FR-1 «Opprette fadderløp», FR-2 «Én økt per dag, maksimalt fem dager», FR-3 «Øktopplysninger» og førdelen av FR-5/FR-12/FR-13/FR-14.

1. Emil oppretter eller finner Noras løp i S1 og første økt i S2/S3 ved oppmøte.
2. Nora velger sjåførrollen på den delte enheten og fyller 22 punkter i S4.
3. Ikke relevant krever begrunnelse i popup. Mangler rettes før bekreftelse.
4. Nora kontrollerer identitet, dato og svar og bekrefter sin førvurdering i S8.
5. **Avgjørende øyeblikk:** Førvurderingen vises låst som periodens utgangspunkt; den skal aldri fylles på nytt dag 2–5.

Feilvei: lagring eller bekreftelse feiler → behold utkast eller vis faktisk fullført lås ved gjenåpning; ikke åpne etterregistrering på en halvlagret førvurdering.

### F2 – Fadder arbeider og planlegger underveis

Dekker FR-7 «Kommentar og tilbakemelding underveis», FR-9 «Lagring og lagringsstatus» og endret FR-16 «Videre oppfølging før endelig avslutning».

1. Emil åpner S6 underveis i arbeidsdagen og registrerer egne vurderinger og kommentarer når det er praktisk.
2. Ingen rygging er utført; han velger Ikke relevant og begrunner i popup.
3. Han endrer ubekreftede notater etter hvert som grunnlaget utvikler seg.
4. Han velger Ja ved behov for videre oppfølging. Detaljene viser antall ekstra fadderdager eller utvidet kjøretrening før fadderkjøring fortsetter. Velger han én ekstra dag etter planlagt dag 3, blir ny planlagt siste dag 4; samlet grense er fortsatt fem.
5. **Avgjørende øyeblikk:** Planen er lagret før Nora fullfører ettervurderingen, slik at hun ikke får sluttoppsummering på den tidligere siste dagen.

Feilvei: planendring kan ikke lagres → vis at den ikke er lagret; ikke presenter den som gjeldende. Sjåfør mangler fortsatt etterbekreftelse → Emil kan fortsette utkastet, men ikke sluttbekrefte dagen.

### F3 – Sjåførens ettervurdering og egenevaluering

Dekker FR-5 «Alle kriterier», endret FR-6 «Begrunnet Ikke relevant med separat fadderavgjørelse», FR-8 «Frivillige oppsummeringer» og sjåførdelen av FR-12/FR-13.

1. Nora åpner dagens S5 etter kjøring, også dag 2–5 uten ny førvurdering.
2. Hun gjennomgår de 22 kriteriene. På dag 1 er Ikke relevant fra førvurderingen allerede videreført og låst med begrunnelse; øvrige punkter besvares etter kjøring. Nye valg av Ikke relevant krever forklaring i popup. Fra dag 2 vurderer hun relevansen på nytt hver dag.
3. Første og planlagt siste dag tilbys S7 etter avkrysning. Nora fyller egenvurdering eller velger Hopp over.
4. Nora kontrollerer og bekrefter sin ettervurdering; eget bekreftet innhold blir skrivebeskyttet.
5. **Avgjørende øyeblikk:** Hun er ferdig med sin del uten å måtte godkjenne fadders meninger eller skrive i frivillige felt.

Feilvei: ett punkt ubesvart eller begrunnelse utilstrekkelig → S8 viser konkret mangel og vei tilbake. Egenevalueringen låses samtidig med sjåførens etterbekreftelse og kan ikke redigeres senere.

### F4 – Relevansbehandling og dagslåsing

Dekker FR-6, FR-7, FR-11 «Feil ved bekreftelse», FR-12 «Kontroll før bekreftelse», FR-13 «Bekreftelse av egen del og tydelig låsevarsel» og FR-14 «Permanent låsing».

1. Emil fortsetter sitt utkast i S6 etter at Nora har bekreftet sin etterdel.
2. Han behandler Noras Ikke relevant-valg som bekreftet eller avslått. Avslag får egen kommentar, uten å endre Noras svar.
3. Han fullfører egne vurderinger og eventuelle egne begrunnelser; S8 viser gjenværende mangler.
4. Han kontrollerer rolle, navn og dato og bekrefter varselet om permanent dagslåsing.
5. **Avgjørende øyeblikk:** Dagen blir låst med begge perspektiver bevart, også ved dokumentert uenighet.

Feilvei: ubehandlet relevans, manglende sjåførbekreftelse eller ulagret endring → ingen lås. Avbrudd etter klikk → gjenåpning viser faktisk lagret tilstand, og eksisterende før-/etterlås bevares.

### F5 – Planlagt siste dag og endelig avslutning

Dekker FR-8, FR-15 «Endelig avslutning av perioden» og FR-16.

1. Nora fullfører S5 på gjeldende planlagt siste dag; ingen utvidelse er registrert.
2. Hun får tilbud om frivillig sluttegenevaluering i S7 og fyller eller hopper over.
3. Emil fullfører dagsbekreftelsen og kan skrive sin valgfrie konklusjon på siste dag.
4. Når alle opprettede dager er bekreftet, velger han i S9 Godkjent eller Oppfølgingsbehov og bekrefter permanent avslutning.
5. **Avgjørende øyeblikk:** Perioden er lukket, Nora får varig fullt innsyn, og PDF blir tilgjengelig uansett valgt utfall.

Feilvei: uferdig dag eller lagringsfeil → løpet er fortsatt åpent; innsyn/PDF utvides ikke før komplett avslutning. Dag 5 gir ikke adgang til dag 6. Ved utvidelse etter bekreftet sluttegenevaluering beholdes den opprinnelige egenevalueringen låst på sin dag. Sjåføren får tilbud om en ny frivillig egenevaluering på den nye planlagte siste dagen. Den nye evalueringen erstatter ikke historikken og låses med sjåførens bekreftelse den dagen. Ved ett-dagsløp får sjåføren én felles, frivillig egenevaluering som dekker den eneste dagen. Den tilbys etter avkrysning, kan hoppes over og låses med sjåførens egen dagsbekreftelse. Det opprettes ikke separate første- og sistedagsevalueringer for samme dag.

### F6 – Historikk, gjenopptakelse og manuell PDF-overlevering

Dekker FR-4 «Roller og historikk», FR-10 «Kortvarig nettbrudd», FR-17 «Nedlastbar sluttdokumentasjon», FR-18 «Bare avsluttet dokumentasjon i normalflyten» og FR-19 «Lesbarhet og gjentatt nedlasting».

1. Nora eller Emil gjenåpner riktig løp etter en pause; S1/S2 viser faktisk lagret status og eksisterende låser.
2. Underveis leser Nora egne registreringer, mens Emil kan se hele skjemaet. Etter avslutning leser begge fullt skjema i S10.
3. Emil laster ned slutt-PDF og overleverer den manuelt til Alex.
4. Alex laster dokumentet opp i HR-portalen utenfor appen, slik at ressursleder og sjåfør kan se det der.
5. **Avgjørende øyeblikk:** Dokumentasjonen kan leses uavhengig av appen, med dager, egne avsendere, bekreftelser og avslutningsutfall bevart.

Feilvei: PDF-generering feiler → prøv igjen uten nye bekreftelser eller endring av låst innhold. Nettbrudd i åpen økt → tidligere lagret arbeid bevares, og ulagret arbeid markeres ærlig.

## Responsive & Platform

Mobilregistrering skal fungere uten horisontal rulling. Prosjekteiers valgte matrise viser kategorier vertikalt og, til høyre for radtekstene, OK / Kan bli bedre / Ikke relevant i denne rekkefølgen med overskrifter øverst. Større skjerm skal støtte samme oppgaver og innsyn. Desktop er ikke en egen rolle eller egen arbeidsflyt. Kolonnebredder, tekstbryting og bruddpunkter må prøves mot A7; 360/1280 CSS-piksler i PRD er forslag, ikke vedtatt testmatrise. Punkthjelpens spørsmålstegn og hjelpetekst er interaktive skjermdetaljer og utelates fra utskrift/PDF.

V1 bruker delt enhet. Ved rollebytte må sjåførflaten ikke beholde synlige fadderkommentarer fra forrige visning. Fremtidig egen enhet dagen før, synkronisering og produksjonstilgang krever senere arkitekturarbeid.

## Inspiration & Anti-patterns

[Originalskjemaet](../../../../docs/Eksempel%20vurderingsskjema.pdf) gir kriterieorden, tydelige vurderingsperspektiver og første-/sistedagsevaluering. Addendumets normaliserte og anonymiserte kriterietekst er gjeldende demotekst. Prosjekteiers tre svarkolonner gjelder aktiv vurdering på mobil; det innebærer ikke at alle tre parters vurderinger skal vises i én bred registreringstabell.

[Importert referansekopi](imports/Eksempel%20vurderingsskjema.pdf) viser vurderingsmatrisen og egenevalueringens tre styrker/tre utviklingsområder. Kopien er uendret; nyere arbeidsflytregler står i dette dokumentet.

Unngå forhåndsvalgte OK-svar, automatisk faglig godkjenning, sammenblanding av lagring og bekreftelse, ny førvurdering hver dag, retur av sjåførens svar ved uenighet og innføring av den utsatte private rapporten i V1.

## PDF og innsyn

[PDF-referansen](mockups/key-pdf.html) og [prøvefilen](../../../../output/pdf/ux-pdf-oppsett.pdf) viser det godkjente oppsettet: liggende vurderingsmatrise først og stående oppfølgingssider. De er statiske layoutreferanser, ikke implementert eksport fra appen. [Gjennomgangsoversikten](review-index.html) samler referansene.

PDF følger hele det endelig avsluttede løpet. Vis én førvurdering med opprinnelig bekreftelse, og hver dags etter-/faddervurdering med egne bekreftelser. En eventuell gjentatt referanse til førvurderingen må merkes som samme historiske utgangspunkt. Bevar relevansbegrunnelser, separate fadderavgjørelser, kommentarer, egenevalueringer, valgfri konklusjon og endelig utfall. Ved sen utvidelse vises både tidligere bekreftede egenevalueringer og eventuell ny siste-dagsevaluering med sine faktiske dager og bekreftelser. Ta også med registrert oppfølgingsbehov og beslutninger om videreføring, inkludert endring av planlagt siste dag og registrert dag/avsender, slik at forlengelsen av løpet kan forstås fra PDF-en.

Første PDF-side er liggende, inspirert av fadderskjemaet, med vurderingene kronologisk ved siden av hverandre for å vise progresjon. Oppsummeringsfeltet øverst beholdes. OK markeres grønt, Kan bli bedre gult og Ikke relevant rødt, alltid sammen med tekst eller symbolforklaring; rød betyr ikke ubesvart. Stående side 2 samler kommentarer, relevansbegrunnelser, egenevaluering og uttrykkelig godkjenning. Ved mye tekst brukes flere sider uten avkutting. Bekreftelsesfelt har vanlig tekstnavn, rolle og dato i signaturlignende oppsett: sjåfør til venstre, fadder til høyre, ekstra fadder i midten når aktuelt. Vis faktisk bekreftende fadder for hver dag; ikke finn på en felles signatur fra andre. Dette er ikke identitetsverifisert e-signatur. Dagene ordnes kronologisk, sider nummereres og relevante tabelloverskrifter gjentas ved sideskift. Tomme frivillige felt er ikke mangler. Ingen normal eksport før avslutning; eventuell teknisk ufullstendig fil skal merkes som ufullstendig på hver side, uten at dette oppretter en ny utkast-PDF-funksjon.



## Godkjente visuelle referanser

- [Fadder gjennom dagen](mockups/key-fadder.html): S3/S6/S8 og F2/F4; obligatoriske øktfelt, løpende vurdering, oppfølgingsplan og egen relevansbehandling. Den separate sidetilstanden viser behandling etter sjåførens bekreftelse; hovedskjermen venter fortsatt på den.
- [Frivillig egenevaluering](mockups/key-egenevaluering.html): S7/S8 og F3/F5; seks frivillige felt, hopp over og separat bekreftelse med låsevarsel. Hopp over bekrefter ikke dagen alene.
- [Endelig avslutning](mockups/key-avslutning.html): S9/S10 og F5/F6; samlet Konklusjon-gruppe med valgfri tekst og påkrevd statusvalg, alternativ bekreftelsesdialog og PDF først etter vellykket avslutning.

Prosjekteier har godkjent vurderingsskjema, fadderdel, egenevaluering, avslutning og PDF-oppsett. Referansene bruker samme visuelle standard og er statiske, uten lagring eller bekreftelse. Dette godkjenner UX-utformingen, ikke en implementert app.

## Avklart utvidet kjøretrening (UX-T1)

I V1 registreres «Utvidet kjøretrening før fadderkjøring fortsetter» bare som et oppfølgingsbehov. Gjennomføring og klarsignal avklares utenfor løsningen, primært i samtale med opplæringsansvarlig. Appen innfører ingen egen treningsøkt, gjenopptakelsesgodkjenning, ny rolle eller produksjonsintegrasjon for dette. Registreringen er ikke i seg selv et klarsignal eller en endelig avslutning av fadderperioden. Eksisterende regler om låste dager, samlet femdagersgrense og eksplisitt avslutning gjelder fortsatt.

Flyt F2 dekker registreringen fra S6: Emil velger Ja og treningsalternativet, lagrer behovet og tar avklaringen videre i samtale utenfor appen. Ved lagringsfeil vises behovet som ulagret; det skal ikke fremstilles som registrert. Det gjøres ingen automatisk endring av historiske vurderinger eller bekreftelser.

UX-L1 er også lukket: mobilmatrise, systemfont, farger, luft, logo, punkthjelp A, hjelpetekster og valgte skjerm-/PDF-referanser er godkjent. Øvrige flater følger IA-, komponent- og tilstandstabellene.

## Overlevering til arkitektur

| ID | Arkitekturoppgave | Eier / når |
| --- | --- | --- |
| A4 / A8 | Lagringsmekanisme, hva virker under nettbrudd, tidsmål og gjenopptakelsesbetingelser. | Arkitekt med prosjekteier før lagringshistorier |
| A7 | Testbredder, nettlesere, tilgjengelighetsmål og faktiske kontrastkombinasjoner. | UX og arkitekt før implementeringsplan |

Ingen av disse radene gjenåpner frivillighet, femdagersgrense, engangs-førvurdering, daglig relevansvalg, fadders tilgang underveis eller fullt innsyn ved avslutning. Detaljer skal ikke fylles med stiltiende antakelser.
