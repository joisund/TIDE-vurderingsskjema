import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import { PdfRenderingError } from '../../application/run-pdf.ts'
import { answerLabels, conclusionLabels, evaluationLabels, followUpText } from '../../content/assessment-labels.ts'
import { groupedCriteria } from '../../content/criterion-groups.ts'
import type { AnswerValue } from '../../domain/baseline.ts'
import type { ClosureSnapshot } from '../../domain/closure.ts'
import { evaluationFields } from '../../domain/driver-day.ts'
import { currentPlan, dailyFollowUp } from '../../domain/follow-up.ts'
import { assessmentContext, criterionIds, professionalTerms, runDays } from '../../domain/run.ts'
import type { Confirmation, Day, Run } from '../../domain/run.ts'

export const pdfFont = 'Noto Sans'

const colors = {
  green: '#2FDA95', lightSand: '#F1E2CE', sand: '#E0D3C3', ink: '#333333', grid: '#9A9A9A',
}
const marks = {
  ok: { token: 'OK', fill: '#CDECCD' },
  needs_improvement: { token: 'KB', fill: '#FFF0A6' },
  not_relevant: { token: 'IR', fill: '#F6C0BF' },
} satisfies Record<AnswerValue, { token: string; fill: string }>

const margin = 28
const numberWidth = 21
const titleWidth = 235
const matrixWidth = 841.89 - 2 * margin
const grid = { borderColor: colors.grid, borderWidth: 0.5 }
const styles = StyleSheet.create({
  page: { fontFamily: pdfFont, color: colors.ink, padding: margin, paddingBottom: 39, fontSize: 9, lineHeight: 1.2 },
  header: { borderTop: `1.3pt solid ${colors.green}`, paddingTop: 8, marginBottom: 6 },
  logo: { width: 17, height: 17, objectFit: 'contain', marginBottom: 7 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 3 },
  summary: { backgroundColor: colors.lightSand, paddingVertical: 4, paddingHorizontal: 7, marginVertical: 5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { fontSize: 7, marginTop: 3, marginBottom: 5 },
  matrix: { ...grid, borderBottomWidth: 0, borderRightWidth: 0, fontSize: 7.4, lineHeight: 1.13 },
  matrixRow: { flexDirection: 'row', minHeight: 13.25 },
  cell: { borderRight: '0.5pt solid #9A9A9A', borderBottom: '0.5pt solid #9A9A9A', padding: 2.4, justifyContent: 'center' },
  groupCell: { backgroundColor: colors.lightSand, fontWeight: 700 },
  centered: { textAlign: 'center' },
  marker: { textAlign: 'center', fontWeight: 700 },
  footer: { position: 'absolute', left: margin, right: margin, fontSize: 7, flexDirection: 'row', justifyContent: 'space-between' },
  landscape: { minHeight: 595.28 },
  portrait: { paddingTop: 86, paddingBottom: 33, lineHeight: 1.12 },
  portraitContinuation: { paddingTop: 103 },
  detailHeader: { position: 'absolute', left: margin, right: margin, top: 19 },
  runningTitle: { fontSize: 10, fontWeight: 700 },
  section: { fontSize: 10.5, fontWeight: 700, backgroundColor: colors.lightSand, paddingHorizontal: 5, paddingVertical: 2.5, marginTop: 5, marginBottom: 2 },
  paragraph: { marginBottom: 1.5 },
  field: { marginBottom: 1.5, paddingBottom: 1, borderBottom: `0.5pt solid ${colors.sand}` },
  fieldLabel: { fontWeight: 700 },
  confirmations: { flexDirection: 'row', marginTop: 4, marginBottom: 5 },
  confirmation: { width: '31%', paddingRight: 8 },
  driverConfirmations: { width: '38%' },
  confirmText: { marginTop: 3, borderTop: `0.5pt solid ${colors.grid}`, paddingTop: 2, fontSize: 8.5 },
})

function dateText(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

const osloTime = new Intl.DateTimeFormat('nb-NO', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset',
})

function confirmationTime(iso: string) {
  return osloTime.format(new Date(iso))
}

// Lange ord får visuelle linjeskift uten bindestreker eller deling av grafemer.
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('nb', { granularity: 'grapheme' }) : undefined

function loadedFont(fontWeight: 400 | 700) {
  return Font.getFont({ fontFamily: pdfFont, fontWeight, fontStyle: 'normal' }).data!
}

function textWidth(text: string, fontSize: number, fontWeight: 400 | 700 = 400) {
  const font = loadedFont(fontWeight)
  return font.layout(text).advanceWidth * fontSize / font.unitsPerEm
}

function flowing(text: string, width = 530, fontSize = 9, fontWeight: 400 | 700 = 400) {
  return text.replace(/\S{15,}/gu, word => {
    const font = loadedFont(fontWeight)
    const limit = width * font.unitsPerEm / fontSize
    let lineWidth = 0
    let result = ''
    const segments = segmenter
      ? Array.from(segmenter.segment(word), ({ segment }) => segment)
      : word.match(/\P{M}\p{M}*|\p{M}+/gu) ?? []
    for (const segment of segments) {
      let segmentWidth = 0
      for (const character of segment) segmentWidth += font.glyphForCodePoint(character.codePointAt(0)!).advanceWidth
      if (lineWidth && lineWidth + segmentWidth > limit) {
        result += '\n'
        lineWidth = 0
      }
      result += segment
      lineWidth += segmentWidth
    }
    return result
  })
}

function assertGlyphs(texts: Iterable<string>) {
  const regular = loadedFont(400)
  const bold = loadedFont(700)
  const checked = new Set<number>()
  const missing = new Set<number>()
  for (const text of texts) {
    for (const character of text) {
      const code = character.codePointAt(0)!
      if (checked.has(code) || /^[\r\n\t]$/.test(character)) continue
      checked.add(code)
      if (!regular.hasGlyphForCodePoint(code) || !bold.hasGlyphForCodePoint(code)) missing.add(code)
    }
  }
  if (missing.size) {
    const codes = [...missing].slice(0, 6).map(code => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`)
    if (missing.size > codes.length) codes.push('…')
    throw new PdfRenderingError(`Dokumentet inneholder tegn som PDF-skriften ikke kan gjengi (${codes.join(', ')}). Historikken er bevart.`)
  }
}

function matrixGroups(source: ClosureSnapshot) {
  const ordered = source.history.content.criteria.toSorted((a, b) => criterionIds.indexOf(a.id) - criterionIds.indexOf(b.id))
  // To ekstra tekstlinjer passer i det reserverte området mellom matrisen og sidetallet.
  let remainingExtraLines = 2
  return groupedCriteria(ordered).map(({ name, rows }) => ({
    name,
    rows: rows.map(({ criterion, number }) => {
      const width = titleWidth - 8
      const lines = flowing(criterion.title, width, 7.4).split(/\r\n|[\r\n]/).flatMap(paragraph => {
        if (textWidth(paragraph, 7.4) <= width) return [paragraph]
        const wrapped: string[] = []
        let line = ''
        for (const part of paragraph.split(/(\s+)/)) {
          if (line.trim() && textWidth(line + part, 7.4) > width) {
            wrapped.push(line.trimEnd())
            line = part.trimStart()
          } else line += part
        }
        return [...wrapped, line]
      })
      remainingExtraLines -= lines.length - 1
      if (remainingExtraLines < 0 || lines.some(line => textWidth(line, 7.4) > width)) {
        throw new PdfRenderingError(`Den frosne teksten for vurderingspunkt ${number} får ikke plass i A4-matrisen.`)
      }
      return { id: criterion.id, number, title: lines.join('\n') }
    }),
  }))
}

function Footer({ landscape = false }: { landscape?: boolean }) {
  return (
    <View fixed style={[styles.footer, { top: landscape ? 571 : 817 }]}>
      <Text>Digital kjørevurdering · Fiktive data</Text>
      <Text render={({ pageNumber, totalPages }) => `Side ${pageNumber} av ${totalPages}`} />
    </View>
  )
}

function Header({ logo, title }: { logo: string; title: string }) {
  return (
    <View style={styles.header}>
      <Image style={styles.logo} src={logo} />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

function Matrix({ logo, source, days, groups }: {
  logo: string; source: ClosureSnapshot; days: Day[]; groups: ReturnType<typeof matrixGroups>
}) {
  const professional = professionalTerms(assessmentContext(source.history))
  const [first] = days
  const dateRange = days.length === 1 ? dateText(first.date) : `${dateText(first.date)}–${dateText(days.at(-1)!.date)}`
  const columnWidth = (matrixWidth - numberWidth - titleWidth - grid.borderWidth) / (1 + 2 * days.length)
  const answerSets = [source.history.baseline.answers, ...days.flatMap(day => [day.driverAfterAnswers!, day.mentorDay!.answers])]
    .map(answers => new Map(answers.map(answer => [answer.criterionId, answer.value!])))
  const name = first.driverIdentity!.name
  const employeeNumber = first.driverIdentity!.employeeNumber
  // Hele identiteten står i øktopplysningene også når den ikke får plass i matrisehodet.
  const identity = name.length + employeeNumber.length < 60 ? `Sjåfør · ${name} · Ansattnummer ${employeeNumber}` : 'Sjåfør og tilhørighet · Se øktopplysninger'
  return (
    <Page size="A4" orientation="landscape" wrap={false} style={[styles.page, styles.landscape]}>
      <Header logo={logo} title={`${professional.formTitle} – vurderinger og progresjon`} />
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text>{identity}</Text>
          <Text>Avsluttet periode · {dateRange}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Registrerte dager · {days.length} · Planlagt siste dag ved avslutning · Dag {currentPlan({ ...source.history, lifecycle: 'closed' }).lastDay}</Text>
          <Text>Konklusjon · {conclusionLabels[source.conclusion.status]}</Text>
        </View>
      </View>
      <Text style={styles.legend}>
        OK = OK · KB = Kan bli bedre · IR = Ikke relevant (begrunnet).
        Før, sjåfør etter og {professional.roleLower} er separate vurderinger. Se detaljsidene for begrunnelser og bekreftelser.
      </Text>
      <View style={styles.matrix}>
        <View style={[styles.matrixRow, styles.groupCell]}>
          <Text style={[styles.cell, { width: numberWidth }]}>Nr.</Text>
          <Text style={[styles.cell, { width: titleWidth }]}>Vurderingspunkt</Text>
          <Text style={[styles.cell, styles.centered, { width: columnWidth }]}>Før oppstart</Text>
          {days.map(day => <Text key={day.id} style={[styles.cell, styles.centered, { width: columnWidth * 2 }]}>
            Dag {day.number} · {dateText(day.date)}
          </Text>)}
        </View>
        <View style={[styles.matrixRow, styles.groupCell]}>
          <Text style={[styles.cell, { width: numberWidth + titleWidth }]} />
          <Text style={[styles.cell, styles.centered, { width: columnWidth }]}>Sjåfør før</Text>
          {days.flatMap(day => ['Sjåfør etter', professional.role].map(role =>
            <Text key={`${day.id}/${role}`} style={[styles.cell, styles.centered, { width: columnWidth }]}>{role}</Text>,
          ))}
        </View>
        {groups.map(({ name: group, rows }) => (
          <View key={group}>
            <Text style={[styles.cell, styles.groupCell]}>{group}</Text>
            {rows.map(({ id, number, title }) => (
              <View key={id} style={styles.matrixRow}>
                <Text style={[styles.cell, styles.centered, { width: numberWidth }]}>{String(number).padStart(2, '0')}</Text>
                <Text style={[styles.cell, { width: titleWidth }]}>{title}</Text>
                {answerSets.map((answers, index) => {
                  const mark = marks[answers.get(id)!]
                  return <View key={index} style={[styles.cell, { width: columnWidth, backgroundColor: mark.fill }]}>
                    <Text style={styles.marker}>{mark.token}</Text>
                  </View>
                })}
              </View>
            ))}
          </View>
        ))}
      </View>
      <Footer landscape />
    </Page>
  )
}

type DetailText = { label?: string; text: string; heading?: boolean; context?: string; reference?: string; attribution?: boolean }
type Detail = DetailText | { node: ReactNode }

function assessmentDetails(run: Run, day: Day): Detail[] {
  const assessments: Detail[] = []
  const after = new Map(day.driverAfterAnswers!.map(answer => [answer.criterionId, answer]))
  const mentor = new Map(day.mentorDay!.answers.map(answer => [answer.criterionId, answer]))
  const { comments, reviews, reasonDrafts, rejectionDrafts } = day.mentorDay!
  for (const criterion of run.content.criteria) {
    const { id, title } = criterion
    const context = `Dag ${day.number} · ${title}`
    const driverAnswer = after.get(id)!
    const mentorAnswer = mentor.get(id)!
    const { name: mentorName, role } = mentorAnswer.actor!
    const professional = professionalTerms(role)
    const driverName = day.driverConfirmation!.actor.name
    const review = reviews[id]
    const entries: DetailText[] = []
    if (driverAnswer.reason) entries.push({
      context, label: `Sjåførens etterbegrunnelse · ${driverName}${driverAnswer.locked ? ' · Videreført fra førvurderingen' : ''}`,
      text: driverAnswer.reason,
    })
    if (review) {
      const prior = review.answerRevision !== driverAnswer.answerRevision
      entries.push({
        context, label: prior ? 'Tidligere relevansavgjørelse' : 'Behandling av sjåførens relevans',
        text: `${review.decision === 'accepted' ? 'Bekreftet' : 'Avslått'} av ${review.actor.name}, ${review.actor.role}.${prior ? ' Gjaldt en tidligere versjon av sjåførens svar.' : ''}`,
      })
      if (review.rejectionComment) entries.push({ context, label: `${professionalTerms(review.actor.role).authorPrefix} avslagskommentar · ${review.actor.name}`, text: review.rejectionComment })
    }
    if (mentorAnswer.reason) entries.push({ context, label: `${professional.authorPrefix} egen begrunnelse · ${mentorName}`, text: mentorAnswer.reason })
    else if (mentorName !== day.mentorConfirmation!.actor.name) {
      entries.push({ context, label: `${professional.authorPrefix} svar · ${mentorName}`, text: answerLabels[mentorAnswer.value!] })
    }
    if (reasonDrafts[id]?.trim()) entries.push({ context, label: 'Lagret begrunnelsesutkast', text: reasonDrafts[id] })
    if (rejectionDrafts[id]?.trim()) entries.push({ context, label: 'Lagret avslagsutkast', text: rejectionDrafts[id] })
    if (comments[id]) entries.push({ context, label: `${professionalTerms(comments[id].actor.role).role}kommentar · ${comments[id].actor.name}`, text: comments[id].text })
    const reference = `Dag ${day.number} · Punkt ${criterionIds.indexOf(id) + 1}`
    assessments.push(...entries.map(entry => ({ ...entry, reference })))
  }
  return assessments
}

function evaluationDetails(day: Day): Detail[] {
  const evaluation = day.driverEvaluation!
  const fields = evaluationFields.filter(field => evaluation.texts[field])
  if (evaluation.state === 'not_offered' && !fields.length) return []
  const context = `Egenevaluering · Dag ${day.number} · ${day.driverConfirmation!.actor.name}`
  const state = { skipped: 'Hoppet over', submitted: 'Innsendt', not_offered: 'Tekst beholdt fra tidligere tilbud' }[evaluation.state]
  return [
    { text: context, heading: true },
    { reference: `Dag ${day.number}`, text: `${state} · Planversjon ${evaluation.planRevision}${evaluation.offerPlanRevision !== undefined && evaluation.offerPlanRevision !== evaluation.planRevision ? ` · Tilbud fra planversjon ${evaluation.offerPlanRevision}` : ''}` },
    ...fields.map(field => ({ context, reference: context, label: evaluationLabels[field], text: evaluation.texts[field]! })),
  ]
}

type ConfirmLine = { label: string; confirmation: Confirmation }

function Confirmations({ source, days }: { source: ClosureSnapshot; days: Day[] }) {
  const driver: ConfirmLine[] = [
    { label: 'Førvurdering bekreftet av', confirmation: source.history.baselineConfirmation },
    ...days.map(day => ({ label: `Dag ${day.number} · Ettervurdering bekreftet av`, confirmation: day.driverConfirmation! })),
  ]
  const { role } = professionalTerms(assessmentContext(source.history))
  const mentors = new Map<string, ConfirmLine[]>()
  for (const day of days) {
    const confirmation = day.mentorConfirmation!
    const { name } = confirmation.actor
    if (!mentors.has(name)) mentors.set(name, [])
    mentors.get(name)!.push({ label: `Dag ${day.number} · ${professionalTerms(assessmentContext(source.history)).role}ens del bekreftet av`, confirmation })
  }
  const [mainMentor, ...otherMentors] = mentors.values()
  return (
    <View style={styles.confirmations}>
      {[
        { role: 'Sjåfør', lines: driver }, { role, lines: otherMentors.flat() }, { role, lines: mainMentor },
      ].map(({ role, lines }, index) => (
        <View key={index} style={index === 0 ? [styles.confirmation, styles.driverConfirmations] : styles.confirmation}>
          {lines.length > 0 && <Text style={styles.fieldLabel}>{role}</Text>}
          {lines.map(({ label, confirmation }) => (
            <View key={label} wrap={confirmation.actor.name.length > 180} style={styles.confirmText}>
              <Text>{flowing(`${label} ${confirmation.actor.name} · ${confirmationTime(confirmation.confirmedAt)}`, 167, 8.5)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function detailContents(source: ClosureSnapshot, days: Day[]): Detail[] {
  const run = { ...source.history, lifecycle: 'closed' as const }
  const professional = professionalTerms(assessmentContext(run))
  const details: Detail[] = []
  const baselineName = source.history.baselineConfirmation.actor.name
  const before = new Map(source.history.baseline.answers.map(answer => [answer.criterionId, answer]))
  const beforeReasons = run.content.criteria.flatMap(({ id, title }) => {
    const reason = before.get(id)!.reason
    return reason ? [{ context: 'Førvurdering · Dag 1', label: `${title} · ${baselineName}, sjåfør`, text: reason }] : []
  })
  if (beforeReasons.length) details.push({ text: 'Førvurdering · Begrunnelser', heading: true }, ...beforeReasons)
  for (const day of days) {
    const { driverIdentity, session } = day
    const reference = `Dag ${day.number}`
    const context = `${reference} · ${dateText(day.date)}`
    details.push(
      { text: context, heading: true },
      { context, reference, text: `Sjåfør · ${driverIdentity!.name} · Ansattnummer ${driverIdentity!.employeeNumber} · ${professional.role} · ${day.mentorName}` },
      { context, reference, text: `Buss · ${[session!.bus1, session!.bus2].filter(Boolean).join(', ')} · Linjer · ${session!.routes} · Inn-tid ${session!.startTime} · Ut-tid ${session!.endTime}` },
      { reference, text: `Dagens oppfølging · ${followUpText(dailyFollowUp(run, day)?.choice, assessmentContext(run))}` },
      ...assessmentDetails(run, day), ...evaluationDetails(day),
    )
  }
  details.push(
    { text: 'Oppfølgingsplan', heading: true },
    { text: `Opprinnelig siste dag · Dag ${run.initialLastDay} · Planlagt siste dag ved avslutning · Dag ${currentPlan(run).lastDay}` },
  )
  if (run.planHistoryBase) details.push({ text: `Tidligere lagret plan · Dag ${run.planHistoryBase.lastDay} · Planversjon ${run.planHistoryBase.revision}` })
  for (const event of run.planEvents ?? []) {
    const label = `Dag ${event.dayNumber} · ${dateText(event.date)} · ${event.actor.name}, ${event.actor.role}`
    const planChange = event.oldLastDay === event.newLastDay
      ? `Planlagt siste dag uendret · Dag ${event.newLastDay}`
      : `Planlagt siste dag fra dag ${event.oldLastDay} til dag ${event.newLastDay}`
    details.push({ label, context: 'Oppfølgingsplan', text: `${event.source === 'extension' ? 'Senere utvidelse · ' : ''}${followUpText(event.choice, event.actor.role)} · ${planChange} · Planversjon ${event.planRevision}` })
  }
  details.push({ text: 'Konklusjon', heading: true })
  if (source.conclusion.text) details.push({ context: 'Konklusjon', label: `${professional.role} · ${source.closedBy.actor.name}`, text: source.conclusion.text })
  details.push(
    { context: 'Konklusjon', text: `${conclusionLabels[source.conclusion.status]} · Avsluttet av ${source.closedBy.actor.name}, ${source.closedBy.actor.role} · ${confirmationTime(source.closedBy.confirmedAt)}` },
    { text: 'Bekreftelser – låste registreringer', heading: true },
    { node: <Confirmations source={source} days={days} /> },
    { text: 'Sjåførens bekreftelser gjelder egne vurderinger og eventuell egenevaluering.' },
  )
  return details
}

function DetailBlock({ detail }: { detail: Detail }) {
  if ('node' in detail) return detail.node
  if (detail.heading) return <Text minPresenceAhead={18} style={styles.section}>{flowing(detail.text, 520, 10.5, 700)}</Text>
  if (detail.attribution) {
    return <Text minPresenceAhead={14} style={[styles.paragraph, styles.fieldLabel]}>{flowing(detail.text, 530, 9, 700)}</Text>
  }
  const label = [detail.reference, detail.label].filter(Boolean).join(' · ')
  if (!detail.label) {
    return <Text wrap={!detail.reference} style={styles.paragraph}>
      {flowing(label ? `${label} · ${detail.text}` : detail.text)}
    </Text>
  }
  if (detail.text.length < 180 && !detail.text.includes('\n')) {
    return (
      <Text wrap={false} style={styles.field}>
        <Text style={styles.fieldLabel}>{flowing(label, 530, 9, 700)}</Text>
        {detail.text && ` · ${flowing(detail.text)}`}
      </Text>
    )
  }
  return (
    <View wrap={false} style={styles.field}>
      <Text style={styles.fieldLabel}>{flowing(label, 530, 9, 700)}</Text>
      {detail.text && <Text orphans={2} widows={2}>{flowing(detail.text)}</Text>}
    </View>
  )
}

type DetailPage = { runningTitle?: string; details: Detail[] }

function detailPages(details: Detail[]): DetailPage[] {
  const pages: DetailPage[] = []
  let pending: Detail[] = []
  for (const [index, detail] of details.entries()) {
    const text = 'text' in detail ? [detail.reference, detail.label, detail.text].filter(Boolean).join(' · ') : ''
    if ('text' in detail && (text.length > 900 || text.split(/\r\n|[\r\n]/).length > 12) && detail.context) {
      const previous = pending.at(-1)
      if (previous && 'text' in previous && previous.heading && previous.text === detail.context) pending.pop()
      if (pending.length) pages.push({ details: pending })
      const attribution = [detail.context, detail.label].filter(Boolean).join(' · ')
      const fitsHeader = (value: string) => !/[\r\n]/.test(value) && textWidth(value, 10, 700) <= 520
      if (fitsHeader(attribution)) {
        pages.push({ runningTitle: attribution, details: [{ text: detail.text }] })
      } else {
        // For lang avsenderlinje hører til i teksten som kan brytes over sider.
        const role = detail.label?.split(' · ', 1)[0]
        const reference = [detail.reference ?? detail.context, role].filter(Boolean).join(' · ')
        const entry = `Oppføring ${index + 1}`
        const runningTitle = fitsHeader(`${reference} · ${entry}`) ? `${reference} · ${entry}` : entry
        pages.push({ runningTitle, details: [{ text: attribution, attribution: true }, { text: detail.text }] })
      }
      pending = []
    } else {
      pending.push(detail)
    }
  }
  if (pending.length) pages.push({ details: pending })
  return pages
}

export function closureDocument({ logo, source }: { logo: string; source: ClosureSnapshot }) {
  const days = runDays(source.history)
  const documentTitle = professionalTerms(assessmentContext(source.history)).formTitle
  const details = detailContents(source, days)
  assertGlyphs([
    ...source.history.content.criteria.map(criterion => criterion.title),
    ...details.flatMap(detail => 'text' in detail ? [detail.text, detail.label ?? '', detail.context ?? '', detail.reference ?? ''] : []),
    source.history.baselineConfirmation.actor.name,
    ...days.flatMap(day => [day.driverConfirmation!.actor.name, day.mentorConfirmation!.actor.name]),
  ])
  const groups = matrixGroups(source)
  const pages = detailPages(details)
  return (
    <Document title={`${documentTitle} – digital kjørevurdering`} language="nb-NO">
      <Matrix logo={logo} source={source} days={days} groups={groups} />
      {pages.map(({ runningTitle, details }, index) => (
        <Page key={index} size="A4" style={runningTitle
          ? [styles.page, styles.portrait, styles.portraitContinuation]
          : [styles.page, styles.portrait]}>
          <View fixed style={styles.detailHeader}>
            <Header logo={logo} title="Øktopplysninger, kommentarer og bekreftelser" />
            {runningTitle && <Text style={styles.runningTitle}>{flowing(runningTitle, 530, 10, 700)}</Text>}
          </View>
          {details.map((detail, blockIndex) => <DetailBlock key={blockIndex} detail={detail} />)}
          <Footer />
        </Page>
      ))}
    </Document>
  )
}
