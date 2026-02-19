import { jsPDF } from 'jspdf'
import { formatSegmentsAsMonospace, parseChordPro } from '@/lib/chordpro'

export interface ChordProPdfOptions {
  songTitle?: string
  transposeLabel?: string
  textSize?: 'small' | 'medium' | 'large'
  columns?: 1 | 2
  includeMetadata?: boolean
  originalKey?: string
  keyOverride?: string
}

function splitTextLine(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text.trim()) {
    return ['']
  }
  return doc.splitTextToSize(text, maxWidth) as string[]
}

interface LayoutBlock {
  type: 'blank' | 'section' | 'lyrics'
  height: number
  chordLine?: string
  lyricLine?: string
  wrappedChords?: string[]
  wrappedLyrics?: string[]
  sectionLabel?: string
}

export function exportChordProToPdf(content: string, options: ChordProPdfOptions = {}): void {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  })

  const parsed = parseChordPro(content)
  const marginX = 40
  const marginTop = 50
  const footerHeight = 24
  const marginBottom = 40 + footerHeight
  const columnGap = 24
  const columnCount = Number(options.columns) === 2 ? 2 : 1
  const includeMetadata = options.includeMetadata ?? true
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usableWidth = pageWidth - marginX * 2
  const contentWidth = (usableWidth - columnGap * (columnCount - 1)) / columnCount

  const textSize = options.textSize || 'medium'
  const bodyFontSize = textSize === 'small' ? 9 : textSize === 'large' ? 12 : 10
  const chordFontSize = bodyFontSize
  const lineHeight = Math.round(bodyFontSize * 1.2)
  const chordLineHeight = Math.max(10, lineHeight - 1)
  const sectionFontSize = Math.max(10, bodyFontSize)
  const metaFontSize = Math.max(9, bodyFontSize - 1)
  const titleFontSize = bodyFontSize + 8

  const title = options.songTitle?.trim() || parsed.title || 'ChordPro Song'

  // ---- Pass 1: Build blocks with heights ----
  const blocks: LayoutBlock[] = []
  for (const line of parsed.lines) {
    if (line.type === 'blank') {
      blocks.push({ type: 'blank', height: Math.max(8, lineHeight - 2) })
      continue
    }
    if (line.type === 'directive') {
      const directiveName = line.directive?.name || ''
      if (directiveName.startsWith('start_of_') || directiveName === 'chorus') {
        const rawLabel = line.directive?.argument || directiveName.replace(/^start_of_/, '').replaceAll('_', ' ')
        const label = rawLabel.trim()
        if (label) {
          blocks.push({
            type: 'section',
            height: sectionFontSize + 5,
            sectionLabel: label,
          })
        }
      }
      continue
    }
    if (!line.segments) continue

    const { chordLine, lyricLine } = formatSegmentsAsMonospace(line.segments)
    const wrappedChords = chordLine ? splitTextLine(doc, chordLine, contentWidth) : []
    const wrappedLyrics = splitTextLine(doc, lyricLine, contentWidth)
    const maxLines = Math.max(wrappedChords.length, wrappedLyrics.length)
    const height = maxLines * (chordLineHeight + lineHeight) + 2
    blocks.push({
      type: 'lyrics',
      height,
      chordLine,
      lyricLine,
      wrappedChords,
      wrappedLyrics,
    })
  }

  // ---- Pass 2: Assign blocks to (page, column, y) ----
  let contentStartY = marginTop
  if (includeMetadata) {
    contentStartY += titleFontSize + 4
    if (parsed.subtitle) contentStartY += metaFontSize + 5
    contentStartY += metaFontSize + 10
  }
  const assignments: { block: LayoutBlock; page: number; column: number; y: number }[] = []

  let page = 1
  let column = 0
  let y = contentStartY

  for (const block of blocks) {
    while (true) {
      const fitsInColumn = y + block.height <= pageHeight - marginBottom
      if (fitsInColumn) {
        assignments.push({ block, page, column, y })
        y += block.height
        break
      }
      if (column < columnCount - 1) {
        column += 1
        y = contentStartY
        continue
      }
      page += 1
      column = 0
      y = contentStartY
    }
  }

  // ---- Pass 3: Render ----
  const getColumnX = (col: number) => marginX + col * (contentWidth + columnGap)

  let currentPage = 0
  for (const { block, page, column, y } of assignments) {
    if (page > currentPage) {
      if (currentPage > 0) doc.addPage()
      currentPage = page
      if (page === 1 && includeMetadata) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(titleFontSize)
        doc.text(title, marginX, marginTop)
        let cy = marginTop + titleFontSize + 4
        if (parsed.subtitle) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(metaFontSize)
          doc.text(parsed.subtitle, marginX, cy)
          cy += metaFontSize + 5
        }
        if (parsed.key || options.keyOverride || options.originalKey || options.transposeLabel) {
          const originalKeyLabel = options.originalKey ? `Original key: ${options.originalKey}` : ''
          const keyLabel = options.keyOverride ? `Key: ${options.keyOverride}` : parsed.key ? `Key: ${parsed.key}` : ''
          const transposeLabel = options.transposeLabel ? `Transpose: ${options.transposeLabel}` : ''
          const labels = [originalKeyLabel, keyLabel, transposeLabel].filter(Boolean).join('    ')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(metaFontSize)
          doc.text(labels, marginX, cy)
        }
      }
    }

    doc.setPage(page)
    const x = getColumnX(column)

    if (block.type === 'blank') {
      continue
    }
    if (block.type === 'section' && block.sectionLabel) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(sectionFontSize)
      doc.text(block.sectionLabel, x, y + sectionFontSize)
      continue
    }
    if (block.type === 'lyrics' && block.wrappedChords != null && block.wrappedLyrics != null) {
      const maxLines = Math.max(block.wrappedChords.length, block.wrappedLyrics.length)
      let cy = y
      for (let i = 0; i < maxLines; i++) {
        const chordRow = block.wrappedChords[i] ?? ''
        const lyricRow = block.wrappedLyrics[i] ?? ''
        if (chordRow) {
          doc.setFont('courier', 'bold')
          doc.setFontSize(chordFontSize)
          doc.text(chordRow, x, cy)
          cy += chordLineHeight
        }
        doc.setFont('courier', 'normal')
        doc.setFontSize(bodyFontSize)
        doc.text(lyricRow || ' ', x, cy)
        cy += lineHeight
      }
    }
  }

  const totalPages = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const pageNumText = `${p} of ${totalPages}`
    const textWidth = doc.getTextWidth(pageNumText)
    doc.text(pageNumText, (pageWidth - textWidth) / 2, pageHeight - footerHeight / 2)
  }

  const filenameBase = title.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'chordpro-song'
  doc.save(`${filenameBase}.pdf`)
}
