# Overlevering for Epic 4

## Arbeidsgrunnlag

- Arbeidsbranch `codex/epic-4` i eksisterende checkout, fra V1-baseline `c5c0e85f2af4b99428d44d419a4be13ed2fe4e1c`. GitHub-remote er `origin`, `joisund/TIDE-vurderingsskjema`. Lesing av `refs/heads/main` fra remote er kontrollert. Push til arbeidsbranchen skjer etter fullført implementering og verifisering i henhold til aktivt mål.
- [Epic 4](../planning-artifacts/epic-4-testkjoring-og-linjetildeling.md) og [samlet implementeringsgrunnlag](epic-4-context.md) dekker alle seks stories. Arbeidsvalgene for pilot med fiktive kandidater er dokumentert i [teknisk grunnlag for testkjøring](epic-4-testkjoring-teknisk-grunnlag.md). Endelig Tide-fullmakt, identitetsleverandør og produksjonsvertskap er åpne produksjonsvalg.
- Lokal verifisering bruker Node 26.13.0 fra `.cache/story-1-1/node-v26.13.0-win-x64` og browserne fra `.cache/playwright`. Bygg før nettleserprøvene. Eldre `app/dist` inneholdt et tidligere bygg uten linjeopplæring. Hold separate testbygg og porter mens en eldre testkjøring pågår.
- Bred regresjon på første Story 4.1-build endte med 305 av 306 nettleserprøver. Den ene Firefox-prøven klikket på historikken mens rollevisningen ble byttet. Den synkroniserte prøven bestod to gjentakelser på gjennomgått build. Kjør bred regresjon på det endelige Epic 4-bygget.

## Status

| Story | Nåværende tilstand |
| --- | --- |
| 4.1 | I review etter kodegjennomgang. Commit `710300fc3cc754f3e0f6c8bd26d3b5190a1c4021`. Oppdatert standardmal med 21 linjer, inkludert 413. Gammel historikk, v6-lagring og PDF er kontrollert. Se [testbevis og triage](spec-4-1-oppdatert-grunnkursmal.md). |
| 4.2 | I review etter kodegjennomgang. Commit `22fe7b0469fc1819c840f43b3196f69751d2eaf3`. Individuell tildeling følger sjåførreferansen. 83 Node-prøver, 33 nettleserprøver og 21 PDF-kontroller bestod. Se [utviklergrunnlag og testbevis](spec-4-2-tilordne-linje-til-en-sjafor.md). |
| 4.3 | I review etter kodegjennomgang. Commit `5e1360f2533d2f5507c411be384793be82663c18`. Egen SQLite-lagring og separat pilotinnlogging med lokal fiktiv postkasse. 92 Node-prøver, Playwright i tre motorer og uavhengige HTTP-/TLS-prøver bestod. [Utviklergrunnlag og testbevis](spec-4-3-opprette-testkjoring-med-individuell-tilgang.md). |
| 4.4 | I review etter kodegjennomgang. Før- og etterdel lagres og leveres separat. 93 Node-prøver og seks pilotprøver i tre nettlesermotorer bestod etter retting. [Utviklergrunnlag og testbevis](spec-4-4-levere-kandidatens-for-og-ettervurdering.md). |
| 4.5–4.6 | Implementeringsutkast er lagt frem i samme mappe. Endelig kodekart og testbevis kommer fortløpende. |

## Fysiske prøver

Samles når siste story er gjennomgått. Bruk fiktive data og to fysiske enheter med hver sin innlogging. Kontroller tildelt ekstra linje, migrert dokument, før- og etterfase, skjerming underveis, at tilgangen utløper eller kan trekkes tilbake, samt åpning av lagret PDF på mobilen. Eksakte steg og forventede skjermbilder oppdateres mot det ferdige bygget.
