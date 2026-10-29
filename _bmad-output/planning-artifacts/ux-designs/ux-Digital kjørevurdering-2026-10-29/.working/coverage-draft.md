# Mekanisk dekningskontroll av første UX-utkast

Dato: 2026-10-29. Omfang: obligatorisk Pass 1 ved distillering, ikke en bestilt flerlinsevalidering eller sluttgodkjenning. Begge dokumenter har status draft.

## 1. Flytdekning

FR-1–FR-19 er koblet til F1–F6 i EXPERIENCE.md. Alle seks flyter har nummererte steg, et avgjørende øyeblikk og en feilvei. Nora, Emil og Alex er merket som fiktive illustrasjoner, ikke personas fra forskning. Nye vedtak om engangs-førvurdering, daglig relevans, fadders løpende arbeid og planlagt siste dag er innarbeidet.

Mangler som hindrer endelig flytdekning: UX-R1 (historisk førrelevans når daglig ettervalg endres), UX-F1/A1 (feltlås dag 2–5), A3/UX-P1 (oppsummeringslås, ett-dagsløp og sen utvidelse). De er synlige i EXPERIENCE.md, ikke gjemt som implementeringsvalg.

## 2. Tokens

Seks verifiserte profilfarger har gyldige seks-sifrede hexverdier. Referanser bruker eksisterende colors-nøkler. Ingen oppdiktet profilfont eller fargepar er presentert som vedtatt. Kontrastberegninger gir begrensninger, ikke en godkjent helhet.

Bevisste mangler: typography, rounded, spacing og components er tomme objekter. Semantiske bakgrunns-/tekst-/fokus-/feiltokens mangler. Dette er en vesentlig ferdigstillingsmangel; dokumentet kan ikke sendes direkte til implementering. Kontrastmålet er merket antakelse. Brukerens valgte mobilmatrise er nå innarbeidet; dimensjonering gjenstår.

## 3. Komponentdekning

18 komponenter har samsvarende navn i DESIGN Components og EXPERIENCE Component Patterns: Profilhode, Løpsoversikt, Dagsoversikt, Øktopplysninger, Vurderingspunkt, Kategorihjelp, Begrunnelsesdialog, Relevansbehandling, Fadderkommentar, Oppfølgingsplan, Egenevaluering, Fadderkonklusjon, Lagringsstatus, Mangelliste, Bekreftelsesdialog, Avslutningsdialog, Historikkvisning, PDF-handling.

Oppførsel er beskrevet; visuelle rader beskriver innhold og begrensninger. Eksakt komposisjon, dimensjoner og tilstandsstil gjenstår sammen med UX-L1 og visuelle tokens.

## 4. Tilstandsdekning

S1–S10 har egne rader for tom/lasting, arbeid/fokus og feil/sperrer. Felles nettbruddregel beskriver sann lagringsstatus. Rolle- og låsematrisen skiller periode, dag og vurderingsdel. Avbrytelse og avbrudd ved låsing/avslutning er omtalt. Ingen full offlinefunksjon er lovet.

Mangler: feltvise regler og enkelte oppsummeringstilstander avventer de åpne spørsmålene. Faktisk navigasjon/fokusrekkefølge kan først kontrolleres i valgt layout og implementasjon.

## 5. Visuelle referanser

imports/Eksempel vurderingsskjema.pdf er lenket i begge dokumenter med formål: vurderingsmatrise og egenevalueringens struktur. Originalkilden er også lenket. Profilhåndbok og fargeark er referert eksternt. Foreldreagenten har lastet ned imports/tide-logo-rgb.png; den er lenket fra DESIGN.md med formål profilhode/skjema.

Ingen mockups er laget av distilleringsagenten. En separat agent lager .working/key-vurdering.html; begge dokumenter lenker til den som foreløpig arbeidsreferanse. Brukerens svar om mobilmatrisen kom under skriving og er innarbeidet; hjelpetekster og detaljdimensjonering er åpne. Før ferdigstilling må øvrige nøkkelflater og mock-dekning avklares. Dokumentenes forrang ved konflikt er angitt i DESIGN.md.

## Videre kontroll

Foreldreagenten kan kontrollere lokale lenker og tokenreferanser mekanisk. Formell validering med flere linser skal tilbys prosjekteier før eventuell dispatch. Ingen valideringsrapport eller final-status er utstedt.
