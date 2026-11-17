# Digital kjørevurdering

Statisk Tide-demonstrasjon med lokale fadderløp. Bruk fiktive navn og ansattnumre. Løp, første registrerte dag og valgt simuleringsrolle lagres i IndexedDB i nettleserprofilen på enheten.

## Kjør appen

Bruk Node.js 26.13.0 og npm 11.20.0. Appen startet fra `create-vite@9.3.3` med malen `react-ts`. Kjør kommandoene i denne mappen.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

For å teste den statiske leveransen, kjør `npm run build` og deretter `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Leveransen ligger i `dist/`. Ved testing på mobil skal filene serveres på en stabil HTTPS-origin. Utviklingsserver, lokal preview og HTTPS-host har hvert sitt lager.

## Prøver

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm exec -- playwright install chromium firefox webkit
npm run test:browser
```

Nettleserprøvene starter lokal preview, bruker egne testprofiler og måler oppfrisking og normal lukking/gjenåpning med to fiktive løp og én dag i hvert. Prøvene kjører også de tre flatene ved 320, 360, 390, 768 og 1280 CSSpx med 100 og 200 prosent rottekststørrelse. 320 CSSpx svarer til tilgjengelig bredde ved 400 prosent zoom på en 1280 px bred visning. Fysisk enhet, nettleserzoom, nett og skjermleser dokumenteres ved egne manuelle prøver.

## Versjoner

Build-ID er appversjonen i `package.json` med valgfri overstyring via `VITE_BUILD_ID`. IndexedDB bruker schema 1. Gjeldende kriterie-ID-er, regel- og hjelpeversjoner ligger under `src/content/` og kopieres inn i hvert løp ved oppretting. Feildiagnostikk i nettleserkonsollen viser feilkode, build og schema.
