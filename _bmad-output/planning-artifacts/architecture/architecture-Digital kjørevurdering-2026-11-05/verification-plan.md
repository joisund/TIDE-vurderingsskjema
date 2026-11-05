# Kontroller før demoakseptanse

**Godkjent testgrunnlag 2026-11-05, ikke utførte apptester.** Prosjekteier har godkjent Q1–Q7 med anbefalte valg. Dette konkretiserer A4/A8/A7 og skal brukes ved senere bygging. Bare dokumentkontrollene i sluttrapporten er gjennomført nå.

## A7: godkjent matrise

| Flate | Nettleser/utstyr | Kontroll |
| --- | --- | --- |
| Automatisk regresjon | Chromium, Firefox, WebKit; versjoner låst med testverktøy | S1–S10/F1–F6, lagring/låser, rolleinnsyn og filnedlasting. |
| Faktisk iPhone | Safari på siste og forrige støttede iOS-major ved akseptanse | Hele løp, skjermtastatur, skjermlås/gjenåpning, lokal lagring, PDF-fil og installert variant. Ingen antatt lagringsdeling mellom Safari og hjemmeskjerm. |
| Faktisk Android | Chrome stable og forrige major der tilgjengelig, støttet Android | Samme mobilflyt, TalkBack, nedlasting og installasjon. Hvis forrige versjon ikke kan prøves: dokumentér gap, ikke kryss av bestått. |
| Windows | Edge og Chrome siste/forrige stable major | Tastatur, NVDA/Edge, PDF-nedlasting, gammel fane, refresh/gjenåpning. |
| Responsivitet | 320, 360, 390, 768, 1280 CSSpx; portrett og mobil landskap | Ingen horisontal registreringsrulling. Sticky-overskrifter, etiketter og 44×48/44×44-trefflater beholdes. |
| Tilgjengelighet | 200 % tekst; 400 % zoom/reflow fra 1280 til 320 CSSpx | Ikke klipp tekst eller dekk fokus/dialogknapper. Tastaturfelle bare i modal, Escape/avbryt uten mutasjon og fokus tilbake. |

Ved akseptanse føres faktiske OS-, nettleser-, app-build- og skjermleserversjoner. Siste/forrige betyr akseptansedato, ikke en ubegrenset historisk støttegaranti. Desktop Safari/macOS og gamle OS-er er ikke lovet i V1; ønsket støtte må bestilles før testbaseline. PDF-lesing prøves i iOS/Android sin vanlige leser og minst én uavhengig desktopleser.

WCAG 2.2 AA er godkjent som kvalitetsmål for webgrensesnittet, med alle relevante kriterier vurdert. Kontroller særlig navn/rolle/fase/dag for svar, programmatisk feiltilknytning, leserekkefølge, fokus, statusmeldinger uten fokusflytt og bruk uten farge. Automatiske tilgjengelighetsskann må suppleres med VoiceOver/Safari, TalkBack/Chrome og NVDA/Edge. Dette er ingen sertifisering. Fargeprøver under er regnet om fra godkjente tokens, ikke en ny designretning.

| Faktisk kombinasjon | Forventet kontrast omtrent | Bruk/kontroll |
| --- | --- | --- |
| #53585F / #FFFFFF | 7,17:1 | Normal tekst og kontrollkant. |
| #53585F / #F1E2CE | 5,64:1 | Kategoritekst. |
| #361EBD / #FFFFFF | 10,11:1 | Valg, fokus, hjelp og feiltekst; hvitt på indigo primærknapp samme forhold. |
| #361EBD / #F1E2CE | 7,95:1 | Fokus/tekst der denne flaten faktisk brukes. |
| #53585F / #E0D3C3 | 4,87:1 | Tekst på sand der brukt. |
| #2FDA95 / hvitt; sand/hvitt | 1,81:1; 1,47:1 | Bare logo/dekor, aldri eneste nødvendige kontrollinformasjon. |
| #333333 / PDF-fyll | Beregnes i dokumentkontroll | Grønne/gule/røde svar har også tekst eller symbolforklaring; gråtoneutskrift prøves. |

## A4/A8: avbrudds- og feilprøver

