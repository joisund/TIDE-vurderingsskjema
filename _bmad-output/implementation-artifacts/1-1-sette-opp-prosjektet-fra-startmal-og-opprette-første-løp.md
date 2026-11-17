---
title: "Story 1.1 – Sette opp prosjektet fra startmal og opprette første løp"
story_key: 1-1-sette-opp-prosjektet-fra-startmal-og-opprette-første-løp
status: in-review
baseline_commit: de6e36c2b4a069e0653fd3d9777948f187fba8d2
created: 2026-11-17
epic: 1
story: "1.1"
dependsOnStories: []
approvedSource: ../planning-artifacts/story-1-1-proposal.md
acceptanceCriteriaUnchanged: true
implementationStarted: true
---

# Story 1.1: Sette opp prosjektet fra startmal og opprette første løp

**Status: in-review.** Se utviklerloggen for faktisk fremdrift og prøver.

Som fadder i demonstrasjonen,
ønsker jeg å opprette og gjenfinne et fadderløp med riktig fiktiv sjåfør, fadder, første dato og startplan,
slik at vi har et lagret og entydig utgangspunkt for den daglige kjørevurderingen.

## Krav, omfang og avhengigheter

Ingen tidligere story kreves. Lever startmal, norsk løpsoversikt, oppretting, lagring og gjenfinning av løp/første dag. FR-1, opprettingsdelene av FR-2/3 og gjenfinning etter FR-9; delkrav i FR-4, NFR-1/2/3/6 og AD-1–5/7–9/13 gjelder slik de ni godkjente kriteriene angir. Full sporbarhet står i [kildestoryen](../planning-artifacts/story-1-1-proposal.md) og [epics](../planning-artifacts/epics.md).

Modell og database begrenses til opprettingsoppgaven. Feltredigering/autosave følger i 1.2; vurderingsmatrise, faglige låser, flere dager/planendring, avslutning og PDF følger i egne stories. Innholdssnapshot ved oppretting er ingen faglig bekreftelse. Manifest/ikoner/installasjon følges opp som felles AD-2-arbeid før prøveleveransen; de utvider ikke disse AC.

## Akseptansekriterier – uendret fra godkjent kilde

**AC-1.1-01 – Åpne en brukbar startflate fra vedtatt oppsett**

**Gitt** et nytt appoppsett basert på create-vite sin react-ts-mal og den godkjente stack-baselinen i AD-2/Stack,
**Når** appens låste avhengigheter installeres rent og appen typekontrolleres, bygges og åpnes,
**Så** består typekontroll/bygg og brukeren får en norsk løpsoversikt med original logo, godkjente DESIGN-tokens, synlig simuleringsrolle og en handling for å opprette løp,
**Og** ingen lagrede løp gir en forklarende tomtilstand; ved lasting venter visningen på faktisk resultat,
**Og** alle ressurser som denne leveransen bruker lastes lokalt før registrering åpnes, uten backend, produksjonsinnlogging, CDN, analyse eller service worker. UI går via applikasjon/porter, og domenet importerer ikke React, nettleser-API eller PDF-bibliotek (AD-1/2).

**AC-1.1-02 – Opprette løp og første dag med gyldige opplysninger**

**Gitt** en tilgjengelig lokal database og nye, tomme opprettingsfelt,
**Når** brukeren oppgir fiktivt sjåførnavn, ansattnummer, faddernavn og gyldig første kalenderdato, velger startplan og oppretter løpet,
**Så** opprettes ett løp med stabil sjåfør-ID, én første dag med dagnummer 1, unike løps-/dags-ID-er og tilstanden Pågående,
**Og** startplanen er normalt tre dager og kan velges til én eller to ved kortere løp; gjeldende planlagt siste dag og dato vises i dagsoversikten,
**Og** første dato lagres som YYYY-MM-DD etter kalenderdato i Europe/Oslo uten forskyvning ved UTC-konvertering; identitet, dato og tilhørighet er ubekreftet, og ingen faglig bekreftelse eller lås er opprettet,
**Og** buss, linjer og inn-/ut-tid kan mangle ved oppretting etter den vedtatte trinnvise fullføringen (FR-3, AD-6/8).

