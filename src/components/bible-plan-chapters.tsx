import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { chapterKey, type ChapterRef } from '@/lib/bible'
import type { CoopReadLog } from '@/lib/bible-coop'
import { cn } from '@/lib/utils'

interface BiblePlanChaptersProps {
  planChapters: ChapterRef[]
  readLogs: CoopReadLog[]
  todayChapterKeys?: Set<string>
  nextUpChapterKeys?: Set<string>
  onMarkRead?: (book: string, chapter: number) => void
  onUnmarkRead?: (logId: string) => void
  readOnly?: boolean
  disabled?: boolean
}

function groupChaptersByBook(chapters: ChapterRef[]): Map<string, ChapterRef[]> {
  const map = new Map<string, ChapterRef[]>()
  for (const ch of chapters) {
    const list = map.get(ch.book) ?? []
    list.push(ch)
    map.set(ch.book, list)
  }
  return map
}

export function BiblePlanChapters({
  planChapters,
  readLogs,
  todayChapterKeys = new Set(),
  nextUpChapterKeys = new Set(),
  onMarkRead,
  onUnmarkRead,
  readOnly = false,
  disabled = false,
}: BiblePlanChaptersProps) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())
  const completedKeys = new Set(
    readLogs.map((l) => chapterKey(l.chapterBook, l.chapterNumber)),
  )
  const logByChapter = new Map<string, CoopReadLog>()
  const sorted = [...readLogs].sort(
    (a, b) => new Date(b.readDate).getTime() - new Date(a.readDate).getTime(),
  )
  for (const log of sorted) {
    const key = chapterKey(log.chapterBook, log.chapterNumber)
    if (!logByChapter.has(key)) logByChapter.set(key, log)
  }

  const byBook = groupChaptersByBook(planChapters)
  const canEdit = !readOnly && onMarkRead && onUnmarkRead

  const toggleBook = (book: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book)
      else next.add(book)
      return next
    })
  }

  const handleChapterClick = (book: string, chapter: number) => {
    if (!canEdit || disabled) return
    const key = chapterKey(book, chapter)
    if (completedKeys.has(key)) {
      const log = logByChapter.get(key)
      if (log) onUnmarkRead(log.$id)
    } else {
      onMarkRead(book, chapter)
    }
  }

  return (
    <div className="space-y-1">
      {Array.from(byBook.entries()).map(([book, chapters]) => {
        const expanded = expandedBooks.has(book)
        const allRead = chapters.every((ch) =>
          completedKeys.has(chapterKey(ch.book, ch.chapter)),
        )
        return (
          <div key={book} className="rounded-md border">
            <button
              type="button"
              onClick={() => toggleBook(book)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors',
                'hover:bg-accent',
                allRead && 'bg-emerald-50 dark:bg-emerald-950/30',
              )}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              {allRead && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
              <span className={cn(allRead && 'text-emerald-700 dark:text-emerald-400')}>
                {book}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {chapters.filter((ch) => completedKeys.has(chapterKey(ch.book, ch.chapter))).length}/
                {chapters.length}
              </span>
            </button>
            {expanded && (
              <div className="border-t px-3 py-2 flex flex-wrap gap-2">
                {chapters.map((ch) => {
                  const key = chapterKey(ch.book, ch.chapter)
                  const isRead = completedKeys.has(key)
                  const isToday = todayChapterKeys.has(key)
                  const isNextUp = nextUpChapterKeys.has(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleChapterClick(ch.book, ch.chapter)}
                      disabled={!canEdit || disabled}
                      className={cn(
                        'min-w-[2.25rem] rounded px-2 py-1.5 text-sm font-medium transition-colors',
                        isRead
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-muted hover:bg-muted/80',
                        canEdit && !isRead && 'hover:ring-2 hover:ring-primary',
                        isToday && !isRead && 'ring-2 ring-blue-400',
                        isNextUp && !isRead && !isToday && 'ring-2 ring-amber-400/60',
                      )}
                    >
                      {ch.chapter}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
