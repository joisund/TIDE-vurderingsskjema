// Normalisert transkripsjon av grunnkursarket for Volvo, side 1.
const groups = [
  ['Viktige knapper/funksjoner utvendig', [
    ['Hovedstrømbryter utvendig'],
    ['NATO-kontakt / batterier'],
    ['Sandkasser og luker', 'Viktig at de er skikkelig lukket og i lås.'],
    ['Plassering av Valeo', 'Bryter skal stå på 1.'],
    ['Hjulbolter, dekkmønster og lufttrykk'],
    ['Diesel- og AdBlue-påfylling'],
    ['Karosseriskader', 'Legges inn i Tide-app.'],
    ['Fogmaker', 'Automatisk brannslukningssystem.'],
    ['Kjølevannsnivå i ekspansjonstank'],
    ['Oljepåfylling og peilestang'],
    ['Sjekk av reimer i motorrom'],
    ['Bryter for start av motor i motorrom'],
    ['Regenerering Euro 6-motorer'],
  ]],
  ['Viktige knapper/funksjoner innvendig', [
    ['Hovedstrømbryter innvendig'],
    ['Tenning og start av motor'],
    ['Innstilling av sete'],
    ['Justering av ratt'],
    ['Sjekke målere for diesel og lufttrykk'],
    ['Sjekke temperaturmåler og oljetrykk motor'],
    ['Kamera over bakdører / ryggekamera'],
    ['Varme i speil og siderute'],
    ['Heve/senke/kneeling'],
    ['Dørlåser innvendig og utvendig'],
    ['Lys innvendig'],
    ['Videoovervåking'],
    ['Nær-, fjern- og parklys, bryterinnstillinger'],
  ]],
  ['Viktige knapper/funksjoner innvendig', [
    ['Håndbrekk og blokkeringsventil'],
    ['Boggiløft, antispinn og differensialsperre'],
    ['Retarder', 'Skal normalt stå på A (automat).'],
    ['Brytere til førervarme'],
    ['Klimaanlegg, pausevarme og innstillinger'],
    ['Tilleggsvarmer (Valeo), start og innstillinger'],
    ['Alkolås, låse og låse opp'],
    ['Strøm til billettmaskin'],
    ['Billettmaskin og sanntidsskjerm'],
    ['Sjåførkort, sette i og ta ut'],
    ['Utkobling stoppsignal'],
    ['Førstehjelpsmappe, plassering'],
    ['Plassering av vognkort, løyve og skademelding'],
    ['LCD-skjermer for holdeplassinfo'],
  ]],
  ['Teknisk sikkerhetsutstyr innvendig', [
    ['Nød-vippebryter, plombert hovedstrømbryter', 'Brukes i nødstilfeller, f.eks. ved brann eller ulykker. Kutter strømmen og tømmer luft ut av dørene.'],
    ['Brannslukningsapparat, plassering og bruk'],
    ['Dørbrems / klemsikring'],
    ['Resetting av dører etter aktivert nødåpner'],
    ['Varseltrekant og refleksvest'],
    ['Rullestolrampe'],
    ['Feste/plassering av rullestoler'],
    ['Barnevogn- og sykkelstropper'],
    ['Barneseter og sikkerhetsseler'],
    ['Kjettinger, plassering'],
    ['Nødhammere'],
    ['Nødutganger, takluke og vinduer'],
  ]],
] as const

export type TechnicalTemplate = {
  id: string
  version: number
  title: string
  vehicleContext: string
  groups: { order: number; title: string; points: { id: string; text: string; note?: string }[] }[]
}

export const technicalTemplateV1: TechnicalTemplate = {
  id: 'grunnkurs-volvo-teknisk',
  version: 1,
  title: 'Teknisk opplæring Volvo busser',
  vehicleContext: 'Volvo · Klasse K1. BB, BN og Klasse 2. FN',
  groups: groups.map(([title, points], group) => ({
    order: group + 1,
    title,
    points: points.map(([text, note], point) => ({
      id: `T${group + 1}-${String(point + 1).padStart(2, '0')}`,
      text,
      ...(note && { note }),
    })),
  })),
}
