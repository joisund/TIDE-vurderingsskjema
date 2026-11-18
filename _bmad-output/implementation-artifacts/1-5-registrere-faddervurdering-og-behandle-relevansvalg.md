---
title: "Story 1.5 – Registrere faddervurdering og behandle relevansvalg"
type: feature
story_key: 1-5-registrere-faddervurdering-og-behandle-relevansvalg
status: in-review
baseline_commit: 4bd42c75000c56c543969a7caeb46000661f3204
route: dispatch
review_loop_iteration: 0
created: 2026-11-18
epic: 1
story: "1.5"
dependsOnStories: ["1.1", "1.2", "1.3", "1.4"]
approvedSource: ../planning-artifacts/story-1-5-proposal.md
acceptanceCriteriaUnchanged: true
context:
  - "_bmad-output/planning-artifacts/architecture/architecture-Digital kjørevurdering-2026-11-05/ARCHITECTURE-SPINE.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/DESIGN.md"
  - "_bmad-output/planning-artifacts/ux-designs/ux-Digital kjørevurdering-2026-10-29/EXPERIENCE.md"
---

# Story 1.5 – Registrere faddervurdering og behandle relevansvalg

Fadder arbeider i egen del gjennom dagen med egne svar og kommentarer, og behandler sjåførens Ikke relevant-valg på det konkrete ettersvaret.

## Akseptansekriterier

<frozen-after-approval>

**AC-1.5-01 – Arbeide i egen del gjennom dagen**

**Gitt** et løp med en opprettet, ulåst dag,
**Når** fadder åpner sin vurderingsdel før eller etter at sjåføren har fullført nødvendige deler,
**Så** kan fadder registrere og endre egne svar og kommentarer gjennom dagen uten å vente på sjåførens etterbekreftelse,
**Og** fadderdelen har nøyaktig 22 egne svarposisjoner med løpets forventede kriterie-ID-er, fast rekkefølge og riktig dag/fase; ingen fremmede/dupliserte ID-er eller forhåndsvalgte OK tillates,
**Og** vurderingsmatrise og godkjent punkthjelp gjenbrukes, og førvurdering, sjåfør-etter og faddervurdering forblir separate perspektiver. Når delene finnes, bevares 66 logiske svarposisjoner på dag 1 og 44 nye per senere dag (FR-4/5/7, AD-7/9).

**AC-1.5-02 – Begrunne fadders eget Ikke relevant-valg**

**Gitt** et redigerbart faddersvar,
**Når** fadder velger OK, Kan bli bedre eller Ikke relevant,
**Så** registreres ett eksplisitt svar per punkt; eget Ikke relevant åpner popup med egen begrunnelse etter den felles A10-regelen fra Story 1.3,
**Og** minst to ord og ti normaliserte Unicode-tegn kreves; de to godkjente eksemplene og øvrige A10-grenser prøves med samme domenefunksjon,
**Og** avbryt/lukk bevarer tidligere gyldig svar. Fadders egen begrunnelse er separat fra både sjåførens begrunnelse og fadders avgjørelse om denne,
**Og** bekreftelse av sjåførens Ikke relevant utleder ikke automatisk et eget faddersvar eller krav om ny egen begrunnelse. Eget Ikke relevant krever egen begrunnelse når fadder faktisk velger det (FR-6, AD-7).

**AC-1.5-03 – Kommentere alle kriterier uavhengig av svar**

**Gitt** et av dagens 22 vurderingspunkter med OK, Kan bli bedre, Ikke relevant eller ubesvart faddersvar,
**Når** fadder aktiverer Kommentar ved punktet,
**Så** åpnes punktets eget kommentarfelt med tydelig kriterium og fadder som avsender; det kan redigeres frem til fadders dagsbekreftelse,
**Og** fri kriteriekommentar er frivillig og har ikke A10-minimum; eget Ikke relevant og relevansavslag har sine egne påkrevde begrunnelsesfelt,
**Og** fri kommentar, fadders egen relevansbegrunnelse og avslagskommentar lagres adskilt. Skifte av svar skjuler ikke eller sletter en allerede skrevet fri kommentar,
**Og** handlingens tilgjengelige navn inneholder kriteriet og formidler åpen/lukket tilstand (FR-7, UX-DR9, AD-7).

