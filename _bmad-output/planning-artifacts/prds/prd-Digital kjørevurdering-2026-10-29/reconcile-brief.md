# Gjeldende kildeavstemming mot PRD

Oppdatert 2026-10-29 etter prosjekteiers avklaringer og tilbakemelding fra hovedchatten. Dette dokumentet erstatter det tidligere uttrekket. [Tidligere avstemming](historikk/reconcile-brief-for-tre-fem-dager-og-todelt-bekreftelse.md) er kun historikk.

## Kildehierarki

Prosjekteiers siste beslutninger styrer produktkravene og overstyrer eldre brief og skjemaforslag. `prd.md` er gjeldende kravutkast; `addendum.md` beskriver kriterier, kildeavvik og videre føringer. Primær-PDF er kilde for opprinnelig ordlyd og oppsett, ikke for senere produktvalg. Dens dag 1–8 overstyrer derfor ikke den vedtatte femdagersgrensen.

Begge PDF-sider er visuelt kontrollert i PRD-arbeidet. Denne avstemmingen er dokumentkontroll, ikke en ny uavhengig kontroll av PDF-en. Bedriftsnavn og personidentitet skal ikke gjeninnføres. Plattformnotatet er teknisk bakgrunn, ikke et stackvalg eller en kontroll av dagens leverandørvilkår.

## Bekreftede krav og dekning

| Gjeldende krav | Dekning |
| --- | --- |
| PWA med fiktive data, mobil og større skjerm | Formål, NFR-1/NFR-6. Ingen produksjonsgodkjenning. |
| Normalt tre ordinære dager, kortere ved retur/lånesjåfør; maksimalt fem totalt | FR-2. Oppfølging er nye dager i samme løp, ikke et eget løp. Dag 6 avvises. Tidligere åttedagersføring er erstattet. |
| 22 kriterier og tre vurderinger per dag | FR-5 og addendum. Ingen forhåndsvalgte OK-svar; alle 66 posisjoner må være gyldig besvart før dagslåsing. |
| Sjåfør bekrefter egen del, fadder sin | FR-12–FR-14 og FR-17. A6 er avklart, ikke et åpent spørsmål om å utelate sjåførbekreftelse. |
| Fadder gir tilbakemelding underveis; sjåfør får fullt skjema når perioden er fullført | FR-4/FR-7/FR-17. A5 er avklart: oppfølging holder løpet åpent uten fullt innsyn/PDF; endelig avslutning gir begge deler varig. Ingen obligatorisk felles godkjenning av fadderens meninger. |
| «Ikke relevant» begrunnes av sjåfør og videreføres etter; fadder bekrefter eller avslår | FR-6/FR-7. A2 er avklart: avslag krever egen fadderkommentar og egen vurdering, uten retur eller overskriving. Sjåførens begrunnelse og fadderens avgjørelse bevares separat i skjema/PDF. |
| Permanente låste dager og tydelig advarsel | FR-11–FR-14. A9 er avklart: førvurdering bekreftes og låses før kjøring, før ettervurdering åpnes. |
| Frivillige første-/sistedagsoppsummeringer, tre styrker og tre utviklingsområder | FR-8. Fremtidige kravendringer skal ikke endre låst historikk. A3 gjelder låsetidspunkt. |
| Godkjent eller fortsatt oppfølgingsbehov; tidligere dager åpnes ikke | FR-15/FR-16. A5 er avklart: videreføring holder løpet åpent; endelig avslutning stenger for nye dager, også når utfallet er fortsatt oppfølgingsbehov. |
| Utkast, lagringsstatus, nettbrudd og gjenåpning | FR-9–FR-11, NFR-3. A4/A8 er foreslåtte tidsmål med oppgitte begrensninger. |
| Nedlastbar PDF med vurderinger, kommentarer, begge bekreftelser og utfall | FR-17–FR-19, NFR-5. Manuell kopi/HR-opplasting. Ufullstendig PDF er ikke normalflyt. PDF representerer hele perioden ved dens ene endelige avslutning, jf. avklart A5. |
| Historikk og synlig utvikling | FR-4. Ingen statistikkmodul. |
| Senere to enheter, mobilapp og Power Apps | Avgrensning og addendum. Ingen teknologistakk, synkronisering eller konvertering er vedtatt. |

## Avklarte hovedvalg og overførte detaljer

1. **A5 – Avklart:** «Fortsett med oppfølging» holder løpet åpent innen femdagersgrensen. «Avslutt perioden» er endelig, gir fullt innsyn og samlet slutt-PDF og tillater ingen nye dager. Ingen tilbakeføring av innsyn eller delavslutnings-PDF er nødvendig.
2. **A9 – Avklart:** Førvurderingen låses separat før kjøring og kan ikke endres etterpå. Ettervurdering åpnes først etter låsing.
3. **A2 – Avklart:** Sjåførens begrunnede Ikke relevant videreføres til ettervurderingen. Fadder bekrefter eller avslår med kommentar ved uenighet; ingen retur eller ny sjåførbekreftelse. Førvurderingen forblir låst. Ettordssvar og svært korte begrunnelser skal ikke godtas; konkret lengdegrense er foreslått i A10.
4. A1/A3 er øvrige felt- og oppsummeringsdetaljer. A4/A7/A8 er tekniske akseptanseforslag med eier og tidspunkt i PRD. A10 foreslår tre ord og 15 tegn som ikke er blanktegn; tallgrensen avklares i UX før feltvalidering fastsettes.


## Kontrollstatus

Prosjekteier opplyste 2026-10-29 å ha kontrollert oppdatert PRD og støttedokumenter og bekreftet at de fire hovedpunktene er løst. Dette gjelder skillet mellom videreføring/avslutning, separat førvurderingslås, enkel relevansflyt og oppdaterte støttedokumenter. Historiske kontrollrapporter er fortsatt merket med sitt begrensede vurderingsgrunnlag.

Den siste presiseringen om låsing av sjåføridentitet, dato og tilhørighet er innarbeidet i FR-3/FR-11/FR-14 og SM-8. Buss, linje og inn-tid kan fylles ut senere frem til dagslåsing; øvrige feltgrenser konkretiseres i UX/arkitektur. Siste presisering er inkludert i sluttkontrollene `reconcile-final.md` og `review-final-rubric.md`.

PRD har status `final` etter BMAD-sluttkontroll 2026-10-29. Kildeavstemming og kvalitetskontroll fant ingen faseblokkere; struktur-/språkkontroll er gjennomført og rettingene innarbeidet. A1/A3/A4/A7/A8/A10 er eksplisitt overført til UX/arkitektur med eiere og avklaringstidspunkt, se `finalization-report.md`. De fire hovedpunktene skal ikke gjenåpnes som ubesvarte. Tre epics er et foreløpig planleggingsmål, ikke en ferdig nedbrytning.
