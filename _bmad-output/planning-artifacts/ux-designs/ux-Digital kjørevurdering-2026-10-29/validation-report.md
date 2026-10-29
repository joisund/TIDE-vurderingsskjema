# UX-validering – Digital kjørevurdering

## Gjeldende sluttstatus – 2026-10-29

Hele UX-oppsettet og alle 22 hjelpetekster er godkjent. UX-T1 er lukket: utvidet kjøretrening er kun registrert oppfølgingsbehov; gjennomføring/klarsignal håndteres utenfor appen, primært med opplæringsansvarlig. De opprinnelige ti funnene er håndtert. A4/A8 og A7 er arkitekturoppgaver. Godkjente skisser er promotert til mockups/. Se finalization-report.md for endelig kontroll og status.

Rapporten nedenfor bevarer vurderingene fra tidligere utkast. Dens draft-status og oppgaver som senere er godkjent er historikk, ikke gjeldende blokkere.

## Historisk valideringsrunde

- **DESIGN.md:** [DESIGN.md](DESIGN.md)
- **EXPERIENCE.md:** [EXPERIENCE.md](EXPERIENCE.md)
- **Tidspunkt:** 2026-10-29T20:43:56+01:00
- **Status:** draft; ikke ferdigstilt.

## Samlet vurdering

Utkastet gjengir hovedbeslutningene godt: én førvurdering, daglig relevans for begge roller, fadders arbeid gjennom dagen, planlagt siste dag, frivillig egenevaluering og separat sluttavslutning. Det er et nyttig grunnlag for neste avklaringsrunde, men ikke klart for ferdigstilling: de validerte låse- og relevansspørsmålene er avklart, mens den visuelle kontrakten fortsatt er ufullstendig. Begge dokumenter beholder status draft.

Tilgjengelighetskontrollen støtter den valgte trematrisen. Tekstoverløp ved forstørrelse og hjelpenavn er rettet og etterkontrollert. Vedvarende kolonneoverskrifter er valgt, lagt inn og kontrollert i skissen. De ti opprinnelige funnene er nå lukket gjennom rettinger og brukeravklaringer. UX er fortsatt draft. Før ferdigstilling gjenstår faglig kontroll av 22 hjelpetekster, gjennomgang av de nye skjerm-/PDF-utkastene og sluttpolering. Tekniske lagringsvalg og testmatrise overleveres eksplisitt til arkitektur. Dette er UX- og skissevalidering, ikke sertifisering eller funksjonstest av appen.

## Kategorivurderinger

- **Flow coverage — adequate:** FR-1–FR-19 dekkes av seks flyter med fiktive deltakere, nummererte steg, avgjørende øyeblikk og feilvei. R1 og R2 er avklart, inkludert låsepunkter, sen utvidelse og ett-dagsløp.
- **Token completeness — adequate (etter retting):** Godkjente visuelle verdier er dokumentert; 215 tokenstier kontrollert uten uløste referanser. Se .working/visual-token-extraction.md.
- **Component coverage — adequate:** 18 komponenter har samme navn i begge dokumenter. Manglende visuell konkretisering inngår i R3 og telles ikke dobbelt.
- **State coverage — adequate:** S1–S10 har tilstander for arbeid, feil og sperrer. Null dager kan nå ikke avsluttes. Identitet/dato/tilhørighet dag 2–5 låses ved sjåførens etterbekreftelse.
- **Visual reference coverage — adequate:** Originalskjema, logo og foreløpig skjermskisse finnes og er lenket med formål. Mock-dekning for øvrige flater må avklares før sluttføring.
- **Bloat & overspecification — strong:** Tabellene dekker ulike behov uten å innføre stakk, ekstra V1-roller eller privat rapport. Foreløpige skisseverdier er tydelig merket.
- **Inheritance discipline — adequate:** Kildelenker, kravnavn og komponentnavn samsvarer. PDF-oppfølgingsbeslutning og relevansavstemming er rettet. PRD/addendum må fortsatt avstemmes med nyere vedtak.
- **Shape fit — strong:** Begge dokumenter følger forventet struktur og beholder status draft. Produktspesifikke PDF- og avklaringsseksjoner er relevante.

## Åpne funn etter retting

Opprinnelig opptelling: 0 critical, 4 high, 4 medium, 2 low. Nå: 0 critical, 0 high, 0 medium, 0 low i den opprinnelige funnlisten. Gjenstående ferdigstillingsoppgaver står i finalization-checklist.md. R1, R2 og R4 er lukket etter brukeravklaring.

### critical (0)

### high (0)

### medium (0)

### low (0)

## Rettede funn

### R3 — Visuell standard (medium)

**Godkjent og dokumentert.** Prosjekteier har godkjent skissens uttrykk som V1-standard. Font, fargebruk, avstander, former og komponentverdier er løftet inn i DESIGN.md. Kontroll av 215 tokenstier fant ingen uløste referanser; valgte tekstpar har kontrast 4,87:1–10,11:1. Presentasjonsrammer er ikke produktkrav. Dette er dokument- og fargekontroll, ikke full apptesting eller ny full review.

### A11Y-2 — Vedvarende kolonneoverskrifter (medium)

**Rettet og kontrollert.** Prosjekteier har valgt at kolonneoverskriftene følger rullingen. Skissen bruker en fast overskriftsrad innen registreringsflaten, med ugjennomsiktig bakgrunn og plass for tastaturfokus. Kontroll i Edge ved 360/390 px og normal/doblet tekst viste fast posisjon ved rulling og ingen tekstoverløp; fokusert sluttfelt var under overskriften. Utskrift bruker vanlig plassering, ingen klippet rulleflate og skjult hjelp. Dette validerer skissen, ikke den fremtidige appen.

