export const testDriveHeaderFields = [
  { id: 'candidateName', label: 'Kandidatens navn' },
  { id: 'candidatePhone', label: 'Mobil' },
  { id: 'candidateEmail', label: 'Kandidatens e-post' },
  { id: 'instructorName', label: 'Instruktør' },
  { id: 'driveDate', label: 'Dato for testkjøring' },
  { id: 'department', label: 'Avdeling' },
  { id: 'bus', label: 'Buss' },
  { id: 'newDrivingLicense', label: 'Nytt førerkort' },
  { id: 'ysk', label: 'YSK' },
  { id: 'drivingLicense', label: 'Førerkort' },
  { id: 'drivingPermit', label: 'Kjøreseddel' },
  { id: 'heavyVehicleExperience', label: 'Erfaring med tunge kjøretøy' },
  { id: 'knowsArea', label: 'Kjent i området' },
] as const

export const testDriveOptionalFields = testDriveHeaderFields.filter(({ id }) =>
  id !== 'candidateName' && id !== 'candidateEmail' && id !== 'instructorName' && id !== 'department',
)

export type TestDriveHeaderField = typeof testDriveOptionalFields[number]['id']
export type TestDriveHeader = Partial<Record<TestDriveHeaderField, string>>

const candidateChoices = [
  { id: 'ok', label: 'OK' },
  { id: 'improve', label: 'Kan bli bedre' },
] as const

export const testDriveV1 = {
  version: 'test-drive-v1',
  source: { title: 'Evalueringsskjema for testkjøring', collection: 'Teamleders verktøykasse', year: 2018 },
  headerFields: testDriveHeaderFields,
  criteria: [
    { id: 'td-01', label: 'Punktlighet' },
    { id: 'td-02', label: 'Stress/nervøsitet' },
    { id: 'td-03', label: 'Selvinnsikt' },
    { id: 'td-04', label: 'Personlig fremtreden/hygiene' },
    { id: 'td-05', label: 'Språk' },
    { id: 'td-06', label: 'Oppstart og daglig kontroll av buss, utvendig og innvendig' },
    { id: 'td-07', label: 'Forberedelser til dagens kjøring (tilpasse speil og stol)' },
    { id: 'td-08', label: 'Teknisk forståelse og håndtering av bussen' },
    { id: 'td-09', label: 'Se-teknikk og VTL § 3' },
    { id: 'td-10', label: 'Risikovurdering og beslutningsevne' },
    { id: 'td-11', label: 'Kommentarkjøring (simultankapasitet)' },
    { id: 'td-12', label: 'Lover: Vikeplikt, forkjørsvei, farts- og veimerking' },
    { id: 'td-13', label: 'Planlegging, tegn, signal og plassering' },
    { id: 'td-14', label: 'Samhandling i rundkjøring og kryss' },
    { id: 'td-15', label: 'Fartstilpasning og avstand til forankjørende' },
    { id: 'td-16', label: 'Fartstilpasning i forhold til veistandard' },
    { id: 'td-17', label: 'Fart og plassering før, gjennom og etter sving' },
    { id: 'td-18', label: 'Rygging og parkering' },
    { id: 'td-19', label: 'God flyt i nedoverbakke (utrulling/retarder)' },
    { id: 'td-20', label: 'God flyt inn mot og ut fra bussholdeplass' },
    { id: 'td-21', label: 'God flyt over fartsdumper' },
    { id: 'td-22', label: 'Kjørekomfort' },
  ],
  candidateChoices,
  instructorChoices: [...candidateChoices, { id: 'fail', label: 'Ikke bestått' }],
  resultChoices: [
    { id: 'pass', label: 'Bestått' },
    { id: 'conditional', label: 'Med forbehold' },
    { id: 'no', label: 'Nei' },
  ],
  instructorComments: { perCriterion: true, overall: true },
} as const