**AC-1.5-04 – Behandle sjåførens Ikke relevant-valg separat**

**Gitt** et gjeldende sjåfør-ettersvar som er Ikke relevant med gyldig begrunnelse,
**Når** fadder behandler dette valget,
**Så** vises sjåførens svar/begrunnelse med tydelig avsender og separate handlinger for å bekrefte eller avslå,
**Og** en bekreftelse krever ikke en ny selvstendig begrunnelse; et avslag krever egen kommentar etter samme A10-regel som øvrige obligatoriske begrunnelser,
**Og** avslag og kommentar endrer ikke sjåførens svar, skaper ingen retur eller konfliktstatus og utleder verken Kan bli bedre, automatisk underkjenning eller et felles svar,
**Og** dag-1-arv fra førvurderingen behandles én gang på det videreførte ettersvaret, ikke som to særskilte før-/etteravgjørelser. Fadders eget svar og frie kommentar bevares uavhengig av avgjørelsen (FR-6, AD-7).

**AC-1.5-05 – Knytte behandlingen til den konkrete svarversjonen**

**Gitt** at fadder har behandlet et Ikke relevant-ettersvar før sjåførens etterbekreftelse,
**Når** sjåføren endrer svaret eller begrunnelsen slik at answerRevision endres,
**Så** er tidligere behandling knyttet til gammel svar-ID/revisjon og kan ikke fremstå som gyldig behandling av det nye innholdet,
**Og** et gjeldende Ikke relevant krever ny behandling før fremtidig dagslåsing; et punkt som ikke lenger er Ikke relevant skal skilles fra et gjeldende Ikke relevant som mangler gyldig behandling,
**Og** fadders egne svar, egne begrunnelser og frie kommentarer beholdes. Ingen endring av sjåførutkast kopieres inn i fadderens mening,
**Og** etter sjåførbekreftelse sammenholdes behandlingen med det kvitterte, låste ettersvaret. Utdatert dialog/fane avvises mot siste revisjon etter AD-5, også om den åpne dialogen viste en tidligere begrunnelse (FR-6/12, AD-5/7).

**AC-1.5-06 – Vise mangler uten å likestille uenighet med feil**

**Gitt** fadders løpende utkast og de gjeldende sjåførsvarene,
**Når** fadder ser fullføringsstatus eller åpner mangellisten for vurderingsdelen,
**Så** skilles ubesvarte fadderpunkter, ugyldige egne begrunnelser og manglende/utdatert relevansbehandling fra gyldige svar og gyldig dokumentert avslag,
**Og** et gyldig Kan bli bedre, eget begrunnet Ikke relevant eller dokumentert avslag markeres ikke i seg selv som en blokkerende mangel,
**Og** frivillige kommentarer kan være tomme; hver faktisk mangel har vei/fokus til riktig felt,
**Og** fadder kan fortsette utkastet mens sjåførens nødvendige bekreftelser mangler, med beskjed om at sjåføren må bekrefte sin del før dagen kan låses. Utfylte/lagrede svar er ikke en dagsbekreftelse (FR-7/12, AD-6/7).

**AC-1.5-07 – Bevare fadderinnhold ved feil og rollebytte**

**Gitt** fadders svar, kommentarer, egne begrunnelser eller relevansavgjørelser under registrering,
**Når** innhold endres, lagring feiler, rolle/rute skiftes eller en gammel fane forsøker å skrive,
**Så** brukes den etablerte autosave-/flush-/revisjonskontrakten med complete før Lagret, mål om to sekunder, periodisk flush og separate kommandokvitteringer etter AD-3–5,
**Og** ved feil beholdes ulagret tekst uten falsk kvittering; rolle-/ruteskifte som ville miste tekst avbrytes. Foreldet tilstand lastes fra lager uten automatisk overskriving/sammenslåing, og gjentatt commandId/payload dupliserer ikke svar eller avgjørelse,
**Og** ved vellykket bytte til sjåfør fjernes forrige model, dialoger, felttilstand og DOM. Sjåfør-read model inneholder ikke fadders svar, kommentarer eller relevansavgjørelser før endelig avslutning, heller ikke via tilbake-navigasjon,
**Og** 60 sekunders nettbrudd i lastet app med fungerende lokalt lager bevarer kvittert fadderinnhold og tillater fortsatt lokal lagring; normal gjenåpning med nett følger AD-4s betingelser. Schemaendringer bevarer tidligere bekreftelser, svar og avsendere; allerede låst fadderinnhold avviser mutasjoner, også direkte kommandoer (FR-4/9/10/14, AD-4/5/6/9/13).

