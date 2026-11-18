# Lokal implementeringsøkt 17.–18. november 2026

Arbeidet pågår på `codex/fadder-v1` i den eksisterende lokale arbeidskopien. Utgangspunktet er `de6e36c2b4a069e0653fd3d9777948f187fba8d2`. Før oppstart lå det endringer i planleggingen og rotens overleveringsnotat. De beholdes i arbeidskopien. Prioritert kjede er Story 1.1–1.8, så 2.1–2.2, deretter 3.1–3.3. Følg [sprintstatus](sprint-status.yaml) og godkjente planleggingskilder ved gjenopptakelse.

## Gjennomført miljøkontroll

- Maskinens Node 24.19.0 og npm 11.17.0 avviker fra vedtatt oppsett. Den offisielle Windows x64-zipen for Node 26.13.0 ble SHA256-kontrollert mot leverandørens publiserte verdi. Lokal utpakking i `.cache/story-1-1/node-v26.13.0-win-x64` gir Node 26.13.0 og npm 11.20.0 uten maskinvid endring.
- `create-vite@9.3.3` med `--template react-ts` opprettet `app/`. Offentlig npm-registry var tilgjengelig ved godkjent nettverkstilgang etter DNS-feil i standard sandkasse.
- Story 1.1 har lokal, kodegjennomgått implementering i `9f4bae73d9a9785c560c10ea6faedf33ee346787`. Ren låst installasjon, bygg/typekontroll, lint, 11 Node-prøver og 39 nettleserprøver passerte. Storyen står i review for faktisk skjermleser og fysisk enhetsprøving. Alle tre automatiserte nettlesere gjenåpnet to fiktive løp med én dag hver på under to sekunder.
- Story 1.2 (øktfelter og autosave) er implementert og kodegjennomgått i `77f708c27e1e892c4ecf0f533c23b2c673592ac5`. Etter reviewretting bestod bygg/typekontroll, lint, 21 Node-prøver og 81 nettleserprøver. Alle tre motorene lagret etter over 60 sekunder frakoblet. Nettleserzoom ved 400 % med åpen feltkontroll ble prøvd separat. Storyen står i review for enhets- og hjelpemiddelprøving. [Utviklerpakken](1-2-registrere-og-bevare-dagens-øktopplysninger.md) har funn og testresultater.
- Story 1.3 er implementert og kodegjennomgått. Etter reviewretting passerte bygg/typekontroll, lint, 27 Node-prøver og 120 nettleserprøver. Lagring og førlås passerte etter 60 sekunder frakoblet i hver motor. Førvurdering med 22 svar ble også låst og gjenåpnet i en faktisk 400 %-zoomprøve. [Utviklerpakken](1-3-fylle-ut-og-låse-sjåførens-førvurdering.md) har de ni uendrede kriteriene og resultatene. Storyen står i review for faktisk enhets- og hjelpemiddelprøving. Neste tekniske oppgave er Story 1.4, sjåførens ettervurdering og frivillige egenevaluering.

## Lokal oppstart

Kjør i PowerShell fra prosjektroten. `npm ci` trengs ved første oppstart eller endret låsfil.

```powershell
$env:Path = (Resolve-Path '.cache/story-1-1/node-v26.13.0-win-x64').Path + ';' + $env:Path
Set-Location app
npm.cmd ci
npm.cmd run dev -- --port 5173 --strictPort
```

