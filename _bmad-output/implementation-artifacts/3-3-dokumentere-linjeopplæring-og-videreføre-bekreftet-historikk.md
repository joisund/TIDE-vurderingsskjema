---
title: "Story 3.3 – Dokumentere linjeopplæring og videreføre bekreftet historikk"
type: feature
story_key: 3-3-dokumentere-linjeopplæring-og-videreføre-bekreftet-historikk
status: in-review
route: dispatch
review_loop_iteration: 0
baseline_commit: 4fbaafebc46db99bdb43eae19cadbe56e446cfda
created: 2026-11-18
epic: 3
story: "3.3"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "3.1", "3.2"]
approvedSource: ../planning-artifacts/story-3-3-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/instructor-extension.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/verification-plan.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/instructor-extension.md"
  - "_bmad-output/planning-artifacts/instructor-source-inventory.md"
  - ".cache/instructor-source/grunnkurs-kildekontroll.md"
---

# Story 3.3 – Dokumentere linjeopplæring og videreføre bekreftet historikk

Sjåfør fører faktiske datoer for en selvstendig linjeoversikt. Instruktør bekrefter valgte registreringer, og hver bekreftelse bevarer en ny frosset, nedlastbar versjon av linjehistorikken.

## Akseptansekriterier

<frozen-after-approval>

**AC-3.3-01 – Opprette og gjenfinne selvstendig linjeoversikt**

**Gitt** instruktørrollen eller sjåførrollen i egen uttrykkelig valgt sjåførkontekst,
**Når** Linjeopplæring opprettes/åpnes fra dokumentoversikten,
**Så** opprettes/gjenfinnes et eget linjedokument med documentId, dokumenttype, revisjon og stabil driverRef, med kandidatnavn/fiktivt ansattnummer i eget identitetsgrunnlag,
**Og** ingen teknisk opplæring, vurderingsløp, dag, vurderingssvar eller CloseRun kreves eller opprettes som omvei. Begge tilleggsskjemaene kan brukes uavhengig av hverandre som avtalt,
**Og** ny oversikt har ingen oppdiktede kjøringer eller bekreftelser. Like navn/ansattnumre slår ikke sammen sjåfører eller dokumenter; valg av annen sjåfør flytter ikke eksisterende dokumentasjon,
**Og** dokumentlisten viser type, sjåfør og faktiske antall bekreftede registreringer/utkast. Tom, lastende og feilet åpning skilles; nytt forsøk sletter ikke innhold. Oppretting av nytt dokument krever uttrykkelig handling og dupliseres ikke av gjentatt kommando (FR-22/23, AD-14/15).

**AC-3.3-02 – Bevare den versjonerte 26-linjers kilden**

**Gitt** linjeskjemaets visuelt gjennomgåtte kildeside,
**Når** dokumentets malgrunnlag opprettes,
**Så** fryses mal-ID/versjon og de 26 linjene i kildeorden: 20, 21, 22, X23, 24, 26, X27, 28, X29, 30, X31, X32, 33 (M1), 34 (M2), X35, X36, 40, 42, X43, X44, 413, 421, 425, 428, 450 og 550,
**Og** stabile linje-ID-er L01–L26 følger denne rekkefølgen; valgt registrering skal peke på en av dokumentets forventede ID-er. Manglende, dupliserte eller fremmede katalog-ID-er avvises selv om antallet er 26. Stor/liten x normaliseres i visning uten å endre linjeidentitet,
**Og** linje 30s merknad «Kjøres med leddbuss. Egen opplæring» vises ved linjen, i relevant bekreftelsesoversikt og i PDF. Den er ikke et automatisk vedtak om at egen opplæring er gjennomført eller bestått,
**Og** ingen global katalogendring bytter navn/merknad eller nytolker en historisk registrering. Kilden behandles som lokal mal, ikke verifisert sanntidsrutedata. Ingen ekstern rutehenting, administrativ malbygger eller fast gjeninnføring av kildens avdelingsnavn inngår (FR-22, AD-13/15/16).

**AC-3.3-03 – La sjåføren føre faktiske linjer og flere kjøredatoer**

