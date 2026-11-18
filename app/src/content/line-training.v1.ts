export type LineTemplateRow = { id: string; label: string; note?: string }
export type LineTemplate = { id: string; version: number; lines: LineTemplateRow[] }

const labels = [
  '20', '21', '22', 'X23', '24', '26', 'X27', '28', 'X29', '30', 'X31', 'X32', '33 (M1)',
  '34 (M2)', 'X35', 'X36', '40', '42', 'X43', 'X44', '413', '421', '425', '428', '450', '550',
]

// Kilde: den visuelt kontrollerte linjeoversikten på side 2 i grunnkursmalen.
export const lineTemplateV1: LineTemplate = {
  id: 'grunnkurs-linjeopplaering', version: 1,
  lines: labels.map((label, index) => ({
    id: `L${String(index + 1).padStart(2, '0')}`, label,
    ...(label === '30' && { note: 'Kjøres med leddbuss. Egen opplæring' }),
  })),
}
