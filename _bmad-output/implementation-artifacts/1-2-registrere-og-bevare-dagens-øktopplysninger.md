---
title: "Story 1.2 – Registrere og bevare dagens øktopplysninger"
type: feature
story_key: 1-2-registrere-og-bevare-dagens-øktopplysninger
status: in-review
baseline_commit: 9f4bae73d9a9785c560c10ea6faedf33ee346787
route: dispatch
review_loop_iteration: 0
created: 2026-11-17
epic: 1
story: "1.2"
dependsOnStories: ["1.1"]
approvedSource: ../planning-artifacts/story-1-2-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.2 – Registrere og bevare dagens øktopplysninger

Som sjåfør og fadder ønsker jeg å fylle ut dagens øktopplysninger med riktig redigeringsansvar og automatisk lagring, slik at vi kan fortsette fra faktisk lagret arbeid etter en pause.

Storyen bygger på Storage/API fra den kodegjennomgåtte 1.1. Fysisk enhetsbruk og faktisk skjermleseropplesing står åpne for 1.1. De lokale funksjons- og lagringsprøvene passerte og gir grunnlag for 1.2.

## Kodekart

| Fil | Oppgave |
| --- | --- |
| `app/src/domain/run.ts` og øktregler i `app/src/domain/` | Utvid dagens data og håndhev felt-/låsematrisen med gjenbruk av `isCalendarDate`. Bevar stabile ID-er og tidligere bekreftelser. |
| `app/src/application/run-application.ts`, `app/src/application/run-store.ts` | Utvid `toView`, porten og mønsteret fra `executeCreate` med revisjon, innholdskopi og kvittering for øktkommandoen. Bruk løps- og dags-ID fra den berørte visningen, også ved konflikt. |
| `app/src/adapters/indexeddb/run-store.ts` | Gjenbruk `runTransaction`, `readRun`, `loadSession` og envelope. Les nyeste revisjon og autoritativ rolle i samme transaksjon som oppdatering/kvittering. Sjekk gjenbrukt ID og payload før revisjonen. |
| `app/src/ui/App.tsx` og øktskjema i `app/src/ui/` | Legg øktfelt i dagsoversikten. Flush før `showRuns`/`openRun`/`changeRole`. La brukeren skrive et nyere utkast mens eldre skriv pågår. Skill dirty innhold fra siste kvittering. |
| `app/tests/` | Utvid Story 1.1s låste verktøysett med domenefiksturer, transaksjons- og nettleserprøver. |

## Akseptansekriterier

<frozen-after-approval>

**AC-1.2-01 – Registrere opplysninger med riktig rolle og ansvar**

**Gitt** et løp med første dag fra Story 1.1,
**Når** dagens øktopplysninger åpnes i sjåfør- eller fadderrollen,
**Så** vises riktig sjåfør, ansattnummer, fadder, dato, buss, linjer, inn-tid og ut-tid med vedvarende etiketter og tydelig redigerbar/låst tilstand,
**Og** fadder kan registrere og endre buss og linjer, mens sjåfør kan lese dem; begge kan registrere og endre inn-/ut-tid frem til dagslåsing,
**Og** aktiv rolle, sjåfør og dag følger visningen, og applikasjonskommandoene avviser skriving utenfor rollens feltansvar også når UI-kontroller omgås (FR-3/4, AD-6/9).

**AC-1.2-02 – Vise feltmangler på riktig trinn**

**Gitt** en opprettet, ubekreftet økt som fortsatt utfylles,
**Når** buss, linjer og tider registreres eller feltkontrollen åpnes,
**Så** viser kontrollen at minst én buss, linjer og begge tider må foreligge før dagslåsing; en ubrukt buss 2 er ikke en mangel,
**Og** begge tider valideres som HH:mm uten sekunder, med gyldige time-/minuttverdier; ut-tid tidligere enn inn-tid avvises ikke alene fordi skiftet kan gå over midnatt,
**Og** mangler forklares ved riktig felt uten at appen påstår at dagen er bekreftet eller låst. Utkast kan være ufullstendige; pågående/ugyldig innskriving beholdes synlig og omtales som lagret bare dersom den faktisk er bevart som utkast,
**Og** feltkontrollen skiller mellom det som kreves ved sjåførbekreftelse og dagslåsing: manglende buss/linjer/tider er ikke i seg selv en mangel i sjåførens etterbekreftelse (FR-3, AD-6).