**Gitt** et linjedokument i riktig sjåførkontekst,
**Når** sjåføren legger til, retter eller uttrykkelig fjerner en egen ubekreftet linje-/datoregistrering,
**Så** kreves en gyldig linje-ID fra dokumentets mal og en gyldig faktisk kjøredato som YYYY-MM-DD i Europe/Oslo. Registreringen får stabil entryId, faktisk utfyllende sjåfør/rolle og egen Utkast-tilstand; kjøredato skilles fra registrerings-/bekreftelsestid,
**Og** samme linje kan ha flere registreringer/datoer, og flere linjer kan kjøres samme dato. Ingen femdagersgrense, krav om sammenhengende dager eller én-økt-per-dato arves fra vurderingsløpet. En senere ført eldre kjøredato endrer ikke gamle registreringer,
**Og** bevisst ny registrering er en ny handling med ny entryId, også om linje/dato er lik en tidligere. Gjentatt commandId/payload er samme handling og lager ikke en ny registrering. Innhold slås ikke automatisk sammen bare fordi feltene er like,
**Og** en tom datocelle i katalogen er ingen registrering og betyr «Ingen bekreftet kjøredato», ikke bestått, avslag eller mangelfullt skjema. Bare faktisk påbegynte registreringer får egen utkaststatus. Bare eget ubekreftet utkast kan fjernes; en slik handling påvirker ikke bekreftet historie eller PDF-kilder. Ingen avkryssing av alle linjer eller forhåndsvalgt dato innføres (FR-22, UX-DR26).

**AC-3.3-04 – Skille sjåførens føring fra instruktørens bekreftelse**

**Gitt** et linjedokument med utkast og eventuelt tidligere bekreftede registreringer,
**Når** sjåfør eller instruktør åpner/betjener det,
**Så** kan bare sjåføren i egen sjåførkontekst føre og rette ubekreftede linjer/kjøredatoer. Instruktør kan forberede hodeopplysninger før første bekreftelse, lese/veilede og bekrefte valgte registreringer, men ikke føre/endre sjåførens linje-/datofelt,
**Og** begge kan lese hele eget aktuelt linjedokument fra utkast til bekreftet historikk. Sjåfør kan ikke bekrefte på instruktørens vegne; ingen ekstra sjåførsignatur, innsending eller foreløpig sjåførlås kreves,
**Og** feil sjåførkontekst og fadderrolle får ikke tilgang gjennom dette dokumentets porter. Felt-/rolleansvar håndheves også ved direkte kommandoer, gamle faner og rollebytte. Dokumentets tidlige sjåførinnsyn utvider ikke skjult faglig innhold i vurderingsløpet,
**Og** driverRef kan aldri omkobles. Hodeopplysningenes identitetsgrunnlag fryses ved første bekreftelse og bevares i senere versjoner; nye profilverdier omskriver ikke historie eller gamle PDF-kilder (FR-23/24, AD-6/9/14/15).

**AC-3.3-05 – Lagre utkast og vise hva som faktisk er bekreftet**

**Gitt** nye/redigerte linje-/datofelt i sjåførrollen,
**Når** innhold lagres, rolle/rute skiftes eller dokumentet gjenåpnes,
**Så** følger lagring AD-4s kontrakt med straks ulagret status, mål om complete innen to sekunder etter siste input og flush-forsøk minst hver to sekunder ved kontinuerlig skriving. Lagret gjelder bare siste kvitterte revisjon,
**Og** rollebytte til instruktør flushes først og avbrytes ved feil som ville miste input. Instruktør leser kvittert tilstand, og en lagret sjåførendring etter åpnet bekreftelsesdialog gjør dialogen foreldet,
**Og** oversikten viser faktiske kjøredatoer og Utkast/Bekreftet per registrering, med antall av hver type. Ingen samlet «Avsluttet», «Alle linjer gjennomført» eller faglig beståttstatus avledes fra at noen registreringer er bekreftet,
**Og** ufullstendig innskriving kan bevares som utkast med feltfeil uten å hevde kjørt/bekreftet. Gjenåpning viser riktig documentId, sjåfør, rolle, utkast og bekreftet historie; åpnefeil simulerer ikke tomt lager (FR-22/23, NFR-3, AD-3/4/13/15).

**AC-3.3-06 – Kontrollere og uttrykkelig bekrefte valgte registreringer**

