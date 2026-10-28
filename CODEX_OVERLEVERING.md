# Overlevering - digital kjørevurdering

## Status og retning

Prosjektet utforsker en mobiltilpasset webapp/PWA for kjørevurdering og
opplæringsdokumentasjon. Første leveranse bruker kun fiktive data.
Senere mobilapp og mulig Power Apps-tilpasning skal vurderes i arkitekturen.
Ingen produksjonstilkobling eller teknologistakk er besluttet.

## Anonymisert grunnlag

Tidligere personopplysninger, samtalesitater, arbeidsgiverkoblinger og interne
system-, tilgangs- og organisasjonsopplysninger er fjernet.
Etter ønske fra prosjekteier er kun den skannede PDF-versjonen lagt tilbake,
med avdelingsstedet fjernet fra selve bildeinnholdet og metadata fjernet.
Resten av skjemainnholdet er beholdt. Fotografiene er ikke lagt tilbake.

Bruk `docs/Eksempel vurderingsskjema.pdf` som primærkilde for original ordlyd
og oppsett. `docs/skjemagrunnlag.md` er kun et omskrevet demoalternativ.
Planleggingen ligger i `_bmad-output/`.

## Funksjonell arbeidsmodell - forslag

Opprett økt, registrer egenvurdering før og etter kjøring, registrer
veileders vurdering og kommentarer, og gå gjennom oppsummeringen sammen.
Hold de tre vurderingene adskilt. Manglende svar skal aldri tolkes som OK.
V1 omfatter historikk, utkastlagring og generering av nedlastbar PDF til
manuell opplasting i et HR-system og kopi til den evaluerte.
Behov for flere dager skal kunne beskrives uten en vilkårlig femdagersgrense.

Roller og myndighet er foreløpige produktforslag. Veileder kan foreslå
oppfølging; eventuell tildeling og tilgang avklares i kravarbeidet.

## Videre arbeid

Fortsett med PRD basert på produktbriefen. V1 demonstrerer et helt fadderløp
over flere dager og rollebytte på én enhet. To enheter skal tilrettelegges for
senere, men implementeres ikke i V1. Full offlinebruk er lite viktig; rask
gjenopptakelse etter nettbrudd er nødvendig. Bruk bare fiktive deltakere og
generiske eksempler. Ikke gjeninnfør originale kilder fra eldre chattekst.
