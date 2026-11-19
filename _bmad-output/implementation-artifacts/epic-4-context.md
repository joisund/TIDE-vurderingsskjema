# Epic 4 Context: Testkjøring og individuell tildeling av linjeopplæring

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Kandidaten kan vurdere egen kjøring før og etter en testtur, også før ansettelse. Instruktøren dokumenterer sine observasjoner underveis, og kandidaten får avtalt innsyn etter avslutning. Sjåføren får de aktuelle grunnkurslinjene som standard og kan få øvrige linjer tildelt individuelt når opplæringen blir aktuell.

## Stories

- Story 4.1: Bruke oppdatert grunnkursmal
- Story 4.2: Tilordne en linje senere til én sjåfør
- Story 4.3: Opprette en testkjøring med individuell tilgang
- Story 4.4: Levere kandidatens før- og ettervurdering
- Story 4.5: Føre en skjermet instruktørvurdering underveis
- Story 4.6: Avslutte testkjøring og eksportere resultatet

## Requirements & Constraints

- Grunnkurset har 21 standardlinjer i eksisterende kildeorden. Skolebusslinje 413 inngår. Linjene 30, 421, 425, 428 og 450 er tilgjengelige for individuell tildeling. Linje 30 beholder merknaden om leddbuss og egen opplæring.
- Bevar eksisterende utkast, bekreftelser, datoer og avsendere utenfor grunnkursmalen. En tom rad i gammel mal gir ingen tildeling eller kjøreoppføring. Tildeling, faktisk kjøring og bekreftelse er separate handlinger. Historiske PDF-versjoner beholder sitt opprinnelige innhold.
- Testkjøring er en egen modul og dokumenttype med egen versjonert mal. Før-, etter- og instruktørdel bruker de samme 22 kriteriene fra testkjøringsskjemaet. Kandidatens svar er «OK» og «Kan bli bedre». Instruktøren har også «Ikke bestått», utfyllende kommentarer og et eksplisitt samlet resultat blant «Bestått», «Med forbehold» og «Nei».
- Hvert testløp har én identifisert kandidat, én tildelt instruktør og en avdeling. En kandidat uten Tide-konto eller ansattnummer skal kunne bruke en godkjent ekstern identitet. Tidsavgrenset individuell tilgang er arbeidsforslaget. Løpstilgang og innloggingsøkt håndteres separat, og lagringsreglene gjelder også etter utløp og tilbakekall.
- Sluttprøven bruker fiktive data, separate innlogginger og to enheter fra invitasjon til mobil PDF. Kontroller innsyn før og etter avslutning, gjenopptakelse, tilgang etter utløp eller tilbakekall, avbrutt lagring og uendret vurdering ved eksportfeil. Regresjonsprøv fadder-, teknisk- og linjeflyt. Fysiske enhetsprøver registreres separat fra automatiserte nettlesertester.

## Technical Decisions

- Bruk stabile identifikatorer for sjåfører, kandidater og linjer. Maloppgradering må bevare registrerte data og historiske eksportkilder. En tildeling er unik per sjåfør og linje. Gjentatte innsendinger og handlinger fra en foreldet visning må håndteres trygt.
- Delt lagring og serverhåndhevet innsyn krever et eget arkitekturvedtak for reelle brukere. Serveren kontrollerer identitet, tildelt rolle, konkret løp, utløp og tilbakekall ved hver lesing, skriving og eksport. En invitasjon inneholder ingen vurderingsdata, og en videresendt lenke alene gir ingen tilgang. Kandidatens svarmodell utelater instruktørens svar, kommentarer, resultat og PDF helt frem til kvittert avslutning.
- Før- og etterdelen har separate revisjoner og låses hver for seg ved innsending. Instruktørens parallelle lagring må bevare kandidatens revisjon. Avslutning fryser én dokumentkilde med faginnhold, faktisk aktør og tidspunkt. Gjenåpning og gjentatt eksport følger avtalt sluttinnsyn og samme låste kilde. Lange kommentarer må få plass over flere sider.
- Tide må avklare fullmakter for oppretting, tildeling og tilgangsstyring, også på tvers av avdelinger. Opplæringsansvarlig per avdeling, stedfortreder og IT er foreslåtte aktører. Driftsrettigheter og faglig innsyn avklares hver for seg. Beslutninger om ekstern identitet, driftsmiljø, underdomene, lagring, personopplysninger, oppbevaring og sletting gjenstår. Det samme gjelder hvem som styrer opplæringsstatus, sluttdato og eventuell senere tilgang til resultatet.

## UX & Interaction Patterns

- Vis valgt sjåfør og linje før tildeling. Skill standardlinjer, individuelle tildelinger og tidligere registrert opplæring. Vis faktisk status etter gjenåpning.
- Gi kandidaten og instruktøren hver sin visning uten rollebytte. Vis hvilken fase som er åpen, hva som er levert eller låst, og hvilken revisjon som sist ble lagret. Vis manglende deler før avslutning. Prosjekteier og Tide må avklare hvem som åpner etterfasen og avslutter, hva instruktøren kan lese underveis, samt hver parts dokumentinnsyn etter avslutning.
- Følg eksisterende mønstre for mobil registrering uten horisontal rulling, tydelige etiketter og lagringskvittering. Kontroller tastatur, fokus og tekstforstørrelse. Lever en selvstendig lesbar PDF med de tre vurderingsperspektivene og det avtalte sluttinnholdet.

## Cross-Story Dependencies

- 4.1 bygger på linjemalen og historikken fra 3.3. 4.2 bygger på 4.1. Linjestoryene kan gjennomføres uavhengig av testkjøringens identitets- og lagringsløsning.
- 4.3 krever en beslutning om identitet, lagring og tilgang for det aktuelle miljøet. 4.4 bygger på 4.3. 4.5 bygger på 4.3 og fasekontrakten fra 4.4. 4.6 bygger på 4.4 og 4.5 samt avklaring om avslutning og innsyn.
