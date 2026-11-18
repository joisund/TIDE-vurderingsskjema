---
title: "Story 1.4 – Fullføre sjåførens daglige ettervurdering"
type: feature
story_key: 1-4-fullføre-sjåførens-daglige-ettervurdering
status: in-review
baseline_commit: 2830dc9aecc0a330affdf78fb807ab6e4033620b
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 1
story: "1.4"
dependsOnStories: ["1.1", "1.2", "1.3"]
approvedSource: ../planning-artifacts/story-1-4-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.4 – Fullføre sjåførens daglige ettervurdering

Sjåføren registrerer dagens svar etter kvittert førvurdering, tar stilling til frivillig egenevaluering der den tilbys, og låser egen del.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.4-01 – Åpne dagens ettervurdering fra en låst førvurdering**

**Gitt** et løp med kvittert, låst førvurdering og en opprettet dag,
**Når** sjåføren åpner dagens ettervurdering,
**Så** vises nøyaktig 22 svarposisjoner for riktig dag, fase og kriteriesnapshot, med samme matrise og godkjente punkthjelp som i Story 1.3,
**Og** dag 1 beholder førvurderingens Ikke relevant-posisjoner låst med opprinnelig begrunnelse/kilde-ID; øvrige posisjoner starter ubesvart og besvares etter kjøring,
**Og** på dag 2–5 er alle etterposisjoner egne registreringer med nytt daglig relevansvalg, uten ny førvurdering eller arv som binder disse dagene,
**Og** etterregistrering avvises både i UI og på kommandoene så lenge førbekreftelsen mangler. Hvert svarsett har de eksakte 22 forventede ID-ene uten fremmede/dupliserte kriterier (FR-5/6, AD-6/7).

**AC-1.4-02 – Velge daglige svar og begrunne eget Ikke relevant**

**Gitt** et redigerbart etterpunkt,
**Når** sjåføren velger eller endrer svar/begrunnelse før egen etterbekreftelse,
**Så** gjelder ett eksplisitt OK / Kan bli bedre / Ikke relevant per kriterium, ingen forhåndsvalgt OK eller Ikke vurdert,
**Og** nye Ikke relevant-valg krever popup-begrunnelse validert med den felles A10-regelen fra Story 1.3; avbryt/lukk bevarer forrige gyldige svar,
**Og** svar-ID-en bevares og answerRevision øker ved faktisk endring av svar/begrunnelse, slik at senere fadderbehandling kan knyttes til den konkrete versjonen. Endringen omskriver ikke førvurderingen eller andre dagers svar,
**Og** låst dag-1-arv kan ikke endres, og sjåføren får ikke et generelt kommentarfelt per kriterium (FR-5/6/7, AD-7).

**AC-1.4-03 – Tilby én frivillig egenevaluering på riktige dager**

**Gitt** at dagens 22 etterpunkter er besvart og gjeldende plan er lest,
**Når** sjåføren går videre i egen fullføring,
**Så** tilbys «Egenevaluering – frivillig» med tre styrker, tre utviklingsområder og faktisk dato på første og gjeldende planlagt siste dag,
**Og** ved ett-dagsløp vises ett felles feltsett, ikke separate første-/sistedagsevalueringer; mellomdager får ikke et påtvunget evalueringssteg eller oppfunnet Hopp over-valg,
**Og** sjåføren kan fylle inntil seks frivillige tekster, sende inn med tomme felt eller velge Hopp over. Tomme frivillige felt er ikke mangler, og Hopp over bekrefter ikke dagens vurdering,
**Og** fadder kan lese, men ikke skrive eller bekrefte sjåførens egenevaluering. Det innføres ingen obligatorisk tekst eller ny administrasjonsskjerm (FR-8, AD-6/8/9).

**AC-1.4-04 – Knytte evalueringstilbud til siste plan uten å flytte historikk**