**Gitt** aktiv instruktør og én eller flere valgte, ubekreftede registreringer for samme sjåfør/dokument,
**Når** Bekreft registreringer åpnes,
**Så** kreves minst én valgt registrering, korrekt dokumenttype/driverRef/identitetsgrunnlag, gyldige linje-ID-er/kjøredatoer, faktisk utfyllende sjåfør og kvittert berørt innhold i aktuell revisjon. Ingen av de 26 øvrige kataloglinjene kreves kjørt,
**Og** mangler i utvalget forklares per linje/felt med vei til sjåførens retting; instruktør får ikke skriverett til linje-/datofeltene som omvei. Uvalgte utkast forblir tydelig ubekreftet og blokkerer ikke bekreftelse av et ellers gyldig utvalg,
**Og** dialogen viser kandidat, faktiske valgte linjer/kjøredatoer, relevant merknad ved linje 30, faktisk bekreftende instruktør og at bare utvalget låses permanent. Tidligere bekreftelser omskrives ikke eller fremstilles som signert av den nye instruktøren,
**Og** bare uttrykkelig bekreftelse sender kommandoen. Avbryt/lukk/Escape gir ingen lås eller ny eksportversjon. Utfyllingsgrad, lagring eller en annen sjåførs opplæring bekrefter ikke registreringene automatisk (FR-22/24, AD-6/15, UX-DR27).

**AC-3.3-07 – Fryse registreringer og samlet bekreftet kilde atomisk**

**Gitt** gyldig utvalg, aktiv instruktør og forventet dokumentrevisjon,
**Når** ConfirmLineTrainingEntries utføres,
**Så** leses siste linjeaggregat og type/ID/rolle/kobling/revisjon/registreringslåser/fullføringskrav valideres igjen i samme readwrite-transaksjon som valgte registreringer, deres faktiske instruktør-ID/navn/rolle/tid og ny frosset LineTrainingSnapshot lagres,
**Og** snapshotet inneholder historisk kandidat/fiktivt ansattnummer/driverRef, malens 26 linjer/merknader, alle hittil bekreftede registreringer med entryId/linje-ID/faktisk kjøredato/utfyller og hver registrerings opprinnelige instruktørbekreftelse samt regel-/layoutversjon og entydig kildeversjon. Ubekreftede utkast kopieres ikke inn som bekreftede,
**Og** Bekreftet per registrering og ny kildeversjon vises først ved complete. Gamle snapshotversjoner og bekreftede registreringer er uforanderlige; feil før complete gir ingen halv bekreftelse eller halv eksportversjon,
**Og** samme commandId/payload returnerer tidligere resultat før revisjonskontroll. Endret payload med samme ID, foreldet revisjon eller et nytt forsøk på å bekrefte allerede låste registreringer avvises uten dobbel bekreftelse. Ingen nett-/PDF-generering foregår i lagringstransaksjonen (FR-24, NFR-4, AD-3/5/6/15/16).

**AC-3.3-08 – Fortsette med flere registreringer uten å åpne historikken**

**Gitt** linjedokument med minst én bekreftet registrering og frosset kilde,
**Når** sjåføren legger til senere linjeopplæring og instruktør eventuelt bekrefter den,
**Så** tilføyes nye entryId-er som utkast uten å endre låste linjer/datoer, faktiske avsendere, tidligere instruktørnavn eller gamle PDF-kilder. Sjåfør/instruktør kan ikke gjenåpne, rette eller slette en bekreftet registrering gjennom støttede skriveveier,
**Og** samme linje kan få nye kjøredatoer, og ulike instruktører kan bekrefte ulike registreringer. Hver persons faktiske bekreftelse beholdes; ny bekreftelse dekker bare det nye utvalget,
**Og** senere bekreftelse lager en ny frosset samlet historikkversjon som inneholder tidligere bekreftede registreringer uendret pluss det nye utvalget. Den erstatter ikke eldre versjoner og hevder ikke at tidligere instruktører har bekreftet nye datoer,
**Og** nye utkast endrer ikke noe annet dokument, teknisk bekreftelse eller lukket vurderingsløp. En generell CloseRun-/gjenåpningskommando brukes ikke til linjeregistrering; oversikten kan fortsette etter en tidligere bekreftet eksport (FR-22/23/24, AD-13/15/16).

**AC-3.3-09 – Laste ned tydelig avgrenset, komplett bekreftet linjehistorikk**

