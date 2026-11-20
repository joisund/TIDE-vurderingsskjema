---
title: "Epic 4 – Testkjøring og individuell tildeling av linjeopplæring"
status: review
created: 2026-11-19
epic: 4
baselineCommit: c5c0e85
---

# Epic 4 – Testkjøring og individuell tildeling av linjeopplæring

Kandidaten kan gjennomføre en testkjøring med egenvurdering før og etter turen. Instruktøren kan dokumentere sin vurdering underveis, og kandidaten får innsyn i den etter avslutning. Sjåføren får grunnkursets linjer som standard og kan få øvrig linjeopplæring tildelt når det blir aktuelt.

Epicen har seks stories. Linjeendringen viderefører linjedokumentet fra Story 3.3. Testkjøring har egen arbeidsflyt og egen lagring, med tidsbegrenset, individuell tilgang for fiktive kandidater uten Tide-konto eller ansattnummer. Tide må fastsette hvem som skal gi tilgang, opprette løp og tildele linjer ved reell bruk. [Implementeringsstatus og testgrunnlag](../implementation-artifacts/overlevering-epic-4.md).

## Grunnlag og avhengigheter

- Evalueringsskjema for testkjøring fra Teamleders verktøykasse 2018 gir 22 egne kriterier, før- og etterkolonnene, instruktørens kolonne og kommentarer samt instruktørens samlede resultat. Baksiden gir plass til utfyllende instruktørkommentarer. [Kontrollert avskrift av kildekriteriene](../implementation-artifacts/epic-4-testkjoring-teknisk-grunnlag.md#kildegrunnlag-for-malen).
- Story 3.3, commit `c5c0e85`, gir den versjonerte linjemalen, sjåførkoblingen, bekreftelsene og PDF-historikken som Epic 4 bygger på.
- [PRD](prds/prd-Digital%20kjørevurdering-2026-10-29/prd.md), [UX-design](ux-designs/ux-Digital%20kjørevurdering-2026-10-29/DESIGN.md), [UX-flyt](ux-designs/ux-Digital%20kjørevurdering-2026-10-29/EXPERIENCE.md) og [arkitektur](architecture/architecture-Digital%20kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md) gir eksisterende skjema-, tilgjengelighets- og historikkmønstre. Delt lagring og serverhåndhevet innsyn for testkjøring krever et eget arkitekturvedtak før implementering med reelle brukere. Valg av innlogging, driftsmiljø og Tide-underdomene hører til dette vedtaket.

| Story | Brukerresultat | Avhengighet |
| --- | --- | --- |
| 4.1 | Nye grunnkurs viser de 21 aktuelle linjene, med bevart linjehistorikk. | 3.3 |
| 4.2 | Linjer utenfor grunnkurset kan tildeles riktig person individuelt. | 4.1 |
| 4.3 | Kandidat og instruktør får avgrenset tilgang til samme testkjøring. | Beslutning om identitet, serverlagring og tilgang for det aktuelle miljøet |
| 4.4 | Kandidaten leverer egenvurdering før og etter kjøring. | 4.3 |
| 4.5 | Instruktøren lagrer sin vurdering underveis med skjermet innsyn. | 4.3 og 4.4s fasekontrakt |
| 4.6 | Partene avslutter testkjøringen og får avtalt innsyn og PDF. | 4.4, 4.5 og beslutning om avslutning og innsyn |

Linjestoryene kan planlegges og utvikles uavhengig av testkjøringens identitets- og lagringsløsning. Den avtalte V1-planen er referanse for rekkefølgen før en eventuell senere sprint tar inn Epic 4.

## Story 4.1 – Bruke oppdatert grunnkursmal

Som sjåfør vil jeg se grunnkursets ordinære linjer i standardoversikten, slik at jeg ser hvilke linjer som inngår i opplæringen nå.

**Akseptkriterier**

1. Når en ny grunnkursoversikt opprettes, viser den disse 21 linjene i eksisterende kildeorden: 20, 21, 22, X23, 24, 26, X27, 28, X29, X31, X32, 33 (M1), 34 (M2), X35, X36, 40, 42, X43, X44, 413 og 550. 413 er skolebusslinjen som beholdes som uttrykkelig unntak i intervallet 400–450.
2. Linje 30 og distriktslinjene 421, 425, 428 og 450 er ute av standardmalen. De kan fortsatt identifiseres i linjekatalogen med sine opprinnelige ID-er. Linje 30 beholder merknaden om leddbuss og egen opplæring.
3. Den reviderte malen har egen versjon og gjenbruker stabile linje-ID-er. Ved oppgradering av et eksisterende dokument bevares faktisk registrerte utkast, bekreftelser, datoer og avsendere. En tom rad fra gammel standardmal oppretter ingen tildeling eller kjøring. Den nye grunnkursoversikten kan skille mellom standardlinjer og eksisterende registreringer utenfor standarden.
4. En tidligere bekreftet PDF-versjon kan fortsatt eksporteres med sine opprinnelige rader, merknader og bekreftelser. Testene sammenligner en ny oversikt, et eldre dokument med utkast og bekreftet opplæring på linjer som nå tas ut, og en uendret historisk eksport.

## Story 4.2 – Tilordne en linje senere til én sjåfør

Som den som har fått rett til å tildele linjeopplæring, vil jeg velge en sjåfør og legge til aktuelle linjer når opplæringen blir relevant, slik at den enkelte får riktig oversikt.

**Akseptkriterier**

1. En autorisert bruker kan finne en sjåfør ved stabil sjåførreferanse, velge 30, 421, 425, 428 eller 450 fra katalogen og bekrefte tildelingen. Oversikten viser sjåfør og valgt linje før bekreftelse. Tildelingen lagres for den valgte sjåføren og vises etter gjenåpning.
2. Samme linje kan bare få én tildeling per sjåfør. Gjentatt innsending, bytte av sjåfør fra en eldre visning eller mangel på tilgang oppretter ingen tildeling til feil sjåfør. En tildeling endrer ingen andres oversikt.
3. En tildelt linje vises som tilgjengelig for opplæring. Faktisk kjøredato registreres separat og instruktøren bekrefter etter reglene i Story 3.3. Linje 30 viser opplæringsmerknaden også ved tildeling og bekreftelse.
4. Ved ny bekreftelse inkluderer den nye PDF-versjonen bekreftet opplæring på den tildelte linjen med faktisk dato og bekreftende instruktør. En tildeling alene gir ingen bekreftet kjøring. Tidligere PDF-versjoner kan fortsatt lastes ned fra sine låste kilder.

## Story 4.3 – Opprette en testkjøring med individuell tilgang

Som den som har fått rett til å opprette testkjøringer, vil jeg koble én kandidat og én instruktør til et løp, slik at begge kan bruke det fra hver sin enhet med riktig tilgang.

**Akseptkriterier**

1. En autorisert oppretter kan opprette en testkjøring med identifisert kandidat, tildelt instruktør og relevant avdeling. Kandidatens interne referanse kan opprettes uten ansattnummer. Like navn kobler ingen personer sammen. Oppretting eller gjentatt forsøk gir ett løp og oppretter ingen fadder-, linje- eller tekniskdokumenter.
2. Testkjøringen bruker en egen versjonert mal. Malen gjør rede for kildens hodefelter: kandidat og kontakt, instruktør, dato og avdeling, buss, førerkort, YSK, kjøreseddel, erfaring med tunge kjøretøy og kjennskap til området. Hvilke felt som trengs i praksis, hvem som fører dem og hvem som får se dem, avklares før de tas i bruk med reelle kandidater.
3. En kandidat uten Tide-konto kan logge inn med godkjent ekstern identitet og finne sitt tildelte løp. En personlig e-postinvitasjon med engangskode er et mulig valg. Invitasjonen inneholder ingen vurderingsdata. En videresendt lenke alene gir ingen tilgang.
4. Serveren kontrollerer innlogget identitet, tildelt rolle og tilgang til det konkrete løpet ved hver lesing, skriving og eksport. En annen kandidat, instruktør uten oppdrag på løpet og en innlogget bruker uten relevant tildeling får avslag. Klienten tilbyr ingen rollebyttehandling i denne flyten.
5. Kandidattilgang kan gis med sluttdato og trekkes tilbake før utløp. Ved utløp eller tilbakekall avviser serveren neste forespørsel om løpet, også for en eksisterende innloggingsøkt. Historikken følger sin egen lagringsregel. Kortvarig innlogging og tilgang frem til sluttdato er to egne kontroller.
6. Før produksjonsbruk fastsetter Tide hvem som får gi og trekke tilbake tilgang, opprette løp og tildele instruktører. Testmiljøet prøves med fiktive identiteter, separate innlogginger og to enheter.

## Story 4.4 – Levere kandidatens før- og ettervurdering

Som kandidat vil jeg dokumentere egen vurdering før og etter kjøringen, slik at endringen i mitt eget perspektiv kan brukes i samtalen.

**Akseptkriterier**

1. Kandidaten åpner testkjøringen fra sin egen visning og ser tydelig om vedkommende jobber med før- eller etterdelen. Begge kolonner har de 22 kriteriene fra den versjonerte testkjøringsmalen og kildens kandidatsvar «OK» og «Kan bli bedre».
2. Før- og etterdelen har hver sin lagrede revisjon og innsending. Kandidaten leverer og låser førdelen før kjøringen starter. Etterdelen åpnes for utfylling og egen innsending når kjøringen er gjennomført. Oppfrisking, gjenåpning og gjentatt innsending kan verken omskrive før-svaret eller kopiere det inn som etter-svar.
3. Utkast kan gjenopptas etter ny innlogging fra en annen enhet, med korrekt kandidat, fase og sist kvitterte revisjon. Ved lagringsfeil vises at siste endring ikke ble lagret. Et gjentatt forsøk gir én innsending. Mobilprøven dekker før- og etterfasen med fiktive data.

## Story 4.5 – Føre en skjermet instruktørvurdering underveis

Som tildelt instruktør vil jeg føre min faglige vurdering og kommentarer mens testkjøringen pågår, slik at jeg kan dokumentere observasjonene mens de er ferske.

**Akseptkriterier**

1. Instruktøren kan føre sin egen vurdering underveis uten at kandidatens etterdel er levert. Den bruker de samme 22 kriteriene fra testkjøringsmalen, kildens instruktørvalg «OK», «Kan bli bedre» og «Ikke bestått», og et felt for utfyllende instruktørkommentarer.
2. Instruktøren kan registrere kildens samlede resultat «Bestått», «Med forbehold» eller «Nei». Resultatet velges uttrykkelig av instruktøren. Ved lagring eller levering bevares instruktøridentitet, valgt resultat og faglig innhold. Kandidatens før- og ettervurdering har egne skrivegrenser.
3. Før gjennomført avslutning utleverer serveren ingen instruktørsvar, kommentarer, foreløpig resultat eller PDF med dette innholdet til kandidaten. Dette prøves med to separate innlogginger, også etter oppfrisking og ved direkte forespørsel om dokument eller eksport. Kandidaten kan fortsatt føre og gjenåpne egen ettervurdering.
4. Instruktørens utkast og innsendte vurdering kan gjenfinnes med riktig lagringsstatus. Samtidige lagringer fra kandidat og instruktør bevarer hver parts revisjon. Gyldig innsending lagres én gang ved nytt forsøk.

## Story 4.6 – Avslutte testkjøring og eksportere resultatet

Som kandidat og instruktør vil jeg få tilgang til den avsluttede testkjøringen etter avtalt innsynsregel, slik at vi kan gjennomgå og dokumentere resultatet.

**Akseptkriterier**

1. Forslaget er at tildelt instruktør avslutter uttrykkelig etter kandidatens leverte før- og etterdel og fullført instruktørvurdering. Før avslutning vises manglende deler. Innsyn og sluttdokumentasjon åpnes først etter serverens kvittering for avslutningen.
2. Avslutning låser svar, kommentarer og resultat og registrerer faktisk avsluttende aktør og tidspunkt. En avbrutt avslutning kan prøves på nytt uten doble sluttversjoner eller for tidlig innsyn. Senere endring av mal, avdeling eller brukerprofil omskriver ingen låste opplysninger.
3. Godkjent sluttinnsyn håndheves også ved gjenåpning og nedlasting. En egen testkjørings-PDF gjengir kandidatens før og etter, instruktørens kriteriesvar, kommentarer og samlet resultat i tråd med den godkjente innsynsregelen. Lengre kommentarer kan fortsette på flere sider. Gjentatt eksport bruker samme låste kilde.
4. Sluttprøven gjennomføres med to innlogginger på separate enheter med fiktive data, fra invitasjon til lesbar PDF på mobil. Prøven dekker innsyn før og etter avslutning, utløpt eller tilbakekalt tilgang, avbrutt lagring og ny innlogging. Feil ved PDF-eksport endrer ingen lagret vurdering. Ordinær fadder-, teknisk- og linjeflyt regresjonsprøves.

## Åpne beslutninger

- **Tildeling og oppretting.** Opplæringsansvarlig per avdeling, stedfortreder ved behov og IT er mulige aktører foreslått av prosjekteier. Tide må avklare hvem som kan opprette løp, tildele instruktør og linjer, og gi eller trekke tilbake tilgang på tvers av avdelinger. Teknisk driftstilgang og lesetilgang til kandidatens vurdering avklares hver for seg.
- **Tilgang under opplæring.** Avklar hvordan statusen «under opplæring» registreres, hvilken sluttdato som gjelder og hvem som korrigerer eller forlenger den. Avklar tilgang for testkjøring før ansettelse og om den samme tidsavgrensede ordningen skal dekke senere opplæringsmoduler. Beslutt om kandidaten skal kunne hente resultat eller PDF i en egen periode etter avslutning.
- **Faser, avslutning og innsyn.** I piloten åpner tildelt instruktør etterfasen etter gjennomført kjøring og avslutter etter tre leverte deler. Partene ser egne faglige svar frem til avslutning. Begge får samme sluttinnsyn med aktiv tilgang. Tide fastsetter fasefullmaktene og innsynsreglene for reell bruk.
- **Drift og oppbevaring.** Tide velger innloggingsløsning, serverlagring, driftsmiljø og eventuelt underdomene. Avklar hvilke personopplysninger skjemaet trenger, hvem som skal ha endelig dokumentasjon, og hvordan data oppbevares og slettes. Prosjektets nåværende pilot gir grunnlag for fiktive prøver.
