# BMAD-workflow: Digital kjørevurdering

**Siste arkitekturstatus 2026-11-05: Ferdigstilt (final) og godkjent.** Prosjekteier har godkjent alle anbefalte valg Q1–Q7. [Arkitekturdokument](planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md), [beslutningslogg](planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/.memlog.md) og [kontroll-/vedtaksrapport](planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/finalization-report.md) er gjeldende grunnlag. A4/A8 og A7 er avklart; Noto Sans for PDF er avstemt i DESIGN. Epics/stories og implementering er ikke startet; ingen commit/push er utført.

## Gjeldende UX-grunnlag og historikk

**Siste UX-status: Ferdigstilt (final).** Hele UX-oppsettet og alle 22 hjelpetekster er godkjent av prosjekteier 2026-10-29. Utvidet kjøretrening registreres bare som oppfølgingsbehov i V1; gjennomføring og klarsignal håndteres utenfor løsningen, primært i samtale med opplæringsansvarlig. Valgte skisser ligger i mockups/. A4/A8 og A7 er godkjent i arkitekturen; PDF-font og avklarte detaljregler er avstemt i UX.
Fase: Arkitektur ferdigstilt og godkjent; epics/stories er neste planlagte fase, ikke startet. Produktbrief og opprinnelig PRD ble ferdigstilt 2026-10-29. Prosjekteier har siden endret flere krav gjennom UX-avklaringer; tidligere PRD-sluttkontroll dekker ikke disse endringene. PRD er fortsatt UX-revidert utkast.

Historisk arbeidsstatus før endelig godkjenning — UX-arbeidsmappe: `planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/`. Beslutninger registreres i `.memlog.md`; `DESIGN.md` og `EXPERIENCE.md` har første utkast. En statisk mobilskisse ligger i `.working/key-vurdering.html`. Kravdekning og tilgjengelighet er validert etter prosjekteiers valg; rapportene dokumenterer rettinger og åpne regler. Nyere brukerbeslutninger i loggen overstyrer motstridende PRD-tekst. PRD/addendum er nå avstemt med UX-beslutningene og PRD er merket UX-revidert utkast. Det visuelle uttrykket er godkjent; A10 er to ord og ti tegn. 22 hjelpetekster er skrevet som utkast for faglig kontroll. A1 og ønsket mock-dekning avventer avklaring. UX er ikke ferdigstilt.

## Bekreftet retning

Mobiltilpasset webapp/PWA med fiktive data som første leveranse.
Tilrettelegg for senere mobilapp eller Power Apps. Godkjent webstakk er
React/TypeScript/Vite med lokal IndexedDB og klientgenerert PDF.
V1 viser et helt fadderløp over flere dager med rollebytte på én enhet.
To enheter skal tilrettelegges for senere, men implementeres ikke i V1.
Generering av nedlastbar PDF til manuell opplasting i et HR-system og kopi
til den evaluerte er nødvendig. Full offlinebruk utsettes; utkastlagring
og rask gjenopptakelse etter nettbrudd inngår i V1.
Dokumentasjonen er anonymisert. Etter ønske fra prosjekteier er den skannede
skjemaversjonen bevart med avdelingsstedet fjernet. Fotografiene er ikke gjeninnført.
Et omskrevet skjemagrunnlag er tilgjengelig som alternativ for demonstrasjonen.

## Gjennomført

- BMAD Method 6.12.0 installert med 29 Codex-skills og norsk språk.
- Konfigurasjonen er kontrollert med BMADs resolver.
- Produktbrief ferdigstilt med mål, V1-omfang, avgrensninger og suksesskriterier.
- Tilleggsnotat samler konkrete spørsmål for PRD, UX og arkitektur.
- Struktur og språk kontrollert med bmad-review; én skrivefeil i tilleggsnotatet rettet.
- Personlige referanser og intern bedriftskontekst fjernet fra dokumentene.

## Videre rekkefølge

| Steg | Skill | Status |
| --- | --- | --- |
| Produktbrief | bmad-product-brief | Ferdigstilt |
| Krav | bmad-prd | UX-revidert utkast; endringer avstemt, gjenstående detaljer merket |
| Brukeropplevelse | bmad-ux | Ferdigstilt og godkjent 2026-10-29 |
| Arkitektur | bmad-architecture | Ferdigstilt (final), Q1–Q7 godkjent 2026-11-05 |
| Epics og stories | bmad-create-epics-and-stories | Ikke startet |
| Sprintplan | bmad-sprint-planning | Ikke startet |
| Implementering | bmad-build | Ikke startet |

Neste planlagte steg er epics/stories basert på godkjent arkitektur og avstemt UX/PRD, med 2–3 epics som ramme. Fasen er ikke startet. A1/A3/A10 og UX-T1 er avklart; A4/A8 og A7 er nå godkjent i arkitekturen. PRD beholder UX-revidert draft; tidligere PRD-sluttkontroll dekker ikke den reviderte baselinen. App-/mobil-/PDF-testene gjenstår ved implementering.

Etter arkitektur følger epics/stories og sprintplan. Disse fasene er ikke startet. Denne filen er workflow-status, ikke generert sprintstatus.

## Gjeldende endringer fra UX 2026-10-29