**Gitt** minst én frosset bekreftet kildeversjon og aktiv instruktør eller riktig sjåførkontekst,
**Når** Last ned bekreftet linjeopplæring velges,
**Så** lager lokal PDF-adapter en faktisk selvstendig application/pdf-fil fra en klart angitt bekreftet versjon, som standard den nyeste. Filen identifiserer sjåfør, kildeversjon og tidspunktet historikken er bekreftet frem til, og sier at ubekreftede registreringer ikke inngår,
**Og** dersom nyere utkast finnes, viser appen før nedlasting hvor mange som fortsatt venter og at de ikke inngår i denne filen. Ingen utkasttekst eller levende status blandes inn i den frosne filkilden. Uten bekreftet kilde er normal PDF sperret; dette innfører ingen utkast-PDF-funksjon,
**Og** egen A4 stående oversikt bevarer alle 26 mal-linjer i kildeorden, linje 30s merknad og alle faktisk bekreftede datoer/utfyllere/instruktørbekreftelser fra kilden. Flere datoer innen en linje ordnes kronologisk med stabil rekkefølge ved lik dato. En linje uten bekreftet dato merkes som ikke dokumentert i denne versjonen, ikke som underkjent eller sikkert ukjørt,
**Og** dokumentkontrollen verifiserer eksakte mal-/entry-ID-er, metadata/merknader, full dato-/avsender-/bekreftelsesdekning og ingen uvedkommende utkast. Godkjent profil/logo, lokal Noto Sans, søkbar tekst, sidetall og fortsatte overskrifter brukes uten klipping ved flere sider. Filen kan leses uten appen og overleveres manuelt, uten fiktiv felles signatur eller sending (FR-22/24, NFR-5/6, AD-11/16).

**AC-3.3-10 – Håndtere feil, gamle faner og gjentatt nedlasting uten datatap**

**Gitt** dobbeltklikk, mistet kvittering, kvotefeil, gammel sjåfør-/instruktørvisning, feil dokumenttype/ID eller PDF-feil,
**Når** oppretting, lagring, bekreftelse eller nedlasting forsøkes og eventuelt gjentas,
**Så** gjelder samme ID/payload-resultat før revisjonskontroll, ingen stille overskriving/merge og intet skriv i en annen sjåførs dokument, teknisk skjema eller vurderingsløp. Ved avvik hentes faktisk snapshot mens ulagret input beholdes separat; feil som ville miste input avbryter rolle-/ruteskifte,
**Og** avbrudd før/etter complete gir enten tidligere utkast/historikk eller helt bekreftet utvalg og kildeversjon, uten halv lås, dupliserte hendelser eller endret tidligere historie. Migrering/ukjent schema gir kontrollert vern etter AD-13, aldri automatisk databasesletting,
**Og** PDF-feil tilbyr nytt forsøk uten å endre registreringer/bekreftelser. Ny nedlasting av samme kildeversjon gir samme faginnhold, selv om nye utkast finnes; byteidentitet loves ikke. Feil/ukjent layout eller ufullstendig kilde stopper normal fil; eventuell teknisk diagnostikkfil merkes på hver side «UFULLSTENDIG – IKKE ENDELIG DOKUMENTASJON»,
**Og** nødvendige skjerm-/PDF-/font-/logoressurser lastes før registrering. Lastet app med fungerende lokalt lager tillater videre lokal føring/bekreftelse/PDF under 60 s nettbrudd. Normal gjenåpning følger AD-4s femsekundersmål på samme origin/profil/enhet med bevart lager; ingen kald offline-start- eller backupgaranti utvides (AD-2–5/13/15/16).

**AC-3.3-11 – Prøve hele den selvstendige linjeoppgaven tilgjengelig**

**Gitt** S11/S13/S14 og et linjedokument uten teknisk skjema eller vurderingsløp,
**Når** føring, instruktørkontroll, bekreftelse, senere tillegg og PDF prøves etter den vedtatte testplanen,
**Så** fungerer oppgavene ved 320/360/390/768/1280 CSSpx, portrett/landskap, 200 % tekst/400 % zoom, tastatur/skjermlesere og mobilskjermtastatur uten horisontal registreringsrulling, skjult fokus eller avkuttede handlinger. Kontrollnavn inkluderer riktig linje/dato/registrering, og Utkast/Bekreftet oppfattes uten farge alene,
**Og** prøvene omfatter én bekreftet linje mens øvrige er tomme, alle 26 linjer, linje 30s merknad, flere datoer per linje/flere linjer per dag, bevisst ny lik registrering versus retry, uvalgt ufullstendig utkast, feil sjåfør/rolle/type, sjåførendring etter åpnet instruktørdialog, ulike bekreftende instruktører og gamle skriveveier mot låst historikk,
**Og** minst to kildeversjoner prøves med nye utkast mellom bekreftelser: gammel PDF beholder identisk faginnhold, ny PDF inneholder gammel historie uendret pluss nytt bekreftet utvalg, og appen opplyser om utkast som ikke er med. Alle sider og fulltekst sammenlignes med kilden, inklusive flere siders registreringer, lange maltekster/merknader og æøå/åäö,
**Og** lagrings-/avbrudds-/gjenopptakelsesprøvene omfatter fem vurderingsløp, ett med fem dager, fem tekniske dokumenter og fem linjedokumenter med 26 linjer og minst to kjøredatoer per linje. Faktisk datamengde/enhet/nett registreres. Ren låst installasjon/typekontroll/bygg og relevante domene-/adapter-/nettleserprøver samt faktiske enhets-/PDF-leserprøver etter AD-12 gjennomføres ved implementering; gap rapporteres, ikke som bestått. Tidligere vurderings-/tekniskhistorikk bevares (NFR-1–6).

