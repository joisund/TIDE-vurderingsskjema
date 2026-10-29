---
title: "Produktbrief: Digital kjørevurdering"
status: complete
created: 2026-10-28
updated: 2026-10-28
---

# Digital kjørevurdering

> Senere avklaring 2026-10-29: PRD-arbeidet har presisert normalt tre ordinære dager, kortere ved retur/lånesjåfør, og maksimalt fem dager inkludert oppfølging i samme løp. Dette erstatter føringen om støtte for dag 1–8 nedenfor. Den opprinnelige briefteksten beholdes som historisk grunnlag; gjeldende krav står i PRD-en.

## Mål og verdi

Digital kjørevurdering skal gjøre det enklere å gjennomføre og dokumentere et helt fadderløp over flere dager. Sjåfør og instruktør/fadder skal kunne registrere vurderinger på mobil, følge utviklingen og avslutte med en samlet PDF. Dokumentasjonen skal kunne lastes opp manuelt i et HR-system og deles som kopi med den evaluerte.

Første leveranse, V1, er en mobiltilpasset webapp/PWA med fiktive data som også fungerer i nettleser på større skjermer. Demoen skal vise sammenhengen fra egenvurdering til sluttdokumentasjon og gi grunnlag for å vurdere videre utvikling. Produksjonsbruk og tilkobling til virksomhetssystemer er ikke besluttet.

## Behov og brukere

Et papirskjema samler vurderinger, men en digital løsning skal også gjøre det enkelt å gjenfinne registreringer og se utvikling gjennom et opplæringsløp. Vurdering og dokumentasjon skal henge sammen, slik at samme informasjon kan brukes i samtalen mellom sjåfør og fadder og i den avsluttende PDF-en.

Sjåføren registrerer egenvurdering før og etter kjøring. Instruktør/fadder registrerer sin vurdering etter kjøring og utdyper med kommentarer. Den evaluerte mottar en kopi av sluttdokumentasjonen. En dokumentmottaker skal kunne lese PDF-en uten å måtte bruke appen. Eventuelle administrative roller og godkjenningsmyndighet avklares senere.

## Arbeidsflyt og innhold

Opprett fadderløp og første økt → egenvurdering før kjøring → egenvurdering etter kjøring → faddervurdering og kommentarer → felles gjennomgang → nye økter ved behov → avsluttende oppsummering og PDF.

Den skannede filen `docs/Eksempel vurderingsskjema.pdf` er primærkilde for ordlyd og oppsett. Alle 22 kriterier og de tre separate vurderingene skal bevares, sammen med relevante øktopplysninger, kommentarer og oppsummering første/siste dag. Skjemaet viser dag 1–8; modellen skal ikke begrenses av en tidligere idé om maksimalt fem dager. Tomme svar skal være synlige og aldri tolkes som OK. Et eventuelt valgbart «Ikke vurdert» avklares i kravarbeidet.

## Omfang for V1

- Et helt fadderløp over flere dager, med økter, vurderinger, kommentarer og historikk.
- Separate sjåfør- og fadderroller, demonstrert ved rollebytte på samme enhet.
- Lagring og gjenåpning av utkast. Kortvarige nettbrudd skal ikke tvinge brukeren til å begynne økten på nytt.
- Rask gjenopptakelse etter nettbrudd, med tydelig informasjon om hva som er lagret og hva som eventuelt venter.
- Generering av en nedlastbar PDF som samler dokumentasjonen fra løpet, inkludert oppsummeringer og synlige ubesvarte felt.
- Mulighet til å gi den evaluerte en kopi av PDF-en og laste den opp manuelt i et HR-system. Nedlasting er grunnlaget for dette; direkte utsending og systemintegrasjon inngår ikke.

V1 omfatter fadderløpet. Andre vurderingskategorier, administrasjon, produksjonsinnlogging, reelle ansattdata, full offlinebruk, synkronisering mellom enheter og appbutikkpublisering inngår ikke i første leveranse. Rollebytte i demoen er en simulering av arbeidsdelingen, ikke tilgangssikring for produksjon.

## Føringer for videre utvikling

V1 skal legge til rette for at sjåfør og fadder senere kan bruke hver sin enhet mot samme fadderløp. Vurderinger må derfor knyttes til riktig rolle og økt, og lagring må kunne videreutvikles uten å bygge om hele brukerflaten. To enheter med delt lagring og synkronisering implementeres ikke i V1.

Mulig videreføring som mobilapp eller i Power Apps er også en føring. Plattformvalg og teknisk løsning avgjøres i arkitekturfasen. Graden av kodegjenbruk og nødvendige tilpasninger skal undersøkes før en bestemt Power Apps-leveranse loves.

## Suksesskriterier

V1 er vellykket når en testbruker med fiktive data kan:

- Gjennomføre et fadderløp over flere dager på mobil uten horisontal rulling i registreringsflyten.
- Bytte mellom sjåfør og fadder uten at vurderinger blandes sammen.
- Gjenåpne utkast og finne tidligere økter med de lagrede vurderingene og kommentarene.
- Oppleve et simulert nettbrudd og fortsette fra lagret arbeid uten å starte økten på nytt.
- Laste ned en lesbar PDF med vurderinger, kommentarer og oppsummeringer fra løpet, klar for manuell opplasting og deling som kopi.

PRD-en skal konkretisere kravene til lagring, gjenoppretting, PDF-innhold og ferdigstilling av et løp. Arkitekturen skal beskrive hvordan to enheter, mobilapp og Power Apps kan støttes senere. Dette er et produktgrunnlag for videre planlegging, ikke en godkjenning av produksjonsbruk.
