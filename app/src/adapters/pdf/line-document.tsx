import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { LineTrainingSnapshot } from '../../domain/line-training.ts'
import { assertGlyphs, confirmationTime, dateText, flowing, pdfFont, textWidth } from './closure-document.tsx'

const margin = 36
const fontSize = 10
const width = 595.28 - 2 * margin - 16 - 4
const lineHeight = 14
const pageBodyHeight = 690
const blockPadding = 5
const blockExtra = 2 * blockPadding + 1
// Hver bokstav beholder egen Unicode-verdi i PDF-lesere som tolker ligaturtabeller ulikt.
const textFeatures = { liga: false, clig: false, dlig: false, hlig: false }
const styles = StyleSheet.create({
  page: { minHeight: 841.89, paddingHorizontal: margin, paddingTop: 94, fontFamily: pdfFont, fontSize, lineHeight: 1.25,
    color: '#333333', fontFeatureSettings: textFeatures },
  header: { position: 'absolute', top: 35, left: margin, right: margin, borderTop: '2pt solid #2FDA95', paddingTop: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontSize: 16, fontWeight: 700 },
  logo: { width: 23, height: 23, objectFit: 'contain' },
  block: { paddingHorizontal: 8, paddingVertical: blockPadding, borderBottom: '1pt solid #E0D3C3' },
  lineTitle: { backgroundColor: '#F1E2CE' },
  text: { height: lineHeight },
  footer: { position: 'absolute', left: margin, right: margin, top: 813, textAlign: 'right', fontSize: 8 },
})

type TextRow = { text: string; size: number; weight: 400 | 700 }
type Block = { rows: TextRow[]; heading?: boolean }

function textRows(text: string, size = fontSize, weight: TextRow['weight'] = 400): TextRow[] {
  return flowing(text, width - 2, size, weight).split(/\r\n|[\r\n]/).flatMap(paragraph => {
    const lines: string[] = []
    let line = ''
    for (const part of paragraph.split(/(\s+)/u)) {
      if (line.trim() && textWidth(line + part, size, weight, textFeatures) > width) {
        lines.push(line.trimEnd())
        line = part.trimStart()
      } else line += part
    }
    return [...lines, line.trimEnd()].map(text => ({ text, size, weight }))
  })
}

function height(rows: TextRow[]) {
  return rows.length * lineHeight + blockExtra
}

function composePages(source: LineTrainingSnapshot) {
  const { header, template, entries } = source
  const pages: Block[][] = [[]]
  let remaining = pageBodyHeight
  function addPage() {
    remaining = pageBodyHeight
    pages.push([])
  }
  function appendBlock(rows: TextRow[], heading = false, allowSplit = false) {
    let pending = rows
    // En vanlig rad flyttes samlet. Svært lange tekster deles kun mellom hele tekstlinjer.
    if (!allowSplit && height(rows) <= pageBodyHeight && height(rows) > remaining) addPage()
    while (pending.length) {
      const capacity = Math.floor((remaining - blockExtra) / lineHeight)
      if (capacity < 1) {
        addPage()
        continue
      }
      const rows = pending.slice(0, capacity)
      pages.at(-1)!.push({ rows, heading })
      remaining -= height(rows)
      pending = pending.slice(rows.length)
    }
  }

  appendBlock([
    ...textRows(`Kandidat · ${header.driverName}`),
    ...textRows(`Fiktivt ansattnummer · ${header.employeeNumber}`),
    ...textRows(`Bekreftet frem til ${confirmationTime(source.confirmedThrough)} (Europe/Oslo)`),
    ...textRows('Ubekreftede registreringer inngår ikke i denne filen.'),
    ...textRows(`Sjåførreferanse ${source.driverRef}`, 9),
    ...textRows(`Dokumentreferanse ${source.documentId} · Bekreftet revisjon ${source.confirmedRevision}`, 9),
    ...textRows(`Mal ${template.id} v${template.version} · Regler v${source.ruleVersion} · PDF v${source.pdfLayoutVersion}`, 9),
  ])

  for (const line of template.lines) {
    const dated = entries.filter(entry => entry.lineId === line.id).toSorted((a, b) => a.drivenDate.localeCompare(b.drivenDate))
    const heading = [
      ...textRows(`Linje ${line.label} · ${line.id}`, fontSize, 700),
      ...(line.note ? textRows(line.note, fontSize, 700) : []),
    ]
    const records = dated.map(entry => [
      ...textRows(`Linje ${line.label} · Kjøredato ${dateText(entry.drivenDate)} · ${entry.drivenDate}`, fontSize, 700),
      ...textRows(`Utfylt av ${entry.author.name} · Sjåfør`),
      ...textRows(`Bekreftet av ${entry.confirmation.actor.name} · Instruktør`),
      ...textRows(`Bekreftet ${confirmationTime(entry.confirmation.confirmedAt)} · Kildeversjon ${entry.confirmation.sourceVersion}`),
      ...textRows(`Registrering ${entry.entryId} · ${line.id}`, 9),
      ...textRows(`Utfyller-ID ${entry.author.id} · Instruktør-ID ${entry.confirmation.actor.id}`, 9),
      ...textRows(`Registrert ${confirmationTime(entry.recordedAt)} · Sist ført ${confirmationTime(entry.editedAt)}`, 9),
    ])
    if (!records.length) records.push(textRows('Ikke dokumentert i denne versjonen'))
    const openingHeight = height(heading) + height(records[0])
    if (remaining < Math.min(openingHeight, pageBodyHeight)) addPage()
    appendBlock(heading, true)
    for (const [index, rows] of records.entries()) appendBlock(rows, false, index === 0 && openingHeight > pageBodyHeight)
  }
  return pages
}

export function lineDocument({ source, logo }: { source: LineTrainingSnapshot; logo: string }) {
  const { header, template, entries } = source
  assertGlyphs([header.driverName, header.employeeNumber, ...template.lines.flatMap(line => [line.label, line.note ?? '']),
    ...entries.flatMap(entry => [entry.author.name, entry.confirmation.actor.name])])
  const pages = composePages(source)
  return (
    <Document title={`Bekreftet linjeopplæring – versjon ${source.sourceVersion}`} language="nb-NO">
      {pages.map((blocks, index) => (
        <Page key={index} size="A4" orientation="portrait" style={styles.page} wrap={false}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Image src={logo} style={styles.logo} />
              <Text style={styles.title}>Bekreftet linjeopplæring</Text>
            </View>
            <Text>Linjer og bekreftede kjøredatoer · Kildeversjon {source.sourceVersion}</Text>
          </View>
          {blocks.map((block, blockIndex) => <View key={blockIndex} style={[styles.block, ...(block.heading ? [styles.lineTitle] : [])]}>
            {block.rows.map(({ text, size, weight }, rowIndex) => <Text key={rowIndex}
              style={[styles.text, { fontSize: size, fontWeight: weight }]}>{text}</Text>)}
          </View>)}
          <Text style={styles.footer}>Side {index + 1} av {pages.length}</Text>
        </Page>
      ))}
    </Document>
  )
}
