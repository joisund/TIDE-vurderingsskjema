# Teknisk grunnlag for testkjøring i Epic 4

Avgrensningen her gjelder et eget, lokalt verifiserbart testmiljø med fiktive data. Opplæringsansvarlige, stedfortredere og IT er fortsatt forslag til ansvarlige. Tide må fastsette fullmakter, identitetsleverandør, oppbevaring og produksjonsdrift før reelle kandidater tas inn.

## Delt testkjøring

- Node 26 og den innebygde SQLite-adapteren passer med prosjektets låste verktøy. En lokal skrive-/leseprøve bestod på Node 26.13.0. Bruk en egen SQLite-fil utenfor de statiske filene. Testkjøring har selvstendig data, mal og dokumentkilde. Fadderløp og teknisk/linjeopplæring beholder sitt etablerte lager.
- Kandidat og instruktør bruker separate autentiserte økter på samme HTTPS-origin. Tilgangen til et konkret løp kontrolleres på serveren ved hver handling. Oppretterens fullmakt er en egen tillatelse for avdeling, uten faglig lesetilgang til vurderingen. Instruktøren får bare sine tildelte testkjøringer. Kandidattilgang har sluttdato og kan trekkes tilbake uavhengig av øktens levetid.
- E-post med engangskode gir en reell separat pålogging i pilotflyten. Lokale prøver kan bruke en kontrollert postkasse med fiktive adresser, og skal gå via samme kode- og øktkontroll som en senere e-postadapter. Lenken i invitasjonen identifiserer innloggingsstedet. Engangskode, økt og tilgangsbevis holdes adskilt fra vurderingsdata.
- Forslag for den fiktive prøven: Kandidaten leverer førdelen før start. Instruktøren åpner etterdelen når kjøringen er gjennomført, kan levere egen del underveis og avslutter først når alle tre delene er levert. Kandidaten kan lese egne svar gjennom hele løpet. Instruktøren får innsyn i kandidatens faglige svar ved avslutning. Inntil avslutning inneholder kandidatens svar fra serveren ingen instruktørsvar, kommentarer, resultat eller eksportgrunnlag. Etter avslutning kan begge se og laste ned den samme låste faglige dokumentasjonen med gyldig tilgang. Utløpsdatoen og tilbakekall gjelder kandidatens tillatelse. Instruktøren beholder sin selvstendige tilgang til tildelt dokumentasjon. Tide kan avklare fase- og innsynsreglene før reell bruk.
- Utkast per del har egne revisjoner. Oppretting, innsending og avslutning må kunne gjentas etter tapt kvittering uten å lage duplikater eller overskrive en nyere revisjon. PDF bygger på den kvitterte sluttversjonen og følger samme tilgangskontroll som dokumentet.

## Føringer for pilotserveren

- Bruk egen inngang `/testkjoring/` fra appen og eget API på samme origin. Test-API og statisk klient skal kunne startes lokalt uten eksisterende Ubuntu-tjeneste, Cloudflare eller en Tide-konto. Start på loopback som standard. Et oppsett for en fysisk pilot må ha HTTPS før tilkobling utenfor verten.
- Skill engangskode fra økt og oppdragstilgang. Koden får kort utløp og begrensede forsøk. Økter bruker en tilfeldig, ugjennomsiktig cookie med `HttpOnly` og `SameSite`, samt `Secure` der HTTPS brukes. Tidsavgrensning og tilbakekall kontrolleres mot oppdraget også for etablerte økter. Innloggingsfeil skal ikke avsløre hvem som er registrert.
- Sett `Cache-Control: no-store` på autentiserte API-svar. Håndhev betrodd origin ved nettleserskriving og bruk validerte, størrelsesbegrensede forespørsler. Utlever bare feltene den autentiserte aktøren kan se i gjeldende fase. Inkluder pilottest for at sluttinnsyn og eksport fortsatt krever gyldig tilgang etter avslutning.
- Lokale pilotmeldinger holdes utenfor appens statiske ressurser og serveres ikke til kandidatens nettleser. Bruk adresser forbeholdt fiktive identiteter i pilotoppsettet. Endelig e-postlevering eller Tide-innlogging kobles til etter valg av identitetsløsning.
- Avslutning lagrer én egen dokumentkilde og endrer fasen i samme SQLite-transaksjon. Frosne faglige avsendere, mal, kommentarer og tidspunkt følger kilden ved gjenåpning. En eksport har fersk tilgangskontroll før og etter lokal PDF-generering. Eksportfeil endrer ingen data. Tegn PDF-skriften mangler vises med forklarte Unicode-koder i PDF-en. Sluttvisningen og den frosne kilden beholder originaltegnene.

## Kildegrunnlag for malen

Arbeidskopiens originalbilde «Evalueringsskjema for testkjøring», Teamleders verktøykasse 2018, er lest visuelt. Skjemaet har instruktørkommentar per kriterium og et sammenhengende kommentarfelt på baksiden. Hodefeltene omfatter kandidatnavn, mobil, e-post, instruktør, dato, avdeling, buss, nytt førerkort, YSK, førerkort, kjøreseddel, erfaring med tunge kjøretøy og om kandidaten er kjent i området. Pilotens felter avspeiler malen med fiktive verdier.

| Nr. | Evalueringskriterium |
| --- | --- |
| 1 | Punktlighet |
| 2 | Stress/nervøsitet |
| 3 | Selvinnsikt |
| 4 | Personlig fremtreden/hygiene |
| 5 | Språk |
| 6 | Oppstart og daglig kontroll av buss, utvendig og innvendig |
| 7 | Forberedelser til dagens kjøring (tilpasse speil og stol) |
| 8 | Teknisk forståelse og håndtering av bussen |
| 9 | Se-teknikk og VTL § 3 |
| 10 | Risikovurdering og beslutningsevne |
| 11 | Kommentarkjøring (simultankapasitet) |
| 12 | Lover: Vikeplikt, forkjørsvei, farts- og veimerking |
| 13 | Planlegging, tegn, signal og plassering |
| 14 | Samhandling i rundkjøring og kryss |
| 15 | Fartstilpasning og avstand til forankjørende |
| 16 | Fartstilpasning i forhold til veistandard |
| 17 | Fart og plassering før, gjennom og etter sving |
| 18 | Rygging og parkering |
| 19 | God flyt i nedoverbakke (utrulling/retarder) |
| 20 | God flyt inn mot og ut fra bussholdeplass |
| 21 | God flyt over fartsdumper |
| 22 | Kjørekomfort |

Kandidaten svarer «OK» eller «Kan bli bedre» før og etter kjøringen. Instruktøren har i tillegg «Ikke bestått» per kriterium og registrerer selv samlet «Bestått», «Med forbehold» eller «Nei».
