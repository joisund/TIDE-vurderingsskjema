# Kildeavstemming: revidert PRD og UX

Oppdatert 2026-10-29 etter gjeldende [.memlog.md](.memlog.md) og [EXPERIENCE.md](EXPERIENCE.md). [PRD](../../prds/prd-Digital%20kjørevurdering-2026-10-29/prd.md) og [addendum](../../prds/prd-Digital%20kjørevurdering-2026-10-29/addendum.md) er nå avstemt med de uttrykkelige UX-beslutningene. PRD er merket som revidert utkast; tidligere sluttkontroll gjelder eldre baseline, ikke en ny gjennomgang.

| Beslutning | Innarbeidet kravgrunnlag |
| --- | --- |
| Én førvurdering før første dag | FR-5/12/17 og NFR-5: 22 før-svar én gang, 44 nye svar per dag; historisk førreferanse er ikke ny registrering. |
| Dag-1 Ikke relevant fra før låses; ny relevans fra dag 2 | FR-6: opprinnelig begrunnelse videreføres dag 1 og fadder behandler én gang. Nye daglige valg krever begrunnelse; historikk endres aldri. |
| Fadder arbeider gjennom dagen og kan selv velge Ikke relevant | FR-6/7: egne popup-begrunnelser, separat behandling av sjåførvalg, påkrevd kommentar ved avslag. Utdatert behandling gjentas ved endret sjåførutkast. |
| Fadder planlegger utvidelse i V1 | FR-16: daglig behovspunkt og ny planlagt siste dag underveis, innen fem dager. Tilbud om evaluering avslutter ikke løpet. |
| Sjåførens egenevaluering og fadders konklusjon | FR-8: egenvurdering låses med sjåførens etterbekreftelse; ett sett ved ett-dagsløp; sen utvidelse bevarer gammel og tilbyr ny. Konklusjon låses ved avslutning. A3/UX-P1 lukket. |
| A1 og feltansvar | FR-3: navn/ansattnummer/faddernavn/dato/buss/linjer/inn-/ut-tid obligatoriske; minst én buss. Identitetslås dag 1 med førbekreftelse, dag 2–5 med etterbekreftelse. Begge roller kan redigere tider i HH:mm; fadder fullfører dem. Fadder redigerer buss/linjer og kan byttes frem til egen endelige dagsbekreftelse. Historiske bekreftende navn bevares. A1/UX-F1 lukket. |
| To ord og ti tegn | FR-6/A10: normaliser blanktegn, tell enkle mellomrom, utelat rene tegnsettingstoken fra ordtelling. «Ingen rygging» og «Ingen billettering» passerer. A10 lukket. |
| Vertikal matrise og vedvarende overskrifter | NFR-1/2 og addendum: OK / Kan bli bedre / Ikke relevant, ett svar per punkt, overskrifter følger rulling uten å skjule fokus. |
| Synlig hjelp ved alle 22 punkter | NFR-2/FR-19: tydelig spørsmålstegn, én kort sammenhengende beskrivelse på omtrent 1–3 linjer uten fast tredelt overskriftsmal, lik for begge roller. Hjelp og symboler utelates fra utskrift. Hele gjeldende UX-oppsettet er godkjent; hjelpetekster følger gjeldende hjelpekilde. |
| Tide-profil og valgt uttrykk | NFR-6 og addendum: original logo, godkjent gjeldende mockuttrykk som V1-standard. Systemfont er produktvalg, ikke påstått offisiell profilfont. |
| Manuell PDF-overlevering | FR-17/19: komplett periode, evalueringer/planhistorikk, konklusjon og separate bekreftelser; opplæringsansvarlig laster opp i HR uten appintegrasjon. |
| Senere scope | Privat fagrapport, egen enhet dagen før, flere enheter, dypere fadderhjelp og opplæringsansvarligs forhåndsutfylling/planleggingsrolle er utenfor V1. |

## Bevart

22 kriterier i samme ordlyd/rekkefølge; normalt tre og maksimalt fem dager; én økt per dato; ingen forhåndsvalgt OK; ubesvart aldri gyldig; ingen Ikke vurdert; separate bekreftelser; permanent låsing; ingen retur/overskriving ved uenighet; sann lagringsstatus; normal PDF bare etter endelig avslutning; begge utfall gir fullt innsyn; fiktive data. Enkel avkrysning, læring, arbeid underveis og gjenkjennelig skjemastruktur er bevart.

## Fortsatt åpent og kontrollstatus

A4/A8: lagringsmekanisme, nettbrudd og tidsmål. A7: testmatrise og tilgjengelighetsmål. Hele gjeldende UX-oppsettet er godkjent; hjelpetekster følger gjeldende hjelpekilde. Disse er ikke stiltiende avgjort ved avstemmingen.

Trinnvis fullføring i FR-3 er merket implementeringstolkning: identitet/faddernavn/dato ved opprettelse og sjåførbekreftelse; buss/linjer/tider før fadders endelige dagslås. Manglende tider skal ikke hindre sjåførbekreftelse når fadder fullfører senere. Hele gjeldende UX-oppsettet er nå godkjent, inklusive fadderdel, Konklusjon og revidert PDF. Det tidligere femsiders PDF-forslaget er fortsatt avvist og overstyrt.

Dette dokumentet erstatter tidligere, motstridende statusavsnitt med gjeldende tilstand. Det oppgir ikke nye valideringstall og hevder ikke at tidligere gjennomganger er kjørt på nytt. Historiske rapporter/reviews er urørt.

## Siste brukeravklaring: oppfølging, konklusjon og PDF

- Fadders behovspunkt er ja/nei. Bare ved ja vises antall ekstra dager eller utvidet kjøretrening før fadderkjøring fortsetter. Samlet maksimum er fortsatt fem dager. Fadder kan åpne kommentar på alle 22 punkter uavhengig av svar.
- Felles overskrift «Konklusjon» samler fritekst først og obligatorisk «Godkjent» / «Oppfølgingsbehov» rett under. «Utfall» brukes ikke i grensesnittet; bekreftelse og permanent avslutning består.
- PDF side 1 er liggende med oppsummeringsfelt øverst og kronologisk vurderingsmatrise for progresjon. OK grønt, Kan bli bedre gult, Ikke relevant rødt, med tekst/symbol i tillegg. Rød Ikke relevant er ikke automatisk underkjenning.
- Stående side 2 rommer kommentarer, relevansbegrunnelser, egenevaluering og uttrykkelig godkjenning. Signaturformede felt har vanlige tekstnavn fra faktiske bekreftelser: sjåfør venstre, fadder høyre, ekstra fadder i midten når aktuelt. Dette innfører ikke elektronisk signatur eller sjåførgodkjenning av fadders meninger. Videre sider tillates ved tekstmengde.
- Hele gjeldende UX-oppsettet er godkjent av prosjekteier. Godkjenningen gjelder revidert PDF, ikke det tidligere avviste femsidersforslaget.

UX-T1 er lukket: V1 registrerer utvidet kjøretrening kun som oppfølgingsbehov. Gjennomføring og klarsignal for videre fadderkjøring håndteres utenfor løsningen, primært i samtale med opplæringsansvarlig. Ingen gjennomføringsregistrering, gjenopptaksfunksjon, ny approlle, treningsmodul, integrasjon eller gjenåpning av avsluttet løp innføres. Femdagersgrensen består. UX-godkjenningen finaliserer ikke PRD-workflowen: PRD/addendum beholder utkaststatus, og historiske sluttkontroller er ikke kjørt på nytt.
