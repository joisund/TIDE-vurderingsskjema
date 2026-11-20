# Overlevering for Epic 4

## Arbeidsgrunnlag

- Arbeidsbranch `codex/epic-4` i eksisterende checkout, fra V1-baseline `c5c0e85f2af4b99428d44d419a4be13ed2fe4e1c`. GitHub-remote er `origin`, `joisund/TIDE-vurderingsskjema`. Lesing av `refs/heads/main` fra remote er kontrollert. Push til arbeidsbranchen skjer etter fullført implementering og verifisering i henhold til aktivt mål.
- [Epic 4](../planning-artifacts/epic-4-testkjoring-og-linjetildeling.md) og [samlet implementeringsgrunnlag](epic-4-context.md) dekker alle seks stories. Arbeidsvalgene for pilot med fiktive kandidater er dokumentert i [teknisk grunnlag for testkjøring](epic-4-testkjoring-teknisk-grunnlag.md). Endelig Tide-fullmakt, identitetsleverandør og produksjonsvertskap er åpne produksjonsvalg.
- Lokal verifisering bruker Node 26.13.0 fra `.cache/story-1-1/node-v26.13.0-win-x64` og browserne fra `.cache/playwright`. Bygg før nettleserprøvene. Eldre `app/dist` inneholdt et tidligere bygg uten linjeopplæring. Hold separate testbygg og porter mens en eldre testkjøring pågår.
- Den første brede kjøringen ved Story 4.1 ga 305 av 306. Firefox-prøven er synkronisert med rollebyttet. Sluttbygget bestod hele suiten med 336 av 336 i Chromium, Firefox og WebKit.

## Status

| Story | Nåværende tilstand |
| --- | --- |
| 4.1 | I review etter kodegjennomgang. Commit `710300fc3cc754f3e0f6c8bd26d3b5190a1c4021`. Oppdatert standardmal med 21 linjer, inkludert 413. Gammel historikk, v6-lagring og PDF er kontrollert. Se [testbevis og triage](spec-4-1-oppdatert-grunnkursmal.md). |
| 4.2 | I review etter kodegjennomgang. Commit `22fe7b0469fc1819c840f43b3196f69751d2eaf3`. Individuell tildeling følger sjåførreferansen. 83 Node-prøver, 33 nettleserprøver og 21 PDF-kontroller bestod. Se [utviklergrunnlag og testbevis](spec-4-2-tilordne-linje-til-en-sjafor.md). |
| 4.3 | I review etter kodegjennomgang. Commit `5e1360f2533d2f5507c411be384793be82663c18`. Egen SQLite-lagring og separat pilotinnlogging med lokal fiktiv postkasse. 92 Node-prøver, Playwright i tre motorer og uavhengige HTTP-/TLS-prøver bestod. [Utviklergrunnlag og testbevis](spec-4-3-opprette-testkjoring-med-individuell-tilgang.md). |
| 4.4 | I review etter kodegjennomgang. Commit `2175cd69ac3800cea77e0d5b4fb49f621bec3c7a`. Før- og etterdel lagres og leveres separat. 93 Node-prøver og seks pilotprøver i tre nettlesermotorer bestod etter retting. [Utviklergrunnlag og testbevis](spec-4-4-levere-kandidatens-for-og-ettervurdering.md). |
| 4.5 | I review etter kodegjennomgang. Commit `0c32ccc05abd9cd7417c76d3c963c284bde1a4aa`. Instruktøren har egne svar, kommentarer og resultat. Etter rettinger bestod 95 Node-prøver og 12 nettleserprøver i tre motorer. [Utviklergrunnlag og testbevis](spec-4-5-fore-skjermet-instruktorvurdering.md). |
| 4.6 | I review etter kodegjennomgang og bestått full sluttregresjon. Atomisk avslutning, sluttinnsyn og PDF ligger i `feat(story-4.6)` på arbeidsbranchen. [Utviklergrunnlag og testbevis](spec-4-6-avslutte-testkjoring-og-eksportere-resultatet.md). |

## Sluttverifisering

- Node 26.13.0, 96 Node-prøver, typekontroll, bygg, lint med de ti eksisterende varslene, 336 nettleserprøver og fem ekstra i installert Edge. Nettleserloggen ligger i `.cache/story-4-6/epic4-final-reviewed-browser.log`.
- Faktisk innhold kontrollert i tolv testkjørings-PDF-er, 21 linje-PDF-er og seks tekniske PDF-er. Sluttbyggets PDF-prøver ligger i `.cache/story-4-6/epic4-final-regression-reviewed` og `.cache/story-4-6/epic4-final-edge`. Edge viste samme PDF for begge roller og ved ny innlogging. Alle fire sidene ble kontrollert visuelt.
- Den faktiske v6- og v8-koden ble kjørt mot samme isolerte IndexedDB-testlager. Løp, bekreftet teknisk versjon, kommando og linjeoversikt kunne gjenåpnes. En separat Edge-prøve brukte tidligere og nytt bygg på samme origin og fikk tre pikselidentiske sider i den historiske linje-PDF-en.
- Lokal HTTPS ga HTML 200, API 401 uten økt og 200 etter innlogging med validert sertifikat og sikker øktcookie.

## Fysiske prøver

Den fysiske prøven står åpen. [Protokollen for to enheter](epic-4-manuell-verifisering.md) har oppstartsblokk, fiktive adresser, faktiske knappetekster og forventet utfall for hvert steg. Den dekker personlig ekstralinje, historisk PDF, lagring ved nettbrudd, kandidatens to innleveringer, skjerming, avslutning, tilgang som trekkes tilbake og åpning av lagret PDF på mobil. Bruk en pilotadresse begge enheter når over betrodd HTTPS. Tide må fastsette produksjonsansvar, reell innlogging, lagringstid og vertskap før bruk med kandidater.