**AC-1.1-03 – Avvise mangler uten å opprette et delvis løp**

**Gitt** at et påkrevd navn/ansattnummer/dato mangler, bare inneholder blanktegn der tekst kreves, datoen er ugyldig eller startplanen ikke er 1, 2 eller 3,
**Når** oppretting forsøkes gjennom brukerflaten eller applikasjonskommandoen,
**Så** avvises forsøket uten lagret løp eller løsrevet første dag,
**Og** brukerflaten forklarer manglene på norsk ved de aktuelle feltene og i en mangelliste som flytter fokus til riktig felt uten at innskrevet tekst forsvinner,
**Og** etiketten er «Ansattnummer», og ingen buss 2, vurderingssvar eller frivillig tekst etterspørres som opprettingsmangel.

**AC-1.1-04 – Fryse riktig innholdsgrunnlag ved oppretting**

**Gitt** det godkjente settet med 22 kriterier i PRD-addendumet og de 22 godkjente hjelpetekstene,
**Når** et løp opprettes,
**Så** lagres løpets kriterie-ID-er, tekster og rekkefølge sammen med regelversjon og godkjent hjelpeversjon som et snapshot,
**Og** settet inneholder nøyaktig de forventede 22 unike ID-ene; fremmede, manglende eller dupliserte kriterier avvises også dersom antallet ellers er 22,
**Og** en senere global endring av kriterie-/hjelpe-/regelgrunnlaget omskriver ikke det eksisterende løpet (AD-7). Innholdssnapshot er ikke en faglig bekreftelse.

**AC-1.1-05 – Kvittere lagring først etter fullført transaksjon**

**Gitt** gyldig opprettingsinnhold og en kommando med commandId, runId, aktiv actor og expectedRevision,
**Når** opprettingskommandoen utføres,
**Så** lagres løp, første dag, innholdssnapshot og kommandoresultat samlet i én IndexedDB-readwrite-transaksjon som validerer siste tilstand,
**Og** «Lagret på denne enheten» og vellykket oppretting vises først ved transaksjonens complete, aldri ved enkeltrequestens success,
**Og** abort før complete etterlater ingen delvis oppretting; feilmelding tilbyr nytt forsøk og beholder innskrevet tekst i den åpne visningen,
**Og** samme commandId og payload returnerer tidligere resultat uten nytt løp, mens samme ID med endret payload avvises. Tap av kvittering etter complete og gjentatt klikk skal derfor gi samme løp (AD-3/5).

**AC-1.1-06 – Gjenfinne flere løp og riktig første dag**

**Gitt** minst to lagrede løp for ulike fiktive sjåfører,
**Når** brukeren åpner løpsoversikten og velger ett av dem,
**Så** skilles løpene med riktig identitet og tekstlig status, og valgt løps dagsoversikt viser dag 1, korrekt dato og planlagt siste dag,
**Og** profilhodet viser den aktive rollen, riktig sjåfør og riktig dag, og navigasjonen endrer verken løpsidentitet, første dato eller andre løps innhold,
**Og** ingen vurdering markeres som OK, utført eller bekreftet som følge av oppretting eller navigasjon (FR-1/4/5, AD-7/9).

**AC-1.1-07 – Gjenåpne kvittert tilstand på samme enhet**

**Gitt** et opprettet løp med kvittert transaksjon og bevart IndexedDB i samme origin, nettleserprofil og enhet,
**Når** siden oppfriskes eller nettleseren lukkes og åpnes igjen med nett,
**Så** gjenfinnes det sist valgte løpet og første dag med samme lagrede opplysninger og plan uten nytt valg av løp,
**Og** aktiv simuleringsrolle gjenopprettes uttrykkelig, og ingen åpningsfeil fremstilles som tomt lager eller slettede data,
**Og** gjenopptakelsen måles mot AD-4s mål på høyst fem sekunder med dokumentert utstyr, nett og datamengde for denne storyen. Den fullstendige femdagers-/femløpsprofilen verifiseres når disse funksjonene finnes; denne storyen alene gir ikke bevis for hele NFR-3.

**AC-1.1-08 – Stoppe ved sperret lager eller schema som ikke støttes**