**AC-1.2-03 – Bevare feltlåser og historiske navn ved redigering**

**Gitt** løpets stabile sjåfør-/øktkobling og den gjeldende feltlåstilstanden,
**Når** identitet, dato, faddertilknytning eller andre øktfelt forsøkes endret,
**Så** kan ubekreftede felt redigeres etter feltmatrisen, mens dag-1-identitet/dato/tilhørighet etter førbekreftelse og dag-2–5-identitet/dato/tilhørighet etter etterbekreftelse avvises som låst,
**Og** gjeldende fadder kan endres frem til fadders dagsbekreftelse, også etter sjåførens bekreftelse; tidligere bekreftelser beholder faktisk bekreftende navn,
**Og** buss/linjer/tider avviser skriving etter dagslås; endring av overordnet profil/løp eller bruk av gammel skjerm kan ikke omgå disse grensene,
**Og** en ulåst datoendring bevarer unikhet og stigende dagsrekkefølge, kalenderdato i Europe/Oslo og samme sjåfør-/løpstilknytning (AD-5/6/8). Låsetilstander kan prøves med kontrollerte domenefiksturer uten at senere bekreftelseshandlinger må være implementert.

**AC-1.2-04 – Lagre utkast automatisk med sann status**

**Gitt** redigerbare øktopplysninger og fungerende IndexedDB,
**Når** brukeren endrer innhold,
**Så** markeres nytt input straks som ulagret/lagring pågår, og automatisk lagring sikter mot transaksjonscomplete innen to sekunder etter siste input under AD-4s testbetingelser,
**Og** ved kontinuerlig skriving forsøkes flush minst hver to sekunder; «Lagret på denne enheten» gjelder bare den sist kvitterte revisjonen og vises aldri for nyere ulagret tekst,
**Og** siste aggregat leses og rolle/låser/revisjon valideres i samme readwrite-transaksjon som data og kommandoresultat skrives; abort endrer ingen kvittert tilstand (AD-3/4/5).

**AC-1.2-05 – Bytte rolle eller side uten å miste innskrevet tekst**

**Gitt** ulagrede øktopplysninger i den åpne visningen,
**Når** brukeren bytter rolle eller navigerer til en annen side/løp,
**Så** flushes berørt utkast før skiftet gjennomføres,
**Og** ved lagringsfeil avbrytes skiftet, teksten beholdes i den åpne visningen, og «Endringene er ikke lagret. Prøv igjen.» forklarer situasjonen,
**Og** etter vellykket rollebytte fjernes forrige visningsmodell, åpne dialoger, felttilstand og DOM før den nye rollevisningen åpnes. Data kopieres ikke mellom roller, og begge ser samme kvitterte, tillatte øktopplysninger (AD-4/9).

**AC-1.2-06 – Fortsette ved nettbrudd og gjenåpne lagrede opplysninger**

**Gitt** at appens aktuelle ressurser er lastet og lokalt lager fungerer,
**Når** nettet kobles fra i 60 sekunder og brukeren fortsetter å registrere øktopplysninger,
**Så** kan opplysningene lagres lokalt, nettstatus vises uavhengig av lagringsstatus, og kvitterte data går ikke tapt; det opprettes ingen synkroniseringskø eller serveropplasting,
**Og** ved gjenåpning/refresh med nett i samme origin/profil/enhet med bevart lager hentes riktig løp/dag og siste kvitterte opplysninger uten nytt løpsvalg; femsekundersmålet prøves med registrert utstyr/nett/datamengde etter AD-4,
**Og** tilgjengelig feil ved kaldstart/refresh uten nett innebærer ikke at lagrede data omtales som slettet. Full femdagers-/femløpsprøve og bekreftelser under nettbrudd gjenstår når de øvrige brukeroppgavene er implementert.

**AC-1.2-07 – Håndtere lagringsfeil og foreldet visning uten overskriving**

