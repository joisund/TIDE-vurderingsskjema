---
name: Digital kjørevurdering
description: Godkjent visuell V1-standard for digital kjørevurdering og samlet PDF.
status: final
created: 2026-10-29
updated: 2026-10-29
sources:
  - .memlog.md
  - mockups/key-vurdering.html
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/prd.md
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/addendum.md
  - ../../prds/prd-Digital kjørevurdering-2026-10-29/finalization-report.md
  - ../../../../docs/Eksempel vurderingsskjema.pdf
  - https://www.tide.no/om-tide/presse-og-nyheter/profilhaandbok
  - https://tide.hel1.your-objectstorage.com/images_and_files/tide-profil/tide-farger.pdf
colors:
  tide-gronn: '#2FDA95'
  tide-sand: '#E0D3C3'
  tide-indigo: '#361EBD'
  tide-lys-sand: '#F1E2CE'
  tide-bla: '#00D6E0'
  tide-gra: '#53585F'
  surface: '#FFFFFF'
  ink: '#53585F'
  primary: '#361EBD'
  on-primary: '#FFFFFF'
  focus: '#361EBD'
  error-ink: '#361EBD'
  category-surface: '#F1E2CE'
  separator: '#E0D3C3'
  pdf-ok: '#CDECCD'
  pdf-kan-bli-bedre: '#FFF0A6'
  pdf-ikke-relevant: '#F6C0BF'
  pdf-ink: '#333333'
  pdf-grid: '#9A9A9A'
typography:
  pdf: {fontFamily: 'Segoe UI'}
  body: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 16px, fontWeight: '400', lineHeight: '1.45'}
  title: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 25px, fontWeight: '700', lineHeight: '1.2'}
  context: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 14px, fontWeight: '400', lineHeight: '1.45'}
  app-label: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 14px, fontWeight: '650', lineHeight: '1.2'}
  eyebrow: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 12px, fontWeight: '650', lineHeight: '1.45'}
  criterion: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 13px, fontWeight: '400', lineHeight: '1.35'}
  criterion-number: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 10px, fontWeight: '700', lineHeight: '1.35'}
  column: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 11px, fontWeight: '750', lineHeight: '1.45'}
  column-label: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 12px, fontWeight: '750', lineHeight: '1.45'}
  category: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 13px, fontWeight: '750', lineHeight: '1.3'}
  help-symbol: {fontFamily: system-ui, fontSize: 18px, fontWeight: '750', lineHeight: normal}
  dialog-title: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 23px, fontWeight: '700', lineHeight: '1.2'}
  dialog-tag: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 12px, fontWeight: '700', lineHeight: '1.45'}
  dialog-criterion: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 15px, fontWeight: '650', lineHeight: '1.45'}
  label: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 14px, fontWeight: '650', lineHeight: '1.45'}
  input: {fontFamily: system-ui, fontSize: 14px, fontWeight: '400', lineHeight: '1.5'}
  hint: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 12px, fontWeight: '400', lineHeight: '1.45'}
  button: {fontFamily: system-ui, fontSize: 14px, fontWeight: '650', lineHeight: normal}
  help-title: {fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 18px, fontWeight: '700', lineHeight: '1.45'}
rounded:
  control: 4px
  help: 8px
  dialog: 12px
  radio: 50%
spacing:
  '1': 4px
  '2': 5px
  '3': 6px
  '4': 8px
  '5': 10px
  '6': 12px
  '7': 13px
  '8': 14px
  '9': 16px
  '10': 18px
  '11': 20px
  '12': 22px