</frozen-after-approval>

## Code Map

- [Originalkontrollen av grunnkursmalens side 2](../../.cache/instructor-source/grunnkurs-kildekontroll.md) har alle 26 linjer i kilderekkefølge og linje 30s merknad. Kontroller mot original og godkjent inventar før malversjonen fryses.
- Gjenbruk sjåførreferanse, dokumentvalg og kvitteringsmodell fra 3.1/3.2. Gi linjeoversikten egen dokumenttype, aktiv versjon, registrerings-ID og bekreftelseskilder. Bruk S11 fra app/src/ui/InstructorOverview.tsx og app/src/ui/App.tsx. Gjenbruk kanonisk driveroppslag, dokumenttypehenvisningen i aktiv sesjon og eksisterende IndexedDB-kommandoer med kvittering ved complete. Bevar vurderingsdata og tekniske kilder fra schema 5 ved oppgradering.
- Gjenbruk appens rollevakt på skjerm-, kommando- og PDF-nivå, inkludert fokus og DOM-rensing i tilbakebuffer. Den tekniske lesemodellen isolerer ugyldige tekniske dokumenter i app/src/adapters/indexeddb/run-store.ts. Bruk samme vern for uleselig linjehistorikk og historiske tekniske dokumenter.
- Gjenbruk dato-, rolle- og revisjonskontroll med linjeskjemaets egne kriterier for gjentatt dato, utvalg og permanent låsing av faktisk bekreftede registreringer.
- Bruk eksisterende PDF-motor og ressurser, den delte dokumentporten i app/src/application/run-pdf.ts og eksplisitte positive sidekoordinater i de fungerende A4-utskriftene. Bygg eksport fra valgt bekreftet historikkversjon. Vis avgrensning av nyere utkast på skjermen og kontroller faktisk filinnhold.

## Tasks & Acceptance

- [x] Lever åpning og egen linjeoversikt for fiktiv sjåfør med 26 versjonerte linjer og historisk kilde.
- [x] Implementer sjåførens separate linje/dato-utkast og instruktørens kontroll og eksplisitte flervalg.
- [x] Bekreft valgte registreringer atomisk, behold tidligere frosne kilder og støtt nye registreringer etter bekreftelse.
- [x] Generer og kontroller faktiske PDF-er for minst to bekreftede historikkversjoner, med gjentatt linje, relevante datoer, merknad, riktig avsender og klart utelatte nyere utkast.
- [ ] Prøv rollegrenser, flere faner, abort og nettbrudd, gjenåpning, mobil, tastatur og hjelpemidler.

## Verification

- Prøv én linje på ulike datoer, flere linjer samme dato, unik registreringsidentitet og bekreftelsesutvalg som utelater ulåst linje.
- Prøv senere registrering og ny bekreftelse uten å endre gammel registrering eller PDF-kilde, samt atomiske aborter, ny rolle, kvotefeil og stale.
- Sammenlign faktisk PDF-tekst og alle sider for hver valgt historikkversjon med frosset kilde. Prøv uavhengig leser og tilgjengelige målenheter.

### Gjennomført på gjennomgangsbygget og kandidatene

