# Fysisk sluttprøve for Epic 4

Fysisk prøve gjenstår. Samle resultat for hvert steg med enhet, OS, nettleser, Git-commit og testadresse. Prøv med fiktive navn, adresser, nummer og fritekst. Gjør prøven stasjonært med en telefon som kandidat og en annen enhet som instruktør. Bruk separate nettleserøkter og samme HTTPS-adresse for testen. [Pilotoppstart og HTTPS-oppsett](../../app/README.md#pilot-for-testkjøring).

## Oppstart i denne arbeidskopien

Kjør i PowerShell på Windows. Punktene for lokal nettleser kan prøves på loopback. For fysisk prøve, sett HTTPS-innstillingene i pilotoppsettet før oppstart. Begge enheter må nå vertsnavnet og godta sertifikatet.

```powershell
Set-Location 'D:\TIDE vurderingsskjema\app'
$env:Path = (Resolve-Path -LiteralPath '../.cache/story-1-1/node-v26.13.0-win-x64').Path + ';' + $env:Path
$env:PILOT_DB = Join-Path (Resolve-Path '..').Path '.cache/epic-4-fysisk-prove/data.sqlite'
$env:VITE_BUILD_ID = git rev-parse --short HEAD
npm.cmd run pilot:seed
npm.cmd run build
npm.cmd run pilot:start
```

Åpne `/testkjoring/` på pilotadressen. Lokalt er adressen `http://127.0.0.1:4173/testkjoring/`. For postkassen, bruk samme Node-versjon og den samme `PILOT_DB`-verdien i en annen terminal fra app-mappen.

## Pilotkontoer

| Rolle | Fiktiv adresse i lokalt oppsett |
| --- | --- |
| Oppretter med tillatelse for Bergen | `opplaering-bergen@pilot.test` |
| Tildelt instruktør | `instruktor-bergen@pilot.test` |
| Kandidat | `kandidat-1@pilot.test` |
| Annen kandidat | `kandidat-2@pilot.test` |

Pilotkontoene klargjøres med `npm.cmd run pilot:seed` i app-mappen. Bruk `npm.cmd run pilot:mailbox -- <adresse>` på servermaskinen for å finne aktiv engangskode til den fiktive kontoen. Kjør postkassekommandoen med samme `PILOT_DB` som serveren. Den lokale postkassen etterligner e-postlevering for prøven. Bruk en egen nettleserprofil for oppretteren når samme enhet også brukes av instruktøren. Faner i samme profil deler innloggingen.

## Grunnkurs og linjetildeling

1. Åpne appens startside i en egen testprofil. Velg **Instruktør** under **Simuleringsrolle**. Bruk **Opprett sjåfør** til å lage to med likt fiktivt navn, for eksempel «Åse Øvelø», med ansattnumrene `DEMO-LINE` og `DEMO-ANNEN`. Velg den første og trykk **Ny linjeopplæring**. Grunnkurslisten viser 21 rader, deriblant 413. Linje 30, 421, 425, 428 og 450 ligger i katalogen for individuell tildeling.
2. Bytt til **Sjåfør**, velg **Legg til registrering**, før en fiktiv dato på 413 og bytt tilbake. Bruk **Bekreft registreringer**, velg raden og tast et fiktivt instruktørnavn før **Lås valgte registreringer**. Hent PDF for denne første versjonen.
3. Velg **30** i **Ekstralinje**, trykk **Tildel ekstralinje** og bekreft at dialogen viser nummer `DEMO-LINE` og merknaden «Kjøres med leddbuss. Egen opplæring». Trykk **Bekreft tildeling**. Åpne dokumentet på nytt og finn 30 under **Individuelt tildelte linjer** uten bekreftet kjøredato. Den samme linjen skal fortsatt være tilgjengelig for tildeling på `DEMO-ANNEN`.
4. Bytt til **Sjåfør** i første dokument og før en annen fiktiv dato på 30. Bekreft den som **Instruktør** og last ned ny PDF. Åpne filen i enhetens PDF-leser og sjekk linje, kjøredato, merknad og bekreftende navn. Velg **Bekreftet historikkversjon** 1 og last ned på nytt. Den tidligere versjonen skal fremdeles vise den opprinnelige 413-registreringen og samme faglige innhold som i steg 2.

## Testkjøring på to enheter

1. Logg inn som oppretter og åpne **Opprett testkjøring**. Velg Bergen, kandidat `kandidat-1@pilot.test` med navn «Nora Eksempel», instruktør «Emil Eksempel» med adresse `instruktor-bergen@pilot.test`, og sett utløpet etter sluttprøven. Trykk **Opprett og inviter**. Åpne **Invitasjonslenke** på de to enhetene og logg inn med hver sin fiktive adresse og engangskode. Prøv samme lenke i en tredje økt med `kandidat-2@pilot.test` og kontroller at løpet er utilgjengelig.
2. På telefonen svarer du på **Punktlighet** i **Førvurdering**, trykker **Lagre førvurdering** og venter på «Lagret utkast · Revisjon 1». Gjenåpne samme lenke med samme kandidat og kontroller at valget ligger der. Endre et annet svar og slå midlertidig av nett på telefonen. Prøv å lagre. Feilmeldingen skal vises ved knappen, og valget skal fortsatt være valgt. Slå på nett og prøv å lagre igjen. Kontroller ny kvittert revisjon og valg etter gjenåpning. Fyll deretter ut alle 22 og trykk **Lever førvurdering**. Kontroller lås og at etterdelen venter.
3. Bruk **Oppdater status** på instruktørens enhet. I **Instruktørvurdering** fører du et instruktørsvar, en kommentar til **Punktlighet** og en utfyllende **Samlet kommentar**. Bruk «INSTRUKTØRPRØVE ÆØÅ» som testmerke og legg inn en fiktiv kommentar på rundt 70 linjer for å få sideskift i PDF. Trykk **Lagre instruktørvurdering**. Oppfrisk kandidatens enhet og kontroller at instruktørens tekst, valg, resultat og PDF er skjermet.
4. Trykk **Bekreft gjennomført kjøring** som instruktør og deretter **Oppdater status** på telefonen. Legg inn et annet svar på **Punktlighet** i etterdelen enn i førdelen. Fyll ut alle 22 og trykk **Lever ettervurdering**. Kontroller at det opprinnelige før-svaret fortsatt er låst. Lever instruktørdelen med et eksplisitt resultat. Kandidaten får innsyn først etter sluttsteget.
5. Som instruktør bruker du **Oppdater leveringsstatus** hvis etterdelen fortsatt står som manglende. Trykk **Avslutt testkjøringen** og deretter **Avbryt**. Kontroller at kandidatens innsyn fortsatt er skjermet. Åpne avslutningen igjen og trykk **Bekreft avslutning**. Oppdater kandidatens side og finn **Resultat av testkjøringen** hos begge. Se etter låst før-, etter- og instruktørsvar, avsluttende instruktør, kommentarer og resultat.
6. Bruk **Last ned testkjørings-PDF** hos begge roller. Åpne filene i enhetenes filmapper og sammenlign de 22 kriteriene, de tre svarkolonnene, valgt resultat og start og slutt på den lange kommentaren. Bekreft at kommentaren kan leses over et sideskift. Slå midlertidig av nett på telefonen og prøv en ny eksport. Vent på feilmeldingen. Slå på nett og prøv nedlasting igjen. Sammenlign faginnhold og tidspunkt med første fil.
7. Trekk tilbake tilgangen fra oppretterens **Tilgangsstyring**, og la kandidatens nettleserøkt stå åpen. Oppdater løpet på telefonen og prøv samme invitasjonslenke igjen. Forvent avslag uten faglig innsyn og uten ny PDF-nedlasting. Instruktøren skal fremdeles kunne hente dokumentet i egen økt. Gjenta eventuelt med en kort frist på et nytt fiktivt løp for å prøve utløp uten tilbakekall.

## Ved avvik

Noter stegnummer, enhet, nettleser og det faktiske resultatet. Behold lagrede fiktive data til feilen er undersøkt. Ny kjøring etter retting skal starte fra en kjent fiktiv tilstand og gjennomføre det berørte steget på nytt.