components:
  profile-header: {padding: '22px 16px 18px', gap: '{spacing.11}', logo-width: 76px, accent-width: 4px, accent: '{colors.tide-gronn}', foreground: '{colors.ink}'}
  context: {padding: '20px 16px 16px', title-margin: '8px 0', paragraph-margin: '4px 0'}
  matrix: {padding: '0 10px 16px', columns: 'minmax(0,1fr) repeat(3,52px)', column-min-height: 56px, column-padding-block: 8px, column-border: 2px, row-min-height: 68px, criterion-padding: '4px 5px 13px', separator-width: 1px, separator: '{colors.separator}', header-background: '{colors.surface}'}
  category: {min-height: 52px, margin-top: 14px, padding: '4px 6px 4px 10px', border-width: 4px, border-color: '{colors.tide-gronn}', background: '{colors.category-surface}'}
  choice: {min-width: 44px, min-height: 48px, dot-size: 22px, border-width: 1.5px, border-color: '{colors.ink}', selected-border-width: 6px, selected-color: '{colors.primary}', radius: '{rounded.radio}', background: '{colors.surface}'}
  help-trigger: {width: 44px, height: 44px, foreground: '{colors.primary}'}
  dialog: {padding: '22px 18px', border-width: 2px, border-color: '{colors.primary}', background: '{colors.surface}', radius: '{rounded.dialog}', inline-inset: 14px}
  text-input: {min-height: 108px, padding: 12px, margin: '8px 0 10px', border-width: 1.5px, border-color: '{colors.ink}', foreground: '{colors.ink}', background: '{colors.surface}', radius: '{rounded.control}'}
  actions: {gap: 10px, margin-top: 22px}
  button-primary: {min-height: 48px, border-width: 1.5px, background: '{colors.primary}', foreground: '{colors.on-primary}', border-color: '{colors.primary}', radius: '{rounded.control}'}
  button-secondary: {min-height: 48px, border-width: 1.5px, background: '{colors.surface}', foreground: '{colors.primary}', border-color: '{colors.primary}', radius: '{rounded.control}'}
  help-panel: {padding: 20px, border-width: 1.5px, border-color: '{colors.primary}', background: '{colors.surface}', radius: '{rounded.help}'}
  focus-ring: {width: 3px, offset: 5px, color: '{colors.focus}'}
  field-error: {foreground: '{colors.error-ink}', border-color: '{colors.error-ink}', background: '{colors.surface}'}
---

## Brand & Style

Løsningen skal oppleves som et enkelt arbeidsverktøy og en opplæringsplattform i Tides grafiske profil. Prosjekteier har godkjent skrifttype, fargebruk, luft, logo og tydelig punkthjelp variant A i [vurderingsskissen](mockups/key-vurdering.html) som visuell standard for V1. Synlig hjelp skal invitere til nysgjerrighet og læring; selve avkrysningen skal være enkel.

Tides offisielle palett og [originale logo](imports/tide-logo-rgb.png) er merkevareressurser. Systemfont, komponentstørrelser og layout i dette dokumentet er godkjente produktvalg, ikke påståtte regler fra Tides profilhåndbok. Logoen står til venstre i profilhodet med bredde `{components.profile-header.logo-width}` og uendret proporsjon. Luft følger `{components.profile-header.padding}`. Dette er godkjent plassering, ikke en påstand om et offisielt minimumsmål for logofrirom.

Telefonrammer, gjennomgangshode, bildetekster, variantetiketter og bakgrunn rundt skissene er presentasjon, ikke appdesign. Prosjekteier har godkjent hele oppsettet, inkludert hjelpetekster og skjerm-/PDF-komposisjoner. A1-feltreglene er avklart i EXPERIENCE.md. Formell final-status settes etter sluttkontroll. `DESIGN.md` eier utseende og [EXPERIENCE.md](EXPERIENCE.md) eier oppførsel. Ved konflikt går dokumentene foran illustrasjoner; nyeste brukerbeslutninger i [.memlog.md](.memlog.md) overstyrer eldre PRD-tekst. [Kildeavstemmingen](reconcile-prd.md) dokumenterer endringene.

## Colors

