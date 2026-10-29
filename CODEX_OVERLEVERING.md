# Overlevering – digital kjørevurdering

**Siste UX-status: Ferdigstilt (final).** Hele UX-oppsettet og alle 22 hjelpetekster er godkjent av prosjekteier 2026-10-29. Utvidet kjøretrening registreres bare som oppfølgingsbehov i V1; gjennomføring og klarsignal håndteres utenfor løsningen, primært i samtale med opplæringsansvarlig. Valgte skisser ligger i mockups/. Arkitektur er neste steg; A4/A8 (lagring og gjenopptakelse) og A7 (implementasjonens testmatrise) følger med dit.
Oppdatert 2026-10-29. Dette er et gjeldende sammendrag, ikke en historisk beskrivelse av briefens første versjon.

## Historisk arbeidslogg og kildehierarki

**Oppdatert under UX 2026-10-29:** UX er nå startet i `_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/`. Nyere brukeravklaringer i `.memlog.md` overstyrer eldre PRD-tekst og sammendraget nedenfor. De viktigste endringene er førvurdering kun før første dag, låst videreføring av førvurderingens Ikke relevant på dag 1 og nytt daglig relevansvalg fra dag 2, med popupbegrunnelse for begge roller, fadders tilgang gjennom hele dagen og planlagt siste dag styrt av fadder i V1. Oppsummeringen er sjåførens frivillige egenevaluering; fadder får valgfri konklusjon siste dag som inngår i skjema/PDF. Tide-profil og logo er nå ønsket. En separat rapport til fagansvarlig uten sjåførinnsyn er utsatt. PRD/addendum og kildeavstemminger er nå oppdatert med UX-beslutningene; PRD er et UX-revidert utkast, og den historiske sluttkontrollen gjelder den tidligere versjonen. Det visuelle V1-uttrykket og variant A er godkjent. Begrunnelser krever minst to ord og ti normaliserte tegn. Utkast til 22 hjelpetekster er skrevet og venter på faglig kontroll. A1-feltregler og ønsket visuell dekning er til avklaring; UX er ikke ferdigstilt. Se workflow-status for gjeldende fasestatus.

### Overleveringsgrunnlag før UX

Produktbrief og PRD er ferdigstilt. PRD har status **final** etter BMAD-sluttkontroll 2026-10-29 og er klar for UX. Avklarte produktkrav er grunnlaget videre; seks merkede detaljantakelser er uttrykkelig overført til UX/arkitektur. UX, arkitektur, epics/stories og sprintplan er ikke startet.

Neste steg er `bmad-ux`, med `_bmad-output/planning-artifacts/prds/prd-Digital kjørevurdering-2026-10-29/prd.md` og tilhørende `addendum.md` som grunnlag. `finalization-report.md` oppsummerer sluttkontrollen og overleverte avklaringer. Les `reconcile-brief.md` og prosessloggen `.memlog.md` ved behov for beslutningshistorikk. Se `_bmad-output/workflow-status.md` for rekkefølgen videre.

Siste brukerbeslutninger overstyrer eldre brieftekst. Rapporter i `historikk/` og merkede historiske vurderinger er ikke gjeldende krav eller godkjenning av dagens PRD.

## Bekreftet retning

