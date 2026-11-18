---
title: "Story 1.3 – Fylle ut og låse sjåførens førvurdering"
type: feature
story_key: 1-3-fylle-ut-og-låse-sjåførens-førvurdering
status: in-review
baseline_commit: 77f708c27e1e892c4ecf0f533c23b2c673592ac5
route: dispatch
review_loop_iteration: 0
created: 2026-11-17
epic: 1
story: "1.3"
dependsOnStories: ["1.1", "1.2"]
approvedSource: ../planning-artifacts/story-1-3-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.3 – Fylle ut og låse sjåførens førvurdering

Sjåføren fyller ut og bekrefter den ene førvurderingen for løpet. Matrisen, begrunnelsene og engangslåsen skal gjenåpnes fra lokal kvittert tilstand. Det finnes ingen uavklart produktbeslutning, ekstern handling eller destruktiv migrering i denne storyen.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.3-01 – Vise én førvurdering med riktig kriteriesett**

**Gitt** et opprettet løp med første dag og innholdsgrunnlag fra Story 1.1,
**Når** sjåføren åpner førvurderingen,
**Så** vises nøyaktig de 22 kriteriene fra løpets snapshot i godkjent rekkefølge, gruppert vertikalt med OK / Kan bli bedre / Ikke relevant i denne kolonnerekkefølgen,
**Og** hvert kriterium har én stabil før-svarposisjon for løpet, uavhengig av dagnummer; nye svar er ubesvart og ingen OK er forhåndsvalgt,
**Og** oppfrisking, ny åpning eller senere dag oppretter ikke en ny førvurdering. Fadder kan lese denne vurderingen, mens bare sjåførrollen kan endre eller bekrefte den (FR-4/5, AD-7/9).

**AC-1.3-02 – Velge ett svar og begrunne Ikke relevant i popup**

**Gitt** en ulåst førvurdering,
**Når** sjåføren velger et svar på et kriterium,
**Så** får kriteriet høyst ett av de tre godkjente svarene; ubesvart er en manglende verdi, og Ikke vurdert tilbys ikke,
**Og** valg av Ikke relevant åpner en dialog med riktig kriterium/rolle og krav om begrunnelse; valget blir gyldig først når begrunnelsen er godkjent etter AC-1.3-04,
**Og** avbryt/lukk bevarer forrige svar og begrunnelse uten bekreftelse eller lås. Inntastet dialogutkast kan bevares separat, men må ikke fremstå som et gyldig Ikke relevant-svar før dialogen er fullført,
**Og** sjåfør får ingen generell fritekstkommentar per kriterium (FR-5/6/7).

**AC-1.3-03 – Åpne godkjent punkthjelp uten å endre vurderingen**

**Gitt** et hvilket som helst av de 22 kriteriene,
**Når** brukeren aktiverer punktets tydelige spørsmålstegn med berøring, klikk eller tastatur,
**Så** vises riktig, godkjent hjelpetekst fra løpets hjelpeversjon som én kort sammenhengende beskrivelse uten fast tredelt overskriftsmal,
**Og** samme tekst brukes for sjåfør og fadder; hjelpen kan lukkes uten å velge eller endre et svar, og fokus returnerer til en forståelig plass,
**Og** variant A og minst 44×44 px trefflate følger DESIGN; tilgjengelig navn inkluderer kriteriet, og hjelp/symboler utelates fra utskrift (UX-DR6, AD-7/12).

**AC-1.3-04 – Validere begrunnelsen etter felles A10-regel**

**Gitt** en begrunnelse for eget Ikke relevant-valg,
**Når** begrunnelsen valideres,
**Så** normaliseres teksten til NFC, start/slutt trimmes og sammenhengende blanktegn erstattes av ett mellomrom; teksten må ha minst to blanktegnseparerte token som inneholder bokstav eller tall, og minst ti Unicode-kodepunkter inklusive de enkle mellomrommene,
**Og** «Ingen rygging» og «Ingen billettering» godtas; ett langt ord, to ord med under ti normaliserte tegn og token som bare er tegnsetting oppfyller ikke begge tersklene,
**Og** blanktegn, linjeskift, tegnsetting og kombinerte Unicode-tegn prøves med samme domeneregel som øvrige begrunnelsesflater senere skal bruke,
**Og** feilmeldingen forklarer det faktiske minstekravet ved feltet uten å hevde at lengdekontrollen vurderer faglig kvalitet (FR-6, AD-7).

