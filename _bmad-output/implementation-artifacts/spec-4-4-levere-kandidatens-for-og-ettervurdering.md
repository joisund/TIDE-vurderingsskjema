---
title: 'Story 4.4 – Levere kandidatens før- og ettervurdering'
type: 'feature'
created: '2026-11-20'
story_key: 4-4-levere-kandidatens-for-og-ettervurdering
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 5e1360f2533d2f5507c411be384793be82663c18
context: ['_bmad-output/implementation-artifacts/epic-4-context.md', '_bmad-output/implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Kandidaten registrerer sin egen vurdering av de 22 testkjøringskriteriene før og etter kjøring. Før- og etterdelen lagres separat og låses ved levering.

## Boundaries & Constraints

Bruk kandidatens autentiserte tilgang til eget løp fra 4.3. Kandidatskalaen er «OK» og «Kan bli bedre». I pilotfasene leverer kandidaten førdelen før start. Etterdelen åpnes når tildelt instruktør kvitterer for at kjøringen er gjennomført. Tide avklarer reell organisatorisk fasefullmakt senere.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| Førdel delvis utfylt | Lagre og logg inn igjen fra en annen klient | Den sist kvitterte førrevisjonen vises |
| Førdel levert, etterfasen fortsatt stengt | Forsøk å skrive før eller etter | Før forblir låst. Etter åpnes først på egen kvittering |
| Etterfasen åpnet | Fyll ut og lever etterdelen | Eget svarsett, egen revisjon og lås |

</frozen-after-approval>

## Code Map

- `app/server/test-drive-store.ts` har Story 4.3s løpstilgang i `withAssignment`, versjonert mal per løp og SQLite-lagring. Bruk denne transaksjonsgrensen for mutasjoner og rollefiltrerte svar.
- `app/server/test-drive-api.ts` har API-inngangen `/api/testkjoring`. Bruk eksisterende opprinnelses-, kroppsstørrelses- og øktkontroll.
- Gjenbruk mønstre for sann lagringsstatus, navngitte valg og synlige feil fra dagens app. Hold serverdelene for testkjøring uavhengige av fadderløpets IndexedDB-domene.

## Tasks & Acceptance

- [x] Innfør faseovergang for gjennomført kjøring og egne kandidatdeler med revisjonskontroll, idempotens og lås.
- [x] Vis kandidatens før-/etterregistrering mobiltilpasset. Behold ulagrede endringer på skjermen når lagring feiler.
- [x] Test egen og annens identitet, ufullstendig innsending, gammel revisjon, lagring på tvers av klienter og åpning av etterfasen. Sammenlign de 22 kriteriene med kilden.

Gitt at kandidaten har levert førdelen, når instruktøren åpner etterfasen, ser kandidaten førdelen som levert og kan fylle ut en separat etterdel. Direkte forespørsel eller nytt forsøk endrer ingen levert del.

## Implementation Notes

SQLite-fasene fra 4.3 er `before`, `driving`, `after` og `closed`. Kandidatens kvitterte førinnsending åpner `driving`. Tildelt instruktør kan kvittere for at kjøringen er gjennomført og åpne `after`. Åpning av etterdelen og levering av eget svarsett er to separate handlinger. Tillat idempotent retry etter tapt nettverkskvittering. Ved avvist skriving skal den åpne visningen beholde ulagrede svar og forklare hvilken handling som feilet.

`app/src/ui/TestDriveApp.tsx` har autorisert detaljvisning og gjenopprettingskontroll ved utløp eller tilbakekall. Utvid den med kandidatens egne deler og instruktørens fasekommando. Gjenlesing ved ordinært fokus skal ikke forkaste ulagret tekst eller svar. Instruktøren kan få fase/status uten kandidatens faglige svar i piloten. Behold samme historiske mal og avtalte SQLite-transaksjonsgrense.

Bruk prosjektets lokale Node 26.13 og browserne fra `.cache/playwright`. Prosjekteier har tillatt lokal nettleserprøving. Agentkjøring av `npm test` for API krever lokal loopback. Fysisk prøve og manuell input samles ved hele epicens slutt. Endringer publiseres når hele Epic 4 er verifisert.

## Spec Change Log

- 2026-11-20. Gjennomgangen presiserte håndtering av forsinket og tapt svar, vist handlingsfeil og kontroll av mistet tilgang på mutasjoner. En egen oppdateringshandling gjenleser fasen mens den andre enheten arbeider. Begge delene har fortsatt uavhengige revisjoner og samme atomiske låsing.

## Review Triage Log

| Funn | Vurdering og belegg | Oppfølging |
| --- | --- | --- |
| Blind 1. Konflikt krever at lagret revisjon hentes inn | Lav. Skjemaet beholder og viser valg fra den gamle revisjonen. Brukeren må velge lagrede svar før nye valg kan kvitteres. Automatisk sammenslåing krever en egen konfliktflyt per kriterium. | Behold synlige lokale valg og eksplisitt innlasting av lagrede svar. |
| Blind 2. Sent POST-avslag gir feil selv etter GET-kvittering | Middels. GET kan ha bekreftet samme svar og lås før mutasjonens fangst setter feilen. | Samordne respons og sist bekreftede revisjon. |
| Blind 3. Et gjentatt lagringskall skjuler senere svar fra annen klient | Middels. Serveren returnerer gjeldende visning for en kjent kvittering. Klienten fjernet utkastet selv når svarene i visningen var endret. | Behold de ulike svarene og vis revisjonsforskjellen. |
| Blind 4. Skriveavslag fjerner ikke en mistet tillatelse | Middels. Kommandofeil lot komponenten stå med en aktiv form. | Invalider visning eller sesjon straks. |
| Blind 5. Ulagrede svar blir borte når en bruker går til oversikten og tilbake | Lav. Vern ved sidebytte fjerner detaljene. Pilotkravet for en gjenåpnet side gjelder sist kvitterte utkast. Ordinært fokus med åpent skjema beholder lokale valg. | Behold skjerming ved sidebytte. |
| Blind 6. Valideringsfeil ligger utenfor synlig handlingsfelt på mobil | Middels. Knappene er klebrige mens feilen lå etter handlingsfeltet. | Flytt feilen inn i handlingsfeltet. |
| Blind 7. Bytte fra lagring til levering kan omtale egen lagring som konflikt | Middels. Ny handling hadde en ny ID og beholdt den gamle revisjonen etter en tapt kvittering. | Gjør ventende kvittering eksplisitt før ny handling. |
| Blind 8. Delvis innsending prøves ikke ved feil i SQLite | Middels. Vanlig levering og omstart prøves. Feil etter innsetting av kvittering var uprøvd. | Simuler feil ved faseendring og prøv samme kall etter tilbakerulling. |
| Kant 1. Utlogging eller tilbakekall håndteres bare på lesing | Middels. Kandidatens og instruktørens kommandoer hadde ingen felles håndtering med lesing. | Koble kommandofeil til eksisterende tilgangsavslag. |
| Kant 2. En sent feilet levering vises ved siden av levert vurdering | Middels. GET har allerede låst skjemaet og skjult ny leveringsknapp. | Bruk bekreftet vurdering ved sen respons. |
| Kant 3. Kandidatens skjema kan vente ubegrenset | Middels. Nettkallet kunne vente uten tidsgrense og holde handlingene deaktiverte. | Avslutt venting lokalt og behold ny prøve på samme skriv. |
| Kant 4. Instruktørens fasekvittering kan vente ubegrenset | Middels. Den samme ventingen holdt etterdelen stengt uten tilgjengelig nytt forsøk. | Bruk avgrenset kalletid også her. |
| Kant 5. En enhet som ligger åpen ser ingen ny fase før fokusendring | Middels. Detaljvisningen meldte stengt fase uten en synlig oppdateringshandling. | Bruk eksisterende gjenlesing fra en synlig knapp. |
| Kant 6. Vern av hurtigbufret side kaster lokale svar etter navigasjon | Lav. Vernet fjerner den gamle, åpne visningen før autorisasjon. Sist kvitterte svar lastes ved retur. | Behold skjerming ved sidebytte. |
| Verifisering 1. Forsinket detaljsvar etter mutasjon | Middels. Sekvensielle prøver skiller ikke en fjernet revisjons- eller fasevakt. | Hold igjen faktisk nettlesersvar over en kvittert mutasjon. |
| Verifisering 2. Feil også i ytre oversiktsforespørsel | Middels. Den tidligere prøven avbrøt bare detaljkallet. Oversiktskallet kan også avmontere skjemaet. | Prøv et avbrutt oversiktskall med et lokalt valg synlig. |
| Verifisering 3. Feil mellom kvittering og faseendring | Middels. SQLite-skrivingene må vinne eller rulle tilbake samlet. | Samme SQLite-prøve som Blind 8. |
| Verifisering 4. En annen klient leverer delen mens egne svar er ulagret | Middels. Tidligere prøve avviste en gammel revisjon med redigerbart skjema. Ulagrede valg i låst visning var uprøvd. | Krev synlig lås, offisielt svar og avvikende lokalt valg i to klienter. |

## Verification

2026-11-20 bestod 93 Node-prøver, seks Playwright-prøver i Chromium, Firefox og WebKit, typekontroll og bygg etter retting. Lint hadde de ti eksisterende varslene. Nettleserne kjørte den faktiske pilotserveren ved 320 CSSpx med separate innlogginger. Testene dekket tapt kvittering etter committed skriv, sent svar, låst del med avvikende lokale valg, utløpt nettventing, eldre detaljsvar, omstart, direkte tilbakekall og oppdatering uten å forkaste utkast. En SQLite-trigger stanset faseendringen, og samme forespørsel lyktes én gang etter full tilbakerulling. De 22 kriteriene og svaralternativene er sammenlignet med kildegrunnlaget. En separat lokal oppstart i Vite-pilotmodus ga HTML 200, autentiseringskrav 401 og kodeforespørsel 202 på samme origin. Fysisk mobilprøve står åpen.
