import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { testDriveHeaderValue, testDriveReceiptTime } from '../../content/test-drive-api.ts'
import type { TestDriveClosedDocument } from '../../content/test-drive-api.ts'
import { assertGlyphs, dateText, flowing, pdfFont } from './closure-document.tsx'

const margin = 36
const width = 595.28 - 2 * margin
const fontSize = 9.5
const styles = StyleSheet.create({
  page: { padding: margin, paddingTop: 91, paddingBottom: 42, fontFamily: pdfFont, color: '#333333', fontSize, lineHeight: 1.22 },
  header: { position: 'absolute', top: margin, left: margin, right: margin, borderTop: '2pt solid #2FDA95', paddingTop: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 26, height: 26, objectFit: 'contain' },
  title: { fontSize: 20, fontWeight: 700 },
  heading: { fontSize: 12, fontWeight: 700, marginBottom: 5 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  field: { width: '50%', paddingRight: 8, marginBottom: 4 },
  bold: { fontWeight: 700 },
  receipt: { marginBottom: 11, padding: 6, backgroundColor: '#F1E2CE' },
  markerNote: { marginBottom: 8 },
  matrixHeader: { flexDirection: 'row', backgroundColor: '#F1E2CE', fontWeight: 700, paddingVertical: 3 },
  matrixRow: { flexDirection: 'row', paddingVertical: 2, borderBottom: '0.5pt solid #E0D3C3' },
  criterion: { width: '49%', paddingHorizontal: 5 },
  answer: { width: '17%', paddingHorizontal: 4 },
  commentTitle: { fontWeight: 700, marginTop: 7, marginBottom: 3 },
  comment: { marginBottom: 7 },
  footer: { position: 'absolute', left: margin, right: margin, top: 813, fontSize: 8, flexDirection: 'row', justifyContent: 'space-between' },
})

function PageHeader({ logo, title }: { logo: string; title: string }) {
  return <View fixed style={styles.header}>
    <Image src={logo} style={styles.logo} />
    <Text style={styles.title}>{title}</Text>
  </View>
}

function PageFooter({ runId }: { runId: string }) {
  return <View fixed style={styles.footer}>
    <Text>Løpsreferanse {runId}</Text>
    <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages}`} />
  </View>
}

export function TestDriveDocument({ source, logo }: { source: TestDriveClosedDocument; logo: string }) {
  const { template, candidateAssessments: { before, after }, instructorAssessment } = source
  // Begge vektene av de medfølgende Noto Sans-fontene har samme tegnsett.
  const font = Font.getFont({ fontFamily: pdfFont, fontStyle: 'normal', fontWeight: 400 }).data!
  const missingGlyphs = new Set<number>()
  function pdfText(value: string) {
    return value.replace(/\r\n?|[\u2028\u2029]/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\p{Zs}{16,}/gu, ' ')
      .replace(/(?:\n\p{Zs}*){2,}\n/gu, '\n\n')
      .replace(/^[\p{Zs}\n]+|[\p{Zs}\n]+$/gu, '')
      .replace(/[^\x20-\x7E\n]/gu, character => {
        const code = character.codePointAt(0)!
        if (font.hasGlyphForCodePoint(code)) return character
        missingGlyphs.add(code)
        return `[U+${code.toString(16).toUpperCase().padStart(4, '0')}]`
      })
  }
  const title = pdfText(template.source.title)
  const fields = template.headerFields.flatMap(({ id, label }) => {
    const value = testDriveHeaderValue(source, id)
    return value ? [{ label: pdfText(label), value: pdfText(id === 'driveDate' ? dateText(value) : value) }] : []
  })
  const result = pdfText(template.resultChoices.find(choice => choice.id === instructorAssessment.result)?.label ?? '')
  const candidateName = pdfText(source.candidate.name)
  const instructorName = pdfText(source.instructor.name)
  const receipts = [
    { label: 'Førvurdering levert', name: candidateName, time: before.submittedAt },
    { label: 'Ettervurdering levert', name: candidateName, time: after.submittedAt },
    { label: 'Instruktørvurdering levert', name: instructorName, time: instructorAssessment.submittedAt },
    { label: 'Avsluttet', name: instructorName, time: source.closedAt },
  ]
  const rows = template.criteria.map(({ id, label }, index) => ({
    id,
    label: `${index + 1}. ${pdfText(label)}`,
    answers: [
      template.candidateChoices.find(choice => choice.id === before.answers[id])?.label ?? '',
      template.candidateChoices.find(choice => choice.id === after.answers[id])?.label ?? '',
      template.instructorChoices.find(choice => choice.id === instructorAssessment.answers[id])?.label ?? '',
    ].map(pdfText),
    comment: pdfText(instructorAssessment.comments[id] ?? ''),
  }))
  const comments: { id: string; label: string; comment: string }[] =
    rows.filter(row => row.comment).map(({ id, label, comment }) => ({ id, label, comment }))
  const overallComment = pdfText(instructorAssessment.overallComment)
  if (overallComment) {
    comments.push({ id: 'overall', label: 'Samlet kommentar', comment: overallComment })
  }
  assertGlyphs([
    title, result, ...fields.flatMap(({ label, value }) => [label, value]), ...receipts.map(({ name }) => name),
    ...rows.flatMap(({ label, answers, comment }) => [label, ...answers, comment]), overallComment,
  ])
  const closedAt = new Date(source.closedAt)
  return (
    <Document title={title} language="nb-NO" creationDate={closedAt} modificationDate={closedAt}>
      <Page size="A4" style={styles.page}>
        <PageHeader logo={logo} title={title} />
        <View style={styles.summary}>
          {fields.map(({ label, value }) => <View key={label} wrap={false} style={styles.field}>
            <Text style={styles.bold}>{label}</Text>
            <Text>{flowing(value, width / 2 - 12, fontSize)}</Text>
          </View>)}
        </View>
        <View style={styles.receipt} wrap={false}>
          <Text style={styles.heading}>Samlet resultat · {result}</Text>
          {receipts.map(({ label, name, time }) => (
            <Text key={label}>
              <Text style={styles.bold}>{label} · </Text>{flowing(name, width - 14, fontSize)} · {testDriveReceiptTime(time)}
            </Text>
          ))}
        </View>
        {missingGlyphs.size > 0 && <Text style={styles.markerNote}>[U+XXXX] er Unicode-koden til et tegn PDF-skriften ikke kan gjengi.</Text>}
        <View wrap={false}>
          <View style={styles.matrixHeader}>
            <Text style={styles.criterion}>Evalueringskriterium</Text>
            <Text style={styles.answer}>Kandidat før</Text>
            <Text style={styles.answer}>Kandidat etter</Text>
            <Text style={styles.answer}>Instruktør</Text>
          </View>
          {rows.map(({ id, label, answers }) => <View key={id} style={styles.matrixRow}>
            <Text style={styles.criterion}>{label}</Text>
            <Text style={styles.answer}>{answers[0]}</Text>
            <Text style={styles.answer}>{answers[1]}</Text>
            <Text style={styles.answer}>{answers[2]}</Text>
          </View>)}
        </View>
        <PageFooter runId={source.runId} />
      </Page>
      {comments.length > 0 && <Page size="A4" style={styles.page}>
        <PageHeader logo={logo} title={title} />
        <Text style={styles.heading}>Instruktørens kommentarer</Text>
        {comments.map(({ id, label, comment }) => <View key={id}>
          <Text style={styles.commentTitle} minPresenceAhead={26}>{label}</Text>
          <Text style={styles.comment} orphans={2} widows={2}>
            {flowing(comment, width - 2, fontSize)}
          </Text>
        </View>)}
        <PageFooter runId={source.runId} />
      </Page>}
    </Document>
  )
}