**Gitt** en skrivefeil, kvotefeil eller nyere løpsrevisjon fra en annen fane,
**Når** utkast forsøkes lagret fra den gamle visningen,
**Så** vises ingen falsk lagringskvittering og ingen nyere data overskrives,
**Og** ved revisjonsavvik lastes faktisk lagret snapshot, mens ulagret tekst beholdes separat for brukerens kontroll uten automatisk sammenslåing,
**Og** nytt forsøk med samme commandId/payload gir samme resultat; samme ID med endret payload avvises. Etter et faktisk endret brukerforsøk brukes en ny kommando mot den siste revisjonen,
**Og** feil eller gjenåpning opphever ingen eksisterende feltlås og sletter ikke databasen; diagnostikk beholder grensen mot navn/fritekst (AD-3/4/5/13).

**AC-1.2-08 – Utfylle øktfeltene på mobil og med hjelpemidler**

**Gitt** øktopplysninger, feltmangler, lagringsstatus og rollebytte på den vedtatte webflaten,
**Når** funksjonene prøves ved 320/360/390/768/1280 CSSpx, 200 % tekst, 400 % zoom/reflow, tastatur og relevante skjermlesere etter AD-12,
**Så** kan feltene leses og brukes uten horisontal registreringsrulling, avkutting eller skjult fokus, også med mobilens skjermtastatur,
**Og** programmatisk feltnavn, feiltilknytning, tekstlig lås/status og naturlig fokusrekkefølge gjør ansvar og mangler forståelige; lagringsmeldinger flytter ikke fokus eller avbryter innskriving gjentatte ganger,
**Og** systemfont, farger, kontrollgrenser, knapper og fokus følger DESIGN. Faktiske testversjoner/enheter og eventuelle gap registreres; ingen generell tilgjengelighetspåstand følger av dokumentet alene.

</frozen-after-approval>

## Tasks & Acceptance

- [ ] Domenet: definer øktfelter med separate regler for utkast og bekreftelse. Gjenbruk kalenderdato og løps-/dags-ID. Valider rolle, identitets-/dagslås, kronologi og tider. Lag felles feltkontroll for kommende bekreftelseskommandoer.
- [ ] Applikasjon/adapter: utvid eksisterende transaksjonsport med øktkommando. Les gjeldende rolle og aggregat, valider revisjon og lagre utkast, ny revisjon og kvittering samlet. Les både tidligere opprettede løp uten øktfelter og løp med lagrede felt.
- [ ] Visning: bruk eksisterende dagsoversikt, vedvarende norske etiketter og feltspesifikt ansvar. Vis feil og ferdigkrav, hold nettstatus atskilt fra lagringsstatus.
- [ ] Autosave: behold ulagret tekst, bruk senest kvitterte revisjon, serialiser skriv, og flush før navigasjon/rollebytte. Behold begge versjoner ved konflikt; prøv igjen eksplisitt uten automatisk sammenslåing.
- [ ] Domenetester: skriveansvar, tre feltlåsetrinn, historisk fadder, like/ombyttede datoer, ugyldig tid, skift over midnatt, buss 2 og separate fullføringskrav.
- [ ] Adapter-/nettleserprøver: tosekundersmålet og periodisk flush, avbrutt bytte, kvote/abort og foreldet fane, idempotens, 60 s nettbrudd, refresh/gjenåpning, 320–1280 CSSpx, tastatur og tekstforstørrelse. Før faktisk skjermleser-/enhetsdekning og gap.

## Design Notes

Bruk fadderens etablerte opprettingsansvar for retting av identitetsfeltene og gjeldende fadder i simuleringen. Sjåfør har lesetilgang til disse og eget redigeringsansvar for tidene. En redigering kan endre visningsdata for gjeldende utkast. Løps-/dagskoblingen og stabil sjåfør-ID består; låste verdier og tidligere bekreftende navn bevares.