**Gitt** at løpets gjeldende planrevisjon påvirker om dagen er planlagt siste dag,
**Når** tilbudet beregnes eller sjåførens etterbekreftelse forsøkes,
**Så** brukes siste lagrede planrevisjon og tilstandene not_offered på mellomdag, skipped ved uttrykkelig Hopp over og submitted ved innsending med inntil seks frivillige tekster, også tomme,
**Og** evalueringen knyttes til faktisk dag og tilbudets planversjon; et endret tilbud før bekreftelse oppdaterer flyten uten å slette faktisk skrevet tekst, som bevares på sin dag,
**Og** en senere utvidelse bevarer tidligere bekreftet evaluering låst på opprinnelig dag og gir nytt frivillig tilbud på ny planlagt siste dag; historikken erstattes ikke,
**Og** en gammel bekreftelsesdialog med utdatert revisjon kan ikke låse et gammelt tilbud. Faktisk snapshot/plan lastes, tekst beholdes separat ved behov og fullføringskontrollen kjøres på nytt (FR-8, AD-5/8).

**AC-1.4-05 – Bevare vurdering og frivillig tekst som utkast**

**Gitt** ubekreftede ettersvar, begrunnelser eller skrevet egenevaluering,
**Når** innhold endres, rolle/side skiftes eller løpet gjenåpnes,
**Så** brukes samme lokale autosave-/flush-/feilkontrakt fra Story 1.2/1.3 med mål om complete innen to sekunder, periodisk flush og sann revisjonsbestemt lagringsstatus etter AD-4,
**Og** kvitterte svar og tekster gjenåpnes på riktig dag; frivillig skrevet tekst omfattes av lagring og kan ikke ignoreres fordi feltet kan være tomt,
**Og** ulagret tekst beholdes i den åpne visningen ved feil, relevant rolle-/ruteskifte avbrytes, og lagret/bekreftet påstås ikke for ulagret innhold,
**Og** schemaendringer bevarer tidligere øktopplysninger, førbekreftelse og dag-1-arv atomisk uten ny faglig validering av låst innhold (FR-9–11, AD-3/4/13).

**AC-1.4-06 – Kontrollere bare sjåførens nødvendige del før låsing**

**Gitt** at sjåføren forsøker å bekrefte dagens ettervurdering,
**Når** fullføringskontrollen utføres,
**Så** kreves låst førvurdering, 22 gyldige ettersvar med nøyaktig kriteriedekning, nødvendige A10-begrunnelser, sjåføridentitet/dato/tilhørighet, gjeldende faddernavn og rent berørt innhold,
**Og** manglende buss/linjer/tider, fadders uferdige vurdering eller manglende fadderbehandling blokkerer ikke sjåførens etterbekreftelse; tomme frivillige evalueringsfelt er heller ikke mangler,
**Og** mangler vises med vei/fokus til riktig punkt. Kan bli bedre og gyldig Ikke relevant er fullverdige svar uten automatisk faglig godkjenning,
**Og** dialogen viser rolle, faktisk navn, dato og hvilke etter-svar, eventuell egenevaluering og felt som låses. Avbryt/lukk eller Hopp over alene gjør ingen bekreftelse, og fadderrollen kan ikke bekrefte sjåførens del (FR-11–13, AD-6/9).

**AC-1.4-07 – Lagre etterbekreftelse og tilhørende låser samlet**

**Gitt** gyldig, kvittert berørt innhold, aktuell løps-/planrevisjon og sjåførens uttrykkelige bekreftelse,
**Når** ConfirmDriverDay utføres,
**Så** lagres dagens 22 ettersvar/begrunnelser, evalueringstilstand og eventuell tekst med faktisk dag/planversjon samt historisk sjåførbekreftelse med rolle/navn/tid i én readwrite-transaksjon,
**Og** på dag 2–5 låses dagens identitet/dato/tilhørighet samtidig; dag-1-låsen og førvurderingen fra Story 1.3 bevares uendret,
**Og** etterdelen og evalueringen vises skrivebeskyttet først ved complete. Buss/linjer/tider og gjeldende faddertilknytning følger fortsatt sine separate grenser frem til dagslåsing,
**Og** sjåførens bekreftelse omfatter egen del. Den oppretter ingen fadderbekreftelse, dagslås, periodeavslutning, faglig godkjenning av fadders meninger eller PDF (FR-3/8/11/14, AD-3/6/8).

