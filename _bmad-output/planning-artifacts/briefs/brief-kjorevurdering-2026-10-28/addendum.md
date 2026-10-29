> HISTORISK PLANLEGGINGSGRUNNLAG fra 2026-10-28. Åpne spørsmål nedenfor er senere behandlet i PRD-arbeidet: femdagersgrense, separate bekreftelser, førvurderingslås, relevans, avslutning og innsyn. Bruk [gjeldende PRD](../../prds/prd-Digital%20kjørevurdering-2026-10-29/prd.md) og dens addendum for krav. Dette notatet beholdes som kildehistorikk, ikke som oppdatert status.

# Grunnlag og oppgaver for videre planlegging

## Kilder og dokumentasjon

`docs/Eksempel vurderingsskjema.pdf` er primærkilde for original ordlyd og oppsett. Avdelingsstedet er fjernet, metadata er renset og side 2 er snudd riktig vei. Fotografier og personlige samtalesitater er ikke gjeninnført. Det generaliserte behovssammendraget og `docs/skjemagrunnlag.md` er omskrevne alternativer for demoen; de skal ikke overstyre primærkilden.

Prosjektbeslutningene er samlet i briefen. `.memlog.md` er prosessloggen. Bedriftsnavn, personidentitet og interne tilgangsforhold skal ikke legges tilbake i planleggingen. Omtalen av HR-system er et generisk krav til bruk av PDF-en, ikke dokumentasjon av et navngitt system eller en integrasjon.

## Kravarbeid: lagring og nettbrudd

Full offlinebruk er ikke prioritert i V1. Kortvarige nettbrudd skal håndteres slik at brukeren raskt kan fortsette med lagrede registreringer. PRD-en må konkretisere:

- Når et utkast er lagret, og hvordan lagringsstatus vises.
- Hva som kan gjenopprettes etter nettbrudd, oppfrisking eller lukking av appen.
- Hvordan brukeren varsles om ulagrede endringer eller mislykket lagring.
- Hvilket mål for gjenopprettingstid som skal testes, og under hvilke forhold.

Ikke lov full tapsfrihet for ulagrede inntastinger eller synkronisering som ikke er implementert. Arkitekturen velger hvordan utkast lagres i V1.

## Kravarbeid: PDF og avslutning

PDF-generering er en nødvendig funksjon i V1. En utskriftsvisning alene erstatter ikke kravet om en nedlastbar PDF-fil. Filen skal kunne brukes ved manuell opplasting i et HR-system og gis som kopi til den evaluerte. Ingen konkret mottakerplattform eller direkte utsendelseskanal er valgt.

PRD og UX må definere struktur for flere dager, identifikasjon med fiktive data, tre vurderinger per kriterium, kommentarer, oppsummering første/siste dag, ubesvarte felt og lesbar paginering. Avklar om PDF også kan lages av et ufullstendig løp og hvordan den i så fall merkes. Eventuell bekreftelse, signatur og regler for endring etter ferdigstilling er fortsatt uavklart.

## Arkitektur: roller og flere enheter

V1 bruker rollebytte på samme enhet. Senere skal sjåfør og fadder kunne arbeide på hver sin enhet mot samme løp. Legg til rette for dette gjennom stabile identifikatorer og et tydelig skille mellom vurderingens rolle, økt og lagring. Ikke bygg delt lagring eller synkronisering mellom enheter i V1.

Vurder deltakere, opplæringsløp, økter, versjonerte kriteriesett, vurderinger, kommentarer og oppsummeringer som separate begreper. Dette er modellforslag. Historiske vurderinger bør kunne tolkes når kriterietekster endres. Autorisasjon, samtidige endringer og konflikter må behandles ved videreutvikling til flere enheter og reelle brukere.

## Plattform og senere omfang

Første leveranse er PWA med fiktive data. Tilrettelegg for senere mobilapp og Power Apps uten å love automatisk konvertering. Se `docs/plattform-og-gjenbruk.md`. Faktisk IT-miljø og lisenser er ukjent; React/TypeScript er fortsatt et forslag, ikke en besluttet stakk.

Andre vurderingskategorier, administrasjon, ekstra opplæring og eventuell godkjenningsmyndighet er senere produktavklaringer. De er ikke dokumenterte organisasjonsprosesser eller krav til V1.