Domenet validerer utkast separat fra bekreftelseskrav. Behold ufullstendige eller feilskrevne tekstverdier som utkast der det er trygt. Faktisk kalenderdato og eksisterende tilknytning må fortsatt være gyldige. Prøv fremtidige låsetilstander og dagrekkefølge med domenefiksturer. Bruk additive datafelter og leseren for schema 1 slik at tidligere opprettede løp gjenåpnes med tomme øktfelt.

Ved revisjonsavvik, hent kvittert snapshot for det samme løpet og den samme dagen. `read()` alene kan følge en annen fanes globale valg. Behold ulagret tekst ved siden av de kvitterte verdiene til et uttrykkelig brukerforsøk. Det finnes ingen destruktiv datamigrering, ekstern handling eller uavklart produktbeslutning for denne storyen.

## Verification

- `npm run build` og `npm run lint` med Node 26.13.0/npm 11.20.0.
- `npm test` for eksisterende og nye domene-/adapterprøver.
- `npm run test:browser` mot lokal statisk preview med låst Playwright og faktiske resultat per motor.
- Dokumenter autosave-/gjenåpningstider, 60 s programmatisk frakobling, layout, tastatur og faktisk hjelpemiddeldekning. Manuelle gap skal stå tydelig i status.

## Kilder

- [Godkjent Story 1.2](../planning-artifacts/story-1-2-proposal.md)
- [Sprintplan](../planning-artifacts/sprint-plan-2026-11-17.md)
- [Arkitektur og feltmatrise](../planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md)
- [Brukeropplevelse](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/EXPERIENCE.md)
- [Verifiseringsplan](../planning-artifacts/architecture/architecture-Digital%20kjørevurdering-2026-11-05/verification-plan.md)

## Implementation Notes

Feltstyring, validering før de to bekreftelsestrinnene, schema 1-utkast og autosave er i appen. Tidsfelt kan lagres som ufullstendige utkast. Korrigert dato må være gyldig og bevare streng rekkefølge. Nye felter er additive og eldre, ubekreftede løp får tomme øktfelter. Fadder redigerer identitet, gjeldende fadder og materiell. Begge roller redigerer inn- og ut-tid frem til dagslåsing.

Før reviewretting bestod bygg/typekontroll, lint, 18 Node-prøver og 63 Playwright-prøver med låst Node 26.13.0/npm 11.20.0. Miljø Windows 11 build 26300.9974, Intel i7-8086K, Playwright 1.62.0 og lokalt nett på 127.0.0.1:4173. Den lokale registreringen fortsatte gjennom over 60 sekunder simulert frakobling i alle tre motorer, uten nettverksforespørsler. Egen prøve i Firefox etter 60 sekunder frakoblet uten input kvitterte første nye endring på 402 ms. Den dekker en reell forsinkelse i nettlesertidsuret, som ble rettet ved å kontrollere samme frist under synlige skjermoppdateringer.

| Motor | Enkeltflush / første periodiske complete / siste input til complete | Normal refresh / gjenåpning | Frakoblet / refresh etter brudd |
| --- | --- | --- | --- |
| Chromium 151.0.7922.34 | 358 / 1506 / 108 ms | 113 / 404 ms | 63404 / 64 ms |
| Firefox 153.0 | 356 / 1505 / 93 ms | 193 / 1681 ms | 63481 / 178 ms |
| WebKit 26.5 | 420 / 1568 / 152 ms | 326 / 1012 ms | 63504 / 305 ms |

Separat Chromium-prøve ved faktisk 400 % nettleserzoom målte 316 CSSpx tilgjengelig bredde. Åpen feltkontroll, navigasjon fra feltfeil og autosave passerte uten horisontal rulling. De ordinære prøvene dekket 320–1280 CSSpx og 200 % tekst. Fysisk mobil, skjermtastatur og faktisk skjermleserprøve av øktskjemaet gjenstår.

