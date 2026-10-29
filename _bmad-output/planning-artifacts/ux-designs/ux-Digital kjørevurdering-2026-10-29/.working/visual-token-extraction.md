# Uttrekk av godkjent visuell standard

Dato: 2026-10-29. Kilde: brukerbeslutning i `.memlog.md` og faktisk CSS i `key-vurdering.html`. Skrifttype, fargebruk, luft, logo og tydelig punkthjelp A er godkjent som V1-standard. DESIGN.md og EXPERIENCE.md beholder draft-status av andre grunner.

## Løftet inn i DESIGN.md

- Seks offisielle Tide-farger, hvit produktflate og semantiske aliaser for tekst, handling, fokus, feil, kategori og skiller.
- Systemfont med faktiske produktroller: 25 px sidetittel, 23 px dialogtittel, 18 px hjelp, 16 px grunntekst, 15/14 px dialog-/konteksttekst, 13 px kriterier, 12/11 px rubrikker og 10 px tilleggsnummer. Ingen påstand om offisiell Tide-font.
- Kontrollavrunding 4 px, hjelp 8 px, dialog 12 px og runde radiovalg.
- Faktiske innvendige avstander og komponentverdier, inkludert logo 76 px, tre svarkolonner à 52 px, radminimum 68 px, radio 22 px, svartrykkflate minst 44 × 48 px og hjelp 44 × 44 px.
- Indigo valgt radio/fokus/primærhandling; hvit sekundærhandling med indigo tekst/kant. Faktisk CSS for fokus er 3 px ring med 5 px avstand.
- Fokus på øvrige kontroller og feiltekst/-grense er eksplisitt implementeringsavledning innen godkjent palett, ikke en ny visuell retning. Feil må forklares med tekst og programmatisk feltkobling.

## Ikke løftet som produktkrav

Ytre gjennomgangshode, presentasjonsbakgrunn, telefonens 24 px rammeavrunding og kant, variantetiketter, demonstrasjonens høydebegrensning, dialogens faste topposisjon og print-CSS som slutt-PDF-format. Sticky overskrifter er besluttet; faktisk fokusbeskyttelse må følge overskriftens høyde i implementasjonen, ikke blindt kopiere demonstrasjonens 160 px scroll-padding.

## Kontroll

Alle referanser i DESIGN.md og EXPERIENCE.md til colors/typography/rounded/spacing/components er mekanisk kontrollert mot definerte tokenstier. Fargeverdiene har seks-sifrede hexverdier. Full YAML-parser var ikke tilgjengelig i den brukte Python-installasjonen; inline-mappingene er derfor kontrollert gjennom tokenuttrekk, ikke påstått parservalidert.

Kontrast beregnet lokalt med sRGB-luminans: grå/hvit 7,17:1; grå/lys sand 5,64:1; indigo/hvit 10,11:1; indigo/lys sand 7,95:1; grå/sand 4,87:1. Sand/hvit 1,47:1 og grønn/hvit 1,81:1 brukes ikke som nødvendig kontrollgrense eller vanlig tekst. Dette er fargekontroll, ikke en ny full tilgjengelighetsvalidering.

## Samtidig regelavstemming

A10 er vedtatt: minst to ord og ti tegn etter trimming og normalisering av blanktegn, inkludert enkelt mellomrom. «Ingen rygging» og «Ingen billettering» passerer. Lengdekravet er teknisk, ikke en automatisk vurdering av meningsfull begrunnelse. Begge dokumenter lenker til `help-texts-draft.md` som utkast til faglig kontroll.

Gjenstår: A1-feltregler, faglig kontroll av hjelpetekster, valg/kontroll av øvrige skjermflater og PDF, samt avtalte arkitektur-/testoppgaver. Ingen final-status eller ny full review er utstedt.
