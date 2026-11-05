# Redaksjonell kontroll – språk

Sluttrapporten skal hjelpe prosjekteier å forstå arkitekturresultatet, kontrollgrunnlaget og valgene som må avgjøres før videre nedbrytning.

Dette er det avhengige språkpasset etter strukturkontrollen. De to anbefalte flyttingene er innarbeidet: resultatet kommer først, og prosjekt-/Git-kontrollen ligger under Kontroller. Lesertype er mennesker, språket norsk og stilgrunnlaget Microsoft Writing Style Guide. Bare `finalization-report.md` er kontrollert; ingen leveranser er endret av denne agenten.

Bevar rapportens nøkterne, tekniske stemme, AD-/Q-identifikatorer, presise versjons- og testbegreper og det uttrykkelige skillet mellom gjennomført workflow, utkast og godkjenning. Tabeller og lenker gir nødvendig sporbarhet. Forslagene nedenfor gjelder kun lokal forståelighet.

Ny `word_metrics.py`-kjøring via uv med workspace-cache gir 1120 ord: innledning 39, Foreløpig resultat 150, Leveranser og kildehierarki 134, Kontroller 402, Samlet beslutningsrunde 320 og Videre føring 55. Språkpasset har ingen reduksjonsmål.

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | «A4/A8 foreslås løst med lokal autosave, tydelig commit-kvittering, 60 sekunders nettbrudd …» | «A4/A8 foreslås løst med automatisk lokal lagring, tydelig lagringskvittering, 60 sekunders nettbrudd …» | Gjør lagringsbegrepene forståelige og unngår at commit-kvittering forveksles med Git i en rapport som også dokumenterer Git-operasjoner. |
| prose | «Øvrige nye valg er tydelig merket antakelser og opprettholder omfanget.» | «Øvrige nye valg er tydelig merket som antakelser og bevarer produktomfanget.» | Tilføyer manglende «som» og gjør omfangsreferansen konkret uten å endre innhold. |
| prose | «Vert og distribuerbar PDF-fontfil er heller ikke valgt eller lastet ned.» | «Ingen vert er valgt. Ingen distribuerbar PDF-fontfil er valgt eller lastet ned.» | Fjerner den utilsiktede formuleringen om at en vert kunne være lastet ned. |

Ingen nye strukturendringer eller faglige endringer foreslås. Kontrollavsnittet er oppdatert med faktiske dokumentkontroller og skiller tydelig fra apptester som ikke er utført. Hovedagenten kan oppdatere raden om språkpasset når denne kontrollen er innarbeidet.