**AC-1.3-05 – Bevare svarutkast og vise riktig lagringsstatus**

**Gitt** en ulåst førvurdering og lokal lagring fra Story 1.1/1.2,
**Når** svar eller begrunnelsesutkast endres,
**Så** brukes samme autosave-/feilkontrakt som øvrige felt: nytt input blir straks ulagret, complete innen to sekunder er målet etter AD-4, og kontinuerlig skriving forsøker flush minst hver to sekunder,
**Og** gjenåpning viser siste faktisk kvitterte svar/begrunnelser; eventuell ufullstendig dialogtekst bevares som utkast uten å gi gyldig svar eller bekreftelse,
**Og** rolle-/ruteskifte flushes først og avbrytes ved feil som ville miste innhold; ingen lagringsstatus hevder at nyere tekst eller faglig bekreftelse er lagret før det er kvittert,
**Og** eventuelle schemaendringer for svarmodellen skjer atomisk og bevarer eksisterende løps-/øktopplysninger fra Story 1.1/1.2; åpnefeil erstattes ikke med tomt lager (FR-9/10, AD-3/4/13).

**AC-1.3-06 – Kontrollere innhold og vise separat låsevarsel**

**Gitt** at sjåføren ønsker å bekrefte førvurderingen,
**Når** fullføringskontrollen kjøres,
**Så** kreves nøyaktig ett gyldig svar for hver av de 22 forventede kriterie-ID-ene, gyldige Ikke relevant-begrunnelser, sjåførnavn/ansattnummer, første dato/tilhørighet og gjeldende faddernavn; dupliserte/fremmede ID-er avvises selv ved riktig antall,
**Og** mangler vises med vei og fokus til riktig felt/punkt; buss, linjer, tider og frivillig tekst kreves ikke ved denne førbekreftelsen,
**Og** ulagret berørt innhold blokkerer bekreftelse. Når kontrollen er oppfylt, viser dialogen rolle, faktisk sjåførnavn, dato, at førvurdering og dag-1-identitet/dato/tilhørighet låses, og «Disse svarene låses og kan ikke endres senere»,
**Og** utfylte svar, lagring eller rollebytte er ikke en bekreftelse; avbryt/lukk endrer ingen lås, og fadderrollen kan ikke bekrefte på sjåførens vegne (FR-11–13, AD-6/7/9).

**AC-1.3-07 – Lagre førbekreftelse, feltlåser og dag-1-arv atomisk**

**Gitt** rent, gyldig berørt innhold og sjåførens uttrykkelige bekreftelse av dialogen,
**Når** ConfirmBaseline utføres mot siste lagrede aggregat/revisjon,
**Så** lagres før-svar, gyldige begrunnelser, førbekreftelse med faktisk sjåførnavn/rolle/tid og lås av dag-1-identitet/dato/tilhørighet samlet i én readwrite-transaksjon,
**Og** dag 1 får 22 sjåfør-etterposisjoner med riktige kriterie-ID-er: før-Ikke relevant videreføres låst med kilde-ID, svar og opprinnelig begrunnelse; øvrige etterposisjoner er ubesvart,
**Og** det opprettes ingen automatisk etterbekreftelse eller fadderavgjørelse. Fadders senere behandling skal knyttes til det videreførte ettersvaret én gang; arven binder bare dag 1,
**Og** førvurderingen og tilhørende felt vises låst først etter transaksjonens complete. Domene/read model tillater etterregistrering først etter denne kvitterte førbekreftelsen; selve etterregistreringsflaten leveres senere (FR-5/6/11/14, AD-3/6/7).

**AC-1.3-08 – Bevare permanent lås ved avbrudd, gammelt skjermbilde og nytt forsøk**

