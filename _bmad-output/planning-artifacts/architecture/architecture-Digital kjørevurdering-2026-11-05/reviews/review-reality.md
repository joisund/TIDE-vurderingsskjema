# Reviewer Gate – versjoner og faktisk kildegrunnlag

Dato: 2026-11-05. Uavhengig reality-/versjonslinse på `ARCHITECTURE-SPINE.md` og `research-notes.md`. Ingen app eller pakker er installert. Bare denne rapporten er skrevet.

**Dom:** Bestått som dokumentasjonskontroll av et foreløpig arkitekturutkast. Ingen bundet versjon er funnet opp eller motsagt av kontrollert primærkilde. Dokumentene skiller uttrykkelig dokumentasjonsverifisering fra installasjon, bygg og mobiltest. To mindre presiseringer forbedrer etterprøvbarheten; ingen kritisk eller høy feil er funnet.

## Funn og håndtering

| ID | Nivå | Sted | Funn | Anbefalt håndtering |
| --- | --- | --- | --- | --- |
| R1 | Lav | research-notes: Starter/Vite/PDF-motor | Rå `main`/`master`-kilder er uttrykkelig merket bevegelige. Kontrollen fant nå også tagbundne filer som bekrefter de samme relevante versjonene/defaultene. | Erstatt eller suppler de bevegelige filreferansene med tagbundne kilder nedenfor. Dette er en klar dokumentretting, ikke et nytt teknologi-/scopevalg. |
| R2 | Lav | research-notes: PDF-motor/runtime | React 19-peer og nettleserbygg er verifisert. Rendererens kompatibilitetsside oppgir samtidig eldre Node-versjoner som testet; den dokumenterer ikke særskilt Node 26. Dette motsier ikke klientvalget, men Node26/hele byggkjeden må ikke tolkes som leverandørtestet bare ut fra peers. | Presiser at Node26 brukes til bygg/verktøy, mens PDF rendres i nettleser, og at den samlede Vite/TS/renderer-kombinasjonen fortsatt krever rent bygg og mobiltest. Behold eksisterende verifikasjonsgrense. |

## Uavhengig kontrollerte primærkilder

| Bundet grunnlag | Kontroll og resultat |
| --- | --- |
| Node26.13.0 LTS / npm11.20.0 | [Offisiell release-index](https://nodejs.org/download/release/index.json) viser denne kombinasjonen fra 2026-10-28 og LTS-navnet Lithium. Nyere alpha er ikke valgt. |
| create-vite9.3.3 react-ts-defaults | [Tagbundet template-package](https://raw.githubusercontent.com/vitejs/vite/create-vite@9.3.3/packages/create-vite/template-react-ts/package.json) bekrefter React/react-dom19.3.1, plugin-react6.1.2, TS7.0.2 og Vite8.3.5 samt `tsc -b && vite build`. Dokumentets beskrevne runtime-seed samsvarer. |
| Vite8.3.5 | [Tagbundet package](https://raw.githubusercontent.com/vitejs/vite/v8.3.5/packages/vite/package.json) bekrefter versjon og Node-motorkrav som tillater Node26. Starteren er en mal, ikke et ferdig lagrings-/UI-system; det er riktig beskrevet. |
| Renderer4.9.0 og React19 | [Tagbundet package](https://raw.githubusercontent.com/diegomura/react-pdf/@react-pdf%2Frenderer@4.9.0/packages/renderer/package.json) bekrefter versjon, nettleser-entry og React19-peer. [Kompatibilitetssiden](https://react-pdf.org/docs/v4/compatibility) bekrefter React19-støtte siden 4.1.0, men gir ingen samlet Node26/Vite8-bygggaranti. |
| PDF-orientering/tekstflyt/font | [Page](https://react-pdf.org/docs/v4/components/page), [wrapping](https://react-pdf.org/docs/v4/advanced/page-wrapping) og [fonts](https://react-pdf.org/docs/v4/fonts) støtter valgt mekanisme. Begrensningen ved overstor ubrytbar blokk og behovet for statisk fontfil er korrekt tatt inn. Ingen pixelperfekt eller allerede prøvd PDF loves. |
| PWA uten service worker | [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) skiller installasjon fra offline og krever ikke service worker universelt. HTTPS/localhost og manifest står riktig; faktisk installasjon er fortsatt en planlagt prøve. |
| IndexedDB og bevaring | De oppgitte W3C-/MDN-kildene støtter transaksjoner, durability-hint og begrenset bevaring. Spinen lover ikke backup, privatprofil-bevaring, strømbruddsvern eller enhetssynk. Valgt helaggregat/revisjonskontroll er merket arkitekturvalg fremfor leverandørdefault. |
| Power Apps/tilgjengelighet | Microsoft-/W3C-kildene brukes som grunnlag for mulighet og testmål; ingen automatisk konvertering, miljøtilgang, juridisk samsvar eller PDF/UA påstås. |

Fontfil, fontrelease/hash og konkrete testpakkeversjoner er uttrykkelig utsatt før berørt bygg. Det er derfor ingen skjult påstand om at en bestemt Noto-font eller testverktøykombinasjon allerede er verifisert. Q5 er korrekt beholdt som konflikt med godkjent DESIGN, ikke som gjennomført endring.

Direkte npm-versjonsendepunkter for React/TypeScript og plugin-react var ikke alle tilgjengelige for denne kontrollen. Den tagbundne offisielle starteren bekrefter de relevante valgte versjonene uavhengig. Runtime-, installasjons-, nettleser- og fontprøver gjenstår etter brukerbeslutning; dette er dokumentert som plan, ikke utførte tester.

## Etterkontroll

R1 og R2 er rettet i `research-notes.md`: starter-, Vite- og renderer-package-lenkene er bundet til de kontrollerte release-taggene, med observerte verdier bevart. Node26-fit er presisert som dokumentasjons-/motorkravkontroll; samlet installasjon/bygg og faktisk mobil-PDF er ikke utført. Ingen øvrige produktfiler er endret. Reality-linsen har ingen gjenværende dokumentfunn; de allerede oppgitte runtime-prøvene gjenstår før kodeverifisering.
