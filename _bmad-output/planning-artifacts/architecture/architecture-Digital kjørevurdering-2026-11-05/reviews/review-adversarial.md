# Reviewer Gate – adversarial konsistens

Kontrollert 2026-11-05 mot nyeste `ARCHITECTURE-SPINE.md` og `verification-plan.md`. Dette er den konfigurerte fritekstlinsen for kompatibilitet mellom senere arbeidsenheter, ikke en minimumsantall-kritikk. Ingen app eller tester er implementert.

**Dom: Rett tre konsistenshull før dokumentbaselinen lukkes.** Atomisk løpsautoritet, monotone bekreftelser, foreldet relevansbehandling og avsluttet dokumentkilde er godt bundet. Planredigering, logisk svarnøkkel og egenevalueringens ikke-tilbudte tilstand kan fortsatt implementeres ulikt av to senere epics.

## A1 — High: Samme oppfølgingsvalg kan få kumulativ eller erstattende effekt

**Sted:** AD-8, avsnittene om basisplan, `oldLastDay < newLastDay`, Ja→Nei og dagens låste planregistrering.

**To kompatible implementasjoner som divergerer:** Plan-/lagringsepicen bruker gjeldende plan som basis hver gang et nytt kommando-ID kommer. Med opprinnelig siste dag 3 gir valget +1 dag plan 4. Når fadder endrer den fortsatt åpne dagens felt til +2, blir ny forespørsel 4+2=6 og avvises. Skjermepicen beholder basis 3 for samme dags oppfølgingsregistrering og forventer at +2 erstatter +1 og gir siste dag 5. Begge har uttrykkelig basisplan, nye kommando-ID-er, revisjonskontroll og ingen duplikatkommando. Regelen om idempotens løser derfor ikke redigering av samme faglige beslutning.

Et motsatt problem oppstår ved +2→+1: episkjermen tillater redigering av eget ubekreftet valg som godkjent UX beskriver, mens domenet avviser 5→4 gjennom strengt økende `oldLastDay < newLastDay`. Ja→Nei-regelen gjør dessuten første lagrede plan permanent selv om dagens felt er ubekreftet. Dette er en ny produkttolkning som bør synliggjøres, ikke skjules som retrydetalj.

**Rett:** Gi oppfølgingsregistreringen stabil beslutnings-ID, eksplisitt basisplan/basisrevisjon og valgt antall. Fastsett én felles regel for endring av samme registrering: erstattende effekt fra samme basis, eller eksplisitt irreversibel tilleggsbeslutning etter egen bekreftelse. Angi også hva som skjer ved nedjustering/Ja→Nei, med låste dager og andre senere planhendelser bevart. Brukeren har godkjent redigering underveis, så en ny irreversibilitet må merkes som antakelse/åpent valg hvis den beholdes. Tilføy tester for +1→+2, +2→+1, Ja→Nei→Ja og endring etter at en annen dag har videreført planen.

## A2 — High: Svarantall binder ikke den logiske nøkkelen og fullstendig kriteriedekning

**Sted:** AD-6s «22 gyldige svar», AD-7s Answer-modell og AD-11s forhåndskontroll av svarantall.

**To kompatible implementasjoner som divergerer:** Registreringsepicen lagrer svar per `(runId, dayId, phase, criterionId)` og forventer én verdi i hver posisjon. PDF-/lagringsepicen bruker hver `Answer.id` som eneste unik nøkkel og teller 22 gyldige Answer-objekter i en fase; to objekter kan ha samme kriterie-ID mens et annet kriterium mangler. Alle objektene har stabile ID-er, gyldig fase og kriterie-ID og det totale antallet er 22. En eksport som velger siste objekt per kriterium får 21 rader, mens en annen viser 22 med duplikat. Den uttalte hensikten tilsier nøyaktig dekning, men den håndhevbare nøkkelregelen står ikke uttrykkelig.

**Rett:** Definer unik logisk posisjon: før-svar `(runId, baseline, criterionId)`, daglige svar `(runId, dayId, phase=driver_after|mentor, criterionId)`. Bekreftelse og eksport krever nøyaktig mengdelikhet med det fryste settet av 22 kriterie-ID-er for hver påkrevd fase, ikke bare antall. Avvis ukjente kriterier/duplikater og krysskobling av svar til annet løp/dag. Arvet dag-1-svar får egen etterposisjon og låst kildehenvisning uten ekstra førposisjon. Test duplisert kriterie-ID, manglende kriterium og feil dayId/phase ved riktig totalantall.

## A3 — Medium: Ikke-tilbudt egenevaluering mangler felles representasjon