**Gitt** førbekreftelse som avbrytes før eller etter complete, et nytt forsøk eller en gammel visning/fane,
**Når** faktisk lagret tilstand lastes og en ny mutasjon eller bekreftelse forsøkes,
**Så** finnes enten hele det tidligere utkastet eller en komplett førbekreftelse med tilhørende feltlåser/arv, aldri en delvis lås eller ettertilgang fra en halvlagret bekreftelse,
**Og** samme commandId/payload returnerer tidligere resultat uten ny bekreftelse eller nye arvposisjoner; endret payload med samme ID og foreldet revisjon håndteres etter AD-5,
**Og** en låst førvurdering kan ikke endres gjennom rollebytte, oppfrisking, gjenåpning, profilendring eller gammel redigeringskommando. Ingen angre-/gjenåpningshandling tilbys,
**Og** gjeldende faddertilknytning og buss/linjer/tider beholder sin separate redigerbarhet frem til dagslåsing etter Story 1.2; førbekreftelsen gjør ikke disse feltene permanent låst,
**Og** 60 sekunders nettbrudd i den lastede appen med fungerende lokalt lager kan håndteres med fortsatt svarlagring og førbekreftelse uten tap av kvitterte data. Dette prøver førlåsen, ikke ennå de senere etter-/dagslåsene (AD-3–6).

**AC-1.3-09 – Bruke matrise, hjelp, mangelliste og dialoger tilgjengelig på mobil**

**Gitt** førvurderingen, punkthjelpen, begrunnelsesdialogen og låsevarselet,
**Når** flatene prøves etter AD-12 ved 320/360/390/768/1280 CSSpx, mobil portrett/landskap, 200 % tekst, 400 % zoom/reflow, tastatur og relevante skjermlesere,
**Så** fungerer registreringen uten horisontal rulling eller avkuttet tekst, og sticky overskrifter med ugjennomsiktig bakgrunn følger rullingen uten å dekke fokus eller dialoger,
**Og** hvert svar har kriterium/rolle/fase i sitt tilgjengelige navn, minst 44×48 px trefflate og tekstlig valgt/ubesvart tilstand; overskrifter og rader vokser med teksten etter DESIGN,
**Og** dialoger har forståelig navn, fokusbegrensning, tastaturtilgang til tilbake/bekreft, avbrytelse med Escape og fokus tilbake. Mobilens skjermtastatur skjuler ikke nødvendige handlinger,
**Og** feil knyttes programmatisk til felt, mangellisten fører til riktig punkt uten skjult fokus, og lagringsstatus annonseres uten fokusflytt eller stadige avbrudd. Faktiske enheter/versjoner og eventuelle gap registreres (NFR-1/2, UX-DR20/21).

</frozen-after-approval>

## Code Map

- `app/src/content/` har de 22 godkjente kriteriene og hjelpetekstene. Bruk løpet sitt snapshot ved lesing og validering.
- `app/src/domain/run.ts` og ny førvurderingsmodul har løpsmodell, `baselineConfirmation`, `firstDay.driverIdentity` og rollelås. Bruk `checkDayFields(dayDraft(run, run.firstDay), 'driver')`. Frys faktisk dagidentitet og 22 etterposisjoner i samme kommando, også for eldre schema 1-løp.
- `app/src/application/run-application.ts`, `app/src/application/run-store.ts` og `app/src/adapters/indexeddb/run-store.ts` eier kommando/port og atomisk commit. Gjenbruk mønsteret i `saveDayDraft`, `withOpenStorage` og `RunReceipt`. Bevar ID/payload-replay før revisjon og låsekontroll.
- `app/src/ui/use-day-draft.ts` og `app/src/ui/App.tsx` har serialisering, tidsfrist, kvitterings-/konfliktvern og flush-grenser. Gjenbruk minste felles del til førutkast. Ved visningsbytte flushes den gamle editoren før den neste åpnes. Rollebytte bevarer valgt løp og dag, samtidig som tidligere rollevisning og dialoger fjernes.
- `app/tests/day-draft.test.ts` og `app/tests/browser/workspace.spec.ts` har mønster for transaksjonsabort, gjenåpning, gamle faner, fortsatt inntasting under skriving og 60 s nettbrudd. Behold prøvene og legg til førvurdering, felt- og svarlås, dag-1-arv, A10, dialog og layout.

## Tasks & Acceptance

