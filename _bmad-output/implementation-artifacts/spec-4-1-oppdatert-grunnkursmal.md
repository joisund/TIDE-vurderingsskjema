---
title: 'Story 4.1 – Bruke oppdatert grunnkursmal'
type: 'feature'
created: '2026-11-19'
story_key: 4-1-oppdatert-grunnkursmal
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: c5c0e85f2af4b99428d44d419a4be13ed2fe4e1c
context: ['_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Grunnkurset skal vise 21 linjer, med skolebusslinje 413. Linjene 30, 421, 425, 428 og 450 er tilgjengelige i katalogen til senere individuell tildeling. Linje 30 beholder merknaden om leddbuss og egen opplæring.

## Boundaries & Constraints

Behold ID, kildeorden og godkjent Story 3.3-historikk. Tidligere aktivt opprettede utkast og bekreftelser utenfor standarden skal være tilgjengelige videre. Story 4.2 innfører tildeling.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| Ny sjåfør | Åpne ny linjeopplæring | 21 standardlinjer og ingen kjøringer |
| V1 med utfylt ekstra linje og tomme malrader | Gjenåpne i ny app | Registrerte oppføringer bevares og merkes, de tomme ekstra radene gir ingen tildeling |
| Frosset V1-kilde | Eksporter samme versjon etter oppgradering | Opprinnelige 26 rader, merknader og bekreftelser |

</frozen-after-approval>

## Code Map

- `app/src/content/line-training.v1.ts` gir de 26 kilde-ID-ene og rekkefølgen.
- `app/src/domain/line-training.ts` validerer mal, hendelser og frosset kilde før lesing/skriving.
- `app/src/adapters/indexeddb/run-store.ts` oppgraderer skjemaet og kan isolere et problem til ett dokument. En ny databaseversjon hindrer samtidige skriverunder fra den gamle appen.
- `app/src/ui/LineTraining.tsx` viser katalog, datovalg og historikk. PDF-rendereren leser mal fra valgt kilde.

## Tasks & Acceptance

- [x] Bygg ny mal fra kildekatalogen. Bevar mal v1 som validerbar historisk kilde.
- [x] Les eldre linjedokumenter med gjeldende grunnkursoversikt og bevar oppføringene. Valider ny registrering mot standarden, og tillat videreføring av eksisterende ekstra utkast.
- [x] Oppgrader tidligere IndexedDB, bevar dokumenter, snapshots og kvitteringer, og vis skillet i linjeoversikten.
- [x] Prøv ny visning, gammel dokumentversjon, registreringskontroll og faktisk PDF.

Gitt et eldre dokument med bekreftelser og utkast, når det åpnes og en ny standardlinje bekreftes, lagres en ny kilde med både ny og tidligere bekreftet opplæring. Den gamle kilden gir den samme PDF-historikken.

## Implementation Notes

Prosjekteier har bedt om samme arbeidsflyt som Epic 1–3 og samlet manuell verifisering til slutt. Appkoden er ren ved oppstart. Andre lokale planendringer bevares.

Bruk prosjektets lokale Node 26.13 i `.cache/story-1-1/node-v26.13.0-win-x64` og browserne fra `.cache/playwright`. Bygg fra kilde før Playwright. Den eksisterende `app/dist` inneholdt et gammelt instruktørbygg uten linjeopplæring. Prosjekteier har tillatt lokal nettlesertesting i økten.

Mal v2 holder de 21 standardlinjene. Tidligere registrerte linjer utenfor grunnkurset utledes fra dokumentets faktiske oppføringer, og identifiseres separat. Et nytt PDF-grunnlag fryser standardmalen og faktiske bekreftede oppføringer utenfor den. IndexedDB 6 → 7 bevarer snapshots og kvitteringer og stanser gammel skriverkode. Uleselige dokumenter isoleres fra resten av oversikten.

## Spec Change Log

## Review Triage Log

| Funn | Dom og håndtering |
| --- | --- |
| Blind review · Utløpt linjevalg dukker opp etter mislykket lagring | Middels. Beholdt skriveforsøk kan lagre standardlinjen først og gjøre den synlige reverseringen ugyldig. Rettet i skrive-/lesekontrakten og prøves med avbrudd. |
| Blind review · Feilmelding for 26 malrader | Lav. Samme feilkode brukes også med ny mal og ved utilgjengelig linje. Meldingen gjøres versjonsnøytral. |
| Blind review · Manglende markering i dialogen | Lav. Gammel ekstralinje vises som vanlig linje i siste instruktørkontroll selv om katalogen skiller den ut. Vis markeringen der også. |
| Blind review · Lagret ekstralinje forsvinner før lagring | Middels. Skillet mellom optimistisk redigering og faktisk historikk blir utydelig ved avbrutt skriving. Katalogen bruker kvitterte oppføringer. |
| Blind review · Referanse-PDF genereres med ny kode | Middels verifikasjonsgap. Kjør separat prøve med frossen Story 3.3-build før databaseoppgradering på samme origin. |
| Blind review · Kronologi i faktisk PDF er ikke lenger dekket | Middels verifikasjonsgap. Verifiser to bekreftede datoer på samme linje i en ny standard-PDF med eksisterende uttrekk. |
| Blind review · Innholdet i PDF fra ny standard er ikke prøvd | Middels verifikasjonsgap. Gjenbruk PDF-uttrekket for 21 standardrader, uten ekstralinjer. |
| Blind review · Schema 6-prøven har tomme løps- og tekniske lagre | Middels verifikasjonsgap. Prøv oppgradering av eksisterende løp, teknisk dokument og lagrede kvitteringer i samme database. |
| Edge case · Gammelt linjevalg kan reaktiveres før retry | Middels. Samme verifiserte årsak som beholdt skriveforsøk over. |
| Verification gap · Eldre ekstrautkast går ikke gjennom bekreftelsesdialog i nettleseren | Middels. Node dekker bekreftelsen. Nettleserprøven skal også åpne dialogen på en migrert ekstralinje. |
| Verification gap · PDF-markeringen prøves bare med opt-in | Lav. Bruk og dokumenter eksisterende opt-in-kontroll med alle tre nettlesermotorene. |
| Verification gap · Nytt linjevalg kan kollidere med beholdt lagringsforsøk | Middels. Samme verifiserte årsak som beholdt skriveforsøk over. |

## Verification

- Typekontroll, produksjonsbygg og lint bestod på gjennomgått kode. Lint har ti tidligere advarsler. Alle 80 Node-tester bestod.
- 21 målrettede prøver bestod i Chromium, Firefox og WebKit på gjennomgått bygg. De dekker blant annet eldre schema, avbrutt lagring av ekstrautkast, gjenoppretting og bekreftelse.
- `verify-line.py` kontrollerte 12 virkelige PDF-eksporter i tre motorer. Gammel historikk har 26 rader. En ny standardfil har 21 rader og riktig rekkefølge på to kjøredatoer for samme linje. En ny historikkfil viser 21 standardrader samt tidligere bekreftet linje 30. En eldre, ubekreftet ekstralinje inngår ikke i eksporten.
- Edge åpnet både frossen Story 3.3 og oppgradert app på samme origin. Det historiske uttakets tre sider var identiske i tekst og gjengitte piksler før og etter oppgradering. En egen prøve brukte faktisk v6-kode til å opprette linjedokument, vurderingsløp og bekreftet teknisk dokument. V7 åpnet dem alle og gjentok den opprinnelige kvitteringen.
- Bred regresjon ble startet før siste gjennomgang. En Firefox-prøve åpnet fadderhistorikk før rollebyttet var kvittert. Frossen V1 bestod tre målrettede repetisjoner. Prøven venter nå på valgt rolle og ferdig overgang før den utvider historikken, og bestod to repetisjoner på gjennomgått build. Hele regresjonen gjentas ved avslutningen av Epic 4.
- Fysisk mobilprøve gjenstår til gjennomgangen av hele Epic 4. Storyen står i review.
