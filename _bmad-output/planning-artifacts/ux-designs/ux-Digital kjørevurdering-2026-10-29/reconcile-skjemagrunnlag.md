# Kildeavstemming: originalt vurderingsskjema

Dato: 2026-10-29. Kilde: [lokal import av vurderingsskjemaet](imports/Eksempel%20vurderingsskjema.pdf), uendret kopi av [originalfilen](../../../../docs/Eksempel%20vurderingsskjema.pdf), to sider. Begge sider er visuelt kontrollert via eksisterende renderinger. Gjeldende produktbeslutninger ligger i [.memlog.md](.memlog.md); PDF-en er inspirasjon og kildehistorikk, ikke overstyrende produktkrav.

## Visuell struktur som tas med

- Side 1 har et tydelig toppfelt for sjåfør, fadder, dato, buss, linje og klokkeslett, etterfulgt av vurderingsmatrisen.
- De 22 kriteriene er ordnet i gjenkjennelige grupper: sjåfør, buss og trafikk-/kjøreteknikk, med undergrupper for sistnevnte. Grupperingen kan bevare oversikt og gjenkjennelse uten å låse mobilutformingen til en bred papirrad.
- Matrisen skiller visuelt mellom sjåfør før, sjåfør etter og fadder etter, med egne svarfelt og et tydelig kommentarområde. Utskriften skal bevare adskilte perspektiver og lesbar sammenstilling.
- Side 2 skiller veiledning fra første-/sistedagsevaluering. Hver evaluering har tre styrker og tre utviklingsområder, dato og plass for bekreftelser. Dette gir struktur til sjåførens egenevaluering.
- Overskrifter, gruppetilhørighet og tydelige rammer gjør papirskjemaet lett å orientere seg i. Eksakte mål, skannede farger og rotert sideorientering er ikke designkrav.

## Bevisste avvik fra papirkilden

| Papirkilde | Gjeldende UX |
| --- | --- |
| Dag 1-8 | Maksimalt fem registrerte dager totalt. Dag 6-8 tas ikke med. |
| Førkolonne på dagsskjemaet | Én førvurdering før første dag, beholdt som låst utgangspunkt for perioden. Ikke nye førvurderinger hver dag. |
| OK / Kan bli bedre | Beholdes og suppleres med begrunnet Ikke relevant etter nyere brukerbeslutninger. Ubesvart er aldri et svar. |
| Bred tabell | Inspirasjon for utskrift og sammenligning. Besluttet mobilmønster har kategorier under hverandre, kriterier i rader og tre rubrikker i rekkefølgen OK / Kan bli bedre / Ikke relevant, med kolonnetitler øverst. Spørsmålstegn ved kategoriene åpner hjelp ved berøring og fjernes ved utskrift. |
| Flere vurderingskategorier i toppfeltet | V1 gjelder fadderløp; øvrige kategorier tas ikke inn. |
| Virksomhetsspesifikk ordlyd i kriterium 10 | Den generiske ordlyden i PRD-addendumet beholdes. Autorisasjon til Tide-logo/profil gjeninnfører ikke interne opplysninger. |
| Signaturlinjer | Navngitte bekreftelser av egen del; ingen påstand om håndtegnet eller identitetsverifisert signatur. |
| Veiledning om dokumentmottaker | Samlet PDF etter endelig avslutning overleveres manuelt til opplæringsansvarlig for HR-opplasting. Ingen automatisk sending. |
| Papirets grønne/gule felt | Offisielt verifisert Tide-profil styrer visuell identitet. Skannens fargeverdier brukes ikke som tokens; tilstand formidles også i tekst. |

## Tillegg uten motstykke i papiret

Popup for begrunnelse, lagringsstatus, rollebytte, permanent låsing med dialog, utvidelse med ny planlagt siste dag, og fadders valgfrie konklusjon kommer fra produkt-/UX-beslutninger. De skal ikke fjernes fordi de mangler i papiret. Den separate rapporten til fagansvarlig er fortsatt utsatt.

Ingen kvalitative ideer fra papiret er utilsiktet droppet i denne avstemmingen: oversikt, gruppering, adskilte vurderinger, plass til utdyping og refleksjon første/siste dag er ivaretatt. Mobilmønsteret er nå besluttet som tre svarkolonner ved siden av kriteriene. Eksakte dimensjoner og hjelpetekst gjenstår for denne presentasjonen. Låsetidspunkt for evaluering og feltvalidering er fortsatt åpne UX-detaljer, ikke fastsatt av kilden.