- [x] Definer stabile før-svarposisjoner, gyldig svarsett og én felles A10-regel i domenet. Legg dialogutkast utenfor bekreftede svar.
- [x] Registrer svar og begrunnelse med samme autosave, komplett transaksjon, feil/retry og flush som 1.2, også ved nettbrudd.
- [x] Implementer vertikal, tilgjengelig vurderingsmatrise, punkthjelp, mangelliste og bekreftelsesdialog. Utskrift utelater hjelp. Prøv sticky overskrift og tastaturfokus ved tekstforstørrelse.
- [x] Implementer `ConfirmBaseline` med sjåførvern, identitetskontroll, frosset bekreftelse og dag-1-arv i samme transaksjon. Bevar fortsatt tillatte øktfelt. Førbekreftelsen oppretter ingen annen faglig bekreftelse.
- [ ] Prøv mangler og alle 22 punkter, dialogavbrytelse, begrunnelsesgrenser, autosave, gammel fane, avbrudd før/etter complete, dobbeltbekreftelse, gjenåpning, nettbrudd og relevante nettleser-/hjelpemiddelprøver.

## Design Notes

Den godkjente [vurderingsskissen](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-vurdering.html) grupperer 1–4 under Sjåfør, 5–11 under Buss, 12–14 under Trafikk / kjøreteknikk · Sjåfør, 15–18 under Trafikk / kjøreteknikk · Samhandling og 19–22 under Trafikk / kjøreteknikk · Optimal kjøreteknikk. Behold gruppene, rekkefølgen, valgrubrikkene og godkjent punkthjelp fra løpets snapshot.

Bruk én stabil logisk posisjon per kriterium i førfasen. Råutkast i dialogen lagres separat. Bare et gyldig lagringsvalg i dialogen endrer fagsvaret og dets `answerRevision`. Dialogen for faglig låsing binder den viste, kvitterte revisjonen. Dag-1-arv bruker egne ettersvar-ID-er med kilde-ID og opprinnelig begrunnelse for før-Ikke relevant. Fadder kan lese før, mens bare sjåfør skriver og bekrefter.

## Verification

- Kjør `npm run build`, `npm run lint`, `npm test` og `npm run test:browser` med de låste versjonene.
- Før faktiske resultater for tre testmotorer, 60 s nettbrudd, 320–1280 CSSpx, 200 % tekst, 400 % nettleserzoom/reflow, tastatur og enhets-/skjermleserprøver.

## Implementation Notes

Implementering startet 18. november med kodegjennomgått Story 1.2 som teknisk grunnlag.

Uavhengig Chromium-prøve under implementering brukte fysisk nettleserzoom 400 % fra 1264 til 316 CSSpx. Alle 22 hjelpetaster og 22 Ikke relevant-valg var tilgjengelige. Matrisen hadde ingen horisontal rulling. Siste punkts fokus kom under sticky overskrift, hjelp og begrunnelse kunne åpnes/lukkes med riktig fokusretur, og punkthjelp var skjult i utskriftsmediet. Skjermleser, fysisk mobil og sluttregresjon gjenstår.

Før reviewretting passerte bygg/typekontroll og lint for build `story-1.3-20261118`, 25 Node-prøver og 102 Playwright-prøver. Førutkast kvitterte første periodiske skriving etter 1506 ms i Chromium, 1512 ms i Firefox og 1565 ms i WebKit. Alle motorer lagret og låste førvurderingen etter 60 sekunder simulert nettbrudd, uten nettverksforespørsler. Bekreftelsestiden vises i Europe/Oslo og lagres i UTC. Svar-ID-er er deterministiske UUIDv8 av løps-/dagsnøkkel, fase og kriterium. Nye datafelter er additive i schema 1.

