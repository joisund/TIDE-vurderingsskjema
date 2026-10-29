# UX-validering: tilgjengelighet

Dato: 2026-10-29. Linse valgt av prosjekteier. Grunnlag: [DESIGN.md](DESIGN.md), [EXPERIENCE.md](EXPERIENCE.md), [.memlog.md](.memlog.md) og [statisk vurderingsskisse](.working/key-vurdering.html).

## Vurdering

Utkastet har et godt grunnlag for tilgjengelig betjening: eksplisitte svar, ekte radioknapper med kriterium og svar i tilgjengelig navn, store trykkflater, fokusmarkering, tekstlig rolle/dag og dokumenterte dialog- og feilprinsipper. Den valgte trematrisen kan beholdes. Tekstoverløp og hjelpenavn er rettet og kontrollert under gjennomgangen. Gjenværende anbefaling gjelder hvordan svarkolonnenes betydning beholdes synlig gjennom hele skjemaet.

Dette er vurdering av et UX-utkast og en statisk illustrasjon, ikke sertifisering av en ferdig app. Ingen manglende JavaScript-funksjon er telt som produktfeil: skissen sier uttrykkelig at popup, hjelp, lagring og bekreftelse ikke er implementert. Nettbrudd, fokusfelle og skjermleserannonsering må senere prøves i faktisk implementasjon.

## Funn

### A11Y-1 — high, rettet og kontrollert: Kolonneoverskrifter ved forstørret tekst

**Sted:** `.working/key-vurdering.html`, CSS `.column-head` og `.column-head span`, sammenholdt med EXPERIENCE.md «Accessibility Floor» og «Responsive & Platform».

Skissen låser de tre svarfeltene til 52 px og bruker eksplisitte linjeskift i overskriftene. I Edge med 360 px viewport og en kontroll der alle beregnede skriftstørrelser dobles, får «Ikke relevant» 84 px innhold i en 52 px celle, og «Kan bli bedre» 60 px i 52 px. «Vurderingspunkt» blir også bredere enn sin celle. Siden som helhet får ikke horisontal rulling, men det beviser ikke at kolonnene er lesbare: overskriftstekst krysser cellegrensene. Kontrollen er en tekstforstørrelsessimulering, ikke en full test av alle nettleseres zoomfunksjoner.

**Tiltak:** Fastsett og prøv en responsiv regel for overskriftsbryting og kolonnebredde ved større tekst. Behold brukerens rekkefølge og tre rubrikker; ikke løs dette ved å redusere skriftstørrelsen eller klippe teksten. Kontroller minst de avtalte mobilbreddene med større tekst, og bekreft at både overskrift og trykkfelt fortsatt kan knyttes entydig sammen. Funnets alvor gjelder risikoen hvis skisseverdiene videreføres; de er foreløpige og ikke vedtatte tokens.

**Etterkontroll:** Skissen ble rettet med bryting av overskriftstekst. Samme Edge-kontroll ved 360 px og doblede beregnede skriftstørrelser ga ingen overløp i de kontrollerte overskriftene, kriterietekstene, dialogen eller knappene. Rullebredden var fortsatt 360 px. Funn lukket for denne skissen; bredere implementasjonstest gjenstår.

### A11Y-2 — medium: Svarkolonnenes betydning forsvinner under rulling

**Sted:** `.working/key-vurdering.html`, én `.column-head` før 22 rader; EXPERIENCE.md «Component Patterns / Vurderingspunkt» og «Responsive & Platform».

Kolonneoverskriftene finnes bare øverst og følger ikke med ved rulling. Senere rader viser tre like, umerkede sirkler. Skjermlesernavnene er gode, men en seende bruker som trenger mer tekststørrelse eller mister kolonnerekkefølgen må rulle tilbake for å huske betydningen. Dette øker risikoen for feil svar i en oppgave hvor enkel avkrysning er hovedmålet.

