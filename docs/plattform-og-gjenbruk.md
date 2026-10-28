# Plattform og senere gjenbruk

Oppdatert: 2026-10-28. Status: føringer og alternativer før arkitekturvalg.

## Føring fra Prosjekteier

Første leveranse er en mobiltilpasset webapp/PWA med fiktive data. Arbeidet
skal legge til rette for senere mobilapp eller innpassing i Power Apps.
Ingen av disse distribusjonsveiene er implementert eller teknisk verifisert i prosjektet.

## Spor som skal vurderes

| Spor | Mulig gjenbruk | Arbeid som gjenstår |
| --- | --- | --- |
| PWA i nettleser og installert på mobil | Samme webapp | Verifisere installasjon og ønskede funksjoner på aktuelle telefoner |
| Egen mobilapp med webbasert innpakning | Potensielt mye webkode | Velge løsning, teste enhetsfunksjoner og avklare distribusjon |
| Power Apps Code Apps | Potensielt eksisterende React-/webkode | Tilpasse til SDK, autentisering, koblinger og Power Platform-miljø |
| Power Apps canvas-app mot felles API | Datamodell, API og eventuell serverlogikk | Lage Power Apps-grensesnitt og custom connector |
| Power Apps-komponenter (PCF) | Utvalgte UI-komponenter og logikk | Tilpasse til komponentrammeverket og pakke/distribuere komponentene |

Microsoft dokumenterer at Code Apps kan bruke blant annet React og Vue og
kjøres i Power Platform. Dette gir et konkret spor for gjenbruk, men er ikke
automatisk import av en vilkårlig PWA. Aktivering av miljø og gjeldende
sluttbrukerlisensiering må avklares med virksomheten.

En canvas-app kan bruke et REST-API via custom connector. Denne veien kan
dele data og serverlogikk med en selvstendig webapp; brukerflaten må lages
for Power Apps. PCF er et eget spor for avgrensede komponenter.

## Foreslåtte arkitekturføringer

- Vurder React/TypeScript som webgrunnlag; bekreft valget i arkitekturfasen.
- Hold vurderingsregler, kriterier og datamodell adskilt fra skjermkomponenter.
- Bruk stabile ID-er, dokumenterte dataformater og versjonerte kriteriesett.
- Legg lagring og innlogging bak tydelige grensesnitt, slik at demonstrasjonslagring kan erstattes.
- Tilrettelegg for at sjåfør og fadder senere kan bruke hver sin enhet mot samme løp. V1 bruker rollebytte på én enhet; delt lagring og synkronisering mellom enheter inngår ikke.
- Utform en eventuell senere API-kontrakt slik at flere klienter kan bruke samme begreper.
- Unngå at PWA-spesifikke funksjoner blir nødvendige for selve vurderingsreglene.

Dette er forslag som skal vurderes mot enkelhet i demoen; det er ikke en
bestilling på å implementere alle plattformene eller en backend nå.

## Teknisk utprøving før vi lover Power Apps-leveranse

Avklar ønsket Power Apps-variant og tilgjengelig miljø med virksomheten. Prøv én
vurderingsskjerm og én lagringsoperasjon i dette sporet. Verifiser mobilbruk,
autentisering og nødvendige lisenser. Først deretter kan graden av kodegjenbruk
og kostnaden ved tilpasning fastslås.

## Offisielle kilder

Kontrollert 2026-10-28:

- [Power Apps Code Apps – oversikt](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview)
- [Canvas-apps med REST-API og custom connector](https://learn.microsoft.com/en-us/power-platform/architecture/reference-architectures/custom-connector-canvas)
- [Kodekomponenter i canvas-apps](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/component-framework-for-canvas-apps)
- [BMAD-installasjon og skillet mellom stabil utgave og preview](https://docs.bmad-method.org/start/install-bmad/)
