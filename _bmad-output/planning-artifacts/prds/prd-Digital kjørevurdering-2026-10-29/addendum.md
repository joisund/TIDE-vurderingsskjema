# Skjemagrunnlag og føringer til UX og arkitektur

## Primærskjema kontrollert 2026-10-29

Begge sider i `docs/Eksempel vurderingsskjema.pdf` er rendret og visuelt lest. Side 1 har 22 kriterier og separate kolonner for sjåfør før kjøring, sjåfør etter kjøring og instruktør/fadder etter kjøring, med OK / Kan bli bedre og kommentar. Side 2 har veiledning og oppsummering første/siste dag med tre styrker, tre utviklingsområder, dato og signaturfelt.

Ordlyden nedenfor følger skjemaet med normalisert linjebryting og mellomrom. Virksomhetsnavnet i kriterium 10 er bevisst erstattet med en generisk betegnelse i samsvar med anonymiseringsføringen. Dette er et dokumentert avvik, ikke en ny offisiell ordlyd. Andre kategorier i skjemaets toppfelt er utenfor V1; fadder er valgt kontekst.

| Nr. | Kriterium til demokriteriesettet |
| --- | --- |
| 1 | Korrekt uniform/hygiene |
| 2 | Selvinnsikt / Stress / Nervøsitet |
| 3 | Kundebehandling / service |
| 4 | Matpakke/drikke |
| 5 | Teknisk kunnskap |
| 6 | Betjening av dører på holdeplasser |
| 7 | Billettering |
| 8 | Språk / Kommentarkjøring |
| 9 | Oppstart / daglig kontroll |
| 10 | Feilrapport i rapporteringsappen |
| 11 | Bruk av Sjåførkort |
| 12 | Se-teknikk og VTL §3 |
| 13 | Bruk av microfon |
| 14 | Rygging |
| 15 | Lover: Vikeplikt, forkjørs-vei, farts- og veimerking |
| 16 | Planlegging, tegn, signal og plassering |
| 17 | Samhandling i rundkjøring og kryss |
| 18 | Fartstilpasning og avstand til forankjørende |
| 19 | God flyt i nedoverbakke (utrulling / retarder) |
| 20 | God flyt inn mot og ut fra bussholdeplass |
| 21 | Fart og plassering før, gjennom og etter sving |
| 22 | God flyt over fartsdumper |

Kriterienes rettslige eller faglige innhold er ikke validert som del av PRD-arbeidet. Henvisninger er transkribert som skjematekst, ikke gitt som juridisk veiledning.

## Felt og bevisste tilpasninger

- Sjåfør og instruktør/fadder beholdes som felt med fiktive navn. Ansattnummer representeres av fiktiv deltaker-ID.
- Dato, buss 1, buss 2, linje, ut kl. og inn kl. finnes i primærskjemaet. Øvingsområde fra det omskrevne demoalternativet er ikke lagt til som kildekrav.
- Dag 1–8 er avkrysningsvalg i papirskjemaet. Prosjekteiers senere avklaring 2026-10-29 overstyrer dette for V1: normalt tre ordinære dager, kortere ved retur/lånesjåfør, og maksimalt fem dager inkludert oppfølging. Oppfølgingsdager legges til samme løp uten å åpne tidligere dager.
- «Ikke relevant» er et nytt produktvalg fra prosjekteier, ikke et alternativ i primærskjemaet. Sjåfør begrunner valget før kjøring, og det videreføres etter kjøring. Fadder bekrefter eller avslår i sin del; avslag krever egen kommentar, uten retur eller endring av sjåførens svar.
- Oppsummeringene bevarer plass til tre styrker og tre utviklingsområder, men er frivillige etter uttrykkelig avklaring fra prosjekteier. Fremtidig obligatorisk status må kunne innføres for nye registreringer.
- Sjåfør og fadder bekrefter hver sin del med navn. PDF-en skal skille mellom disse bekreftelsene. A6 er avklart; antakelsen om utelatt sjåførbekreftelse er erstattet. Fullt skjema vises til sjåføren når fadderperioden er fullført; fadder har ansvar for tilbakemelding underveis.
- Opprinnelig mottakertittel i veiledningen erstattes med generisk dokumentmottaker. Direkte levering, automatisk kopi og mottakersystem er ikke valgt.

## Til UX

Prioriter ett kriterium med tydelige, adskilte vurderinger fremfor å kopiere papirets brede tabell direkte til mobil. Dette er et designinnspill; skjermutformingen er ikke bestemt.

Bekreftelsesdialogene skal skille mellom sjåførens og fadderens del og vise hvem og hvilken dag som bekreftes. Førvurderingen skal bekreftes og låses separat før kjøring, før ettervurderingen åpnes. Ettervurderingen bekreftes etter kjøring. A9 er avklart; ingen bekreftet førvurdering kan endres ved senere registrering. Fadderens endelige låsedialog skal vise hvem og hvilken dag som låses. Mulig tekst: «Du bekrefter vurderingen for [sjåfør], [dato], som [faddernavn]. Dagens vurderinger, kommentarer og opplysninger låses permanent og kan ikke endres etterpå. Kontroller at dere er ferdige før du fortsetter.» Handlinger: «Tilbake til gjennomgang» og «Bekreft og lås dagen».

