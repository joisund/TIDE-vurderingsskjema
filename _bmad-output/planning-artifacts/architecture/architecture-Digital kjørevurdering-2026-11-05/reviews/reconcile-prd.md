# Kildeavstemming: gjeldende PRD og addendum

Kontrollert 2026-11-05 mot hele `prd.md` og `addendum.md` i `prds/prd-Digital kjørevurdering-2026-10-29/`, med `ARCHITECTURE-SPINE.md` som mål. Status gjelder lest utkast før forfatterens eventuelle rettinger.

**Dom:** Hovedomfanget er bevart. Ingen påvist gjeninnføring av historisk åttedagersgrense, daglig førvurdering, tvungen egenevaluering eller privat fagrapport. Ingen falsk PRD-/arkitekturgodkjenning. To presiseringer anbefales før arkitekturbaseline; fontavviket er allerede korrekt markert som åpent spørsmål.

## Funn

| ID | Nivå | Kilde og sted | Funn / nødvendig presisering |
| --- | --- | --- | --- |
| P1 | Medium | PRD tilstandstabell og FR-16; spine AD-8/AD-10 og verdikonvensjon | Kravet om synlig løpsstatus **Pågående / Under oppfølging / Avsluttet** er ikke gitt en entydig avledningsregel i arkitekturen. AD-8 lagrer planhendelser og AD-10 lukking, men fastsetter ikke hvem som eier eller avleder åpen oppfølgingsstatus, særlig ved Ja→Nei eller registrert utvidet kjøretrening. Presiser en felles domeneprojeksjon av disse tilstandene, og hva som utløser Under oppfølging. Dette må ikke avgjøres ulikt av S1/S2/PDF eller forveksles med avslutningsutfallet Oppfølgingsbehov. |
| P2 | Medium | PRD FR-2/8/16; spine AD-8 | Planmodellen fastsetter maksimum fem, men ikke initial planlagt siste dag eller gyldig nedre grense ved opprettelse/endring. Bevar eksplisitt normalt tre og kortere løp, og presiser at planlagt siste dag ikke kan ligge før allerede registrerte dager. Ellers kan egenevalueringens tilbud og antall ekstra dager avledes forskjellig av to deler. Teknisk grensepresisering kan gjøres uten å opprette en ny planleggingsworkflow. |
| P3 | Avklart som åpent | Addendum mobilvisning/profil, UX DESIGN som PRD peker på; spine AD-11/Q5 | PDF-fonten er et reelt foreslått avvik fra godkjent UX. Utkastet fremstiller ikke Noto Sans som godkjent og bevarer layoutkravene. Q5 må fortsatt stå åpent; ikke omklassifiser til ren implementeringsdetalj ved ferdigstilling. |

## Kravdekning

| Kildeområde | Landet i arkitekturen |
| --- | --- |
| FR-1–3 | RunAggregate, stabile identifikatorer, unik dato/fem dager, snapshots og trinnvise feltlåser AD-3/5/6/8. Fadderbytte og delte tidsfelt er bevart. Obligatoriske felter arves fra gjeldende PRD/addendum. |
| FR-4 | Rollebestemte read models, opprydding ved rollebytte, fullt innsyn etter begge avslutningsutfall AD-9. Q4 er tydelig ny antakelse om plansynlighet. |
| FR-5–7 | 22 kriterier, 22+44n svar, dag-1-arv, daglig relevans dag 2–5, separat fadderavgjørelse, versjonert behandling og separate kommentarer AD-7. A10-terskler er bevart. |
| FR-8 | Frivillig seksfeltsevaluering, ett felles sett ved ett-dagsløp, historikk ved sen utvidelse og konklusjon låst ved avslutning AD-6/8/10. |
| FR-9–11 | Lokal commit-kvittering, dirty/lagret, atomiske delbekreftelser, abort og retry AD-3–5. A4/A8 er forslag til prosjekteier, ikke bakdatert godkjenning. |
| FR-12–15 | Separate eksplisitte låser, siste lagrede revisjon, ingen gjenåpning, minst én fullført dag og alle opprettede dager før CloseRun AD-5/6/10. Dialogenes konkrete oppførsel arves fra godkjent EXPERIENCE. |
| FR-16 | Ja/Nei, ekstra dager, basisplan, femdagersgrense og historiske planhendelser AD-8. UX-T1 beholdes som behov uten trenings-/klarsignalfunksjon. P1/P2 gjelder de resterende konsistenspresiseringene. |
| FR-17–19 | Frosset dokumentkilde, faktisk PDF, kun avsluttet, alle perspektiver/bekreftelser/planhendelser, liggende matrise og stående tekstsider AD-10/11. Nedlasting/manuell overlevering beholdes uten HR-integrasjon. |
| NFR-1/2 | Godkjente UX-kontrakter og A7-testplan med faktiske enheter, tekstforstørrelse, fokus og skjermleser AD-12. Ikke sertifisert implementasjon. |
| NFR-3/4 | Null tap av kvitterte data innen foreslåtte betingelser, domene-/transaksjonshåndhevede låser AD-3–6/13. Ikke manipulasjonssikker lagring. |
| NFR-5/6 | Komplett femdagers-PDF og senere visuell kontroll; kun fiktive data, godkjent Tide-profil og ingen produksjonsintegrasjon AD-2/10–12. |

PRD beholder status `draft` etter UX-revisjon. Historisk `finalization-report.md` er ikke brukt som godkjenning av dagens krav. Ingen implementering, epic/story-workflow, commit eller push er utført i denne avstemmingen.