1. Fyll og endre alle felttyper, også frivillig tekst og plan. Mål tidspunkt for input, lagringsstart og complete; målet er complete innen 2 s etter siste input i samme testprofil som punkt 3. «Lagret» må aldri vise en eldre revisjon som siste innhold; prøv periodisk flush ved kontinuerlig skriving.
2. Fullfør ressurslasting, koble nett fra i 60 s. Fortsett vurdering, lagring, før-/etterbekreftelse og dagslås. Slå nett på igjen. Verifiser samme kvitterte innhold/låser og ingen synkduplikater. Nettstatus og lokal lagringsstatus prøves uavhengig.
3. Refresh og lukk/gjenåpne med nett, samme origin/profil, bevart DB. Mål <=5 s fra navigasjonsstart til riktig run/day og kvittert tilstand er lesbar. Testprofil føres med utstyr, nett og datamengde: fem dager i ett løp, fem lagrede løp. Langsom/feil initial ressurslasting rapporteres separat og må ikke bortforklares som datatap.
4. Avbryt prosessen før og etter transaksjonscomplete ved hver lås og avslutning. Resultatet skal være opprinnelig utkast eller full lås/avslutning. Reload viser faktisk tilstand før retry; eksisterende låser og innsyn bevares.
5. Injiser kvote-/transaksjonsfeil. Vis ikke Lagret; behold dirty tekst, blokker bekreftelse/rollebytte som ville miste tekst, og prøv retry. Frivillig tekst er fortsatt ulagret innhold, selv om den kan hoppes over når den er tom.
6. To faner/gammel dialog: lagre ny revisjon og lås i én, forsøk endring i gammel. Ingen silent overwrite. Samme commandId gjentas før/etter reload og ved tapt kvittering; endret payload med samme ID avvises. Dobbeltklikk utvidelse/opprettelse/avslutning må ikke duplisere.
7. Prøv blokkert DB, persistent storage avslag, versionchange/blocked upgrade, ukjent nyere schema og mislykket migrering. Ingen automatisk reset. Privat profil, slettet lager, origin-/profilbytte og offline-kaldstart dokumenteres som avgrensninger, ikke tap innen avtalt garanti.

## Domene, låser og innsyn

- Ett-, kort-, tre- og femdagersløp; 66/110/154/242 svarposisjoner. Ingen nye førvurderinger dag 2–5. Samme dato finner eksisterende dag; dag 6 og nye dager etter avslutning avvises. Q6 prøves også ved endring av ulåst dato.
- Dag 1 arver bare før-Ikke relevant låst; én behandling per videreført punkt. Dag 2–5 har egne svar. Endret sjåførbegrunnelse invaliderer tidligere behandling, men bevarer fadders egne utkast. Avslag og Kan bli bedre er gyldige, uten automatisk godkjenning.
- A10-grenser: ett langt ord avvises; to ord under ti normaliserte tegn avvises; tegnsetting alene teller ikke. Unicode, tabs/linjeskift, blanktegn og de to godkjente eksemplene prøves med samme regel i alle flater.
- Feltlåsene kontrolleres direkte via applikasjonskommandoene, også etter profil-/fadderbytte og gammel visning. Sjåfør kan bekrefte uten buss/linjer/tider når fadder må fullføre; fadders lås krever alt. Klienttid over midnatt skal ikke få utilsiktet ny produktregel.
- Fadder kan arbeide før sjåfør er ferdig. Oppfølging endrer plan atomisk. Q7: samme dags +1→+2 skal erstatte effekten, ikke kumulere; Ja→Nei trekker bare ulåst effekt tilbake innen AD-8-grensene, uten å slette hendelser eller andre/låste beslutninger. Ny dag kan ikke overstige gjeldende plan. Sen utvidelse bevarer tidligere egenevaluering og tilbyr ny. Ett-dagsløp har ett sett; Hopp over låser ikke dagen alene. Mellomdag er not_offered uten oppfunnet brukervalg. Utvidet kjøretrening lager ikke egen trenings-/klarsignalfunksjon.
- Rollebytte kontrolleres i DOM, dialoger og hurtig tilbake-navigasjon, ikke bare visuelt. Sjåfør får ingen faddertekst før avslutning. Begge avslutningsutfall gir varig fullt innsyn. Q4 styrer planvisning.

## PDF og byggekvalitet

- Ren installasjon med eksakte låste pakker, TypeScript/bygg og relevante domene-/adaptertester. Ressurslasting før registrering må inkludere PDF-motor, logo og godkjent font; ingen CDN. Mål minne/tid på faktisk telefon før valg av eventuell worker.
- Kontroller begge avslutningsutfall, førbekreftelse én gang, etter-/fadderbekreftelser per dag, faktiske fadderbytter, relevansavslag, alle kommentarer, tomme/frivillige felter, sen utvidelse, konklusjon og planhendelser. Sammenlign eksportmodellen med frosset DB-snapshot.
- Femdagersmatrise: 22 rader, én førkolonne, ti daglige kolonner, legend og synlige markeringer. Korte data følger godkjent tosidig prinsipp. Lange tekster gir flere stående sider med fortsatte etiketter og sidetall; ingen femsiders fast mal.
- Render alle genererte sider og inspiser tekst/sidebrudd, norsk/svensk æøå/åäö, 10 000 tegn i én kommentar og flere lange kommentarer. Ingen lang blokk må tvinges til å forbli på én side. Ingen produktgrense for fritekst innføres gjennom testdataene.
- Kontroller godkjent Noto Sans-font etter Q5 og dokumentér filkilde/lisens/hash. Søkbar tekst og fornuftig leserekkefølge prøves; PDF/UA/PDF-A inngår ikke som vedtatt krav. Alle sider ved eventuell diagnostisk ufullstendig fil får FR-18-merke. Normalflow skal stoppe før slik fil tilbys.
- Gjenta nedlasting uten å endre låst faginnhold. Feil/retry skal verken opprette nye bekreftelser eller åpne løpet. Nedlastet fil skal åpnes uten app og manuelt kunne overleveres; ingen integrasjonstest mot et faktisk HR-system.
