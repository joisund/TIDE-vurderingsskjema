# Digital kjørevurdering

Demoprosjekt for mobiltilpasset vurdering av kjøring og opplæring.
Bare fiktive data skal brukes. Prosjektet representerer ingen arbeidsgiver
og dokumenterer ikke faktiske interne systemer eller arbeidsprosesser.

## Status

BMAD-workflow er startet. Første leveranse er en webapp/PWA med mulighet
for senere mobilapp og Power Apps-tilpasning. V1 viser et helt fadderløp over
flere dager, med rollebytte på én enhet, utkast og PDF-generering. Bruk av to
enheter skal tilrettelegges for senere. Ingen app er implementert ennå.

- [Workflow og status](_bmad-output/workflow-status.md)
- [Produktbrief](_bmad-output/planning-artifacts/briefs/brief-kjorevurdering-2026-10-28/brief.md)
- [Generisk skjemagrunnlag](docs/skjemagrunnlag.md)
- [Skannet vurderingsskjema - sted fjernet](docs/Eksempel%20vurderingsskjema.pdf)
- [Plattformvalg og gjenbruk](docs/plattform-og-gjenbruk.md)
- [Anonymiseringskontroll](docs/anonymiseringskontroll.md)

## BMAD

BMAD Method 6.12.0 ligger i `_bmad/`, med Codex-skills i `.agents/skills/`.
Språk er norsk. Neste steg etter produktbriefen er `bmad-prd`, deretter
`bmad-ux`, `bmad-architecture`, `bmad-create-epics-and-stories`,
`bmad-sprint-planning` og `bmad-build`. Bruk `bmad-help` for veiledning.

## Versjonskontroll

Prosjektet bruker Git. Lokale filer publiseres gjennom commit og push.
Kontoeier, maskinstier og fjernadresse gjengis ikke i dokumentasjonen.
Git-historikk og ekstern repoidentitet omfattes ikke av dokumentanonymiseringen.
Verktøycache, personlige innstillinger og mellomfiler ignoreres av Git.
