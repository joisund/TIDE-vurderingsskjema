# HISTORISK – ikke gjeldende kravgrunnlag

Dette uttrekket ble skrevet før senere avklaringer om maksimalt fem dager, bekreftelse fra både sjåfør og fadder og innsyn ved fullført periode. Beskrivelser av åtte dager, egen oppfølgingsdel og utelatt sjåførbekreftelse er foreldet. Bruk `../reconcile-brief.md` og `../prd.md` for gjeldende status. Teksten nedenfor er bevart som historikk, ikke som nye instrukser.

---

# Kildeuttrekk og avstemming mot PRD

Dato: 2026-10-29. Kilder: ferdigstilt produktbrief og tilhørende addendum fra 2026-10-28, `docs/skjemagrunnlag.md` og `docs/plattform-og-gjenbruk.md`. Sammenligningsgrunnlag: PRD-oppstartsutkastet lest før innarbeiding av prosjekteiers nye svar.

## Bekreftet omfang fra kildene

- Mobiltilpasset webapp/PWA med fiktive data; skal også fungere i nettleser på større skjermer. V1 demonstrerer et helt fadderløp over flere dager og er ikke godkjent for produksjonsbruk.
- Flyt: opprett løp og økt, sjåfør før kjøring, sjåfør etter kjøring, fadder etter kjøring med kommentarer, felles gjennomgang, nye økter og til slutt oppsummering og PDF.
- Alle 22 kriterier og tre separate vurderinger bevares. Dag 1–8 må kunne representeres; femdagersgrense er avvist. Kildene fastsetter ikke at åtte dager er maksimalgrensen.
- Rollebytte på samme enhet i V1. Vurderinger skal knyttes til riktig rolle og økt. Rollebytte er demonstrasjon av arbeidsdeling, ikke tilgangssikring.
- Utkast skal lagres, gjenåpnes og gjenfinnes med vurderinger og kommentarer. Kortvarige nettbrudd skal ikke tvinge frem ny start av økten. Lagringsstatus må skille lagret arbeid fra ventende endringer.
- En faktisk nedlastbar PDF er nødvendig; utskriftsvisning alene er utilstrekkelig. Dokumentet skal dekke flere dager, fiktiv identifikasjon, tre vurderinger per kriterium, kommentarer og oppsummering første/siste dag med lesbar paginering. Kopi til den evaluerte og manuell HR-opplasting skjer uten direkte utsending eller integrasjon.
- Ubesvart er aldri OK. Briefens krav om synlige ubesvarte felt gjelder visning av mangler, ikke tillatelse til automatisk utfylling.
- Produksjonsinnlogging, reelle ansattdata, full offlinebruk, to-enhetssynkronisering, administrasjon, andre vurderingskategorier og appbutikkpublisering er utenfor V1.
- Tilrettelegging for senere to enheter, mobilapp og Power Apps er en føring. Stakk og lagringsmekanisme avgjøres i arkitekturen. React/TypeScript, versjonerte kriteriesett og konkrete Power Apps-spor er forslag, ikke besluttet V1-implementasjon.

## Kildehierarki og begrensninger

Den skannede PDF-en er primærkilde for ordlyd og oppsett. Det omskrevne skjemagrunnlaget er et demoalternativ og gir ikke hjemmel til å erstatte originaltekst uten beslutning. PDF-en er ikke visuelt kontrollert i dette uttrekket.

Eksempelfelt, svarene OK/Kan bli bedre og forslag om tre styrker/tre utviklingsområder i det omskrevne dokumentet må verifiseres mot primærkilden. Eksempelets bekreftelse fra både deltaker og veileder er ikke et allerede vedtatt signeringskrav.

Bedriftsnavn, personidentitet og interne tilgangsforhold skal ikke gjeninnføres. HR-system er en generisk mottakerbeskrivelse. Teknologipåstandene i plattformnotatet er historisk kildekontekst og er ikke kontrollert mot dagens leverandørdokumentasjon i dette uttrekket.

## Viktige mangler i oppstartsutkastet

1. Bruk på større skjerm og felles gjennomgang er uttrykkelige føringer i briefen, men lite synlige i PRD-oppstartsutkastet. Ta dem med i ferdig PRD.
2. Lagringsutløser, mislykket lagring, gjenoppretting etter oppfrisking/lukking og målbare tidskrav gjenstår. Ikke lov tapsfrihet for ulagret inntasting.
3. Nøyaktige felt og ordlyd, PDF-paginering og første/siste-dag-oppsummering må konkretiseres etter primærskjemakontroll.
4. Historikk og synlig utvikling er del av nytteverdien; kravene bør gjøre det mulig å gjenfinne og sammenholde tidligere økter uten å utvide til analysemodul.

## Nye brukerbeslutninger som avklarer eldre åpne spørsmål

Prosjekteiers svar 2026-10-29 har forrang foran de eldre kildenes åpne spørsmål:

- Hurtigløp er valgt; antakelser skal merkes tydelig.
- PDF skal kunne vise «Bekreftet av [fadderens navn]».
- Ferdigstilling skal hindre senere endring. En popup skal ettertrykkelig varsle at bekreftelsen er irreversibel og kreve et aktivt valg.
- Alle vurderingspunkter skal være avkrysset før ferdigstilling. «Ikke vurdert» skal ikke forekomme; «Ikke relevant» ønskes som mulig svar.
- Ufullstendig PDF er ikke en ønsket normalflyt. Dersom en slik fil mot formodning oppstår, må den merkes ettertrykkelig som ufullstendig.

Spørsmålene om låseomfang, relevans og oppsummeringer var åpne ved første uttrekk. De er senere avklart, se avstemmingen nedenfor.

## Ny avstemming mot samlet PRD-utkast

Samlet `prd.md` og `addendum.md` ble lest på nytt etter innarbeiding av prosjekteiers videre avklaringer. Denne avstemmingen erstatter vurderingen av mangler i oppstartsutkastet over.

| Kildekrav | Dekning i samlet utkast |
| --- | --- |
| PWA, mobil og større skjerm, fiktive data, ingen produksjonsgodkjenning | Formål, NFR-1 og NFR-6, avgrensning. Dekket. |
| Hele fadderløpet, tre vurderinger, 22 kriterier og flere dager | Arbeidsflyt og FR-1–FR-5. Alle 66 posisjoner per dag er gjort uttrykkelige. Dag 1–8 støttes uten fast maksimum. Dekket. |
| Felles gjennomgang og synlig utvikling | FR-4 og FR-7 bevarer historikk, sammenhold av dager og uenighet mellom vurderingene. Dekket uten å innføre statistikkmodul. |
| Primærskjema overstyrer omskrevet alternativ | Addendum gjengir 22 kriterier, kildefelt og anonymiseringsavvik. Forelderens visuelle kildekontroll er oppgitt; denne avstemmingen er ikke en uavhengig ny PDF-kontroll. |
| Utkast, lagringsstatus, nettbrudd, oppfrisking og normal lukking | FR-9–FR-11 og NFR-3. Auto-lagring og tidsmål er korrekt merket A4/A8, med begrensning til samme profil/enhet og uten løfte om full offlinebruk. Dekket som kravutkast med åpne målvalg. |
| Reell PDF-fil, flere dager, kommentarer, oppsummeringer, kopi og manuell HR-opplasting | FR-17–FR-19 og NFR-5. Paginering, lange kommentarer, gjentatt nedlasting og PDF-feil er konkretisert. Dekket. |
| Synlige ubesvarte felt, aldri automatisk OK | FR-5, FR-12 og FR-18. Nye brukerkrav presiserer at normal slutt-PDF ikke tillater ubesvarte vurderinger; ufullstendig feilutskrift merkes særskilt. Ingen motstrid. |
| Daglig, permanent låsing med tydelig popup og faddernavn | FR-11–FR-14, FR-17 og NFR-4. Lagringsfeil, avbrytelse og gammel redigeringsvisning er dekket. |
| «Ikke relevant» videreføres før→etter og krever fadderens bekreftelse og grunn | FR-6–FR-7. Relevans oppdaget sent eller korrigert før låsing er eksplisitt A2, ikke presentert som brukerbekreftet. |
| Frivillige oppsummeringer, senere mulig obligatorisk regel | FR-8 og addendum til arkitektur. Historiske registreringer beholder sine regler. Låsetidspunkt er A3. Dekket. |
| Godkjent eller behov for videre oppfølging; nye registreringer uten gjenåpning | FR-15–FR-16. Historiske beslutninger bevares. Konkret organisering i egen oppfølgingsdel/PDF er merket A5. Dekket med gjenstående modellavklaring. |
| Senere to enheter, mobilapp og Power Apps uten lovet konvertering | Avgrensning og addendum til arkitektur. Stakk, synkronisering og plattformleveranse er ikke valgt eller lagt til V1. Dekket. |

## Gjenstående forhold før kravene låses

Ingen bekreftede krav fra briefen eller briefens addendum er identifisert som utelatt i samlet utkast. Følgende er fortsatt uttrykkelige antakelser og bør ikke forveksles med godkjente detaljer:

- A1, A2 og A3 påvirker feltvalidering, relevansflyt og tidspunktet oppsummeringer låses.
- A5 avgjør hvordan nye oppfølgingsregistreringer henger sammen med historisk avslutning og PDF. Dette er den mest vesentlige gjenstående produktmodellavklaringen.
- A6 utelater primærskjemaets separate sjåførsignatur. Fadderens navngitte bekreftelse er vedtatt; det er ikke i seg selv en eksplisitt beslutning om sjåførsignaturen.
- A4, A7 og A8 er foreslåtte akseptansegrenser for lagring, skjermbredder/nettlesere og gjenoppretting, med eiere og tidspunkt angitt i PRD-en.

Briefens tekniske modellforslag er flyttet til addendum og holdt som forslag. Tidligere plattformnotats konkrete Power Apps-alternativer er bevart gjennom henvisning, uten å gjøre dem til et implementeringsløfte.