- Låst installasjon, typekontroll, produksjonsbygg, lint og 76 Node-prøver er utført. De 294 nettleserprøvene på første frosne gjennomgangsbygg passerte i Chromium, Firefox og WebKit. Kontrollen av sluttbygget etter gjennomgangsretting kjøres separat.
- Vanlig Edge-flyt med fiktive data produserte historikkversjon 1 med én kjøring og versjon 2 med 54 kjøringer på alle 26 linjene. To uvalgte utkast forble åpne. Uavhengig uttrekk kontrollerte alle malrader, kjøredatoer, registrerings-/aktør-ID-er, avsendere, versjoner, tider og merknaden for linje 30. Uttak av versjon 1 før og etter neste bekreftelse var likt i tekst og sideflate. Begge rollene fikk samme innhold for hver versjon. Alle 11 A4-sidene i bred prøve og 8 i langnavnprøven er inspisert i farge og gråtone. En fiktiv instruktørtekst på 10 000 tegn kom med i sin helhet i begge registreringene som brukte den. I Edge fant den innebygde PDF-leseren begge forekomster av «Astrid Fiktiv Træn».
- På rettet A4-kandidat utførte WebKit registrering, to versjoner og faktisk nedlasting etter 60 038 ms uten nettforespørsler. Edge prøvde lagringsabort ved rollebytte, avbrutt lås før complete, foreldet utvalg og tapt svar etter complete. Gjenforsøket åpnet én eksisterende bekreftelse. Ordinær Chromium-tilbakebuffer skjermet både lagret og ulagret dato fra DOM før rollelesing. Ulagret råtekst kom tilbake ved uttrykkelig gjenopptakelse i korrekt rolle.
- Fem løp, fem tekniske dokumenter med 260 punkter og fem linjedokumenter med til sammen 270 bekreftede kjøringer ga 1 199 702 byte serialisert data i den fiktive PC-profilen. Windows Edge ved samme testorigin brukte 513 ms ved oppdatering og 1349 ms ved kald gjenåpning. Schema 5 → 6 bevarte de tekniske kildene, tidligere vurderingsløp og kvitteringer. PDF-par for fadder, instruktør og teknisk opplæring hadde samme tekst og sideflate før og etter oppgradering.
- Skjerm og dialog er prøvd i Edge ved 320/360/390/768/1280 CSSpx, portrett og landskap samt simulert 200 % tekst. Faktisk Chromium-zoom 400 % gav 316 CSSpx. NVDA 2026.3.1 i Edge leste navngitt linjeregistrering og kjøredato i valget, kvittert lagringsstatus, valgt linje 30, bekreftelsesdialog og nedlastingshandling. Brukerens fysiske mobil-/nettbrettmatrise, mobilskjermtastatur, installert variant, telefonmålinger og mobile skjermlesere gjenstår.

### Sluttbygg etter gjennomgang

- `story-3.3-20261118-final` ble bygget med Node 26.13.0 og npm 11.20.0. `index-BYO-o1ih.js` har SHA-256 `D1F14136827937531D64341910E8456843A569514962A64D0F3A0309AE16AB94`. Ren, låst og frakoblet installasjon installerte 92 pakker. Typekontroll, bygg, lint og 79 Node-prøver passerte. Lint gav ti varsler om blant annet Fast Refresh og React-effekter. Vite meldte om bundelstørrelsen.
- Edge prøvde fire separate reviewrettinger med uavhengige nettleserforløp. Rettetasten fokuserte linjevelgeren, og en gammel fane kunne ikke bytte rolle i det nå valgte dokumentet. Ved lesefeil på samme dokument ble ulagret dato vist separat. Etter skrivefeil før complete beholdt brukeren innholdet frem til uttrykkelig forkasting og fikk tilbake sist kvitterte verdi.
- Samme Edge-sluttbygg gjennomførte 54 faktiske kjøringer, avbrutt lagring og bekreftelse, foreldet instruktørutvalg og tapt svar etter complete. Ny kopi av versjon 1 hadde samme tekst og sideflate på tre A4-sider. Versjon 2 hadde alle 54 registreringene på elleve stående A4-sider, med identisk tekst og sideflate fra begge roller. WebKit opprettet og førte et eget dokument og lastet ned begge kildeversjonene etter 60 073 ms uten nettforespørsler.
- Schema 5 → 6 gjenåpnet valgt teknisk dokument på 838 ms i Edge. De tre tidligere PDF-typene er kontrollert før og etter migreringen med samme fulltekst og sideflate. Hele profilen på fem løp, fem tekniske dokumenter og fem linjedokumenter inneholdt 1 199 707 serialiserte byte og 270 bekreftede kjøringer. Oppdatering tok 745 ms og kald gjenåpning 2165 ms.
- På samme frosne bygg gikk et ordinært todagers fadderløp med to faddere gjennom dagslåser, konklusjonen Oppfølgingsbehov og begge PDF-roller. Første fadderfil kom etter 61 064 ms uten nettforespørsler. Uavhengig verifikator kontrollerte 110 vurderingsruter og fulltekst på ti A4-sider i hver rolle. Gjenåpnet låst dag 2 i samme profil tok 1937 ms.
- Edge åpnet den dokumenterte V1-adressen `127.0.0.1:4186` på 720 ms og nådde både teknisk inngang og linjeføring. NVDA på sluttbygget leste datofeltet med tilhørende feltfeil og format, kvittert lagring, linje 30 med dato, bekreftelsesdialog og PDF-handling.
- Alle 303 nettleserprøver passerte på sluttbygget i Chromium 151.0.7922.34, Firefox 153.0 og WebKit 26.5. De versjonerte Python-kontrollene leste ni faktiske linje-PDF-er og seks tekniske PDF-er fra de samme nettleserprøvene. Kildeversjonene, linje 30-merknaden, aktive begrunnelser, tekst og filavgrensninger stemte. Utestående fysisk akseptanse beholder story-status `review`.
- Ekte Chromium-tilbakebuffer på sluttbygget fjernet linje og dato fra gjenopprettet DOM før rollekontroll. En lagret visning erstattes av fadderoversikten ved rollebytte i en annen fane. I ren prøving med ulagret dato viste uttrykkelig gjenopptakelse samme råtekst. Faktisk 400 % zoom ved 316 CSSpx gav synlig fokus, trefflater og fokusretur etter Escape uten horisontal rulling.

