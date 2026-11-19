---
title: 'Story 4.2 – Tilordne en linje senere til én sjåfør'
type: 'feature'
created: '2026-11-19'
story_key: 4-2-tilordne-linje-til-en-sjafor
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 710300fc3cc754f3e0f6c8bd26d3b5190a1c4021
context: ['_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent">

## Intent

Når ekstra linjeopplæring blir aktuell, kan en autorisert bruker legge linje 30, 421, 425, 428 eller 450 til én valgt sjåfør. Linjetildeling gir tilgang til registrering og forblir separat fra faktisk kjøring og faglig bekreftelse.

## Boundaries & Constraints

Valgt sjåfør identifiseres med stabil referanse. Tildeling er unik per sjåfør og linje og følger sjåføren på tvers av linjedokumenter. Eldre data og frosset PDF-historikk skal kunne leses videre. Instruktørrollen i V1 brukes som autorisert øvingsrolle med fiktive data. Endelig Tide-fullmakt avklares senere og utledes ikke fra øvingsrollen.

| Tilstand | Handling | Resultat |
| --- | --- | --- |
| Riktig sjåfør og øvingsrolle valgt | Velg ekstra linje og bekreft | Tildelingen vises på sjåførens linjeoversikt uten kjøredato |
| Linjen allerede tildelt eller gammel visning | Send på nytt eller bytt aktiv sjåfør | Høyst én tildeling, ingen skriving på feil person |
| En tildelt linje er kjørt og bekreftet | Lag ny PDF og last ned en tidligere versjon | Ny PDF inkluderer bekreftet dato, tidligere kilde beholder sitt innhold |

</frozen-after-approval>

## Code Map

- `app/src/content/line-training.v1.ts` inneholder stabile kilde-ID-er. Bruk samme katalog og v2-standard fra Story 4.1.
- `app/src/adapters/indexeddb/run-store.ts` validerer valgt sjåfør, aktiv rolle, dokumentadresse og kommandoer i transaksjonen. Tildeling skal leses fra samme lagrede sjåførkontekst der linjeføring kontrolleres.
- `app/src/application/run-application.ts` binder aktør til forventet kontekst. `app/src/ui/LineTraining.tsx` gir eksisterende mønstre for lagringskvittering, bekreftelsesdialog og feil.
- `app/src/domain/line-training.ts` og `app/src/adapters/pdf/line-document.tsx` bevarer per-registrering-bekreftelse og eksporterer historikk fra frosset kilde.

## Tasks & Acceptance

- [x] Lagre tildeling uavhengig av ett linjedokument, med idempotens og kontroll av rolle, valgt sjåfør, dokumentkontekst og linje.
- [x] Bind ordentlig bekreftelsesdialog til valgt sjåfør og linjen. Vis tildeling, relevant merknad og lagringsstatus.
- [x] Bruk samme tildeling for nye og eksisterende dokumenter med riktig sjåførreferanse, og kontroller den også ved skriving.
- [x] Kjør en nettleserflyt med to fiktive sjåfører, gjentatt tildeling, faktisk dato og bekreftet PDF, samt adaptertest for foreldet kontekst.

Gitt en sjåfør med to linjedokumenter og to personer med likt navn, når instruktøren tildeler linje 30 til én referanse, vises linjen med leddbussmerknaden i begge dokumentene for den sjåføren. Den andre personens oversikt består av sine egne linjer.

## Implementation Notes

Story 4.1 har lagt inn schema 7 og en separat katalog for de fem ekstralinjene. Bruk et eget styrt IndexedDB-lager for tildelinger, som knytter linje-ID til sjåførreferansen. Oppgrader schema på vanlig måte. Utfør kontekstkontroll og unik tildeling i samme transaksjon. Hold tildeling utenfor `DriverReference` og alle historiske dokumenter, slik at referanser i tidligere løp og PDF-er ikke omskrives. Utvid arbeidsmodellen med den aktive sjåførens tildelte linjer. Ved gjenlesing skal en tildeling kunne vises selv om linjedokumentets revisjon er uendret. Endringer i tildeling skal ikke forkaste ulagret kjøredato.

Skilj tildelte linjer fra standardlinjer og tidligere registrerte ekstralinjer. Ved bekreftelse fryses bare tildelte ekstralinjer som har bekreftet registrering, slik at en framtidig tildeling ikke endrer gammel PDF. Fortsett å validere og lese kilder fra begge tidligere malversjoner og fra Story 4.1.

Bruk lokal Node 26.13 og `.cache/playwright` som i Story 4.1. Sett separat `--outDir` og bruk en annen port for nettleserprøver. Den brede Story 4.1-prøven bruker `app/dist` i port 4173 inntil den er ferdig. Prosjekteier har autorisert lokal nettleserkjøring.

Schema 8 lagrer en sortert unik liste for hver sjåførreferanse. En kvittering og tilhørende tildeling lagres i samme transaksjon. Frosne PDF-versjoner skiller mellom tildelt og beholdt eldre opplæring. Tildelinger på en annen fane kan leses inn uten en ny faglig revisjon. Ugyldig lagret tildeling stopper berørte linjeendringer. Navigasjon og lesing av frosset historikk er fortsatt tilgjengelig.

## Spec Change Log

## Review Triage Log

| Funn | Dom og håndtering |
| --- | --- |
| Blind review · Ugyldig tildeling sperrer arbeidsområdet | Høy. Reprodusert med en konvolutt der nøkkel og innhold avviker. Isoler tildelingsfeil fra dokument- og historikklesing. |
| Blind review · Indeks kan skjule ugyldig tildelingsrad | Middels. Manglende indeksfelt fører til tom liste selv om primærnøkkelen fortsatt er opptatt. Les tilstanden ved sjåførens primærnøkkel. |
| Blind review · Manglende tildeling kan ødelegge neste bekreftede kilde | Høy. Valideringen forventer monoton klassifisering som ny eksport kan miste. Bevar allerede frosset klassifisering, eller avvis før skriving. |
| Blind review · Kvittering kan gjentas etter at tildelingen mangler | Middels. Replay sjekker tidligere kommandokvittering uten å sjekke tilstanden. Kontroller lagret tildeling. |
| Blind review · Avvist gammel dialog fortsetter å vise gammel sjåfør | Middels. Feilgrenen leste ikke aktiv kontekst igjen. Les og vis gjeldende arbeidsområde. |
| Blind review · Ingen nettleserprøve for lesefeil etter bekreftet skriving | Middels verifikasjonsgap. Prøv fullført tildeling, feil i etterfølgende lesing og trygg gjenlesing. |
| Blind review · Blandet historikk etter senere tildeling mangler adapterprøve | Middels verifikasjonsgap. Bekreft en annen linje etter tildeling av tidligere bekreftet ekstralinje, og sjekk både ny og arkivert kilde. |
| Blind review · Vanlig nettleserkommando mangler PDF-uttrekk | Lav. Behold repositoryets valgfrie uttrekk og kjør det på faktiske eksporter som obligatorisk leveranseverifikasjon for storyen. |
| Edge case · Ugyldig tildeling stopper oppstart | Høy. Samme årsak som arbeidsområde-feilen over. |
| Edge case · Etterlesingsfeil etter commit kan feilrapportere utfallet | Middels. Skill kvittert skriving fra verifisering og bruk samme utførte operasjon ved gjenlesing. |
| Edge case · Testhjelper venter til timeout på manglende dokument | Lav. Avvis uttrykkelig dersom den valgte raden mangler. |
| Edge case · Samtidig kontekstbytte skjuler kvittering | Middels. Rapporter lagret tildeling med nøytral status etter overgang til ny kontekst. |
| Verification gap · Uttrekk av tildelingsmerknad er opt-in | Lav. Samme verifikasjon som PDF-uttrekket over. |
| Verification gap · Tildeling av allerede bekreftet ekstralinje følges ikke av ny eksport | Middels. Samme verifikasjon som adapterprøven for blandet historikk over. |
| Verification gap · En ugyldig tildeling blokkerer selv gyldig historikk i UI | Høy. Samme lagringsårsak som arbeidsområde-feilen over. |

## Verification

- Typekontroll, produksjonsbygg og lint bestod. Samme ti tidligere lint-advarsler. Sluttbygget bestod 83 Node-prøver, inkludert feil ved tildelingsoppslag, schemaoppgradering og bevart historisk klassifisering.
- **33 av 33** linjeprøver bestod på frosset sluttbygg `epic4-story-4.2-final` i Chromium, Firefox og WebKit. Prøvene dekker to sjåfører med samme navn, to dokumenter for samme sjåfør, feil etter kvittert skriving, ny verifisering uten dobbelskriving og foreldet sjåførvalg.
- `verify-line.py` sammenlignet 21 faktisk nedlastede PDF-er med kildefixturer fra sluttregresjonen. En ny bekreftet rapport viser tildelt linje 30 med leddbussmerknad, dato og instruktør. Tidligere PDF-er beholder standard- eller historisk kilde. Tildelt linje uten bekreftet kjøring inngår ikke i rapporten. Den tre-siders PDF-en med individuelt tildelt linje er også sett visuelt.
- Manuell bekreftelse av fysisk mobil og leser samles ved Epic 4s sluttprøve. Storyen står i review.