**Gitt** at IndexedDB ikke kan åpnes/skrives, oppstartens skriveprøve feiler eller lagret schemaVersion er nyere enn appen støtter,
**Når** appen starter eller oppretting forsøkes,
**Så** sperres registrering med konkret feil og relevant nytt forsøk/oppdateringsbeskjed, uten automatisk databasesletting eller stilltiende minnelager,
**Og** feil ved lesing bevarer skillet mellom utilgjengelig og tomt lager; ingen vellykket lagringsstatus vises,
**Og** persistent storage forespørres der støttet; avslag forklares uten å love backup eller bevaring ved slettet lager. Diagnostikk inneholder bare feilkode, build/schema og tillatte ikke-personlige ID-er (AD-4/13).

**AC-1.1-09 – Bruke opprettings- og oversiktsflatene på mobil og med tastatur**

**Gitt** løpsoversikt, opprettingsskjema og første dagsoversikt ved 320/360/390/768/1280 CSSpx,
**Når** flatene brukes med tastatur, 200 % tekst og 400 % zoom/reflow etter AD-12,
**Så** finnes alle oppgaver uten horisontal registreringsrulling, avkuttet tekst eller skjult fokus,
**Og** vedvarende feltnavn, tekstlige statuser og programmatisk tilknyttede feltfeil kan oppfattes med skjermleser; lagringsstatus annonseres uten å flytte fokus,
**Og** kontrast, fokusbehandling og minimumsmål for kontroller/knapper følger DESIGN/EXPERIENCE. De funksjonene som leveres her inngår i den vedtatte nettleser-/tilgjengelighetsmatrisen; faktisk prøvd utstyr og eventuelle gap registreres.

## Oppgaver / deloppgaver

- [ ] Miljø og startmal (AC-01)
  - [ ] Kontroller godkjent stack i arkitekturen mot faktisk verktøymiljø og pakke-/engine-tilgjengelighet. Observert 17. november: Node 24.19.0 / npm 11.17.0; baseline angir Node 26.13.0 / npm 11.20.0. Løs/dokumenter dette før bygg; meld konkret hindring hvis baseline ikke kan brukes, uten stilltiende versjonsbytte.
  - [ ] Opprett `app/` fra vedtatt create-vite/react-ts, lås eksakte avhengigheter/transitive pakker, fjern malinnhold og etabler typekontroll/bygg. Lås relevante testverktøy og noter kjørekommandoer.
  - [ ] Skill domene, applikasjon/porter, adapter, UI og bootstrap etter AD-1. Ingen direkte UI→IndexedDB eller domene→nettleser/React.
- [ ] Versjonert innhold og minimal modell (AC-02/03/04)
  - [ ] Overfør nøyaktig 22 kriterier i kilderekkefølge og de 22 godkjente hjelpetekstene til lokale, versjonerte innholdsressurser. Bruk stabile ID-er; dokumenter ID-/regel-/hjelpeversjon i koden. Ikke forbedre faglig ordlyd.
  - [ ] Modellér bare løp/første dag, stabil sjåfør-ID, identitet, kalenderdato, initialplan 1/2/3, revisjon og innholdssnapshot. Valider eksakt ID-sett, ikke bare antall. Bruk kalenderdato i Europe/Oslo uten UTC-datoforskyvning.
  - [ ] Valider tomme/blanke påkrevde felt, ugyldig dato og feil plan også i applikasjonskommandoen. Ingen delvis oppretting, automatisk OK eller faglig lås.
- [ ] Lokal oppstart og atomisk oppretting (AC-05/07/08)
  - [ ] Lag porter for oppretting, liste/henting og sist valgt løp/dag/aktiv simuleringsrolle. Skill tomt resultat fra lesefeil.
  - [ ] Implementer én readwrite-transaksjon som leser/validerer siste tilstand og skriver løp, første dag, snapshot og kommandoresultat. Kvitter først ved complete. Ingen asynkron nett-/ressursventing inne i transaksjonen.
  - [ ] Håndhev commandId/payload-idempotens og expectedRevision etter AD-5, også når kvittering går tapt. Behold input og tilby retry ved abort; aldri opprett nytt løp som følge av dobbeltklikk.
  - [ ] Oppstartsprøve for lager, schemaVersion/nyere schema og persistent storage der støttet. Feil sperrer registrering uten automatisk sletting/minnelager. Diagnostikk utelater navn/fritekst.