Profilverdiene er de offisielle HTML-verdiene fra [Tides fargeark](https://tide.hel1.your-objectstorage.com/images_and_files/tide-profil/tide-farger.pdf), kontrollert 2026-10-29. Sand har avvik mellom RGB og HTML i kilden; digitale tokens følger HTML-verdien. Logo brukes i Tide Grønn eller hvit negativ variant etter [profilhåndboken](https://www.tide.no/om-tide/presse-og-nyheter/profilhaandbok); V1-skissen bruker den positive varianten.

| Token | Valgt produktbruk |
| --- | --- |
| `{colors.tide-gronn}` | Logo, profilhodets bunnlinje og dekorativ venstrekant på kategorier. |
| `{colors.separator}` | Tide Sand som dekorativ radskillelinje. |
| `{colors.primary}` | Tide Indigo på primærhandling, valgt svar og tydelig spørsmålstegn. |
| `{colors.category-surface}` | Tide Lys sand bak kategorioverskrifter. |
| `{colors.ink}` | Tide Grå som standard tekst og nødvendige kontrollgrenser. |
| `{colors.surface}` | Hvit produktflate, dialog, input og sekundærhandling. Hvit er produktvalget, ikke en ny profilfarge. |
| `{colors.on-primary}` | Hvit tekst på indigo primærhandling. |
| `{colors.tide-bla}` | Verifisert profilfarge uten aktiv komponentrolle i V1-skissen. |

Implementeringsavledning innen den godkjente paletten: `{colors.focus}` bruker skissens indigo ring, med `{components.focus-ring.width}` bredde og `{components.focus-ring.offset}` avstand. Behandlingen videreføres til øvrige interaktive kontroller. `{colors.error-ink}` bruker indigo til konkret feiltekst og markert feltgrense på hvitt. Feil har alltid tekstlig forklaring og programmatisk kobling; fargen alene skiller ikke feil fra fokus. Dette er en funksjonell avledning, ikke et nytt merkevarevalg eller en automatisk faglig vurdering.

Kontrastkontroll med sRGB-luminans: grå/hvit **7,17:1**, grå/lys sand **5,64:1**, indigo/hvit **10,11:1**, indigo/lys sand **7,95:1**, grå/sand **4,87:1**. De valgte tekstparene møter kontrollmålet 4,5:1 for vanlig tekst. Nødvendige kontrollgrenser skal møte 3:1. Sand/hvit **1,47:1** og grønn/hvit **1,81:1** brukes bare dekorativt eller som logo; de er ikke eneste nødvendige kontrollgrense eller tekstinformasjon. Hvit eller grå tekst på grønn flate brukes ikke. Dette er fargekontroll, ikke sertifisering av hele appen.

## Typography

Skissens systemfont er godkjent produktfont, ikke dokumentert Tide-profilfont. `{typography.body.fontFamily}` er standardstakken; input, knapper og spørsmålstegn bruker skissens `system-ui`. Hovedtittel bruker `{typography.title.fontSize}`, kriterietekst `{typography.criterion.fontSize}` og kolonneoverskrifter `{typography.column.fontSize}`. Punktnummeret på `{typography.criterion-number.fontSize}` er tilleggsinformasjon; kriteriets innhold står separat. Dialogtittel bruker `{typography.dialog-title.fontSize}`. Øvrige roller følger frontmatter.

Størrelsene er utgangspunkt ved normal tekststørrelse, ikke en sperre mot forstørrelse. Kriterier, kolonneoverskrifter, knapper og dialoginnhold skal kunne brytes uten overlapping eller avkutting. Kolonneoverskrifter og kriterietekst tillater ordbrudd ved behov. Ingen komponentbibliotek eller teknisk stakk er valgt.

## Layout & Spacing

De 22 punktene beholder rekkefølgen i PRD-addendumet. Kategorier ligger vertikalt. Til høyre for radteksten står **OK**, **Kan bli bedre**, **Ikke relevant** i denne rekkefølgen. Griden er `{components.matrix.columns}` ved de godkjente 360/390 px-visningene; radteksten tar resterende bredde. Matrisens innvendige luft er `{components.matrix.padding}`. Rader har minimum `{components.matrix.row-min-height}`, og tekstpadding følger `{components.matrix.criterion-padding}` etter innføring av nummerlinje og hjelp. Radhøyden vokser med teksten.

Kolonneoverskriftene følger rullingen med hvit, ugjennomsiktig bakgrunn. De har minimum `{components.matrix.column-min-height}` og vokser ved tekstforstørrelse. Fokusert innhold skal aldri ligge skjult under dem. Skissens 160 px scroll-padding er et demonstrasjonsmål; implementasjonen må ta hensyn til faktisk overskriftshøyde. Telefonrammens høydebegrensning og ytre avrunding følger ikke med i produktet.

Profilhode og kontekst bruker sine `components`-tokens. Dialogens padding og innvendige avstander følger `{components.dialog.padding}`, `{components.text-input.margin}` og `{components.actions.gap}`. Dialogen har ikke en fast topposisjon fra telefonillustrasjonen; plasseringen må fungere med skjermtastatur og tekstforstørrelse.

[Godkjent vurderingsskjerm](mockups/key-vurdering.html) er visuell referanse for registrering, punkthjelp A og begrunnelsesdialog. Den er fortsatt en statisk skisse, ikke en implementasjon av lagring eller låsing. [Importert originalskjema](imports/Eksempel%20vurderingsskjema.pdf) gir vurderingsmatrise og egenevalueringsstruktur; [originalkilden](../../../../docs/Eksempel%20vurderingsskjema.pdf) er bevart.

Det godkjente PDF-oppsettet har liggende første side med vurderinger kronologisk ved siden av hverandre, inspirert av dagens fadderskjema, og bevart oppsummeringsfelt øverst. OK er grønt, Kan bli bedre gult og Ikke relevant rødt; alle markeringer har også tekst/symbolforklaring. Stående side 2 samler kommentarer, relevansbegrunnelser, egenevaluering og godkjenning. Vanlige tekstnavn, roller og datoer står i signaturlignende felt: sjåfør venstre, fadder høyre og eventuell ekstra fadder i midten, med faktisk avsender for hver dag. Flere sider tillates ved tekstmengde. Ingen fiktiv e-signatur eller automatisk felles godkjenning innføres. Hjelp utelates. [PDF-referansen](mockups/key-pdf.html) og [prøvefilen](../../../../output/pdf/ux-pdf-oppsett.pdf) viser det godkjente oppsettet med liggende progresjonsmatrise og stående oppfølgingsside. [Samlet gjennomgang](review-index.html) lenker skjermreferansene.

PDF bruker `{typography.pdf.fontFamily}`, tekst `{colors.pdf-ink}`, tabellrutenett `{colors.pdf-grid}` og vurderingsfyll `{colors.pdf-ok}`, `{colors.pdf-kan-bli-bedre}` og `{colors.pdf-ikke-relevant}`. Sandflater følger `{colors.tide-lys-sand}`. Dette er verdier fra det godkjente PDF-eksemplet, ikke nye Tide-profilfarger. Tekst/symboler bevarer betydningen uten farge og ved gråtoneutskrift.

Prosjekteier har godkjent vurderingsskjemaet, [egenevalueringen](mockups/key-egenevaluering.html), [fadderdelen](mockups/key-fadder.html) og [avslutningen](mockups/key-avslutning.html) med samme visuelle standard. Fadderdelen viser Ja/Nei som separate statiske tilstander; detaljfelter hører bare til Ja. Alle 22 vurderingspunkter har Kommentar. Avslutning samler fritekst og påkrevd statusvalg under Konklusjon.

## Elevation & Depth

Godkjent dialog har hvit flate, indigo kant på `{components.dialog.border-width}` og avrunding `{rounded.dialog}`. Skissen bruker ingen skygge; ingen skyggeeffekt legges til som ny designretning. Hjelpeflate bruker `{components.help-panel.border-width}` kant. Dempet bakgrunn i dialogillustrasjonen er bare illustrasjon av inaktivt innhold; aktiv tekst og kontroller skal beholde normal kontrast.

## Shapes

Input og knapper bruker `{rounded.control}`, hjelpeflate `{rounded.help}` og dialog `{rounded.dialog}`. Valgkontrollen er rund med `{components.choice.dot-size}` diameter og `{rounded.radio}` radius. Uvalgt kontroll har `{components.choice.border-width}` grå kant; valgt svar har `{components.choice.selected-border-width}` indigo kant. Treffområdet er større enn den synlige sirkelen. Telefonillustrasjonens 24 px rammeavrunding er ikke en produkt-token.

## Components

Samme komponentnavn brukes i EXPERIENCE.md. Der en flate ennå ikke har egen skisse, arver den vedtatt tekst, flater, input, handlingsknapper og fokus; komposisjonen bygges fra komponent- og flyttabellene i EXPERIENCE.md.

| Komponent | Visuell regel |
| --- | --- |
| Profilhode | Original logo til venstre, `{components.profile-header.logo-width}` bred, `{typography.app-label.fontSize}` konteksttekst og grønn bunnlinje. Aktiv rolle, aktuell sjåfør og dag er tydelige. |
| Løpsoversikt | Hvit flate, grå tekst; fiktiv identitet og tekstlig status skiller løp. Tittel/kontekst følger `{typography.title.fontSize}` / `{typography.context.fontSize}`. |
| Dagsoversikt | Samme teksthierarki; dagnummer, dato, planlagt siste dag og separate vurderingsstatuser. Førvurdering merkes som engangsvurdering. |
| Øktopplysninger | Vedvarende etiketter med `{typography.label.fontSize}`, input med `{components.text-input.radius}` og grå grense. Obligatorisk/frivillig og låst tilstand får tekst. A1 i EXPERIENCE.md angir obligatoriske felt og ansvar; tider vises i HH:mm. |
| Vurderingspunkt | Vertikal matrise etter `{components.matrix.columns}`. Kriterietekst `{typography.criterion.fontSize}`; tydelig nummerlinje. Ett svar per rad. Svarfelt minimum `{components.choice.min-height}` høyt; valgt/uvalgt sirkel etter choice-tokens. |
| Punkthjelp | Variant A: tydelig indigo spørsmålstegn til høyre i punktets nummerlinje, `{typography.help-symbol.fontSize}`, trefflate `{components.help-trigger.width}` × `{components.help-trigger.height}`. Hvit hjelpeflate med `{rounded.help}`; én kort sammenhengende beskrivelse per punkt, omtrent 1–3 linjer, uten faste overskrifter. Samme tekst brukes av begge roller. Skjules i utskrift/PDF. [Godkjente hjelpetekster](help-texts-draft.md) beskriver de 22 punktene. |
| Begrunnelsesdialog | Hvit flate, indigo kant, `{rounded.dialog}`, `{typography.dialog-title.fontSize}` tittel. Felt minimum `{components.text-input.min-height}`. Sekundær avbryt og indigo primærhandling er minst `{components.button-primary.min-height}` høye. |
| Relevansbehandling | Separate, navngitte tekster for sjåførens begrunnelse og fadders avgjørelse. Grå tekst på hvitt; ingen felles «enighet»-markør. |
| Fadderkommentar | Synlig sekundær «Kommentar»-handling ved hvert av de 22 punktene, uavhengig av svar. Åpent felt bruker label/input-typografi, tydelig avsender og samme kontrollgrense som begrunnelsesfelt. |
| Oppfølgingsplan | Ja/Nei først. Bare Ja viser valg mellom antall ekstra fadderdager og utvidet kjøretrening før fortsettelse. Gjeldende plan og avledet ny siste dag vises med tekst; label-, input- og button-tokens gjenbrukes. |
| Egenevaluering | Tre styrker og tre utviklingsområder, dato og tydelig frivillighet. Samme tekstfeltstil; sekundær «Hopp over». |
| Fadderkonklusjon | Én gruppe med overskrift «Konklusjon»: valgfritt fritekstfelt først, så Godkjent / Oppfølgingsbehov rett under som påkrevd valg uten forhåndsvalg. Samme felt- og radiostil som resten av løsningen. |
| Lagringsstatus | `{typography.hint.fontSize}` tekst på hvitt; status skiller lagring fra faglig bekreftelse. Feil beskrives med tekst og `{colors.error-ink}`. |
| Mangelliste | Konkret tekstlig feltmangel med vei til riktig felt. Indigo feiltekst på hvitt; frivillige felt listes ikke som feil. |
| Bekreftelsesdialog | Arver dialog-, label- og button-tokens. Rolle, navn, dato, berørt del og varsel om permanent låsing vises før primærhandling. |
| Avslutningsdialog | Samme dialogstil; valgt konklusjon, permanent lukking og fullt innsyn vises samlet før bekreftelse. Ordet «utfall» brukes ikke i grensesnittet. |
| Historikkvisning | Grå tekst på hvitt; kronologiske dager, avsendere og bekreftelser. Skrivebeskyttet innhold fremstår som lesing, ikke redigerbare felt. |
| PDF-handling | Indigo primærhandling, tekstlig genererings-/feilstatus; nytt forsøk bruker samme stil. Ikke en «send»-knapp. |

## Do's and Don'ts

| Gjør | Unngå |
| --- | --- |
| Bruk original logo, verifiserte profilfarger og godkjente produkttokens. | Kall systemfonten offisiell Tide-font eller tegn om logoen. |
| Bevar kriterietekst, punktrekkefølge og tre svarkolonner. | Kopier gamle daggrenser eller daglig førvurdering fra papirskjemaet. |
| Bevar tekstforstørrelse, store trefflater og synlig fokus. | Lås radhøyde, klipp overskrifter eller gjør den synlige sirkelen til hele treffområdet. |
| Skill svar, begrunnelse, behandling og bekreftelse med avsender og tekst. | Bruk farge alene eller én felles vurdering ved uenighet. |
| Bruk oppsettet som godkjent V1-standard; ferdigstill resterende flater innen samme språk. | Overfør telefonramme, ytre skissehode eller demonstrasjonsposisjon for dialog til appen. |

**Godkjent UX-grunnlag:** de 22 korte hjelpetekstene, vurderingsskjema, fadderdel, egenevaluering, avslutning og PDF-oppsett. A1 og UX-T1 er avklart; videre lagrings-/testbeslutninger står som arkitekturoppgaver i EXPERIENCE.md. Systemfont, palettbruk, luft, logo og punkthjelp A er godkjent og skal ikke spørres om på nytt. Mørk visning er ikke del av den godkjente lyse skissen og innføres ikke automatisk.
