# Redaksjonell sluttkontroll – PRD og addendum

Dato: 2026-10-29. Dokumentene skal hjelpe prosjekteier, UX og arkitektur med å videreføre avklarte produktkrav uten å forveksle dem med utsatte detaljvalg.

Kontrollen gjelder `prd.md` og `addendum.md` etter innarbeidet overlevering til UX. Struktur er vurdert først, deretter språk på samme struktur. Kravinnhold og akseptansekriterier er ikke endret av denne kontrollen.

## Struktur

Modell: Strategic/Context (Pyramid) for PRD, supplert med referansestruktur for kravene og addendumets kriterieliste. Formål og arbeidsflyt kommer før detaljer; begreper og tilstander gir nødvendig støtte til kravene. Overleveringen skiller avklarte beslutninger fra utsatte detaljer. Gjentakelse mellom krav og testmål har en tydelig kontrollfunksjon og foreslås bevart.

Ingen strukturelle endringsforslag. Ingen ord foreslås fjernet.

## Språk

Bevar den konkrete norske kravstilen, stabile ID-er og eksplisitte forbud mot å endre bekreftet dokumentasjon. To små formuleringer bør presiseres:

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | PRD, FR-18: «Normal eksport skal være utilgjengelig for ufullstendige, pågående løp og løp under oppfølging, også når alle hittil registrerte dager er bekreftet.» | «Normal eksport skal være utilgjengelig for ufullstendige løp, pågående løp og løp under oppfølging, også når alle hittil registrerte dager er bekreftet.» | Gjør de tre leddene parallelle; «ufullstendige» kan ellers leses som en avgrensning av bare pågående løp. |
| prose | Addendum, Til arkitektur: «Begge bekreftende navn og hvilken del de bekrefter må være historisk bevart, ikke hentes dynamisk fra en redigerbar profil ved senere PDF-generering.» | «Begge bekreftende navn og opplysningen om hvilken del hver person bekrefter må bevares historisk, ikke hentes dynamisk fra en redigerbar profil ved senere PDF-generering.» | Retter uklar grammatikk og gjør det tydelig at personene bekrefter hver sin del. |

## Omfang og telling

`word_metrics.py` ble kjørt på begge dokumenter før vurderingen:

- PRD: 4 311 ord.
- Addendum: 1 272 ord.
- Samlet: 5 583 ord.
- Struktur: 0 endringsforslag, estimert reduksjon 0 ord / 0 %.
- Språk: 2 rettingsforslag; ingen endring av kravinnhold eller omfang.

Ingen bestemt lengdegrense er oppgitt. Ingen forståelsesstøtte, tabeller eller eksempler foreslås fjernet. Rapporten foreslår rettinger; kildedokumentene er ikke endret av kontrolløren.
