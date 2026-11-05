# Redaksjonell kontroll – struktur

Dette dokumentet skal hjelpe prosjekteier å forstå arkitekturresultatet, kontrollgrunnlaget og hvilke valg som må avgjøres før videre nedbrytning.

**Modell:** Strategic/Context (Pyramid). Lesertype: mennesker. Stilgrunnlag: Microsoft Writing Style Guide. Kun `finalization-report.md` er kontrollert; arkitekturspinen er ikke redaksjonelt omskrevet.

`word_metrics.py` ble kjørt via uv med workspace-cache 2026-11-05. Dokumentet hadde **823 ord** ved kontroll: innledning 39, Leveranser og kildehierarki 199, Foreløpig resultat 134, Kontroller 56, Samlet beslutningsrunde 320 og Videre føring 55. Seksjonstallene er skriptets brødteksttelling. Rapportens kontrollavsnitt var fortsatt uttrykkelig foreløpig og oppdateres av hovedagenten etter sluttkontrollene; dette passet hevder ikke at workflowen allerede er ferdig.

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | §Foreløpig resultat – hele seksjonen (134 ord), etter §Leveranser og kildehierarki (199 ord) | MOVE §Foreløpig resultat rett etter den innledende statusen | Gir leseren løsningsforslaget og den åpne fontkonflikten før kilde- og prosessdetaljene. Resultat før evidens følger valgt pyramidmodell. Flytting, ingen ordreduksjon. |
| structure | §Leveranser og kildehierarki – avsnittet fra «Prosjektsti ble kontrollert …» til «… er konfigurert.» | MOVE avsnittet til starten av §Kontroller | Prosjekt-/Git-/instruksjonskontroll er kontrollbevis, mens leveranselisten og kildehierarkiet svarer på hvor resultatet finnes og hva som er fasit. Flytting, ingen ordreduksjon; hele seksjonen er 199 ord før flytting. |
| structure | §Samlet beslutningsrunde (320 ord) og innledningens tydelige draft-status | PRESERVE | Tabellen samler spørsmål, anbefaling, konsekvens og avklaringstidspunkt på ett sted slik brukeren ba om. Gjentatt status om manglende godkjenning har viktig avgrensningsverdi i en sluttrapport og bør ikke kuttes som ren redundans. Ingen ordreduksjon. |

**Oppsummering:** To flytteanbefalinger og én uttrykkelig bevaringsanbefaling. Foreslått reduksjon er **0 ord (0 % av 823)**; ingen lengdegrense er gitt. Flyttingene forbedrer rekkefølgen uten å fjerne nødvendig kontrollbevis, godkjenningsskille eller beslutningsstøtte. Ingen forståelsestap foreslås for å gjøre rapporten kortere.