**AC-1.5-08 – Vurdere, kommentere og behandle relevans tilgjengelig på mobil**

**Gitt** faddermatrisen, hjelpe-/begrunnelsesdialoger, kommentarfelt, relevansbehandling og mangelliste,
**Når** flatene brukes på vedtatte bredder/enheter med tekstforstørrelse, tastatur og skjermlesere etter AD-12,
**Så** videreføres den godkjente vertikale matrisen, store trefflater, sticky overskrifter og dialogmønstre fra Story 1.3 uten horisontal registreringsrulling, skjult fokus eller avkuttede handlinger,
**Og** sjåførens begrunnelse, fadders avgjørelse, eget faddersvar og kommentarer har tydelige navn/avsendere også uten farger; skjermleser kan skille kriterium, dag, rolle og fase,
**Og** kommentarer og begrunnelser kan brukes med mobilens skjermtastatur; fokus/avbrytelse/feiltilknytning og status uten fokusflytt følger EXPERIENCE. Faktisk prøvd utstyr/versjoner og eventuelle gap registreres (NFR-1/2, UX-DR8/9/21).

</frozen-after-approval>

## Code Map

- `app/src/domain/baseline.ts`, `app/src/domain/driver-day.ts` og `app/src/domain/reason.ts` har svarverdier, stabil UUIDv8, dag-1-arv, svarrevisjon og A10. Fadderfasen har egne stabile svar-ID-er per dag og kriterium, også før førbekreftelsen og når sjåførens ettervisning ennå mangler. Bruk nåværende, kvitterte sjåfør-ettersvar som emne for relevansbehandling.
- `app/src/domain/day-draft.ts` har dagslåsevern. Legg fadders egen utkastvalidering og fullføringskontroll i domenet, slik at senere dagsbekreftelse kan bruke samme regler.
- `app/src/application/run-application.ts` og `app/src/adapters/indexeddb/run-store.ts` har rollebestemt `toView`, `withOpenStorage` og `#mutateRun`. Utvid eksisterende port med additiv schema 1-lagring. Håndhev autoritativ rolle, løp, dag og revisjon før skriving. `orderedChanges` og `answerFingerprint` gir mønsteret for revisjonsbundne, idempotente payloads.
- `app/src/ui/AssessmentForm.tsx` har `groupedCriteria`, dialoger, punkthjelp og matrisens sticky/fokus/ARIA-mønster. `use-assessment-draft.ts` og `use-autosave-deadline.ts` har utkast, feil- og konfliktflyt. Gjenbruk delene der det gir mindre kode. `App.tsx` må flushe den aktive faddereditoren før rolle/ruteskifte og forkaste den ved vellykket bytte. Prøv den serialiserte sjåførmodellen og tilbake-navigasjon særskilt.

## Tasks & Acceptance

- [x] Utvid vurderingsdomene og pipeline med 22 faddersvar per dag, egen A10 for Ikke relevant og separat frivillig kommentar på alle kriterier uavhengig av svar.
- [x] Legg til `RelevanceReview` for sjåførens ettersvar. Bind behandling til svar-ID og answerRevision. Behold egne svar og kommentarer uendret når behandling blir foreldet.
- [x] Gjenbruk matrise, punkthjelp, dialog, fokushåndtering og autosave fra foregående stories. Prøv fadders arbeidsflate både før og etter sjåførens bekreftelser.
- [x] Avgrens fadderstatus, svar, begrunnelser og kommentarer i applikasjonens lesemodell. Sjåførvisning og rollebytte skal ikke lekke dette innholdet. Gjenbruk gjeldende verifisering av autoritativ rolle og revisjon i IndexedDB.
- [x] Test lagring, idempotens, separat avsender, endret/foreldet behandling, rollebytte med utkast, nettbrudd og relevante skjermstørrelser.
- [ ] Prøv fysisk mobil/nettbrett, mobilt skjermtastatur og skjermleser etter AD-12.