**AC-1.4-08 – Bevare etterlås ved feil, nettbrudd og gammelt vindu**

**Gitt** avbrudd før/etter transaksjonscomplete, mistet kvittering, foreldet visning eller 60 sekunders nettbrudd i lastet app med fungerende lokalt lager,
**Når** lagring/bekreftelse forsøkes igjen og faktisk tilstand gjenåpnes,
**Så** finnes enten komplett tidligere utkast eller full etterbekreftelse med korrekte låser/evaluering, uten halvlagret bekreftelse eller tap av kvitterte data,
**Og** samme commandId/payload returnerer tidligere resultat uten duplisert bekreftelse; endret payload med samme ID og foreldet revisjon avvises etter AD-5,
**Og** låste ettersvar, begrunnelser, evaluering og identitetsfelt avviser mutasjoner også fra gammel dialog, profilendring, rollebytte og direkte applikasjonskommando; tidligere før-/daglåser oppheves ikke,
**Og** gjenåpning med nett i samme origin/profil/enhet med bevart lager viser riktig dag og kvittert tilstand etter AD-4s femsekundersmål. Full femdagers-/femløpsprøve følger når resten av løpsfunksjonene er implementert (AD-3–6/13).

**AC-1.4-09 – Fullføre egen del tilgjengelig med riktig innsyn**

**Gitt** dagens ettervurdering, egenevaluering, mangelliste, historikk og bekreftelsesdialog,
**Når** sjåføren bruker flatene på de vedtatte bredder/enheter med tekstforstørrelse, tastatur eller skjermleser etter AD-12,
**Så** videreføres Story 1.3s tilgjengelige matrise, punkthjelp, 44×48/44×44-trefflater, sticky overskrifter og dialogmønster uten horisontal registreringsrulling, skjult fokus eller avkuttede handlinger,
**Og** evalueringens seks felt har tydelige navn og frivillighet; Hopp over og videre til egen bekreftelse kan nås med tastatur og mobilskjermtastatur,
**Og** sjåførvisningen viser egne svar/evalueringer og gjeldende planlagt siste dag underveis. Faddertekst, relevansavgjørelser, konklusjon og begrunnet planhistorikk følger AD-9s skjuling; rollebytte rydder forrige model/dialog/DOM,
**Og** historikken viser en eventuell etterbekreftelse med korrekt dag/navn/del; faktisk prøvd utstyr/versjoner og eventuelle gap registreres (FR-4, NFR-1/2, AD-9/12).

</frozen-after-approval>

## Code Map

- `app/src/domain/baseline.ts` har svarverdier, stabile svar-ID-er og dag-1-arv. `app/src/domain/reason.ts` eier A10. Bruk samme verdi- og begrunnelsesregler for etterfasen med riktig dags-ID i settvalideringen. Behold lagret `firstDay.driverAfterAnswers` ved å gjøre feltet tilgjengelig på `Day` uten flytting av schema 1-data.
- `app/src/domain/day-draft.ts` har `checkDayFields` og låsereglene. Bruk sjåførens feltkontroll. Frys dagidentitet og faktisk bekreftende navn ved behov.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` har kommandohåndtering, lesemodell, idempotens og `#mutateRun`. Legg til etterutkast og etterbekreftelse gjennom samme portmønster. Behold samme kommando-ID ved ukjent utfall.
- `app/src/ui/BaselineForm.tsx`, `app/src/ui/use-baseline-draft.ts` og `app/src/ui/use-autosave-deadline.ts` har matrise, dialog, feltfokus og lagringsstatus. Trekk ut felles visning og lagringslogikk der det reduserer duplisering. La de seks evalueringsfeltene bruke samme etterutkastkø. Bruk `App` sin flush av aktiv editor og bevar førvurderingens oppførsel.
- `app/tests/browser/baseline.spec.ts` og domenetestene gir gjenbrukbare mønstre for aktiv rolle, 22 svar, utsatt kvittering, stale faner, gjenåpning og 60 sekunder frakoblet.

## Tasks & Acceptance