Reviewrettingene bevarer nyere feltaktivitet selv når teksten går tilbake til en tidligere verdi under skriving. Et eksplisitt konfliktvalg kan hente låste felt og bevare andre endringer. Gjenåpning ved midlertidig stengt database bruker applikasjonens lageråpning, mens nyere schema forklares med teksten fortsatt i skjemaet. Tomt fadderutkast ligger i et additivt felt med gyldig kanonisk navn i den eldre schema 1-formen. Etter retting bestod bygg/typekontroll, lint, **21 Node-prøver og 81 Playwright-prøver** i Vite-build `story-1.2-20261118`. Den siste kjøringen målte første periodiske complete til 1509/1512/1569 ms og normal gjenåpning til 427/2208/899 ms i Chromium/Firefox/WebKit. Alle tre fortsatt lagret etter 63,3–63,6 sekunder frakoblet. Storyen står i review for faktisk enhets- og hjelpemiddelprøving.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Ny tekst skrevet tilbake til opprinnelig verdi under konflikt-retry | Medium. Reprodusert i Chromium: Linjer B→Y→B ble erstattet av X etter tidligere kvittering. Spor feltaktivitet under skriving. |
| Retting av dato mens ugyldig skriving er i arbeid (blind gjennomgang) | Medium. Avvist gammel verdi kunne feste feil til gyldig ny tekst. Bruk forsøkte feltverdier og prøv den nye verdien. |
| Retting av dato mens ugyldig skriving er i arbeid (kanttilfeller) | Medium. Autosave-flush kunne stoppe på foreldet validering. Samme retting, med nettleserprøve. |
| Retry med samme ID etter kommando-ID-konflikt | Medium. Samme signatur holdt ID-en i bruk. Nytt uttrykkelig konfliktforsøk bruker ny ID. |
| Ett låst felt blokkerer øvrige redigerbare utkast | Medium. UI tvang til forkasting av hele utkastet. Brukeren får beholde de redigerbare endringene ved eget valg. |
| Låst identitet fra profil uten snapshot | Fremtidig integrasjonsvern. Dags- og bekreftelsesdata må være koherente. Test den aktuelle lagrede formen og avvis ugyldige låser ved lesing. |
| Feilformede bekreftelser kan se ut som gyldige låser | Medium ved ukjent persisted data. Valider eksisterende bekreftelsestype og forventet rolle, med beholdt støtte for eldre ubekreftede løp. |
| Tomt fadderutkast er uleselig i eldre schema 1-app | Medium for samme schema. Hold kanonisk navn gyldig og lagre tomt arbeid additivt. |
| Nyere schema gir resultatløst nytt forsøk | Medium. Behold tekst og forklar hvilken oppdatering som kreves. |
| En offline lagringsretry avhenger av logolasting | Medium. Åpne lokal lagring via applikasjonen og behold allerede lastede ressurser. |
| Ren dagsnavigasjon eller rollebytte etter stengt database | Medium. Nytt forsøk kan åpne lagring på nytt uten utkasttap. |
| Ny konflikthenting prøver en stengt tilkobling igjen | Medium. Hent samme løp og dag etter gjenåpning av lagring. |
| Korrupt record i et annet løp påvirker konflikthenting | Lav nå. Arbeidsoversikten stanser kontrollert for ødelagt innhold. Nåværende app skriver kun validerte records. Egen målrettet lesemodell vurderes når flere dokumenttyper kommer. |
| Revisjon kan overskride heltallsgrensen | Lav, bekreftet. Avvis før commit når ny revisjon ikke kan leses. |
| Fokus mistes når konfliktknapp forsvinner | Medium for tastatur/skjermleser. Flytt fokus til overlevende dagskontekst etter avsluttet uttrykkelig valg. |
| Vedvarende kravtekst ved feltene | Lav. Vis hvilket trinn som krever feltet, og at én buss er tilstrekkelig. |
| Dagskontroll med åpne lenker ved zoom (blind gjennomgang) | Verifiseringsgap. Den separate zoomen prøvde åpen kontroll. Mål også lenkemål i regresjonen. |
| Manglet test av eksplisitt valg og gjenåpning av dag 2 | Verifiseringsgap i adapteren. Test senere dag som lagret fikstur. |
| Manglet test av gjenvinning etter rolleendring på dagflaten | Verifiseringsgap. Prøv to faner med bevart utkast og uttrykkelig lagring. |
| Manglet test av åpne mangellenker ved 200 % og alle bredder | Verifiseringsgap. Kontroller åpne lenker, rulling og minstemål. |