- [ ] Norsk vertikal brukerflate (AC-01/02/03/06/09)
  - [ ] Lag oversikt med lasting/tomtilstand/feil, opprettingsskjema og dagsoversikt med initialplan. Minst to fiktive løp skal kunne skilles og åpnes riktig.
  - [ ] Bruk original logo og DESIGN-tokens, vedvarende feltnavn «Ansattnummer», tydelig simuleringsrolle og kontekst. Feilliste peker/fokuserer riktig felt uten å miste input.
  - [ ] Tilgjengelig lagringsstatus annonseres uten fokusflytt; vent på faktisk transaksjon og siste kvitterte tilstand. Alle ressurser storyen bruker er lokale og ferdig lastet før registrering åpnes.
- [ ] Gjenopptakelse og feilvern (AC-05/07/08)
  - [ ] Gjenåpne sist valgte løp/dag og uttrykkelig rolle i samme origin/profil/enhet med nett. Refresh og normal lukking/gjenåpning må bruke bevart database.
  - [ ] Verifiser abort før complete, tapt kvittering etter complete, sperret DB, mislykket skriveprøve og nyere schema; ingen feil får se ut som tom database.
- [ ] Verifisering og overlevering (alle AC)
  - [ ] Kjør ren låst installasjon, typekontroll/bygg og meningsfulle domene-/adapter-/nettleserprøver i matrisen nedenfor.
  - [ ] Prøv tastatur, feltfeil/fokus/status, 320/360/390/768/1280 CSSpx, 200 % tekst og 400 % reflow; før faktiske skjermleser-/enhetsresultater og gap.
  - [ ] Dokumenter build/schema, kommandoer/resultater, endrede filer og eventuell gjenstående fysisk test. Lenovo/Android/Brave via hotspot prøves fredag–søndag. Ikke marker storyen ferdig med uoppgitte AC-gap.

## Utviklernotater

**Filkart som følger arkitekturen:** `app/src/domain/` for minimal løpsmodell/validering/read models; `application/` for kommandoer, gjenopptakelse og porter; `adapters/indexeddb/` for transaksjon/schema; `content/` for lokale snapshots; `ui/` for oversikt/oppretting/dagsoversikt og vanlig CSS; `bootstrap/` for sammenkobling/lager- og ressurskontroll. Eksakte modulnavn velges ved bygg. Ingen PDF-adapter eller fremtidige dokumentaggregater er nødvendig for å levere denne storyen.

**Kontrakter som ikke skal svekkes:** complete før «Lagret»; samme commandId/samme payload gir samme resultat før revisjonssjekk; samme ID/endret payload avvises; abort gir ingen delvis oppretting; ukjent schema feiler kontrollert; historisk innhold følger løpets snapshot. Aktiv rolle er simulering, ikke produksjonsinnlogging. Identiteter er fiktive.

**Ressurser:** original logo fra `planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/imports/tide-logo-rgb.png` under `_bmad-output/`; behold proporsjoner. Kriterier i PRD-addendumets tabell 1–22 og hjelp i `help-texts-draft.md`, som faktisk har `status: approved`. Skjerm bruker systemfont. Noto Sans gjelder senere PDF; ikke bytt skjermfont eller hent CDN-ressurser.

**Prøveplattform:** prosjekteiers Lenovo Pad / Android / Brave, mobil hotspot. Samme HTTPS-origin/profil må beholdes; localhost-/preview-data er separate fra nettbrettets lager. Denne storyens utviklingsprøver kan kjøres før fredag; faktisk nettbrettresultat føres først når prøven er utført. AD-12s øvrige matrise står fast. Gjenåpningsmålet ≤5 s prøves med dokumentert nåværende dataprofil; femløps-/femdagerskravet bevises senere.

## Verifikasjonskart