## Design Notes

Fadderens egne svar, egne begrunnelser, frivillige kommentarer og behandling av sjåførens relevansvalg er egne deler. Bekreftelse av sjåførens Ikke relevant krever ingen ny begrunnelse. Avslag krever A10 og endrer ikke sjåførsvar eller fadders eget svar. For arvet Ikke relevant på dag 1 brukes det videreførte ettersvarets ID og revisjon.

Bevar råtekst for påbegynt egen begrunnelse og for påbegynt avslag adskilt fra fri kommentar og kvitterte beslutninger. Vis ulik status for punkt uten aktuelt Ikke relevant, ubehandlet punkt, utdatert behandling og gyldig bekreftelse eller avslag. Et foreldet relevansforsøk kan ikke flyttes til et nytt `answerRevision` av en generell konfliktretry. Fadder kan gjøre en ny uttrykkelig behandling mot det nye innholdet. Bevar annet fadderutkast uavhengig før og etter konflikten.

Bruk [godkjent fadderskisse](../planning-artifacts/ux-designs/ux-Digital%20kjørevurdering-2026-10-29/mockups/key-fadder.html) for kommentar og plassering av relevante kontroller. Oppfølging og dagsbekreftelse følger senere stories.

## Verification

- Kjør bygg, typekontroll, lint og Node-prøver. Kjør faktisk lokal nettleserflyt i Chromium, Firefox og WebKit med fiktive data. Prøv eksakt 22 svar, begge vurderingsroller, endret grunnlag i en annen fane, transaksjonsfeil og lokal lagring etter minst 60 sekunder frakoblet.
- Bruk vedtatte CSS-bredder og 400 % faktisk nettleserzoom. Registrer enhets- og hjelpemiddelprøver med faktisk utstyr og kontrollert utfall. Oppsett i denne arbeidskopien står i [overleveringen](overlevering-lokal-implementering.md).

## Implementation Notes

Godkjente kriterier er lagt inn uten endring. Implementering startet 18. november med kodegjennomgått Story 1.4 som teknisk grunnlag.

En uavhengig prøve med Edge 157.0.4341.60 ved 316 CSSpx åpnet fadderdelen før sjåførens førbekreftelse, fant 22 svarposisjoner uten forhåndsvalg, avbrøt ugyldig A10-tekst og vekslet til sjåfør uten fadderfelt i DOM. Deretter ble et gyldig avslag verifisert mot det arvede ettersvaret. Opprinnelig sjåførbegrunnelse, separat avslagskommentar, eget faddersvar og fri éntegnskommentar var bevart etter gjenåpning. Prøven brukte fiktive data og faktisk IndexedDB i en isolert profil. Full regresjon, review og fysisk prøving gjenstår.

Før review passerte bygg/typekontroll, lint, 35 Node-prøver og 15 målrettede Playwright-prøver i Chromium, Firefox og WebKit. Nettleserprøvene dekker to faner, avbrutte transaksjoner, rollebytte og tilbake-navigasjon, 60 sekunder frakoblet og fem bredder med 200 % tekst. En separat Chromium-prøve med faktisk 400 % zoom gikk fra 1264 til 316 CSSpx med matrise, kommentar, egen begrunnelse og avslagskommentar. Fysisk mobil-/nettbrettprøve, mobilens skjermtastatur og faktisk skjermleser står åpne.

Etter de tre gjennomgangene ble reviewforsøket bundet til opprinnelig mål før utkastet flushes. Ved feil beholdes mål, avgjørelse og en eventuell allerede utstedt kommando-ID. Feltene tydeliggjør sperret redigering mens forsøket er uavklart. Mangellisten venter på kontrollesing, og den aktive fadderdialogen skjules når nettleseren beholder siden for Tilbake. Ulagret tekst vernes når rollekontroll feiler eller en annen fane allerede har byttet rolle.