**Tiltak:** Beskriv hvordan overskriftene forblir tilgjengelige gjennom skjemaet, for eksempel ved vedvarende overskriftsrad eller gjentakelse ved kategoriene. Dette er en anbefaling til UX-kontrakten, ikke et krav om en bestemt implementasjon. Ved fast overskriftsrad må den ikke skjule fokuserte felter eller dialoginnhold.

### A11Y-3 — low, rettet og kontrollert: Hjelpeknappenes tilgjengelige navn

**Sted:** `.working/key-vurdering.html`, `.help-trigger` med `aria-label="Hjelp til kategori"`; EXPERIENCE.md «Component Patterns / Kategorihjelp».

Hver knapp heter det samme uten kategorinavn. Knappelisten i en skjermleser gir derfor ikke informasjon om hvilken kategori hjelpen gjelder, selv om kategorien står visuelt ved siden av.

**Tiltak:** Knytt navnet til kategorien, for eksempel «Hjelp om Sjåfør», og beskriv dette i komponentregelen. Når hjelpen implementeres, må åpnet/lukket tilstand og koblingen til hjelpeinnholdet formidles, og fokus må beholdes eller returneres forutsigbart. Det er allerede besluttet at hjelp skal kunne lukkes og utelates fra utskrift.

**Etterkontroll:** Tilgjengelige navn i skissen er endret til kategorispesifikke navn. Funn lukket for navngivingen; fungerende hjelpedialog er fortsatt utenfor den statiske skissen.

## Kontrollert uten nye funn

- Ved 360 px viewport hadde dokumentet 360 px rullebredde. De skisserte telefonrammene tilpasset seg til 344 px innenfor presentasjonens marger.
- Målt trykkflate i den rendrerte skissen var 52 × 48 px for svar og 44 × 44 px for spørsmålstegn. Den lille synlige sirkelen er ikke hele treffområdet.
- Radioknapper har egne navn per rad og visuell fokusmarkering. Native radiogrupper ivaretar ett svar per rad; gruppene i de to illustrasjonene deler ikke registreringer.
- Rolle, fiktivt navn, fase og dag vises i konteksthodet. EXPERIENCE.md krever at fadderinnhold fjernes fra sjåførflaten ved rollebytte.
- Begrunnelsesfeltet har synlig etikett og dialogen navngis av sin overskrift. EXPERIENCE.md beskriver fokus inne i dialogen, tilbakeføring av fokus, avbrytelse uten bekreftelse og tekstlige feil.
- Valgt svar vises som markert sirkel, ikke bare endret fargetone. Dokumentene krever status utover farge og sann lagringsstatus.
- Verifiserte profilfarger og kontrastbegrensninger er dokumentert. Skissen bruker ikke hvit tekst på Tide Grønn. Ikke-endelige fargepar og fokus-/feiltilstander må fortsatt kontrolleres før implementeringsklar designstatus.
- Utskrifts-CSS skjuler spørsmålstegn og hjelpeflater. Dette er kontroll av skissens regel, ikke validering av slutt-PDF-ens leserekkefølge eller struktur.

## Omfang og opptelling

**Før retting: 0 critical, 1 high, 1 medium, 1 low. Etter kontroll: 0 critical, 0 high, 1 medium, 0 low åpne funn.** A11Y-1 og A11Y-3 er rettet og kontrollert. A11Y-2 gjenstår som anbefaling om vedvarende kolonneforståelse. Formell validering av en funksjonell app, hjelpens faglige innhold og endelig PDF gjenstår.


## Senere avklaring og etterkontroll – A11Y-2 lukket

Prosjekteier har valgt at kolonneoverskriftene følger rullingen. Skissen bruker en fast overskriftsrad innen registreringsflaten, med ugjennomsiktig bakgrunn og plass for tastaturfokus. Kontroll i Edge ved 360/390 px og normal/doblet tekst viste fast posisjon ved rulling og ingen tekstoverløp; fokusert sluttfelt var under overskriften. Utskrift bruker vanlig plassering, ingen klippet rulleflate og skjult hjelp. Dette validerer skissen, ikke den fremtidige appen.

Gjeldende åpne tilgjengelighetsfunn: 0. Opprinnelige funn over bevares som historikk.
