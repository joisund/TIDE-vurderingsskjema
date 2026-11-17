# Lokal implementeringsøkt 17. november 2026

Arbeidet pågår på `codex/fadder-v1` i den eksisterende lokale arbeidskopien. Utgangspunktet er `de6e36c2b4a069e0653fd3d9777948f187fba8d2`. Før oppstart lå det endringer i planleggingen og rotens overleveringsnotat. De beholdes i arbeidskopien. Prioritert kjede er Story 1.1–1.8, så 2.1–2.2, deretter 3.1–3.3. Følg [sprintstatus](sprint-status.yaml) og godkjente planleggingskilder ved gjenopptakelse.

## Gjennomført miljøkontroll

- Maskinens Node 24.19.0 og npm 11.17.0 avviker fra vedtatt oppsett. Den offisielle Windows x64-zipen for Node 26.13.0 ble SHA256-kontrollert mot leverandørens publiserte verdi. Lokal utpakking i `.cache/story-1-1/node-v26.13.0-win-x64` gir Node 26.13.0 og npm 11.20.0 uten maskinvid endring.
- `create-vite@9.3.3` med `--template react-ts` opprettet `app/`. Offentlig npm-registry var tilgjengelig ved godkjent nettverkstilgang etter DNS-feil i standard sandkasse.
- Story 1.1 har lokal, kodegjennomgått implementering. Ren låst installasjon, bygg/typekontroll, lint, 11 Node-prøver og 39 nettleserprøver passerte. Storyen står i review for faktisk skjermleser og fysisk enhetsprøving. Alle tre automatiserte nettlesere gjenåpnet to fiktive løp med én dag hver på under to sekunder. Neste implementeringsstory er 1.2, øktfelter og autosave.

## Lokal oppstart

Kjør i PowerShell fra prosjektroten. `npm ci` trengs ved første oppstart eller endret låsfil.

```powershell
$env:Path = (Resolve-Path '.cache/story-1-1/node-v26.13.0-win-x64').Path + ';' + $env:Path
Set-Location app
npm.cmd ci
npm.cmd run dev -- --port 5173 --strictPort
```

Åpne [lokal utviklingsvisning](http://localhost:5173). For statisk bygg, bruk `npm.cmd run build` og `npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Utviklingsvisning og preview har separate lagre.

## PDF-forprøve

`@react-pdf/renderer@4.9.0` og React 19.3.1 genererte en lokal A4-prøve under Node 26.13.0. `pdfinfo` bekreftet én liggende og én stående side. Begge sider er rendret med Poppler, inspisert visuelt og kontrollert med tekstuttrekk for ÆØÅ/æøå og ÄÖ/äö. Prøven ligger i prosjektets ignorerte `.cache/pdf-preflight`.

En separat lokal Vite 8.3.5-side lastet begge fonter med `Font.load` før registrering. Etter simulert nettbrudd genererte og lastet Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5 ned en PDF med gyldig filheader. WebKit feilet først da prøveprogrammet forsøkte `Blob.slice(...).text()` før nedlasting. Kontroll av selve nedlastingen passerte. Vurderingsinnhold, appens nedlastingsflate, lengre tekster og faktisk mobilåpning verifiseres i Story 2.2.

Testet fontgrunnlag er de statiske TTF-filene fra `NotoSans/full/ttf/` i [Noto Sans v2.014](https://github.com/notofonts/latin-greek-cyrillic/releases/tag/NotoSans-v2.014), SIL Open Font License 1.1.

| Fil | SHA256 |
| --- | --- |
| NotoSans-Regular.ttf | `7f5a908610bf27c48f336c73e10b881dcce6ea1c7113e1e207c9e9833c86eb46` |
| NotoSans-Bold.ttf | `808b5dc93fe0ac398911e9013697ad5fb0de2d80a85ba34192976efb113a83d5` |
| OFL.txt | `cee9892f9f0cc8fe882c9e9537ee6a89621d86ee7ceaf70b02e2b2b1c25c061a` |

## Praktisk prøve

Fast HTTPS-origin og faktisk prøving etter [nettbrettprotokollen](nettbrett-testprotokoll-2026-11-20.md) gjenstår. Sett av holdepunkt for Lenovo Pad / Android / Brave på mobil hotspot, og bruk samme origin og profil mellom fadderdagene. Bruk fiktive personer.