Sluttbygget `story-1.5-20261118-r2` bestod bygg/typekontroll, lint, 36 Node-prøver og 174 Playwright-prøver i Chromium, Firefox og WebKit. Fadder kunne lagre nytt svar og behandling etter minst 60 sekunder simulert nettbrudd i hver motor. Dag 2 og dagslås ble prøvd med lagrede fiksturer. Den egne, faktiske Chromium-prøven bekreftet `pageshow.persisted` etter navigasjon mellom lokale adresser og rollebytte i en annen fane. Fadderfelt var skjult allerede ved gjenoppretting, og fadder-DOM ble fjernet etter lesing av autoritativ sjåførrolle. Sluttbygget bestod også faktisk 400 %-zoom og Edge 157.0.4341.60 ved 316 CSSpx. Oppgradering fra det frosne 1.4-bygget i samme Chromium-origin beholdt identiteter, før- og etterlås, egenevaluering og opprinnelig begrunnelse. Fadderdelens egne 22 posisjoner ble lagt til i bruk, og arven ble behandlet på ettersvaret. Fysisk verifikasjon gjenstår.

## Spec Change Log

## Review Triage Log

| Funn | Dom og behandling |
| --- | --- |
| Mangelliste kan vise positivt resultat før kontrollesing (blind gjennomgang) | Medium. Vent på kvittert kontrollesing eller vis egen feil. |
| Innsendt avslag går tapt når første utkastflush aborteres (blind gjennomgang) | Medium. Bevar uttrykkelig mål og avgjørelse gjennom retry. |
| Synlige inndata forkastes når behandlingsskriving feiler (blind gjennomgang) | Medium. Speil sperre i kontrollene mens avgjørelsen er uavklart. |
| Eldre råtekst er fylt inn i ny avslagsdialog (blind gjennomgang) | Lav. Råteksten er et utkast. Den nye dialogen viser nytt mål og krever en ny uttrykkelig handling. Den gamle avgjørelsen forblir utdatert til handlingen er kvittert. |
| Konfliktløsing kan ta tilbake råtekst som ble tømt ved egen bekreftelse (blind gjennomgang) | Medium. Bevar brukerens tømming ved uttrykkelig lagring av egen versjon. |
| Utdatert relevans kan fjerne tastaturfokus (blind gjennomgang) | Medium. Behold meningsfullt fokus ved beskjed eller kontroll som overlever. |
| Dialogens felt mangler programmatisk kriterium/dag/fase (blind gjennomgang) | Medium for hjelpemidler. Koble synlig kontekst til begge feltene. |
| Tilbakebuffer kan restaurere faddervisning etter rollebytte i annen fane (blind gjennomgang) | Medium. Reprodusert i faktisk Chromium med `pageshow.persisted` og levende fadder-DOM etter at IndexedDB viste sjåfør i den andre fanen. Sperr gammel visning under autoritativ rollekontroll. |
| Dag 2 er prøvd i domene uten samme applikasjonsvei (blind gjennomgang) | Dekningsgap. Kontroller eget svar, behandling og kommentar på dag 2 gjennom faktisk nettleserlagring. |
| Ingen visningsprøve av bekreftet fadderdel (blind gjennomgang) | Dekningsgap. Prøv bevart lesing og stengte redigeringsveier fra en lagret, låst fikstur. |
| Første utkastflush kan avbryte avgjørelsen (kanttilfeller) | Medium. Samme retting for aksept med fri kommentar og avslag med rå avslagskommentar. |
| Fadder kan forsøke redigering mens uavklart avgjørelse sperrer den (kanttilfeller) | Medium. Vis sperren på de relevante kontrollene. |
| Manglende adapterprøve med korrupt faddersett (verifikasjon) | Dekningsgap. Bruk schema 1-fikstur med ugyldig radrekkefølge. |
| Dag 2 kan feilaktig bindes til dag 1 ved kommandobygging (verifikasjon) | Dekningsgap. Test faktisk valgt dag og at dag 1 er bevart. |
| Replaytesten varierer bare kommentar (verifikasjon) | Dekningsgap. Varier også eget svar, rå avslagskommentar og målrevisjon når samme kommando-ID brukes. |
| Mangellenke til egen A10-begrunnelse er uprøvd (verifikasjon) | Dekningsgap. Prøv at lenken åpner riktig dialog med bevart råtekst. |
| Bekreftet reproduksjon av mistet avslag ved avbrutt utkastskriving (verifikasjon) | Medium. Egen nettleserregresjon skal sjekke både kvittert avgjørelse og beholdt tekst etter retry. |