- [x] Gjenbruk førvurderingens matrise, A10, dialoger og utkastlagring for sjåførens ettersvar. Bevar og forklar de låste arvesvarene dag 1. Bruk nye svarposisjoner på senere dager.
- [x] Legg til frivillig egenevaluering med tre styrker, tre utviklingsområder og faktisk dato. Bruk ett tilbud på éndagsløp. Knytt tilbud/tekst til dagen og planrevisjonen og bevar historikk ved endret plan.
- [x] Bruk eksisterende rollekontroll og transaksjonsport for `ConfirmDriverDay`. Skill påkrevde svar, sjåførens øktfelt og frivillig evaluering fra fadders senere låsekrav. Lås bare sjåførens del etter complete.
- [x] Prøv domene og adapter mot aktuelle og foreldede planrevisjoner, skjult fadderinnsyn, frivillige tekster, abort, replay, refresh og reelle forsøk fra gammel fane. Senere dager og planendringer er prøvd med kontrollerte fiksturer.
- [x] Prøv registrering, dialog og tastatur i lagret dagsflyt, under nettbrudd og relevante skjerm-/tekststørrelser.
- [ ] Prøv fysisk enhet, mobilt skjermtastatur og skjermleser etter AD-12.

## Design Notes

Fadder kan lese sjåførens ettersvar og egenevaluering. Sjåførens bekreftelse validerer bare egen del og aktuelle øktfelt. Dag 1 beholder før-låsen, og dag 2–5 låser dagens identitet ved etterbekreftelsen. Overgangen gjennom egenevaluering skal bevare faktisk skrevet tekst på samme dag, også hvis tilbudet endres før bekreftelsen.

Planversjonen må kunne kontrolleres på nytt i `ConfirmDriverDay`. Bruk startplanen som det eldste gyldige plangrunnlaget, og prøv endret plan og senere dager med kontrollerte domenefiksturer fram til Story 1.6 og 1.8 leverer handlingene. Før-Ikke relevant bevarer opprinnelig begrunnelse, kilde-ID og lås på dag 1. Fra dag 2 bruker sjåføren dagens egne svarposisjoner og nye relevansvalg.

Bruk [godkjent egenevalueringsskisse](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-egenevaluering.html). Ingen uavklarte produktvalg, eksterne handlinger eller destruktive migreringer står i veien for oppgaven.

## Verification

- Kjør `npm run build`, `npm run lint`, `npm test` og `npm run test:browser` med de låste versjonene.
- Dokumenter faktisk rollevern, lagring, etterlåsing, feilgjenoppretting, skjermstørrelser og relevante manuelle utstyrsprøver.

## Implementation Notes

Godkjente kriterier er lagt inn uten endring. Implementering startet 18. november med kodegjennomgått Story 1.3 som teknisk grunnlag.

Før reviewretting passerte bygg/typekontroll, lint, 30 Node-prøver og fem målrettede Chromium-prøver. En uavhengig prøve ved 400 % faktisk Chromium-zoom, med 316 CSSpx tilgjengelig bredde, fylte og låste førvurdering, beholdt ett arvet Ikke relevant, fylte 21 egne ettersvar, sendte inn frivillig tekst og gjenåpnet låst ettervurdering. Matrisen og egenevalueringen hadde ingen horisontal rulling. Alle data var fiktive. Full nettlesermatrise og manuell enhets-/skjermleserprøving følger.

Første fulle kjøring med build `story-1.4-20261118` ga 135 av 138. Fokusskifter til mangelliste og egenevaluering må vente på montering. Én kontroll rapporterte 47,999969 CSSpx for et vedtatt 48 px mål. Nettbruddsprøven for ettersvar, tekst og etterlås passerte i alle tre motorer etter 60069/60128/60258 ms uten nettverksforespørsler.

