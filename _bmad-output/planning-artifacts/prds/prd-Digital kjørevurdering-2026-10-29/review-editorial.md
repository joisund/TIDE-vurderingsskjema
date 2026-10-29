> HISTORISK KONTROLL – vurderer en tidligere utgave av PRD-en, før senere avklaringer om fem dager, separate bekreftelser og innsyn. Funn og behandling nedenfor er bevart som historikk. Rapporten er ikke en kontroll eller godkjenning av dagens krav. Se `reconcile-brief.md` for gjeldende status.

# Redaksjonell kontroll av PRD og addendum

Dokumentene skal hjelpe prosjekteier, UX-designer og arkitekt å forstå V1, skille beslutninger fra antakelser og bruke kravene i videre planlegging.

Kontrollert 2026-10-29 med BMADs struktur- og språklinser, i den rekkefølgen. Målgruppe: mennesker. Strukturmodell: Strategic/Context (Pyramid) for PRD-en, med et supplerende referansedokument for skjemadetaljer. Innhold og faglige krav er ikke utfordret eller endret i denne kontrollen.

## Struktur

Ingen strukturelle endringer anbefales. PRD-en starter med produktmål og arbeidsflyt, definerer begrepene før detaljkravene og samler antakelsene for videre avklaring. Addendumet skiller kildefelter fra innspill til UX og arkitektur. Gjentakelser om låsing og relevans støtter lesing av enkeltkrav og er ikke ren redundans.

Eksakte ordtellinger fra `word_metrics.py`: PRD 2673 ord; addendum 826 ord; samlet 3499 ord. Ingen lengdegrense er oppgitt. Strukturpasset foreslår ingen kutt: reduksjon 0 ord (0 %), uten tap av forståelsesstøtte.

## Språk

Bevart stil: direkte norsk kravspråk, stabile FR/NFR-ID-er, tydelig merkede antakelser, kildeordlyd i kriterietabellen og konkrete testbetingelser. Kriterietabellens opprinnelige skrivemåter er ikke modernisert som en språkretting.

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | PRD, FR-9/A4: «Det finnes et synlig forsøk-på-nytt ved feil.» | «Ved lagringsfeil skal brukeren få et synlig valg for å forsøke lagringen på nytt.» | Erstatter en uklar substantivering med en konkret handling og presiserer at det gjelder lagring. Kravet om nytt forsøk er uendret. |

Ingen språkfunn i addendumet. Én anbefaling totalt, ingen strukturelle kutt. Dokumentene er ikke redigert av kontrolløren.

## JSON

```json
[
  {
    "lens": "prose",
    "location": "prd.md, FR-9, antakelse A4",
    "original_text": "Det finnes et synlig forsøk-på-nytt ved feil.",
    "revised_text": "Ved lagringsfeil skal brukeren få et synlig valg for å forsøke lagringen på nytt.",
    "changes": "Gjør handlingen og feiltypen tydelig uten å endre kravet."
  }
]
```
