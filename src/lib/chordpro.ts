const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const KEY_DIRECTIVES = new Set(['key', 'k'])

export interface ChordSegment {
  chord: string | null
  lyric: string
}

export interface ChordProDirective {
  name: string
  argument: string
  raw: string
}

export interface ParsedChordProLine {
  type: 'blank' | 'directive' | 'lyrics'
  raw: string
  directive?: ChordProDirective
  segments?: ChordSegment[]
}

export interface ParsedChordPro {
  lines: ParsedChordProLine[]
  title: string
  subtitle: string
  key: string
}

function normalizeIndex(index: number): number {
  const normalized = index % 12
  return normalized < 0 ? normalized + 12 : normalized
}

function extractRootAndSuffix(chord: string): { root: string; suffix: string } | null {
  const match = chord.trim().match(/^([A-G](?:#|b)?)(.*)$/)
  if (!match) {
    return null
  }
  return {
    root: match[1],
    suffix: match[2] || '',
  }
}

function transposeRoot(root: string, semitones: number, preferSharps: boolean): string {
  const index = NOTE_TO_INDEX[root]
  if (index === undefined) {
    return root
  }
  const nextIndex = normalizeIndex(index + semitones)
  return preferSharps ? SHARP_NOTES[nextIndex] : FLAT_NOTES[nextIndex]
}

export function transposeChordSymbol(chord: string, semitones: number, preferSharps = true): string {
  const trimmed = chord.trim()
  if (!trimmed || semitones === 0) {
    return chord
  }

  const [base, bass] = trimmed.split('/', 2)
  const baseParts = extractRootAndSuffix(base)
  if (!baseParts) {
    return chord
  }

  const transposedBase = `${transposeRoot(baseParts.root, semitones, preferSharps)}${baseParts.suffix}`

  if (!bass) {
    return transposedBase
  }

  const bassParts = extractRootAndSuffix(bass)
  if (!bassParts) {
    return transposedBase
  }

  return `${transposedBase}/${transposeRoot(bassParts.root, semitones, preferSharps)}${bassParts.suffix}`
}

export function parseChordLine(line: string): ChordSegment[] {
  if (!line.includes('[')) {
    return [{ chord: null, lyric: line }]
  }

  const segments: ChordSegment[] = []
  const regex = /\[([^\]]+)\]/g
  let currentIndex = 0
  let currentChord: string | null = null

  for (;;) {
    const match = regex.exec(line)
    if (!match) {
      break
    }

    if (match.index > currentIndex) {
      segments.push({
        chord: currentChord,
        lyric: line.slice(currentIndex, match.index),
      })
    }

    currentChord = match[1].trim()
    currentIndex = match.index + match[0].length
  }

  if (currentIndex < line.length || currentChord) {
    segments.push({
      chord: currentChord,
      lyric: line.slice(currentIndex),
    })
  }

  return segments.length === 0 ? [{ chord: null, lyric: line }] : segments
}

function displayChord(chord: string | null): string {
  if (!chord || chord === '.') {
    return chord === '.' ? '-' : ''
  }
  return chord
}

export function formatSegmentsAsMonospace(segments: ChordSegment[]): { chordLine: string; lyricLine: string } {
  let chordLine = ''
  let lyricLine = ''

  for (const segment of segments) {
    const lyric = segment.lyric || ''
    const chord = displayChord(segment.chord)
    const width = Math.max(lyric.length, chord.length, 1)
    const lyricPart = lyric.padEnd(width, ' ')
    const chordPart = chord.padEnd(width, ' ')

    chordLine += chordPart
    lyricLine += lyricPart
  }

  return { chordLine: chordLine.trimEnd(), lyricLine: lyricLine.trimEnd() }
}

export function parseDirective(line: string): ChordProDirective | null {
  const trimmed = line.trim()
  const match = trimmed.match(/^\{([^:\s}]+)(?:\s*:\s*(.*?))?\s*}$/)
  if (!match) {
    return null
  }

  return {
    name: match[1].toLowerCase(),
    argument: (match[2] || '').trim(),
    raw: line,
  }
}

export function parseChordPro(text: string): ParsedChordPro {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let title = ''
  let subtitle = ''
  let key = ''

  const parsedLines: ParsedChordProLine[] = lines.map((rawLine) => {
    if (!rawLine.trim()) {
      return {
        type: 'blank',
        raw: rawLine,
      }
    }

    const directive = parseDirective(rawLine)
    if (directive) {
      if ((directive.name === 'title' || directive.name === 't') && !title) {
        title = directive.argument
      }
      if ((directive.name === 'subtitle' || directive.name === 'st') && !subtitle) {
        subtitle = directive.argument
      }
      if (KEY_DIRECTIVES.has(directive.name) && !key) {
        key = directive.argument
      }

      return {
        type: 'directive',
        raw: rawLine,
        directive,
      }
    }

    return {
      type: 'lyrics',
      raw: rawLine,
      segments: parseChordLine(rawLine),
    }
  })

  return {
    lines: parsedLines,
    title,
    subtitle,
    key,
  }
}

export function inferPreferSharpsFromKey(key: string): boolean {
  const normalized = key.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return !normalized.includes('b')
}

export function transposeChordPro(text: string, semitones: number, preferSharps = true): string {
  const replaceChords = (raw: string, fn: (chord: string) => string) =>
    raw.replace(/\[([^\]]+)\]/g, (_, chord) => `[${fn(String(chord))}]`)

  const transposed = semitones === 0
    ? text
    : replaceChords(text, (chord) => transposeChordSymbol(chord, semitones, preferSharps))
        .replace(/^\{([^:\s}]+)\s*:\s*(.*?)\s*}$/gm, (_, name, argument) => {
          const directiveName = String(name).toLowerCase()
          if (!KEY_DIRECTIVES.has(directiveName)) {
            return `{${name}: ${argument}}`
          }
          const transposedKey = transposeChordSymbol(String(argument), semitones, preferSharps)
          return `{${name}: ${transposedKey}}`
        })

  return convertChordProToAccidentalStyle(transposed, preferSharps)
}