Tre uavhengige gjennomganger ble fulgt av retting og regresjon. Bygg/typekontroll og 31 Node-prøver passerte. Alle 141 nettleserprøver i `story-1.4-20261118-r2` passerte etter reviewretting. Etterdelen ble lagret og låst etter 60072/60135/60311 ms i Chromium/Firefox/WebKit uten nettverksforespørsler. Siste UI-retting holder den reaktive statusen for usikker bekreftelse synkron med kommandoreferansen. Det frosne sluttbygget `story-1.4-20261118-r3` bestod bygg/typekontroll, lint, 54 målrettede før-/etterprøver og faktisk Chromium-zoom ved 400 %. En separat Chromium-prøve åpnet databasen fra 1.3 i 1.4 på identisk origin og beholdt rolle, buss, låst førvurdering, arvesvar og 21 redigerbare etterposisjoner. Full r3-regresjon kjører. Fysisk prøving gjenstår. Senere dager og planrevisjoner er kontrollert med fiksturer fram til de ordinære handlingene blir tilgjengelige.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Eldre tilbudsrevisjon uten bevis for tilbud (blind gjennomgang) | Medium. Bruk verifiserbar historisk plan eller lagret tilbud. |
| Fiktiv tilbudsproveniens fra vilkårlig eldre revisjon (kanttilfeller) | Medium. Samme domenesjekk ved bevaring av eldre tekst. |
| Endring kunne gå tapt under kontrollesing (blind gjennomgang) | Medium. Sperr nye feltendringer under kontrollen og bind dialogen til ren, fersk visning. |
| Interaktiv matrise under kontrollesing (kanttilfeller) | Medium. Samme sperre og revisjonskontroll. |
| Fersk lesing fant en lås uten nytt fokusmål | Medium for tastatur. Bruk den lagrede statusen som fokusmål. |
| Kontroll kunne bruke motsatt valg fra en annen fane | Medium. Verifiser den uttrykkelig valgte evalueringsbeslutningen mot kvittert tilstand. |
| Foreldet kontroll kunne fortsatt påstå 22 svar | Medium. Gjenta mangelkontroll og behold tekst når brukeren må tilbake til et punkt. |
| Uttrekk fra foreldet tekstutkast stoppet ved et nytt ubesvart punkt | Medium. Bevar tekst fra et verifisert tilbud. Krev komplett sett ved beslutning/bekreftelse. |
| Konfliktvisning manglet eget og lagret evalueringsvalg | Medium. Vis begge beslutninger før uttrykkelig nytt forsøk. |
| Fjernet knapp mistet fokus ved konflikt | Medium for tastatur. Flytt fokus til overlevende konflikthode. |
| Avbrutt dialog skjulte usikkert bekreftelsesutfall | Medium. Behold forklaring, vern og gjenoppretting utenfor dialogen. |
| Tomt, lagret evalueringsvalg forsvant hos fadder | Lav. Vis lagret utkastvalg uten å fremstille det som sjåførbekreftelse. |
| Låst tilstand strider mot tilbudet (blind gjennomgang) | Medium for historikk. Valider mot den planversjonen som faktisk er kjent. |
| Umulig låst evalueringsvalg (kanttilfeller) | Medium. Samme kontroll, spesielt dag 1 og aktuell mellomdag. |
| Falsy ettersvarsliste passerte lagringskontroll | Medium. Valider eksplisitt tilstedeværende verdier før lesemodellen. |
| Eldre mislykket payload kan gå foran nyere tekst | Medium. Avklar lagret tilstand når brukeren har endret forsøket. Gjenbruk samme kommando for identisk retry. |
| Plan fjernet tilbud før teksten var kvittert | Dekningsgap. Prøv eksplisitt konfliktlagring og gjenåpning med samme dag og tilbudsrevisjon. |
| Korrupt svarsett på senere dag var ikke prøvd gjennom adapteren | Dekningsgap. Bruk lagret fikstur og forvent kontrollert lesefeil. |
| Fullført etterlås med isolert kontrollesefeil | Dekningsgap. Prøv kjent kvittering uten vellykket etterfølgende lesing. |
| Mangellenke fra senere dags ettervurdering | Dekningsgap. Kontroller riktig dag og feltfokus i nettleser. |
| Mangelliste-/evalueringsfokus i full kjøring | Bekreftet. Flytt fokus etter at overskriften er montert. |
| Målt høyde rett under 48 px i Firefox | Avrundingsavvik. Kontroller kontrollmålet med ubetydelig flyttallstoleranse. |
