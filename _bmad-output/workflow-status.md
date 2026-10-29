# BMAD-workflow: Digital kjørevurdering

Fase: produktbrief og PRD ferdigstilt. BMAD-sluttkontroll gjennomført 2026-10-29 uten faseblokkere. Neste steg er UX (`bmad-ux`).

## Bekreftet retning

Mobiltilpasset webapp/PWA med fiktive data som første leveranse.
Tilrettelegg for senere mobilapp eller Power Apps. Stakk er ikke valgt.
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
| Krav | bmad-prd | Ferdigstilt – status final, klar for UX |
| Brukeropplevelse | bmad-ux | Neste steg – ikke startet |
| Arkitektur | bmad-architecture | Ikke startet |
| Epics og stories | bmad-create-epics-and-stories | Ikke startet |
| Sprintplan | bmad-sprint-planning | Ikke startet |
| Implementering | bmad-build | Ikke startet |

Start `bmad-ux` med `prd.md` og `addendum.md` i
`_bmad-output/planning-artifacts/prds/prd-Digital kjørevurdering-2026-10-29/`.
PRD-en har status `final`, med 19 funksjonelle krav og testbare kvalitetskrav.
Beslutningslogg og kilder er avstemt; kvalitetskontroll fant ingen faseblokkere.
Struktur- og språkkontroll er gjennomført, og to språkrettinger er innarbeidet.
Se `finalization-report.md`, `reconcile-final.md`, `review-final-rubric.md` og
`review-final-editorial.md` i samme mappe for kontrollgrunnlaget.

A1/A3/A10 er overført til prosjekteier og UX for feltregler, oppsummeringsflyt
og begrunnelseslengde. A4/A7/A8 er overført til arkitekt, UX og prosjekteier
for lagring, testmatrise og gjenoppretting. Avklaringstidspunkt står i PRD-en;
alle skal være behandlet før berørte stories og tester fastsettes.
Ingen av disse detaljene blokkerer oppstart av UX.

Etter UX følger arkitektur, epics/stories og sprintplan. Ingen senere fase er
påbegynt eller ferdigstilt. Tre epics er et foreløpig mål. Denne filen er
workflow-status, ikke en generert sprintstatus.

## Kravavklaringer 2026-10-29

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