export function convertChordProToAccidentalStyle(text: string, preferSharps: boolean): string {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    const converted = convertChordSymbolToAccidentalStyle(String(chord), preferSharps)
    return `[${converted}]`
  }).replace(/^\{([^:\s}]+)\s*:\s*(.*?)\s*}$/gm, (_, name, argument) => {
    const directiveName = String(name).toLowerCase()
    if (!KEY_DIRECTIVES.has(directiveName)) {
      return `{${name}: ${argument}}`
    }
    const converted = convertChordSymbolToAccidentalStyle(String(argument), preferSharps)
    return `{${name}: ${converted}}`
  })
}

export function convertChordSymbolToAccidentalStyle(chord: string, preferSharps: boolean): string {
  const trimmed = chord.trim()
  if (!trimmed || trimmed === '.') {
    return chord
  }
  const [base, bass] = trimmed.split('/', 2)
  const baseParts = extractRootAndSuffix(base)
  if (!baseParts) {
    return chord
  }
  const index = NOTE_TO_INDEX[baseParts.root]
  if (index === undefined) {
    return chord
  }
  const convertedRoot = preferSharps ? SHARP_NOTES[index] : FLAT_NOTES[index]
  const convertedBase = `${convertedRoot}${baseParts.suffix}`

  if (!bass) {
    return convertedBase
  }
  const bassParts = extractRootAndSuffix(bass)
  if (!bassParts) {
    return convertedBase
  }
  const bassIndex = NOTE_TO_INDEX[bassParts.root]
  if (bassIndex === undefined) {
    return convertedBase
  }
  const convertedBass = preferSharps ? SHARP_NOTES[bassIndex] : FLAT_NOTES[bassIndex]
  return `${convertedBase}/${convertedBass}${bassParts.suffix}`
}