## Implementation Notes

Det godkjente storygrunnlaget er verifisert ordrett med elleve AC. Originalmalen er kontrollert visuelt. Lokal kildekontroll er også tilgjengelig som forventede 52 punkter, 26 linjer og linje 30-merknad i .cache/instructor-source/forventede-grunnkursrader.json. Den kan sammenlignes med ferdig mal og faktisk eksport når storyen er gjennomførbar. Implementering følger avhengighetene i sprinten.

Første kandidat bruker eget linjedokument i IndexedDB schema 6. Kildekontroll bekreftet 26 stabile ID-er og originalmerknaden ved L10. Ordinær Edge-prøve opprettet linjeskjema uten teknisk dokument eller vurderingsløp, beholdt to uvalgte utkast og lastet ned faktiske versjoner etter én og tre bekreftede kjøringer. Kald gjenåpning av samme dokument tok 824 ms. Faktisk schema 5 → 6 åpnet den valgte tidligere tekniske kilden i en profil med fem løp og fem tekniske dokumenter på 589 ms. Sammenligning av filer, videre nettleserprøver og formell kodegjennomgang pågår.

Senere kandidater førte 54 faktiske registreringer over alle 26 linjer, inklusive en bevisst lik linje/dato som egen registrering. En separat konkret PDF-prøve reproduserte at en innebygd sammensatt bokstav i første eksport kunne gi en senere bokstav tom Unicode-kartlegging i fontkit. Det ble rettet uten å endre den frosne kilden. Linjene pagineres med hele tekstlinjer, og A4-høyden er satt uttrykkelig. Kjøredato lagres i ISO-format. Det lokale simuleringsoppsettet bruker aktiv aktør-ID per rolle og oppgitt instruktørnavn per bekreftelse. Navn, kildeversjon og bekreftelsestid følger hver låst registrering.

## Spec Change Log

## Review Triage Log

