export interface BibleBook {
  name: string
  chapters: number
}

export interface ChapterRef {
  book: string
  chapter: number
  canonicalIndex: number
}

export interface PlannedDay {
  dayNumber: number
  date: string
  chapters: ChapterRef[]
}

export const BIBLE_BOOKS: BibleBook[] = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
]

function getBookByName(name: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((book) => book.name === name)
}

function getBookStartCanonicalIndex(bookName: string): number {
  let index = 1

  for (const book of BIBLE_BOOKS) {
    if (book.name === bookName) {
      return index
    }
    index += book.chapters
  }

  throw new Error(`Unknown Bible book: ${bookName}`)
}

function normalizeDate(date: string): Date {
  // Keep date math stable across environments by anchoring to UTC midnight.
  return new Date(`${date}T00:00:00.000Z`)
}

function addDays(date: string, days: number): string {
  const result = normalizeDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

export function chapterKey(book: string, chapter: number): string {
  return `${book}:${chapter}`
}

export function chapterLabel(chapter: ChapterRef): string {
  return `${chapter.book} ${chapter.chapter}`
}

export function validateChapter(bookName: string, chapter: number): void {
  const book = getBookByName(bookName)
  if (!book) {
    throw new Error(`Unknown Bible book: ${bookName}`)
  }

  if (chapter < 1 || chapter > book.chapters) {
    throw new Error(`Invalid chapter for ${bookName}. Must be 1-${book.chapters}.`)
  }
}

export function buildChapterRange(
  startBook: string,
  startChapter: number,
  endBook: string,
  endChapter: number,
): ChapterRef[] {
  validateChapter(startBook, startChapter)
  validateChapter(endBook, endChapter)

  const startBookIndex = BIBLE_BOOKS.findIndex((book) => book.name === startBook)
  const endBookIndex = BIBLE_BOOKS.findIndex((book) => book.name === endBook)

  if (startBookIndex === -1 || endBookIndex === -1) {
    throw new Error('Invalid book selection.')
  }

  if (endBookIndex < startBookIndex) {
    throw new Error('End book must come after start book.')
  }

  if (startBookIndex === endBookIndex && endChapter < startChapter) {
    throw new Error('End chapter must come after start chapter when using the same book.')
  }

  const chapters: ChapterRef[] = []
  let canonicalIndex = getBookStartCanonicalIndex(startBook) + (startChapter - 1)

  for (let bookIndex = startBookIndex; bookIndex <= endBookIndex; bookIndex += 1) {
    const currentBook = BIBLE_BOOKS[bookIndex]
    const firstChapter = bookIndex === startBookIndex ? startChapter : 1
    const lastChapter = bookIndex === endBookIndex ? endChapter : currentBook.chapters

    for (let chapter = firstChapter; chapter <= lastChapter; chapter += 1) {
      chapters.push({
        book: currentBook.name,
        chapter,
        canonicalIndex,
      })
      canonicalIndex += 1
    }
  }

  return chapters
}

export function distributeChaptersAcrossDays(
  chapters: ChapterRef[],
  totalDays: number,
  startDate: string,
): PlannedDay[] {
  const days = Math.max(1, totalDays)
  const plan: PlannedDay[] = []

  let cursor = 0
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const remainingChapters = chapters.length - cursor
    const remainingDays = days - dayIndex
    const chapterCountForDay = remainingChapters > 0 ? Math.ceil(remainingChapters / remainingDays) : 0
    const dayChapters = chapters.slice(cursor, cursor + chapterCountForDay)
    cursor += chapterCountForDay

    plan.push({
      dayNumber: dayIndex + 1,
      date: addDays(startDate, dayIndex),
      chapters: dayChapters,
    })
  }

  return plan
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = normalizeDate(startDate).getTime()
  const end = normalizeDate(endDate).getTime()
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((end - start) / millisecondsPerDay)
}