| AC | Bevis som kreves ved implementering |
| --- | --- |
| 01 | Ren låst installasjon/typekontroll/bygg; norsk startflate; lokale ressurser; import-/avhengighetsretning. |
| 02 | Gyldig oppretting med plan 1/2/3, stabile/unike ID-er, dato og ubekreftet tilstand; buss/tider kan mangle. |
| 03 | Manglende/blankt/ugyldig input gjennom både UI og kommando; null deldata; mangelliste/fokus/tekstbevaring. |
| 04 | Nøyaktig kriterie-ID-sett og frosset innhold; bytt global innholdsversjon i test og verifiser uendret gammelt løp. |
| 05 | Adapterprøver for abort før complete, ingen tidlig kvittering, dobbeltklikk, tapt kvittering/retry og ID/payload-konflikt. |
| 06 | To fiktive løp, riktig valg/kontekst/dag, ingen krysskobling eller oppdiktet bekreftelse. |
| 07 | Refresh og normal gjenåpning med nett, samme løp/dag/rolle, målt ≤5 s og oppgitt utstyr/nett/datamengde. |
| 08 | Blokkert DB/skriveprøve/nyere schema/lesefeil/persistence-avslag, ingen reset/minnelager eller persondata i diagnostikk. |
| 09 | Responsivitet/tekst/reflow, tastatur og relevant faktisk skjermleser/enhet; dokumenterte gap framfor antatt bestått. |

## Kilder

- [Godkjent originalstory](../planning-artifacts/story-1-1-proposal.md) og [epics](../planning-artifacts/epics.md).
- [Arkitektur](../planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md) og [testplan](../planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/verification-plan.md).
- [Kriterier og feltregler](../planning-artifacts/prds/prd-Digital%20kjørevurdering-2026-10-29/addendum.md).
- [DESIGN](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/DESIGN.md), [EXPERIENCE](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/EXPERIENCE.md), [godkjent hjelp](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/help-texts-draft.md).
- [Sprintplan](../planning-artifacts/sprint-plan-2026-11-17.md) og [nettbrettprotokoll](nettbrett-testprotokoll-2026-11-20.md).

## Utviklerlogg

Startmalen og de tre registreringsflatene ligger i `app/`. Build-ID `1.1.0`, lagringsschema `1`. Oppstartslasting, kommando og visning er delt mellom `bootstrap`, `application`, `domain`, `adapters/indexeddb` og `ui`. De godkjente 22 titlene og hjelpetekstene er sammenlignet tegn for tegn. Kopien av original logo har samme SHA256 som kilden.

Før reviewretting passerte ren `npm ci` under Node 26.13.0/npm 11.20.0, typekontroll, bygg, lint, åtte Node-prøver og 21 Playwright-prøver. Profilen for gjenåpning var Windows 11, lokal loopback på port 4173 og to fiktive løp med én dag hver.

| Nettleser | Refresh | Normal lukking/gjenåpning |
| --- | ---: | ---: |
| Chromium 151.0.7922.34 | 91 ms | 430 ms |
| Firefox 153.0 | 166 ms | 1696 ms |
| WebKit 26.5 | 334 ms | 834 ms |

Separat Edge 157.0.4341.60-prøve dekket oppretting, feltfeil med fokus, rollebytte og refresh (86 ms, fiktivt én-dagsløp). Faktisk 400 % zoom i Chromium ga tilgjengelig bredde 316 CSSpx og ingen horisontal rulling i oversikt, skjema, skjema med feilliste og dagsoversikt. Nettleserserien prøvde 320–1280 CSSpx og 200 % rottekst. NVDA 2026.3.1 startet med lydløs konfigurasjon, men prøven ga ingen dokumentert opplesing av feltet. NVDA/Edge og fysisk nettbrett samt VoiceOver-/TalkBack-prøvene står åpne.

