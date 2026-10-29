# Sluttavstemming av kilder og beslutninger

Dato: 2026-10-29. Kontrollert som del av BMAD PRD Finalize før endelig statussetting. PRD-en hadde `status: draft` ved denne avstemmingen. Dette er kildeavstemming, ikke en ny visuell kontroll av primær-PDF-en eller teknisk validering av implementasjon.

## Grunnlag og forrang

Lest: gjeldende `prd.md`, `addendum.md`, `.memlog.md`, `reconcile-brief.md`, prosjektets `CODEX_OVERLEVERING.md`, og produktbrief med tilleggsnotat fra 2026-10-28. Prosjekteiers siste beslutninger, dokumentert i prosessloggen, overstyrer eldre brieftekst og tidligere antakelser. Tidligere kilder er brukt til å kontrollere videreført innhold, ikke til å gjenåpne avklarte valg.

## Dekning av kildene

| Kilde eller beslutning | Dekning i gjeldende dokumenter |
| --- | --- |
| Produktbrief: PWA, fiktive data, mobil og større skjerm, flere dager, historikk og rollebytte på én enhet | Formål, FR-1–FR-5, NFR-1/NFR-6 og avgrensning. Ingen stakk eller produksjonsgodkjenning er lagt til. |
| Produktbrief/addendum: utkast, lagringsstatus, nettbrudd og gjenåpning | FR-9–FR-11, NFR-3, A4/A8. Garantien er avgrenset; ingen løfter om full offlinebruk eller synkronisering. |
| Produktbrief/addendum: faktisk PDF, alle kriterier og vurderinger, kommentarer, oppsummeringer, manuell kopi/HR-opplasting | FR-17–FR-19, NFR-5 og skjemagrunnlag i addendum. Ingen direkte utsending eller integrasjon. |
| Normalt tre ordinære dager, kortere ved retur/lånesjåfør, maksimalt fem totalt i samme løp | FR-2/FR-16, akseptansescenarier og gjeldende støttedokumenter. Dag 6 avvises. |
| Separat førvurderingslås og egne bekreftelser | FR-5/FR-11–FR-14 og SM-4/SM-5. Ettervurdering åpnes først når førvurderingen er låst. Begge rollenes bekreftelser og navn gjengis separat i PDF. |
| Identitet, dato og tilhørighet låses med førvurderingen; buss, linje og inn-tid kan fylles ut senere | FR-3/FR-11/FR-14, SM-8 og addendum. Også omkobling gjennom overordnede profiler/løp er uttrykkelig sperret. |
| Sjåfør begrunner Ikke relevant; fadder bekrefter eller avslår uten retur/overskriving | FR-6/FR-7 og SM-7. Avslag krever kommentar og egen faddervurdering. Dokumentert avslag blokkerer ikke dagslåsing. Begge perspektiver bevares i PDF. |
| Mer enn ett ord eller få tegn i begrunnelsen | FR-6/A10. Tre ord og 15 tegn er tydelig merket forslag, ikke brukerbekreftet tallgrense. |
| Videreføring skilt fra endelig avslutning, innsyn og PDF | Tilstandstabellen, FR-4/FR-15–FR-18 og SM-6. Videreføring gir verken fullt innsyn eller PDF; endelig avslutning gir begge deler varig og tillater ingen nye dager. |
| Frivillige første-/sistedagsoppsummeringer med tre styrker og tre utviklingsområder, mulig senere kravendring | FR-8 og addendum. Historiske bekreftelser beskyttes mot senere regelendring. A3 merker detaljforslaget til låsetidspunkt. |
| Senere to enheter, mobilapp/Power Apps og foreløpig mål om tre epics | Avgrensning og addendum. Ingen ny plattformleveranse, synkronisering eller fast epicinndeling er lovet. |

## Beslutninger som er erstattet

- Åttedagersføringen og avvisningen av femdagersgrense er erstattet av maksimalt fem dager totalt.
- Egen oppfølgingsdel med separat avslutning/PDF er erstattet av nye dager i samme åpne løp og én endelig avslutning.
- Bare fadderbekreftelse og samlet sjåførbekreftelse etter kjøring er erstattet av separate bekreftelser og låsing før kjøring.
- Fadder som opprinnelig begrunnelsesforfatter og en konfliktflyt med retur/korrigering er erstattet av sjåførbegrunnelse, separat fadderavgjørelse og ingen retur.
- Obligatorisk felles godkjenning og mulig «Ikke vurdert» er ikke gjeldende krav. Fadder formidler tilbakemelding, og «Ikke relevant» er det besluttede alternativet.

Gjeldende PRD, PRD-addendum, overlevering og kildeavstemming reflekterer disse endringene. Historiske kontrollrapporter er tydelig merket.

## Gaps og overlevering til UX

Ingen bekreftet produktbeslutning er funnet utelatt eller motsagt i det nåværende PRD-/addendum-paret. Ingen kildeavstemmingsfunn blokkerer UX.

A1, A3, A4, A7, A8 og A10 er fortsatt merkede detaljer med eiere og tidspunkt. De gjelder feltregler, oppsummeringens låsetidspunkt, lagrings-/gjenopprettingsmål, nettlesermatrise og lengdeterskel. De kan føres videre til UX/arkitektur uten å gjenåpne hovedvalgene, men må avklares før berørte stories fastsettes.

Ved ferdigstilling må `CODEX_OVERLEVERING.md`, `reconcile-brief.md` og workflow-status oppdateres fra utkast/formell ferdigstilling gjenstår til faktisk ny status. Briefens gamle tilleggsnotat har fortsatt formuleringer om at bekreftelse/signatur er uavklart; merk gjerne hele notatet som historisk underlag med henvisning til gjeldende PRD, slik at det ikke leses isolert som dagens oppgaveliste.

**Vurdering:** Klar som kildegrunnlag for UX etter hovedagentens øvrige sluttkontroller og formelle ferdigstilling.
