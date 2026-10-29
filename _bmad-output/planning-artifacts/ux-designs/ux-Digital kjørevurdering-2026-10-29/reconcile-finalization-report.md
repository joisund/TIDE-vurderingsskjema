# Kildeavstemming: tidligere PRD-sluttkontroll

Oppdatert 2026-10-29. Kilde: [finalization-report.md](../../prds/prd-Digital%20kjørevurdering-2026-10-29/finalization-report.md). Den historiske rapporten er urørt og dokumenterer en eldre PRD-baseline. Senere uttrykkelige UX-beslutninger er nå innarbeidet i PRD/addendum med statusmerknad; dette er ikke en ny full sluttkontroll.

| Tidligere åpen detalj | Gjeldende status |
| --- | --- |
| A1: feltkrav og låsing | Avklart: navn/ansattnummer/faddernavn/dato/buss/linjer/inn-/ut-tid er obligatoriske; minst én buss. Identitetslås dag 1 ved førbekreftelse, dag 2–5 ved etterbekreftelse. Begge roller redigerer tider i HH:mm og fadder fullfører mangler; buss/linjer er fadders ansvar. Fadder kan byttes til egen dagsbekreftelse; historiske navn bevares. Trinnvis fullføring i FR-3 er merket implementeringstolkning. |
| A3: evalueringens plassering/låsing | Avklart: sjåførens frivillige tekst etter avkrysning første/planlagt siste dag, låst med etterbekreftelse. Ett sett ved ett-dagsløp; historikk beholdes og ny evaluering tilbys ved sen utvidelse. Konklusjon låses ved periodens avslutning. |
| A4: automatisk lagring | Åpent: mekanisme, betingelser og tidligere foreslått tosekundersmål. |
| A7: testflater | Åpent: endelig testmatrise/tilgjengelighetsmål. Godkjent mock er ikke test av ferdig app. |
| A8: nettbrudd | Åpent: scenario, gjenopptakelsesbetingelser og tidligere foreslått tidsmål. |
| A10: begrunnelseslengde | Avklart: minst to ord og ti normaliserte tegn. Den eldre rapportens tre ord/15 tegn er ikke gjeldende. |

I tillegg er én førvurdering for perioden, dag-1 låst relevans og nye valg dag 2–5, fadders arbeid gjennom dagen/eget relevansvalg, oppfølgingsplan, vedvarende overskrifter, tydelig hjelp ved 22 punkter og valgt Tide-uttrykk innarbeidet. Hjelpen er nå presisert som 1–3 linjer sammenhengende tekst uten fast overskriftsmal, lik for begge roller. Øvrige hjelpetekster er godkjent; siste presiseringer revideres separat. [Samlet avstemming](reconcile-prd.md) viser dekningen uten å duplisere historisk gjennomgang.

Rapportens opprinnelige «ingen faseblokkere» gjaldt overgangen til UX da den ble skrevet. Den godkjenner ikke senere endringer, hjelpetekster eller implementering. Historiske review-filer er ikke omskrevet som om nye kontroller var kjørt. Gjeldende åpne punkter følger ansvarlige eiere i revidert PRD og UX-kontraktene.

## Siste brukeravklaring: oppfølging, konklusjon og PDF

- Fadders behovspunkt er ja/nei. Bare ved ja vises antall ekstra dager eller utvidet kjøretrening før fadderkjøring fortsetter. Samlet maksimum er fortsatt fem dager. Fadder kan åpne kommentar på alle 22 punkter uavhengig av svar.
- Felles overskrift «Konklusjon» samler fritekst først og obligatorisk «Godkjent» / «Oppfølgingsbehov» rett under. «Utfall» brukes ikke i grensesnittet; bekreftelse og permanent avslutning består.
- PDF side 1 er liggende med oppsummeringsfelt øverst og kronologisk vurderingsmatrise for progresjon. OK grønt, Kan bli bedre gult, Ikke relevant rødt, med tekst/symbol i tillegg. Rød Ikke relevant er ikke automatisk underkjenning.
- Stående side 2 rommer kommentarer, relevansbegrunnelser, egenevaluering og uttrykkelig godkjenning. Signaturformede felt har vanlige tekstnavn fra faktiske bekreftelser: sjåfør venstre, fadder høyre, ekstra fadder i midten når aktuelt. Dette innfører ikke elektronisk signatur eller sjåførgodkjenning av fadders meninger. Videre sider tillates ved tekstmengde.
- Vurderingsskjema og egenevaluering er godkjent. Tidligere femsiders PDF-forslag er avvist; nye fadder-/konklusjons-/PDF-komposisjoner er ikke visuelt sluttgodkjent av denne avstemmingen.

UX-T1 er et smalt åpent punkt: hvem registrerer gjennomført utvidet kjøretrening og at fadderkjøring kan fortsette, og hvilke opplysninger registreres? Behovsvalget kan beskrives, men gjenopptaksgrenen er ikke implementeringsklar. Ingen ny rolle, treningsmodul, integrasjon eller gjenåpning av avsluttet løp er besluttet. PRD/addendum beholder utkaststatus; historiske sluttkontroller er ikke kjørt på nytt.
