# Utsatt arbeid

- source_spec: `2-2-laste-ned-komplett-sluttdokumentasjon-som-pdf.md`
  summary: En ugyldig historikkpost kan sperre felles løpsoversikt selv om andre løp er gyldige.
  evidence: Arbeidsområdets etablerte lesesti validerer alle poster før visning og stoppet allerede ved uleselig historikk i 2.1. Story 2.2 skal bevare den konkrete dokumentfeilen og avvise eksport av det berørte grunnlaget. Separat isolering av uleselige arkiver krever egen vurdering av felles lagrings- og gjenopprettingsflyt.

- source_spec: `3-2-dokumentere-teknisk-opplæring-med-egen-bekreftelse-og-pdf.md`
  summary: Alle PDF-typene deler skriftdekningen i de vedtatte, lokale Noto Sans-filene.
  evidence: Fontkit bekreftet manglende dekning for U+674E, U+1F600, U+1F642 og U+1F68D i begge valgte skrifter. Motoren stopper med konkret kodepunkt og bevarer registrert tekst og bekreftelse når eksport ikke kan gjengi tegnet. Dokumentene er prøvd med æøå og åäö. Bredere dekning krever et felles skrifttillegg som også oppfyller kravene til lokal ressurslasting og ytelse.