Etter reviewretting passerte bygg/typekontroll, lint, **27 Node-prøver og 120 nettleserprøver** i build `story-1.3-20261118-r2`. Første transaksjonscomplete med kontinuerlig skriving kom etter 1509/1506/1562 ms i Chromium/Firefox/WebKit. Bekreftelse under simulert nettbrudd passerte etter 60113/60323/60399 ms uten nettverksforespørsler. Frossen kopi av sluttbygget er kontrollert med filhash mot regresjonsbygget. En egen 400 %-prøve på port 4176 fylte 22 svar, åpnet og bekreftet låsen og verifiserte permanent låst førvurdering etter refresh. Status står i review for faktisk mobiltastatur, fysiske enheter og full skjermleserprøve.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Lagring kunne inneholde bekreftelse uten førdata (blind gjennomgang) | Medium. Ingen tidligere produksjonskode skrev denne deltilstanden. Sperr lesing og oppdater den syntetiske låsefiksturen. |
| Lagring kunne inneholde bekreftelse uten førdata (kanttilfeller) | Medium. Deltilstanden ga låst status uten gyldig ettertilgang. Samme sperre. |
| Svarrevisjon kunne ligge over aggregatets revisjon (blind gjennomgang) | Medium. En økning kan gjøre en kvittert rad uleselig. Håndhev invarianten ved lesing og mutasjon. |
| Svarrevisjon kunne overskride heltallsgrensen (kanttilfeller) | Medium. Samme underliggende revisjonsvern. |
| Gruppering ved endret kilderekkefølge (blind gjennomgang) | Medium. Matrisen kunne sette et gyldig kriterium i feil kategori. Behold snapshotrekkefølge og avled kategori/nummer fra stabilt ID. |
| Kategorier avledet fra arrayposisjon (kanttilfeller) | Medium. Samme retting, uten å avvise historisk snapshotrekkefølge. |
| Avsluttet begrunnelse kunne arve råtekst fra annen fane | Medium. En uttrykkelig tømming må følge konfliktforsøket. |
| Modal kunne se redigerbar ut ved konflikt (blind gjennomgang) | Medium. Redigeringsforsøk ble ignorert. Gjør sperren synlig og gi vei til sammenligning. |
| Modal skjulte konfliktvalgene (kanttilfeller) | Medium. Samme sperre og vei tilbake fra dialogen. |
| Fokustrigger kan forsvinne under konflikt (verifikasjon) | Medium for tastatur. Bruk synlig konfliktoverskrift som reservemål etter lukk. |
| Kjent lagret lås vises som ubekreftet | Medium. Vis den autoritative låsen og behold ulagret innhold til sammenligning. |
| Ny rolle fjernet bekreftelsesfeilen (blind gjennomgang) | Medium. Feilteksten må overleve remount av editoren. |
| Dialog stengte stille ved annen aktiv rolle (kanttilfeller) | Medium. Samme feilbeskjed i arbeidsflaten. |
| Avbrutt og senere gjenåpnet låseforsøk kunne bruke gammelt tidspunkt | Medium for bekreftelsesdata. Slipp kommandoen når brukeren avbryter et verifisert ubekreftet forsøk. Behold identisk retry ved uavklart resultat. |
| Feltfokus mistes ved bytte til redigerende rolle | Medium. Bevar valgt felt gjennom eksplisitt rollebytte. |
| Mangelliste pekte til erstattede svarknapper (blind gjennomgang) | Medium. Skjul inaktive lenker når konflikten sperrer redigering. |
| Mangellenke ga ugyldig fokus (kanttilfeller) | Medium. Samme sikring av handlingene. |
| Profilhode viste senere dag fra førvurderingen | Medium. Førvurderingens profil skal bruke dag 1-identiteten. |
| Oppgitt utskrift og faktisk utstyrsdekning | Uavhengig utskriftsprøve bestod. Manuell skjermleser og mobilt skjermtastatur står åpne i sprintstatus. |
| UI-prøve skilte ikke lagret innhold fra innebygd versjon | Dekningsgap. Så inn særskilt historisk innhold og prøv begge roller. |
| Kvittering med lesefeil ved førbekreftelse | Dekningsgap. Injiser en mislykket lesing etter fullført transaksjon og prøv kjent lås. |
| Konfliktretry prøvde kun samme kriterium | Dekningsgap. Test at en annen kvittert rad overlever. |
| Dag 2 ble aldri prøvd i førvisningen (blind gjennomgang) | Dekningsgap. Prøv samme 22 posisjoner og at arven binder dag 1. |
| Mangelfeltlenken ble aldri prøvd fra senere dag (verifikasjon) | Dekningsgap. Kontroller brukt dag og riktig feltmål. |
| Ugyldig arvekilde ble aldri lest via adapter | Dekningsgap. Så inn ødelagt arv og forvent lesefeil. |
| Skrivefane ble ikke lukket etter complete før kvittering | Dekningsgap. Lukk skrivefanen i denne fasen og verifiser faktisk gjenåpnet lås. |