**Sted:** AD-6 `ConfirmDriverDay` fryser «egenevaluering eller eksplisitt hopp over»; AD-8 tilbyr evaluering bare første og planlagt siste dag, mens DAY→SELF_EVALUATION er valgfri.

**To kompatible implementasjoner som divergerer:** Skjermepicen tilbyr ingen egenevaluering på mellomdag 2 i et tredagersløp og sender ingen evaluering/skip-markør. Domene-/lagringsepicen krever en av de to oppgitte frosne tilstandene ved alle `ConfirmDriverDay`-kommandoer og avviser bekreftelsen. Alternativt oppretter den «hoppet over» på en dag hvor sjåføren aldri fikk tilbudet, som PDF-en da kan fremstille som et faktisk brukervalg.

**Rett:** Fastsett en felles tilbuds-/deltakelsestilstand, for eksempel `not_offered`, `offered_empty`, `provided`, `skipped`, knyttet til faktisk dag og planversjon. På mellomdag er `not_offered` gyldig uten ny brukerhandling. På første/siste dag blokkerer tom frivillig tekst aldri, og bare et faktisk Hopp over lagres som eksplisitt skip. La ConfirmDriverDay fryse denne avledede tilstanden og eventuell tekst samlet. Test mellomdag uten felt, frivillig tomt tilbud, faktisk hopp over og planendring mens sjåførens skjerm er åpen.

## Angrep uten ytterligere funn

- To samtidige faner som skriver/låser samme løp: revisjonskontroll i siste DB-transaksjon forhindrer gammel overskriving; UI-serialisering er ikke eneste vern.
- Tapt kvittering/retry: samme ID og payload kan gjenfinne transaksjonsresultat; gjenåpning må vise faktisk lagret tilstand før nytt forsøk.
- Endret sjåførbegrunnelse etter fadderbehandling: answerRevision gjør behandlingen utdatert uten å ødelegge egne fadderutkast.
- Fadderbytte og profilendring: historiske actor-snapshots og separate feltlåser hindrer omskriving.
- Avslutning under uferdig dag eller samtidig ny dag: samme løpsaggregat/revisjon og CloseRun-validering hindrer halvåpent innsyn.
- PDF etter endret global kriterietekst/navn: frosset ClosureSnapshot og kriterie-/regelversjon hindrer ny fortolkning. Q5 er kjent, uttrykkelig UX-avvik og er ikke telt på nytt.

Q1–Q6 er eksisterende forslag til prosjekteier; vurderingen ovenfor er ingen godkjenning av disse og ingen oppfordring til implementering nå.

## Etterkontroll av rettinger

Nyeste AD-6–8 er kontrollert på nytt 2026-11-05. **A1–A3 er håndtert i dokumentkontrakten; ingen nye konkrete konsistenshull er påvist i de endrede avsnittene.** Dette er fortsatt et arkitekturutkast, ikke resultat av kjørende tester.

- **A1:** Stabil `FollowUpDecision`-ID og aktivt valg gjør +1→+2 erstattende. Planen avledes deterministisk fra initialplan og aktive tillegg, med maksimalt fem og nedre grense mot opprettede dager. Ja→Nei gjelder bare samme ulåste beslutning; låste beslutninger/historiske hendelser bevares. Senere utvidelse får egen ID og kan bare øke planen. `CreateDay <= plannedLastDay` hindrer at nye dager omgår planen. Q7 gjør den nye produkttolkningen synlig og må avgjøres før berørt baseline.
- **A2:** Unik posisjonsnøkkel og nøyaktig mengdelikhet med løpets 22 kriterie-ID-er er nå uttrykkelig påkrevd ved mutasjon, bekreftelse og dokumentkontroll. Riktig antall alene kan ikke godkjenne duplikat/manglende kriterium. Dagfri førfase og separate etterposisjoner bevarer antallet 22+44n.
- **A3:** `not_offered`, `skipped` og `submitted` er skilt. Mellomdag krever ingen oppfunnet Hopp over; innsendt tilbud kan ha tom frivillig tekst. Tilbud vurderes mot gjeldende planrevisjon, og faktisk skrevet tekst beholdes ved planendring uten omskriving av låst historikk.

Revisjonskontroll, atomiske planhendelser og eksisterende commandId-idempotens gjelder fortsatt. Tester for endring/replay og planendret tilbud er nødvendige ved senere implementering, men de er ikke grunn til ytterligere arkitekturendring nå. Q1–Q7 og det kjente fontavviket er fortsatt prosjekteiers beslutninger.
