# Fysisk sluttprøve for Epic 4

Planlagt for gjennomgang etter implementering og automatiske prøver. Samle resultat for hvert steg med enhet, OS, nettleser, bygg-ID og testadresse. Prøv med fiktive navn, adresser, nummer og fritekst. Gjør prøven stasjonært med en telefon som kandidat og en annen enhet som instruktør. Bruk separate nettleserøkter og samme HTTPS-adresse for testen.

## Pilotkontoer

| Rolle | Fiktiv adresse i lokalt oppsett |
| --- | --- |
| Oppretter med tillatelse for Bergen | `opplaering-bergen@pilot.test` |
| Tildelt instruktør | `instruktor-bergen@pilot.test` |
| Kandidat | `kandidat-1@pilot.test` |
| Annen kandidat | `kandidat-2@pilot.test` |

Pilotkontoene klargjøres med `npm.cmd run pilot:seed` i app-mappen. Bruk `npm.cmd run pilot:mailbox -- <adresse>` på servermaskinen for å finne aktiv engangskode til den fiktive kontoen. Kjør postkassekommandoen med samme `PILOT_DB` som serveren. Den lokale postkassen etterligner e-postlevering for prøven.

## Grunnkurs og linjetildeling

1. Opprett to fiktive sjåfører med likt navn og hvert sitt testansattnummer. Åpne linjeopplæringen for den første. Grunnkurslisten viser 21 rader, deriblant 413. Linje 30, 421, 425, 428 og 450 skal være borte fra standardlisten. Prøv at 413 kan velges som kjørt linje.
2. Tildel linje 30 til den første sjåføren fra instruktørens testrolle. Bekreft valgt sjåfør og linje. Åpne oversikten på nytt og kontroller at linjen er tildelt og viser merknaden om leddbuss og egen opplæring. Kontroller at den andre sjåføren fortsatt har sine egne linjer.
3. Bruk sjåførrollen i linjeflyten for å føre en fiktiv dato på linje 30. Bekreft den som instruktør og last ned PDF. Åpne den lagrede filen i enhetens PDF-leser og sjekk linje, kjøredato, merknad og faktisk bekreftende navn. Åpne også en tidligere bekreftet versjon fra en klargjort fiktiv historikk og kontroller opprinnelig innhold.

## Testkjøring på to enheter

1. Opprett én testkjøring med fiktive prøveidentiteter. Tildel instruktør og kandidat, og gi kandidaten utløp etter sluttprøven. Logg inn på hver enhet med sin egen identitet. Kontroller at kandidaten kommer inn med ekstern testidentitet uten ansattnummer. Prøv samme lenke med en tredje testidentitet og forvent avslag på løpet.
2. Som kandidat fyller du inn noen før-svar, venter på lagringskvittering og gjenåpner på samme adresse. Kontroller at svarene fortsatt ligger der. Fyll deretter ut alle 22 og lever førdelen. Bekreft at den er låst og at etterdelen er stengt før instruktøren åpner den.
3. Før et instruktørsvar, en kommentar per kriterium og en egen utfyllende kommentar på instruktørenheten. Bruk en særpreget fiktiv tekst, for eksempel «INSTRUKTØRPRØVE ÆØÅ». Oppfrisk kandidatens enhet og se etter at verken teksten, instruktørresultatet eller PDF-en er synlig.
4. Åpne etterfasen som instruktør. Som kandidat endrer du minst ett svar fra førdelen i etterdelen og leverer alle 22. Kontroller at før-svaret fortsatt er låst. Lever instruktørdelen med et eksplisitt resultat. Kandidaten får fortsatt skjermet innsyn frem til sluttsteget.
5. Avslutt som tildelt instruktør. Gjenåpne på begge enheter og finn før-, etter- og instruktørsvarene, kommentarene og resultatet. Kontroller at sluttversjonen er låst. Last ned PDF fra hver rolle, åpne filene fra enhetens faktiske filmappe og sammenlign de 22 kriteriene, valgt resultat og fiktive kommentarer. Prøv en lengre kommentar som fortsetter på neste side.
6. Trekk tilbake tilgangen for kandidaten eller bruk et kort utløp på et separat fiktivt løp. Behold kandidatens aktive nettleserøkt. Oppfrisk løpet og forsøk på nytt å hente dokumentet. Forvent avslag fra samme adresse selv om innloggingsøkten fortsatt finnes. Instruktørens dokumenthistorikk skal fremdeles være tilgjengelig innen egen tillatelse.

## Ved avvik

Noter stegnummer, enhet, nettleser og det faktiske resultatet. Behold lagrede fiktive data til feilen er undersøkt. Ny kjøring etter retting skal starte fra en kjent fiktiv tilstand og gjennomføre det berørte steget på nytt.