Etter reviewretting passerte bygg/typekontroll, lint, **11 Node-prøver** og **39 Playwright-prøver** (13 per motor). Firefox beholdt først et injisert tomt stilark ved nytt forsøk. Ny ressursadresse ved gjentatt stilarkinnlasting rettet feilen. Sluttkjøringen målte refresh/gjenåpning til 103/349 ms i Chromium, 177/1571 ms i Firefox og 301/734 ms i WebKit, med samme to-løpsprofil. Edge i simulert mobilt landskap (667 × 375 CSSpx) passerte oppretting, feltfokus, tekstgrenser og gjenåpning. Utprøving på fysisk enhet og faktisk opplesing gjenstår. Storyen står i review mens det lokale funksjonsgrunnlaget kan brukes av neste story.

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Ny innsending etter fullført skriv og feil ved lesing (to reviewlag) | Medium. Før retting var inndata fortsatt redigerbare ved kjent commit. Behold kvitteringen og prøv lesing igjen. |
| Låst opprettingsskjema etter rollebytte i en annen fane (to reviewlag) | Medium. Rollen kunne bli sjåfør uten synlig vei tilbake med bevart utkast. Rett og prøv i nettleser. |
| Rollebytte henter en annen fane sitt valgte løp | Medium. Bytte leste globalt sist valgte løp. Bevar eksplisitt valgt løp og dag i rollekommandoen. |
| Muterbar opprettingskommando etter beregnet fingeravtrykk | Medium. Endring før IndexedDB-callback ga ulikt innhold og fingeravtrykk. Ta én kopi før arbeidet køes. |
| Utelatt påkrevd tekst ga lagringsfeil | Medium. Utypet anrop med manglende ansattnummer kunne kaste i `.trim()`. Gjør dette til feltvalidering. |
| Utelatt dags- eller sjåfør-ID kunne lagres | Medium. IndexedDB hopper over manglende indeksnøkler. Valider ID før skriving. |
| Senere planlagt dag har ukjent sluttdato | Falsk som påstand om manglende dato i dagsoversikten. Første kalenderdato og planlagt siste dag vises. Sluttdato er kjent for plan på én dag. AD-8 teller registrerte dager og gir ingen datoberegning for dag 2/3. |
| Feilformet lagret dato kunne krasje visningen (to reviewlag) | Medium. En record med riktig schema og manglende dato passerte versjonssjekken. Vis lesefeil før rendering. |
| Vilkårlig rekkefølge i versjonert innhold | Falsk som feil i leveransen. Det lokale innholdet og rekkefølgen verifiseres mot godkjent kilde. Porten bevarer rekkefølgen fra den aktuelle versjonen, også når et nytt sett introduseres. |
| Faktisk opplesing ved samtidige statusskifte og navigasjon | Uavklart i skjermleser. Status er en vedvarende live-region som ikke får fokus. Manuell NVDA/Edge-prøve gjenstår for å høre rekkefølgen. |
| Faktisk zoom, avkuttet tekst og landskap | Reelt verifiseringsgap ved opprinnelig review. Chromium-zoom er prøvd separat. Mobil i landskap og faktisk skjermleser/visuell kontroll inngår i gjenstående utstyrsprøver. |
| Feil fontvekt og linjehøyde i profilhodet (to reviewlag) | Lav. CSS-verdi avvek fra godkjent token. Rett direkte. |
| Ingen oppstartstekst ved feil i JavaScript-innlasting | Medium ved ufullstendig lokal ressurslasting. Statisk reservevisning gir vei til ny innlasting. |
| Fastlåst logoforespørsel holdt appen i lasting | Medium. Innlasting må kunne feile med nytt forsøk. Begrens venting. |
| CSS kunne feile uten at registrering ble sperret | Medium. Lagringsprøven tok ikke hensyn til aktiv stil. Kontroller lokal stil før registrering. |
| Manglet nettleserprøve for vellykket commit fulgt av lesefeil | Reelt dekningsgap. Legg til retry fra dette skillet mellom commit og lesing. |
| Manglet påstand om planlagt siste dag ved gjenåpning | Reelt dekningsgap. Kontroller verdien i dagsoversikten, også etter gjenåpning. |
| Lastetesten holdt logoen, kun etterfølgende endeutfall ble observert | Reelt dekningsgap. Hold IndexedDB-åpning og verifiser at lasting vedvarer. |
| Oppstartens «Prøv igjen» var bare sjekket som synlig | Reelt dekningsgap. Prøv at samme skjerm kan åpne lageret etter en forbigående feil. |

## Endringslogg

2026-11-17: Klargjort første implementeringsstory fra godkjent kilde med alle ni AC uendret, konkrete oppgaver, kontrakter, kilder og verifikasjonskart. Produktomfanget er uendret.