Åpne [lokal utviklingsvisning](http://localhost:5173). For statisk bygg, bruk `npm.cmd run build` og `npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Utviklingsvisning og preview har separate lagre.

En frossen kopi av testbygget `story-1.2-20261118` ligger i `.cache/story-1-2/verified-dist`. Med Node/npm-stien fra oppstart og PowerShell i `app/`, start den med `npm.cmd run preview -- --host 127.0.0.1 --port 4175 --strictPort --outDir ../.cache/story-1-2/verified-dist`. Åpne [det frosne testbygget](http://127.0.0.1:4175). Bruk denne adressen under hele PC-prøven, slik at nettleseren gjenåpner samme lager. Kopien er prøvd i Chromium på port 4175 med oppretting, økt over midnatt, rollebytte umiddelbart etter innskriving og refresh.

Prøv først oppretting av et fiktivt éndagsløp. Fyll Buss 1, la Buss 2 stå tom, legg inn flere linjer og før tider over midnatt, for eksempel 23:30 og 01:05. Bytt raskt til Sjåfør mens du skriver i et tidsfelt. Sjekk bevart verdi, lesetilgang til buss/linjer og at sjåføren kan endre tidene. Vent på «Lagret på denne enheten», lukk og gjenåpne samme adresse og kontroller løp, rolle og opplysninger.

Det nyeste frosne bygget `story-1.3-20261118-r2` ligger i `.cache/story-1-3/verified-dist`. Start det fra `app/` med `npm.cmd run preview -- --host 127.0.0.1 --port 4176 --strictPort --outDir ../.cache/story-1-3/verified-dist`, og åpne [Story 1.3-kopien](http://127.0.0.1:4176). Gjenta PC-prøven med fiktive data på denne adressen. Åpne førvurderingen som sjåfør. Prøv hjelp, avbryt én begrunnelse og lagre «Ingen rygging» for ett Ikke relevant-punkt. Fyll de øvrige punktene, bekreft førvurderingen, og sjekk lås og historisk navn etter refresh. Bytt til fadder. Dato og sjåføridentitet skal være låst, mens buss, linjer og tider fortsatt følger sine egne redigeringsregler.

## PDF-forprøve

`@react-pdf/renderer@4.9.0` og React 19.3.1 genererte en lokal A4-prøve under Node 26.13.0. `pdfinfo` bekreftet én liggende og én stående side. Begge sider er rendret med Poppler, inspisert visuelt og kontrollert med tekstuttrekk for ÆØÅ/æøå og ÄÖ/äö. Prøven ligger i prosjektets ignorerte `.cache/pdf-preflight`.

En separat lokal Vite 8.3.5-side lastet begge fonter med `Font.load` før registrering. Etter simulert nettbrudd genererte og lastet Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5 ned en PDF med gyldig filheader. WebKit feilet først da prøveprogrammet forsøkte `Blob.slice(...).text()` før nedlasting. Kontroll av selve nedlastingen passerte. Vurderingsinnhold, appens nedlastingsflate, lengre tekster og faktisk mobilåpning verifiseres i Story 2.2.

En separat Node-prøve fordelte 10 000 tegn med fiktiv tekst på to stående A4-sider. Gjentatt overskrift og riktige sidetall ble kontrollert visuelt. Tekstuttrekket matchet alle tegn utenom linjebryting og blanktegn. Komplett eksport med faktisk vurderingsdata gjenstår.

En prøve med 10 000 tegn uten mellomrom viste at standard tekstflyt alene kan plassere tekst utenfor sidebredden. Med usynlige linjeskiftmuligheter i visningskopien fordelt over tre sider var alle 10 000 tegn innenfor tekstområdet. Story 2.2 må prøve lange, ubrutte ordstrenger i det faktiske PDF-oppsettet.

Testet fontgrunnlag er de statiske TTF-filene fra `NotoSans/full/ttf/` i [Noto Sans v2.014](https://github.com/notofonts/latin-greek-cyrillic/releases/tag/NotoSans-v2.014), SIL Open Font License 1.1.

| Fil | SHA256 |
| --- | --- |
| NotoSans-Regular.ttf | `7f5a908610bf27c48f336c73e10b881dcce6ea1c7113e1e207c9e9833c86eb46` |
| NotoSans-Bold.ttf | `808b5dc93fe0ac398911e9013697ad5fb0de2d80a85ba34192976efb113a83d5` |
| OFL.txt | `cee9892f9f0cc8fe882c9e9537ee6a89621d86ee7ceaf70b02e2b2b1c25c061a` |

## Praktisk prøve

Fast HTTPS-origin og faktisk prøving etter [nettbrettprotokollen](nettbrett-testprotokoll-2026-11-20.md) gjenstår. Sett av holdepunkt for Lenovo Pad / Android / Brave på mobil hotspot, og bruk samme origin og profil mellom fadderdagene. Bruk fiktive personer.

For AD-2s senere manifestprøve krever Chromiums installasjonspromotering et manifest med navn, startadresse, visningsmodus og 192/512 px ikoner over HTTPS. Safari 26 kan legge en side til som webapp fra delingsmenyen. Noter den faktiske installerte profilen ved prøving av lageret. [Chromiums kriterier](https://web.dev/articles/install-criteria) og [WebKit om Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).

NVDA 2026.3.1 i Edge leste «Løpsoversikt» og «Opprett løp» i den isolerte Windows-prøven 18. november. Edge-tilgang ble verifisert. En Windows-brannmurmelding for en lokal Node-prosess lå foran vinduet. Manuell opplesing av feltnavn, feltfeil og lagringsstatus gjenstår.