Skill mellom «Fortsett med oppfølging» og «Avslutt perioden». Videreføring holder løpet åpent og gir ikke fullt innsyn eller slutt-PDF. Endelig avslutning gir enten utfallet «Godkjent» eller «Fortsatt oppfølgingsbehov»; begge lukker perioden for nye dager og gir fullt innsyn og samlet PDF. Oppfølgingsbehov i et avsluttet løp betyr behov som må håndteres utenfor dette løpet, ikke ufullstendig skjema.

Varsler om ubesvarte vurderinger må ikke blandes med tomme, frivillige oppsummeringsfelt. «Ikke relevant» og «Kan bli bedre» må ikke fremstilles som OK eller som manglende utfylling.

## Til arkitektur

Ingen teknisk stakk er valgt. Vurder stabil identifikasjon av sjåfør, fadderløp, økt og kriterium, samt historisk bevaring av kriteriesett og krav til utfylling. Låsingen må ligge i reglene for lagring og endring, ikke bare i skjermens knapper.

Ved hver bekreftelse må den berørte delens innhold og bekreftelsesstatus bevares som en samlet tilstand. En feil senere på dagen skal aldri oppheve førvurderingens eksisterende låsing. En feil eller et avbrudd må ikke låse et halvlagret skjema. Gammel redigeringsvisning skal ikke kunne overskrive bekreftet dokumentasjon. Begge bekreftende navn og opplysningen om hvilken del hver person bekrefter må bevares historisk, ikke hentes dynamisk fra en redigerbar profil ved senere PDF-generering.

Velg hvor utkast lagres og beskriv konkret hva som virker under nettbrudd. PRD-en stiller krav til utfall, men lover ikke full offlinebruk. Vurder mekanismer for gjenåpning, tydelig lagringsstatus og gjentatt forsøk uten duplisering.

Fremtidig endring fra frivillig til obligatorisk oppsummering må kunne uttrykkes uten at alle skjermbilder må bygges om. V1 trenger ingen administrasjonsportal for regelendringen. Historiske bekreftelser må beholde reglene som gjaldt da de ble opprettet.

A5 er avklart: Løpet er pågående, under oppfølging eller endelig avsluttet. Videreføring kan legge til nye dager innen femdagersgrensen uten å åpne tidligere dager. Endelig avslutning er enveis og skjer én gang; den gir varig fullt innsyn og samlet slutt-PDF for alle periodens dager og beslutninger. Ingen nye dager tillates etter avslutningen. Ikke bygg gjenåpning, tilbaketrekking av innsyn eller versjonerte delavslutninger.

Senere bruk på to enheter krever videre arbeid med identitet, tilgang, samtidighet og konflikter. Dette bygges ikke i V1. Mobilapp og Power Apps er mulige videreføringer; gjenbruk må utprøves før det loves. Se `docs/plattform-og-gjenbruk.md` for tidligere notater, ikke for et vedtatt stackvalg.

## Relevans etter separat førvurderingslås

A2 er avklart: Sjåføren skriver begrunnelsen før låsing. Valg og begrunnelse videreføres til ettervurderingen. Fadder bekrefter eller avslår uten retur til sjåfør og uten å endre låst innhold. Ved avslag skriver fadder egen kommentar og avgir egen vurdering; ved enighet kan fadder bekrefte begrunnelsen uten ny fritekst. Utdypende kommentar er mulig også ved enighet.

Bevar sjåførens begrunnelse, fadderens avgjørelse og fadderens kommentar som adskilt informasjon med avsender. Dagsbekreftelse er ikke det samme som enighet om relevans. Både bekreftelse og dokumentert avslag kan gi en fullført dag. Vis forskjellen også i slutt-PDF-en.

Begrunnelsen skal være mer enn ett ord eller noen få tegn. A10 foreslår minst tre ord og 15 tegn som ikke er blanktegn, også for påkrevd avslagskommentar. Tallet er et UX-forslag, ikke et uttrykkelig brukerkrav. En lengdekontroll kan ikke garantere meningsfullt innhold.

## Øktopplysninger ved førvurderingslås

Sjåføridentitet (deltaker-ID og bekreftende navn), øktdato og kobling til økt/fadderløp låses sammen med førvurderingen. Låsingen må også hindre omkobling gjennom endring av overordnede profil- eller løpsdata. Senere navneendring skal ikke omskrive historisk bekreftende navn.

Buss 1/buss 2, linje og inn-tid kan fylles ut frem til dagslåsing. UX og arkitektur definerer en feltoversikt som skiller obligatorisk utfylling fra låsetidspunkt og konkretiserer de øvrige feltene, blant annet ut-tid og faddertilknytning. Ingen senere feltendring skal flytte førvurderingen til en annen person eller dag.

## Planleggingsmål for epics

Tre epics er fortsatt et foreløpig mål fra prosjekteiers tilbakemelding. Endelig inndeling gjøres etter UX og arkitektur, basert på sammenhengende leveranser og avhengigheter. Antallet er ikke en besluttet nedbrytning og skal ikke begrense nødvendige akseptansekriterier.
