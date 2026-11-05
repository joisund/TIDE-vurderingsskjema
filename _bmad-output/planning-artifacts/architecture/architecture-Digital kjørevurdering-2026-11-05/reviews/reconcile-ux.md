# Avstemming mot godkjent UX

Dato: 2026-11-05. Uavhengig kontroll av `ARCHITECTURE-SPINE.md` og `verification-plan.md` mot final DESIGN.md, EXPERIENCE.md, UX-finalization-report.md og de siste beslutningene i UX-loggen. Dette er dokumentavstemming, ikke implementasjons- eller tilgjengelighetstest.

**Dom:** De bærende UX-beslutningene er bevart. Ingen ny produktkonflikt utover det uttrykkelig åpne PDF-fontavviket Q5. Ett diagramfunn bør rettes før overlevering; A4/A8 og A7 er tydelig foreløpige valg, ikke feilaktig omtalt som brukerbeslutninger.

## Funn som kan rettes direkte

| ID | Sted | Problem | Anbefalt retting |
| --- | --- | --- | --- |
| UX-ARCH-1 | Structural Seed, ER-diagram: `RUN` til `DAY` | Diagrammet krever minst én dag per løp. EXPERIENCE S2 har uttrykkelig tilstanden «Ingen dager: opprett første», og avslutningsregelen skiller mellom et tomt løp og minst én fullført dag. To byggere kan følge henholdsvis diagram og UX og lage ulike opprettelsesmodeller. | Bruk null–mange dager fra RUN i den generelle modellen. Behold minst én låst dag som en valideringsregel for CloseRun. Baseline kan gjerne være et forhåndsopprettet tomt objekt, men diagrammet må ikke tolkes som en allerede bekreftet førvurdering. |

## Kontrollert og bevart

- AD-6/7/8 dekker engangs-førvurdering, låst videreføring av Ikke relevant bare dag 1, selvstendig daglig relevans fra dag 2, foreldet behandling ved endret sjåførsvar, separate meninger, fadders tilgang underveis og de vedtatte feltlåsene. Fadderbytte omskriver ikke faktisk bekreftende navn.
- Frivillig egenevaluering, én evaluering ved ett-dagsløp, beholdt historikk ved sen utvidelse og konklusjonslås først ved avslutning er bevart. UX-T1 er fortsatt bare registrert oppfølgingsbehov; ingen trenings- eller klarsignalmodul er kommet inn.
- Rollebytte rydder forrige rollevisning; fullt sjåførinnsyn og normal PDF åpnes ved begge endelige avslutningsutfall. Q4 om detaljert plansynlighet viderefører et faktisk åpent UX-punkt og er merket som forslag.
- Godkjent mobilmatrise, sticky-overskrifter, trefflater, tokens og 22 hjelpetekster er arvet. A7-planen utvider kontrollgrunnlaget til faktiske mobilnettlesere, skjermlesere, zoom og flere bredder uten å hevde at disse testene er utført. Den tidligere statiske Edge-kontrollen blir ikke presentert som bevis for en app.
- PDF bevarer liggende progresjonsmatrise, stående oppfølgingssider, lange tekster, faktiske bekreftelser og avsendere, planhistorikk og evalueringer. Punkthjelp utelates. Q5 om Segoe UI/Noto Sans er en synlig konflikt med DESIGN som krever prosjekteiers svar; ingen ny font er godkjent gjennom arkitekturkontrollen.

## Avgrensning

Godkjente interaksjonsdetaljer, blant annet navn/rolle/dato/del og låsekonsekvens i bekreftelsesdialoger samt Avbryt uten tilstandsendring, gjelder fortsatt gjennom de normative UX-kildene. Det er ikke nødvendig å kopiere alle komponentregler til arkitekturspinen. Under senere bygging må tester bruke EXPERIENCE som kontrakt i tillegg til AD-reglene.