| Funn | Vurdering | Belegg og håndtering |
| --- | --- | --- |
| B1. Rettetasten kan åpne et annet dokument | high | Rollebyttet leser den delte sesjonen uten å kontrollere opprinnelig linjeadresse. Faneskrift kan flytte både sjåfør og dokument før kontrollen. Valider forventet adresse og aktiv aktør i samme rollebyttetransaksjon. Rettes. |
| B2. Uleselig dokument kan forkaste ulagret dato | high | Egen Edge-prøve avbrøt en lagring, gjorde det valgte dokumentet uleselig og reproduserte at den ulagrede datoen forsvant ved rolle- og kontekstkontroll. Behold den lokale innskrivingen separat med kontrollert vei videre. Rettes. |
| B3. Vedvarende lagringsfeil stenger navigasjon | medium | Flush sperrer skiftet korrekt, men panelet gir bare nytt forsøk ved ordinær skrivefeil. Legg til uttrykkelig forkasting og innlesing av aktiv arbeidsflate. Rettes. |
| B4. Låst dokument kan inneholde tegn utenfor fontens dekning | medium | Fontkontrollen kan avvise `漢` i PDF etter at navnet er lagret. Samme kontrollerte eksportgrense gjelder felles Noto Sans-oppsett i 2.2 og 3.2. Bredere fontdekning er dokumentert som utsatt felles arbeid. |
| B5. Ny bekreftelsestid kan ligge før tidligere historikk | medium | Direkte prøve lot versjon 2 få kl. 10 som sluttid samtidig som den inneholdt versjon 1 bekreftet kl. 12 og et valgt felt redigert kl. 11. Kontroller kronologi og behold tidligere tidsstempler. Rettes. |
| B6. Hull i arrays hopper over validering | medium | `every` og `map` hopper over tomme posisjoner. En ugyldig kommando kan gå inn i transaksjonen og gi misvisende skrivefeil. Tilsvarende lagringspost gir TypeError. Avvis begge med riktig kontraktfeil. Rettes. |
| B7. Mange små bekreftelser gir voksende historikk | low | Strukturell kopi lagrer hver fullstendige historie som godkjent eksportgrunnlag. Femdokumentprofilen med 270 bekreftede kjøringer og øvrige dokumenter gjenåpnet på 1349 ms. Endring av lagringsrepresentasjonen avvises i denne leveransen. Kvote- og gjenopprettingsveier prøves. |
| B8. Skjermen kan være uklar ved valg av eldre PDF | low | PDF-avgrensningen viser valgt versjon, mens katalogen fortsatt viser gjeldende historikk. Presiser i katalogoverskriften hvilken historikk som vises. Rettes. |
| B9. Vedvarende prøve mangler for eksisterende teknisk kilde i schema 5 | medium | Egen faktisk Edge-migrering bevarte den aktive kilden, fem tekniske dokumenter og kvitteringer. Testkoden får en egen migration med eksisterende teknisk kilde og replay. Rettes. |
| B10. PDF-prøver kan passere med feil historikkinnhold | medium | Lokal filkontroll fant konkret feil i tekstlaget da vanlige filheader- og A4-prøver passerte. Sporbar, uavhengig PDF-kontroll fra testartefakt oppdager feil versjon, merknad, avsender og utkast. Rettes. |
| E1. Deaktivert linjevelger får ikke fokus | medium | Faktisk Edge-prøve landet på siden fremfor riktig linjevelger. Rollebyttet fokuserte før navigasjon var ferdig. Flytt fokus når handlingen er aktiv. Rettes. |
| E2. Støttede kilder kan inneholde navn uten lokalt glyf | medium | Den dokumenterte fontgrensen gjelder også `李` og `ع`. Samme avgrensning som B4, med konkret eksportfeil og bevarte data. |
| E3. Systemklokken kan flyttes bakover | medium | Ingen eksisterende tidskontroll sjekker ny sluttid mot forrige versjon. Krev at ny bekreftelse er kronologisk gyldig før lagring. Rettes sammen med B5. |
| E4. Skifte er sperret når lagring fortsetter å feile | medium | Vedvarende feil gir ingen eksplisitt forkastvei. Samme observerte kontrollflyt som B3. Rettes. |
| E5. Sparsomt kommandoinnhold blir lagerfeil | medium | En fordelingsliste med hull kan passere innholdskontroll som tom liste. Avvis den som ugyldig kommando før transaksjon. Rettes sammen med B6. |
| E6. Neste revisjon kan overskride lagringsformatet | low | En eksisterende, gyldig trygg heltallsverdi på maksimum er mulig i en syntetisk post. Økning vil gjøre posten uleselig. Legg en enkel sperre før skriveberegning. Rettes. |
| V1. Faktisk PDF-tekst mangler vedvarende verifiering | medium | Selvstendig filkontroll er kjørt i `.cache`. Gjenta med kodebasens versjonerte prøver og sammenlign ny kopi av versjon 1 med den tidligere. Rettes sammen med B10. |
| V2. Schema 5-grenen mangler ordinær migreringsprøve | medium | Eksisterende versjon 4-prøve setter ikke opp teknisk lager. Legg til teknisk snapshot, dokumentvalg og kvittering som virkelig kommer fra schema 5. Rettes sammen med B9. |
| V3. Avbrutt linjedraft før rollebytte mangler ordinær nettleserprøve | medium | Egen Edge-prøve avbrøt skrivekommandoen og gjenopptok samme inndata etter nytt forsøk. Flytt tilsvarende konkret feilvei inn i nettlesertestene. Rettes. |
| V4. Eksisterende linjedokument åpnes ikke fra oversikten i testen | medium | Den eksisterende prøven leser knappeteksten og gjenåpner aktivt dokument ved refresh. Legg til vanlig klikk etter avvalgt dokument og bekreft samme identitet og historikk. Rettes. |
| V5. Samme dokumentadresse med leseproblem avmonterer utkastet | high | Faktisk Edge-reproduksjon bekreftet at gammel visning forsvinner uten separat råtekst mens lagret original består. Behold råtekst på kontrollert konfliktflate når kilden blir uleselig. Rettes sammen med B2. |
