import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { technicalFieldLabels, technicalHeaderFields, technicalStatusText } from '../../domain/technical-training.ts'
import type { TechnicalSnapshot } from '../../domain/technical-training.ts'
import { assertGlyphs, confirmationTime, dateText, flowing, pdfFont } from './closure-document.tsx'

const margin = 36
const width = 595.28 - 2 * margin
const fontSize = 10
const styles = StyleSheet.create({
  page: { padding: margin, paddingTop: 111, paddingBottom: 42, fontFamily: pdfFont, color: '#333333', fontSize, lineHeight: 1.25 },
  cover: { paddingTop: margin },
  header: { position: 'absolute', top: margin, left: margin, right: margin },
  logo: { width: 26, height: 26, objectFit: 'contain' },
  coverTitle: { fontSize: 20, lineHeight: 1.3, fontWeight: 700, marginTop: 11, marginBottom: 8 },
  titleLine: { borderTop: '2pt solid #2FDA95', paddingTop: 8 },
  columnHeaders: { flexDirection: 'row', paddingHorizontal: 5, paddingVertical: 4, backgroundColor: '#F1E2CE', fontWeight: 700 },
  groupTitle: { fontSize: 12, fontWeight: 700, marginTop: 3, marginBottom: 5 },
  key: { fontWeight: 700 },
  fullText: { marginBottom: 5 },
  record: { marginTop: 14, padding: 8, backgroundColor: '#F1E2CE' },
  confirmation: { marginTop: 18, paddingTop: 8, borderTop: '0.5pt solid #9A9A9A' },
  point: { paddingHorizontal: 5, paddingVertical: 5, borderBottom: '0.5pt solid #E0D3C3' },
  row: { flexDirection: 'row' },
  pointName: { width: '65%', paddingRight: 9, fontWeight: 700 },
  pointStatus: { width: '35%' },
  note: { marginTop: 2 },
  reason: { marginTop: 4 },
  footer: { position: 'absolute', left: margin, right: margin, top: 814, fontSize: 8, textAlign: 'right' },
})

function PageNumber() {
  return <View fixed style={styles.footer}>
    <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages}`} />
  </View>
}

export function technicalDocument({ source, logo }: { source: TechnicalSnapshot; logo: string }) {
  const { header, template, confirmation, filledBy } = source
  const pointStatus = new Map(source.points.map(point => [point.id, point]))
  const summary = technicalHeaderFields.map(field => [technicalFieldLabels[field],
    field === 'trainingDate' ? dateText(header[field]) : header[field]] as const)
  const confirmedBy = `Teknisk opplæring bekreftet av ${confirmation.actor.name}`
  const confirmedAt = `Instruktør · ${confirmationTime(confirmation.confirmedAt)}`
  const filled = `Utfylt av ${filledBy.name} · Sjåfør`
  assertGlyphs([
    template.title, template.vehicleContext, ...Object.values(header), confirmedBy, confirmedAt, filled,
    ...template.groups.flatMap(group => [group.title, ...group.points.flatMap(point => [point.text, point.note ?? ''])]),
    ...source.points.map(point => point.reason ?? ''),
  ])
  return (
    <Document title={template.title} language="nb-NO">
      <Page size="A4" orientation="portrait" style={[styles.page, styles.cover]}>
        <View style={styles.titleLine}><Image src={logo} style={styles.logo} /></View>
        <Text style={styles.coverTitle}>{template.title}</Text>
        <Text>{template.vehicleContext}</Text>
        <View style={styles.record}>
          {summary.map(([key, value]) => (
            <Text key={key} style={styles.fullText}>
              <Text style={styles.key}>{key} · </Text>{flowing(value, width - 20, fontSize)}
            </Text>
          ))}
          <Text style={styles.fullText}>{flowing(filled, width - 20, fontSize)}</Text>
        </View>
        <View style={styles.confirmation}>
          <Text style={styles.key}>{flowing(confirmedBy, width - 4, fontSize, 700)}</Text>
          <Text>{confirmedAt}</Text>
        </View>
        <PageNumber />
      </Page>
      {template.groups.map(group => (
        <Page key={group.order} size="A4" orientation="portrait" style={styles.page}>
          <View fixed style={styles.header}>
            <Text style={styles.titleLine}>{template.title}</Text>
            <Text style={styles.groupTitle}>{group.order}. {group.title}</Text>
            <View style={styles.columnHeaders}>
              <Text style={styles.pointName}>Punkt og merknad</Text>
              <Text style={styles.pointStatus}>Status</Text>
            </View>
          </View>
          {group.points.map(point => {
            const row = pointStatus.get(point.id)!
            return (
              <View key={point.id} style={styles.point}>
                <View wrap={false} minPresenceAhead={row.reason ? 23 : 0}>
                  <View style={styles.row}>
                    <Text style={styles.pointName}>{point.id} {point.text}</Text>
                    <Text style={styles.pointStatus}>{technicalStatusText[row.status]}</Text>
                  </View>
                  {point.note && <Text style={styles.note}>{point.note}</Text>}
                </View>
                {row.status === 'not_applicable' && row.reason && <Text style={styles.reason} orphans={1} widows={1}>
                  <Text style={styles.key}>Begrunnelse · </Text>{flowing(row.reason, width - 14, fontSize)}
                </Text>}
              </View>
            )
          })}
          <PageNumber />
        </Page>
      ))}
    </Document>
  )
}