- Førvurdering fylles ut og låses kun før første dag. Sjåførens ettervurdering og fadders vurdering fylles hver dag.
- Sjåfør kan endre relevans ved hver ettervurdering. Både sjåfør og fadder må begrunne egne valg av «Ikke relevant» i popup. Fadder behandler dessuten sjåførens valg med bekreftelse eller avslag; avslag krever egen kommentar og endrer ikke sjåførens svar.
- Fadder kan fylle ut og endre egen del underveis hele dagen. Sluttbekreftelse krever at sjåførens nødvendige deler er ferdige.
- Fadder registrerer behov for flere dager og velger ny planlagt siste dag i V1, innen maksimum fem dager. I fullversjonen ønskes ansvaret hos opplæringsansvarlig/fagansvarlig.
- Første-/sistedagsoppsummering er sjåførens frivillige egenevaluering. Tilbudet siste dag følger planlagt siste dag og flyttes ved utvidelse. Fadder har et valgfritt konklusjonsfelt siste dag; konklusjonen inngår i skjema/PDF og blir synlig for sjåfør etter avslutning.
- Separat rapport til fagansvarlig uten sjåførinnsyn er kun en mulig senere utvidelse.
- Vurderingspunkter og PDF bygger på originalskjemaet; visuell profil og logo skal følge Tide. Dette autoriserer ikke gjeninnføring av personopplysninger eller interne opplysninger.

## Kravavklaringer før UX – historisk grunnlag

Punktene nedenfor beskriver PRD ved opprinnelig ferdigstilling. Ved konflikt gjelder UX-endringene over og den løpende UX-beslutningsloggen.

- Én økt per dag; sjåfør og fadder bekrefter hver sin del med navn. Dagen låses permanent etter tydelig advarsel når begge bekreftelser foreligger. Fadder gir tilbakemelding underveis, og sjåføren får tilgang til hele skjemaet ved fullført fadderperiode.
- Alle vurderingspunkter må besvares. «Ikke relevant» begrunnes av sjåfør før kjøring og videreføres etter kjøring. Fadder bekrefter eller avslår, med egen kommentar ved uenighet; ingen retur eller endring av sjåførens registrering. Begrunnelsen skal være mer enn ett ord eller noen få tegn; tallgrensen er et forslag i A10. «Ikke vurdert» brukes ikke.
- Første-/sistedagsoppsummeringene er frivillige, med tre styrker og tre utviklingsområder hver. Kravet må kunne endres senere uten å endre bekreftet historikk.
- «Fortsett med oppfølging» holder løpet åpent med nye dager uten å åpne tidligere dager. «Avslutt perioden» lukker løpet permanent, som godkjent eller med fortsatt oppfølgingsbehov; begge utfall gir fullt innsyn og samlet slutt-PDF. Ingen nye dager etter endelig avslutning.
- Førvurderingen bekreftes og låses før kjøring; ettervurderingen åpnes først etter dette.
- Ordinært løp er normalt tre dager, kortere ved retur eller lånesjåfør. Oppfølging legges til samme løp som dag 4–5, eventuelt fra dag 3 ved kortere løp. Maksimalt fem dager gjelder samlet og erstatter den tidligere åttedagersføringen.
- Normal PDF-eksport gjelder avsluttet dokumentasjon og viser sjåførens separate før-/etterbekreftelser og fadderens bekreftelse. Eventuell ufullstendig PDF må merkes ettertrykkelig.

## Avstemming av prosessloggen

Valg om PWA, fiktive data, fadderløp, roller, nettbrudd, PDF og senere bruk på
to enheter er samlet i briefen. Kildevalg, anonymisering og detaljspørsmål
for videre planlegging er samlet i addendumet. Tidligere åpne spørsmål om
én/to enheter og om PDF er nødvendig er dermed avklart. Installasjons- og
filbehandlingshistorikk forblir prosessinformasjon i loggen.

## Git

BMAD-oppsett, produktbrief og dokumentgrunnlag versjoneres i prosjektets repo.
Gjeldende synkroniseringsstatus kontrolleres med Git. Historikk og ekstern
repoidentitet er ikke omskrevet som del av dokumentanonymiseringen.

## Siste kontroll og videre føring

Prosjekteier har kontrollert PRD og støttedokumentene og bekreftet at de fire hovedpunktene er løst. Identitet, dato og tilhørighet låses med førvurderingen; buss, linje og inn-tid kan fylles ut senere frem til dagslåsing. UX/arkitektur konkretiserer øvrige feltgrenser. Tre epics er et foreløpig mål for senere nedbrytning, ikke en ferdig plan.


## Historisk status før endelig godkjenning

Vurderingsskjema og egenevaluering er godkjent. Fadderdelen er revidert med Ja/Nei for oppfølgingsbehov, betingede valg for ekstra dager eller utvidet kjøretrening og kommentarer på alle 22 punkter. Avslutning samler tekst og Godkjent/Oppfølgingsbehov under Konklusjon. Det avviste femsiders PDF-forslaget er erstattet av en liggende progresjonsmatrise og en stående side med kommentarer, egenevaluering og signaturfelt. 15 hjelpetekster er godkjent, sju er revidert. Nye komposisjoner venter på brukergjennomgang. UX-T1: fortsettelsen etter utvidet kjøretrening må avklares. DESIGN.md og EXPERIENCE.md forblir draft.