### R2 — Egenevaluering og konklusjon (high)

**Avklart av prosjekteier og innarbeidet.** R2 er avklart: Egenevaluering låses med sjåførens dagsbekreftelse, konklusjon med periodens avslutning. Ved sen utvidelse beholdes tidligere egenevaluering låst og ny tilbys på ny siste dag. Ved ett-dagsløp får sjåføren én felles, frivillig egenevaluering som dekker den eneste dagen. Den tilbys etter avkrysning, kan hoppes over og låses med sjåførens egen dagsbekreftelse. Det opprettes ikke separate første- og sistedagsevalueringer for samme dag.

Ingen ny full valideringsrunde er kjørt.

### R4 — Feltlås dag 2–5 (high)

**Avklart av prosjekteier og innarbeidet.** På dag 2–5 låses dato, identitet og tilhørighet når sjåføren bekrefter ettervurderingen. Buss, linje og inn-tid fylles ut og redigeres av fadder frem til dagslåsing; sjåføren ser disse som øktopplysninger uten redigering.

Ingen ny full valideringsrunde er kjørt.

### R1 — Relevansens livsløp (high)

**Avklart av prosjekteier og innarbeidet.** På dag 1 videreføres «Ikke relevant» fra førvurderingen låst med opprinnelig begrunnelse; fadder bekrefter eller avslår i sin del. Fra dag 2 vurderer sjåføren relevansen på nytt hver dag. Nye «Ikke relevant»-valg krever popup-begrunnelse og fadderbehandling. Historiske svar endres ikke.

Ingen ny full valideringsrunde er kjørt; dette er dokumentavstemming av brukerens beslutning.

### R5 — Avslutning av tomt løp (medium)

**Rettet – dokumentkontrollert.** Kontrakten krever nå minst én registrert og bekreftet dag. En tom liste kan ikke oppfylle avslutningskravet.

Sted: EXPERIENCE.md – etter Component Patterns. Lukket i UX-teksten; test regelen i implementasjonen.

### R6 — Oppfølging i PDF (medium)

**Rettet – dokumentkontrollert.** PDF-kontrakten inkluderer nå oppfølgingsbehov, videreføringsbeslutninger, endret planlagt siste dag og registrert dag/avsender.

Sted: EXPERIENCE.md – PDF og innsyn. Lukket i UX-teksten; kontroller innhold mot lagrede data ved PDF-implementering.

### R7 — Ikke gjenåpne eget valg kontra ren bekreftelse (low)

**Rettet – dokumentkontrollert.** Kildeavstemmingen skiller nå eget Ikke relevant-valg med popupbegrunnelse fra ren behandling av sjåførens valg.

Sted: reconcile-prd.md – popupbegrunnelse. Lukket; ikke be brukeren gjenta dette avklarte skillet.

### A11Y-1 — Overskrifter ved forstørret tekst (high)

**Rettet og etterkontrollert.** Opprinnelig tekst krysset cellegrenser ved doblet beregnet skriftstørrelse. Etter retting viste samme Edge-kontroll ved 360 px ingen overløp i kontrollerte overskrifter, kriterier, dialog eller knapper; rullebredden var 360 px.

Sted: .working/key-vurdering.html – column-head. Lukket for denne statiske skissen. Bredere zoom- og implementasjonstest gjenstår.

### A11Y-3 — Hjelpeknappenes tilgjengelige navn (low)

**Rettet og etterkontrollert.** Knappene har nå kategorispesifikke navn. Reviewer har kontrollert rettingen.

Sted: .working/key-vurdering.html – help-trigger. Lukket for navngiving. Åpnet tilstand, kobling til hjelpeinnhold og fokus testes i faktisk implementasjon.

## Faseblokkere og resterende arbeid

UX er fortsatt draft. Før ferdigstilling gjenstår faglig kontroll av 22 hjelpetekster, gjennomgang av de nye skjerm-/PDF-utkastene og sluttpolering. Tekniske lagringsvalg og testmatrise overleveres eksplisitt til arkitektur. Dette blokkerer ikke videre skissearbeid.

A4/A7/A8/A10 er fortsatt merkede detaljoppgaver med eiere. PRD/addendum må avstemmes, øvrig mock-dekning avklares og valgt design må kontrolleres før final-status. Ingen implementasjon eller endelig PDF er funksjonstestet.

## Mekaniske merknader

- Seks fargetokens, ti IA-flater, seks flyter og 18 samsvarende komponenter.
- Lokale lenker og tokenreferanser er kontrollert. Ingen Mermaid-diagrammer.
- Skissen viser samme 22 kriterier ved to bredder, ikke 44 produktkriterier.
- Tilgjengelighetens etterkontroll bruker Edge ved 360 px og doblede beregnede skriftstørrelser; dette erstatter ikke full zoom-/nettlesertest.

## Reviewer-filer

- [review-rubric.md](review-rubric.md)
- [review-accessibility.md](review-accessibility.md)



## Siste arbeidsstatus

A1 er avklart: alle angitte øktopplysninger er obligatoriske; begge roller kan fylle HH:mm-tider, og fadder fullfører mangler før dagslåsing. Fadderbytte er tillatt underveis. Hjelp er omskrevet til korte felles prosatekster. Fadderdel, egenevaluering, avslutning og PDF-oppsett er laget og visuelt kontrollert; de nye komposisjonene og fagtekstene venter på prosjekteiers gjennomgang. Se [samlet gjennomgang](review-index.html). Ingen final-status er satt.
