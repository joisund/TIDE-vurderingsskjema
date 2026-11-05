# Reviewer gate – good-spine rubric

Dato: 2026-11-05. Uavhengig rubric walker etter lokal `references/reviewer-gate.md`. Grunnlag: nyeste ARCHITECTURE-SPINE.md, verification-plan.md og finalization-report.md, med gjeldende PRD/UX som kontrollgrunnlag. Det tidligere UX-avstemmingsfunnet om null dager i et løp er nå rettet i ER-diagrammet.

**Dom:** Arkitekturen dekker de bærende dimensjonene og er et sammenhengende beslutningsutkast. Ingen kritiske eller høye funn i denne linsen. Ett middels konsistenshull i oppretting av neste dag bør lukkes før spinen brukes som felles byggkontrakt. Åpne Q1–Q6 og fontkonflikten er tydelig skilt fra godkjente regler.

## Funn og behandling

### R-1 – medium: Neste dag er ikke eksplisitt bundet til gjeldende plan

**Sted:** AD-8, ny dag og planlagt siste dag; testplanens domeneprøver.

**Eksempel:** Et løp har planlagt siste dag 3. En modul oppretter dag 4 fordi det fortsatt er innen maks fem og datoen kommer etter dag 3. En annen modul krever først at fadder registrerer ekstra dager og utvider planen. Begge kan følge dagens AD-8 ordrett. I første variant er faktisk dagnummer høyere enn planlagt siste dag, og tilbudet om sluttegenevaluering og status Under oppfølging blir avhengig av hvilken modul som opprettet dagen.

**Anbefalt behandling – autofix som teknisk avledning:** Fastsett at `CreateDay` krever `nextDayNumber <= plannedLastDay` i tillegg til femdagersgrensen. Ved behov for flere dager registreres en gyldig planutvidelse først, eventuelt atomisk sammen med opprettelsen. Behold separat regel om at avslutning kan skje når minst én dag finnes og alle opprettede dager er låst; ikke gjør oppnådd planlagt siste dag til et nytt absolutt avslutningskrav. Tilføy prøve på forsøk på dag 4 ved plan 3 og gyldig utvidelse 3→4.

Dette lukker en avhengighet mellom plan og dagsmodell. Hvis prosjekteier faktisk ønsker dager utenfor registrert plan, må alternativet og konsekvensen for egenevaluering beskrives eksplisitt; stilltiende ulikhet er ikke en holdbar utsettelse.

## Rubric-gjennomgang

| Kontroll | Vurdering |
| --- | --- |
| Paradigme og grenser | Navngitt lett heksagonal klientarkitektur, tillatte avhengigheter og domene uten React/nettleser/PDF er tydelig. Utskiftbare adaptere betyr ikke at backend eller flere plattformer bygges nå. |
| Binds/Prevents/Rule | AD-1–13 har alle feltene. Regler kan kontrolleres ved importer, applikasjonskommandoer, revisjon/låsvalidering, databasekvittering og eksplisitte read models. |
| Tilstandsautoritet | Ett løpsaggregat og én transaksjon eier konsistensen. Kommando-ID, revisjon og atomisk resultat hindrer gjentatt utvidelse og halvlagrede låser. Ingen parallelle autoritative dagslagre er innført. |
| Datalåser og tilgang | Separate før-/etter-/dags-/avslutningslåser, historiske navn og per-felt redigeringsgrenser er bevart. Simuleringsrolle og lokal funksjonshåndheving omtales ikke som produksjonsautorisasjon. |
| Vurdering og relevans | Faste kriterier, 22+44n posisjoner, dag-1-arv og konkret answerRevision for behandling lukker de viktigste divergenspunktene. Fadderens egen mening, sjåførens svar og relevansavgjørelse blandes ikke. |
| Plan og egenevaluering | Normal/kort initial plan, append-only endringer, behov uten ny treningsmodul, ett-dagsløp og sen utvidelse er dekket. R-1 er det eneste påviste hullet i koblingen til neste dags oppretting. |
| A4/A8 | Lager, complete-kvittering, autosavemål, nettbrudd, gjenopptakelsesbetingelser, feil og avgrensninger er konkrete. Planlagte tidsmålinger fremstår ikke som allerede bestått. |
| A7 | Bredder, tekst/zoom, faktiske mobilnettlesere, skjermlesere og versjonsregistrering er spesifisert. Automatiske tester er supplement. Skissenes tidligere kontroller regnes ikke som appbevis. |
| PDF | Frosset faglig input, avsluttet-only, faktisk fil, layoutadapter og obligatorisk innhold er dekket. Fontavviket er synlig godkjenningsspørsmål. Visuell kontroll og komplette femdagersdata er påkrevd ved senere bygg. |
| Miljø og drift | Lokal utvikling/preview, stabil HTTPS-origin, ressurslasting, leverandørvalg før publisering, schema/migrering, gamle faner, atomisk deploy og rollbackgrenser er adressert. Ingen hel operasjonell dimensjon er taus. |
| Teknologi | Seed er eksakt oppgitt og peker på research-notat med primærkilder. Ren installasjon/bygg er eksplisitt utestående. Detaljert versjons-/kildeverifikasjon tilhører den selvstendige teknologilinsen, ikke en påstand om utført runtime-test her. |
| Scope og input | Godkjent UX går foran historiske avsnitt. Fem dager, én førvurdering, frivillighet, fullt innsyn ved begge avslutningsutfall og UX-T1 er bevart. Ingen epic-/story- eller implementeringsworkflow er startet. |
| Deferred | To enheter, serverautorisasjon, full offline/synk, mobil/Power Apps og fremtidig dokumentintegritet ligger klart utenfor V1. Host og testpakkeversjoner kan vente til publisering/bygg. R-1 kan ikke legges i Deferred fordi det påvirker dagens domeneinvariant. |
| Status og godkjenning | Draft, tidligere godkjent, teknisk avledning og nye spørsmål er eksplisitt skilt. Sluttrapportens kontrollstatus er fortsatt under arbeid ved denne lesningen; parent må oppdatere den etter alle kontroller uten å sette arkitekturen til final. |

## Avgrensning

Dette er en kontroll av arkitekturkontrakten, ikke en vurdering av eksisterende appkode. Ingen app er implementert. Lagringsgarantier, faktisk nettleserkompatibilitet, fontressurser og PDF-layout må prøves i senere bygg. Denne linsen godkjenner ikke Q1–Q6 på prosjekteiers vegne.

## Etterkontroll

R-1 er rettet i AD-8: Ny dag krever nå uttrykkelig `nextDayNumber <= plannedLastDay`, og nødvendig planutvidelse må lagres først eller atomisk sammen med opprettelsen. Dette lukker det rapporterte konsistenshullet. Minst én låst dag, snarere enn oppnådd planlagt siste dag, er fortsatt betingelsen for avslutning. Ingen øvrig endring av leveransene er utført av denne kontrollagenten.