- Mobiltilpasset webapp/PWA, også på større skjerm, kun med fiktive data.
- Normalt tre ordinære dager; kortere ved retur eller lånesjåfør. Oppfølging fortsetter som nye dager i samme løp. **Maksimalt fem dager totalt**, inkludert oppfølging. Eldre føring om åtte dager gjelder ikke lenger.
- Én økt per dato, 22 kriterier og tre separate vurderinger: sjåfør før, sjåfør etter og fadder etter kjøring. Alle vurderingsposisjoner må besvares før dagen låses. Ubesvart er aldri OK.
- «Ikke relevant» begrunnes av sjåfør før kjøring og videreføres etterpå. Fadder bekrefter eller avslår; ved uenighet kreves egen kommentar. Ingen retur eller endring av sjåførens svar. Begrunnelse må være mer enn ett ord eller noen få tegn. «Ikke vurdert» er ikke et svaralternativ.
- Sjåfør bekrefter egen del, fadder sin. Bekreftet dag er permanent låst, med tydelig varsel før låsing. Førvurderingen bekreftes og låses separat før kjøring, før ettervurderingen åpnes.
- Fadder har ansvar for tilbakemelding underveis. Sjåføren får hele skjemaet når fadderperioden er fullført. «Fortsett med oppfølging» holder løpet åpent uten fullt innsyn/PDF. «Avslutt perioden» gir varig fullt innsyn og samlet PDF og stenger for nye dager, uansett om utfallet er godkjent eller fortsatt oppfølgingsbehov.
- Oppsummering første/siste dag er frivillig, med tre styrker og tre utviklingsområder hver. Kravet skal kunne endres for fremtidige registreringer uten å endre låst historikk.
- Faktisk nedlastbar PDF med begge parters bekreftelser, for manuell kopi til sjåfør og HR-opplasting. Ingen direkte utsending eller integrasjon.
- Utkastlagring og gjenopptakelse etter nettbrudd inngår. Full offlinebruk inngår ikke.
- Rollebytte på én enhet simulerer arbeidsdelingen; det er ikke produksjonsautorisasjon. To enheter, mobilapp og mulig Power Apps-tilpasning skal vurderes for senere videreføring. Ingen teknologistakk eller produksjonstilkobling er valgt.

## Avklarte hovedvalg og gjenstående detaljer

- **A5 er avklart:** Videreføring og endelig avslutning er forskjellige handlinger, som beskrevet over. Ikke gjeninnfør delavslutninger eller nye dager etter avslutning.
- **A9 er avklart:** Førvurderingen låses før kjøring. Ikke gjeninnfør mulighet til å endre førvurderingen etterpå.
- **A2 er avklart:** Sjåfør begrunner; fadder bekrefter eller avslår med egen kommentar ved uenighet. Ingen retur, forhandlingsflyt eller overskriving av sjåførens svar. Bekreftelse og dokumentert avslag er begge gyldig behandling. A10 foreslår konkret lengdegrense, som gjenstår å fastsette i UX.

Disse avklaringene er innarbeidet samlet i PRD, addendum, kildeavstemming og workflow-status. Prosjekteier har kontrollert oppdatert PRD/støttedokumenter og bekreftet at de fire hovedpunktene er løst. Den siste feltpresiseringen er innarbeidet: identitet, dato og tilhørighet låses med førvurderingen; buss, linje og inn-tid kan fylles ut frem til dagslåsing. Øvrige feltgrenser konkretiseres i UX/arkitektur. Formell BMAD-ferdigstilling er gjennomført; ikke spør på nytt om de fire avklarte hovedpunktene. Øvrige merkede antakelser har eiere og avklaringstidspunkt i PRD; lengdegrensen i A10 er et forslag, ikke en ny brukerbeslutning.

## Anonymisert skjemagrunnlag

`docs/Eksempel vurderingsskjema.pdf` er primærkilde for original ordlyd og oppsett. Den er bevart med avdelingssted og metadata fjernet. Fotografier er ikke gjeninnført. `docs/skjemagrunnlag.md` er kun et omskrevet demoalternativ.

Personopplysninger, samtalesitater, arbeidsgiverkoblinger og interne system-, tilgangs- og organisasjonsopplysninger skal ikke gjeninnføres. Bruk generiske eksempler og fiktive deltakere. Primærskjemaets dag 1–8 er kildehistorikk, ikke gjeldende produktgrense.

Tre epics er et foreløpig planleggingsmål. Endelig nedbrytning følger etter UX og arkitektur.


## Historisk status før endelig godkjenning

Vurderingsskjema og egenevaluering er godkjent. Fadderdelen er revidert med Ja/Nei for oppfølgingsbehov, betingede valg for ekstra dager eller utvidet kjøretrening og kommentarer på alle 22 punkter. Avslutning samler tekst og Godkjent/Oppfølgingsbehov under Konklusjon. Det avviste femsiders PDF-forslaget er erstattet av en liggende progresjonsmatrise og en stående side med kommentarer, egenevaluering og signaturfelt. 15 hjelpetekster er godkjent, sju er revidert. Nye komposisjoner venter på brukergjennomgang. UX-T1: fortsettelsen etter utvidet kjøretrening må avklares. DESIGN.md og EXPERIENCE.md forblir draft.
