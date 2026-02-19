import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoute, redirect, useSearch, useNavigate } from '@tanstack/react-router'
import { rootRoute } from '@/routes/__root'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  addMemberToPlan,
  buildMemberCompletionMap,
  buildPlanViewModel,
  createCoopPlan,
  createReadLog,
  deletePlan,
  deleteReadLog,
  getPlanById,
  getPlanInvites,
  getPlanMembers,
  getPlanReadLogs,
  getPlansForUser,
  inviteMemberToPlan,
  removeInvite,
  type CoopInvite,
  type CoopMember,
  type CoopPlan,
  type CoopReadLog,
} from '@/lib/bible-coop'
import { BIBLE_BOOKS, chapterKey, chapterLabel, validateChapter, type PlannedDay } from '@/lib/bible'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BiblePlanChapters } from '@/components/bible-plan-chapters'
import { CheckCircle, TrendingUp, AlertCircle, ChevronDown, Plus, UserPlus, Copy, X, Trash2, ArrowLeft } from 'lucide-react'

const todayDate = new Date().toISOString().slice(0, 10)

export const bibleCoopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/bible-coop',
  validateSearch: (search: Record<string, unknown>): { join?: string } => ({
    join: typeof search.join === 'string' ? search.join : undefined,
  }),
  beforeLoad: async () => {
    try {
      const { account } = await import('@/lib/appwrite')
      await account.get()
    } catch {
      throw redirect({
        to: '/auth/login',
        search: { redirect: '/projects/bible-coop' },
      })
    }
  },
  component: BibleCoopPage,
})

function formatDayPreview(day: PlannedDay): string {
  if (day.chapters.length === 0) {
    return 'Rest / catch-up'
  }

  if (day.chapters.length <= 3) {
    return day.chapters.map((chapter) => chapterLabel(chapter)).join(', ')
  }

  const first = day.chapters[0]
  const last = day.chapters[day.chapters.length - 1]
  return `${chapterLabel(first)} - ${chapterLabel(last)}`
}

function BibleCoopPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { join: joinPlanId } = useSearch({ from: '/projects/bible-coop' })
  const [plans, setPlans] = useState<CoopPlan[]>([])
  const [members, setMembers] = useState<CoopMember[]>([])
  const [readLogs, setReadLogs] = useState<CoopReadLog[]>([])
  const [invites, setInvites] = useState<CoopInvite[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false)
  const [submittingPlan, setSubmittingPlan] = useState(false)
  const [submittingLog, setSubmittingLog] = useState(false)
  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [submittingJoin, setSubmittingJoin] = useState(false)
  const [submittingDelete, setSubmittingDelete] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(todayDate)
  const [totalDays, setTotalDays] = useState(30)
  const [startBook, setStartBook] = useState(BIBLE_BOOKS[0].name)
  const [startChapter, setStartChapter] = useState(1)
  const [endBook, setEndBook] = useState('John')
  const [endChapter, setEndChapter] = useState(21)

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.$id === selectedPlanId) || null,
    [plans, selectedPlanId],
  )

  const planView = useMemo(() => {
    if (!selectedPlan || !user) {
      return null
    }
    return buildPlanViewModel(selectedPlan, readLogs, user.$id)
  }, [selectedPlan, readLogs, user])

  const memberCompletion = useMemo(() => {
    if (!planView) {
      return {}
    }
    return buildMemberCompletionMap(planView.allChapters, members, readLogs)
  }, [planView, members, readLogs])

  const userCompletedChapters = useMemo(() => {
    if (!user) {
      return new Set<string>()
    }
    return new Set(
      readLogs
        .filter((log) => log.userId === user.$id)
        .map((log) => chapterKey(log.chapterBook, log.chapterNumber)),
    )
  }, [readLogs, user])

  const nextChaptersToRead = useMemo(() => {
    if (!planView) return []
    return planView.allChapters
      .filter((ch) => !userCompletedChapters.has(chapterKey(ch.book, ch.chapter)))
  }, [planView, userCompletedChapters])

  const loadPlans = useCallback(async () => {
    if (!user) {
      return
    }

    setLoadingPlans(true)
    try {
      const results = await getPlansForUser(user.$id)
      setPlans(results)
      if (!selectedPlanId && results.length > 0) {
        setSelectedPlanId(results[0].$id)
      }
      if (results.length === 0) {
        setSelectedPlanId('')
      }
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load plans. Please verify Appwrite collections and permissions.'
      toast.error(message)
    } finally {
      setLoadingPlans(false)
    }
  }, [user, selectedPlanId])

  const loadSelectedPlanDetails = useCallback(async () => {
    if (!selectedPlanId) {
      setMembers([])
      setReadLogs([])
      setInvites([])
      return
    }

    setLoadingPlanDetails(true)
    try {
      const [fetchedMembers, fetchedLogs, fetchedInvites] = await Promise.all([
        getPlanMembers(selectedPlanId),
        getPlanReadLogs(selectedPlanId),
        getPlanInvites(selectedPlanId).catch(() => []),
      ])
      setMembers(fetchedMembers)
      setReadLogs(fetchedLogs)
      setInvites(fetchedInvites)
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load plan details.'
      toast.error(message)
    } finally {
      setLoadingPlanDetails(false)
    }
  }, [selectedPlanId])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    void loadSelectedPlanDetails()
  }, [loadSelectedPlanDetails])

  useEffect(() => {
    if (joinPlanId && plans.length > 0) {
      const plan = plans.find((p) => p.$id === joinPlanId)
      if (plan) {
        setSelectedPlanId(joinPlanId)
      }
    }
  }, [joinPlanId, plans])

  useEffect(() => {
    const book = BIBLE_BOOKS.find((item) => item.name === startBook)
    if (book && startChapter > book.chapters) {
      setStartChapter(book.chapters)
    }
  }, [startBook, startChapter])

  useEffect(() => {
    const book = BIBLE_BOOKS.find((item) => item.name === endBook)
    if (book && endChapter > book.chapters) {
      setEndChapter(book.chapters)
    }
  }, [endBook, endChapter])

  const handleCreatePlan = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) {
      return
    }

    try {
      validateChapter(startBook, startChapter)
      validateChapter(endBook, endChapter)
      if (totalDays < 1) {
        throw new Error('Total days must be at least 1.')
      }
    } catch (validationError: unknown) {
      const message = validationError instanceof Error ? validationError.message : 'Invalid form values.'
      toast.error(message)
      return
    }

    setSubmittingPlan(true)
    try {
      const created = await createCoopPlan(
        {
          title,
          description,
          startDate,
          totalDays,
          startBook,
          startChapter,
          endBook,
          endChapter,
        },
        {
          id: user.$id,
          name: user.name,
          email: user.email,
        },
      )
      toast.success('Plan created.')
      setTitle('')
      setDescription('')
      await loadPlans()
      setSelectedPlanId(created.$id)
    } catch (createError: unknown) {
      const message =
        createError instanceof Error
          ? createError.message
          : 'Failed to create plan. Please verify Appwrite schema and permissions.'
      toast.error(message)
    } finally {
      setSubmittingPlan(false)
    }
  }

  const handleUnmarkChapter = async (logId: string) => {
    setSubmittingLog(true)
    try {
      await deleteReadLog(logId)
      toast.success('Chapter unmarked.')
      await loadSelectedPlanDetails()
    } catch (unmarkError: unknown) {
      toast.error(unmarkError instanceof Error ? unmarkError.message : 'Failed to unmark chapter.')
    } finally {
      setSubmittingLog(false)
    }
  }

  const quickLogChapter = async (book: string, chapter: number) => {
    if (!selectedPlan || !user) {
      return
    }

    setSubmittingLog(true)
    try {
      await createReadLog({
        planId: selectedPlan.$id,
        userId: user.$id,
        userName: user.name,
        chapterBook: book,
        chapterNumber: chapter,
        readDate: todayDate,
      })
      toast.success(`${book} ${chapter} marked read for today.`)
      await loadSelectedPlanDetails()
    } catch (createError: unknown) {
      const message = createError instanceof Error ? createError.message : 'Failed to log chapter.'
      toast.error(message)
    } finally {
      setSubmittingLog(false)
    }
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedPlan || !user || !inviteEmail.trim()) return
    setSubmittingInvite(true)
    try {
      await inviteMemberToPlan(selectedPlan.$id, inviteEmail, user.$id)
      toast.success(`Invitation sent to ${inviteEmail.trim()}. Share the invite link with them.`)
      setInviteEmail('')
      await loadSelectedPlanDetails()
    } catch (inviteError: unknown) {
      toast.error(inviteError instanceof Error ? inviteError.message : 'Failed to invite.')
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleCopyInviteLink = () => {
    if (!selectedPlan) return
    const url = `${window.location.origin}/projects/bible-coop?join=${selectedPlan.$id}`
    void navigator.clipboard.writeText(url)
    toast.success('Invite link copied to clipboard.')
  }

  const handleJoinPlan = async () => {
    if (!joinPlanId || !user) return
    setSubmittingJoin(true)
    try {
      await addMemberToPlan(joinPlanId, {
        id: user.$id,
        name: user.name,
        email: user.email,
      })
      toast.success('You joined the plan!')
      setSelectedPlanId(joinPlanId)
      await loadPlans()
      await loadSelectedPlanDetails()
      navigate({ to: '/projects/bible-coop', search: {} })
    } catch (joinError: unknown) {
      toast.error(joinError instanceof Error ? joinError.message : 'Failed to join plan.')
    } finally {
      setSubmittingJoin(false)
    }
  }

  const handleRemoveInvite = async (inviteId: string) => {
    try {
      await removeInvite(inviteId)
      await loadSelectedPlanDetails()
    } catch {
      toast.error('Failed to remove invite.')
    }
  }

  const handleDeletePlan = async () => {
    if (!selectedPlan || !isPlanOwner) return
    setSubmittingDelete(true)
    try {
      await deletePlan(selectedPlan.$id)
      toast.success('Plan deleted.')
      setSelectedPlanId('')
      await loadPlans()
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete plan.')
    } finally {
      setSubmittingDelete(false)
      setShowDeleteConfirm(false)
    }
  }

  const [joinPlanFetched, setJoinPlanFetched] = useState<CoopPlan | null>(null)
  const [joinPlanMembers, setJoinPlanMembers] = useState<CoopMember[]>([])

  useEffect(() => {
    if (!joinPlanId) {
      setJoinPlanFetched(null)
      setJoinPlanMembers([])
      return
    }
    const found = plans.find((p) => p.$id === joinPlanId)
    if (found) {
      setJoinPlanFetched(found)
    } else {
      void getPlanById(joinPlanId).then((p) => setJoinPlanFetched(p ?? null))
    }
    void getPlanMembers(joinPlanId).then(setJoinPlanMembers)
  }, [joinPlanId, plans])

  const isPlanOwner = selectedPlan && user && selectedPlan.ownerId === user.$id
  const isMemberOfJoinPlan =
    joinPlanId && user && joinPlanMembers.some((m) => m.userId === user.$id)
  const joinPlan = joinPlanFetched

  const originalToday =
    planView?.originalPlan.find((day) => day.date === todayDate) ||
    planView?.originalPlan[0] ||
    null
  const todayChapterKeys = useMemo(() => {
    if (!originalToday) return new Set<string>()
    return new Set(originalToday.chapters.map((ch) => chapterKey(ch.book, ch.chapter)))
  }, [originalToday])
  const nextUpChapterKeys = useMemo(() => {
    const today = todayChapterKeys
    return new Set(
      nextChaptersToRead
        .filter((ch) => !today.has(chapterKey(ch.book, ch.chapter)))
        .map((ch) => chapterKey(ch.book, ch.chapter)),
    )
  }, [nextChaptersToRead, todayChapterKeys])
  const viewedUserReadLogs = useMemo(() => {
    const userId = selectedMemberId ?? user?.$id
    if (!userId) return []
    return readLogs.filter((log) => log.userId === userId)
  }, [readLogs, selectedMemberId, user?.$id])
  const adjustedToday =
    planView?.adjustedPlan.find((day) => day.date === todayDate) ||
    planView?.adjustedPlan[0] ||
    null

  const originalPreview = planView?.originalPlan.slice(0, 7) || []
  const adjustedPreview = planView?.adjustedPlan.slice(0, 7) || []

  const { scheduleStatus, expectedByToday, chaptersToReadToday } = useMemo((): {
    scheduleStatus: 'ahead' | 'on-track' | 'today-pending' | 'behind' | null
    expectedByToday: number
    chaptersToReadToday: number
  } => {
    if (!planView || !selectedPlan) {
      return { scheduleStatus: null, expectedByToday: 0, chaptersToReadToday: 0 }
    }
    const start = selectedPlan.startDate
    if (todayDate < start) {
      return { scheduleStatus: 'on-track', expectedByToday: 0, chaptersToReadToday: 0 }
    }
    let expectedToday = 0
    let expectedYesterday = 0
    for (const day of planView.originalPlan) {
      if (day.date < todayDate) {
        expectedYesterday += day.chapters.length
      }
      if (day.date <= todayDate) {
        expectedToday += day.chapters.length
      } else {
        break
      }
    }
    const completed = planView.completedCount
    const toReadToday = Math.max(0, expectedToday - expectedYesterday)
    if (completed > expectedToday) return { scheduleStatus: 'ahead', expectedByToday: expectedToday, chaptersToReadToday: toReadToday }
    if (completed === expectedToday) return { scheduleStatus: 'on-track', expectedByToday: expectedToday, chaptersToReadToday: toReadToday }
    if (completed >= expectedYesterday) return { scheduleStatus: 'today-pending', expectedByToday: expectedToday, chaptersToReadToday: expectedToday - completed }
    return { scheduleStatus: 'behind', expectedByToday: expectedToday, chaptersToReadToday: toReadToday }
  }, [planView, selectedPlan])

  const [showAdjustedPlan, setShowAdjustedPlan] = useState(false)
  const isBehind = scheduleStatus === 'behind'

  useEffect(() => {
    if (!isBehind) setShowAdjustedPlan(false)
  }, [isBehind])

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Bible Co-op Reading</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Create shared chapter-based reading plans, track progress, and adapt pacing as members read more or less than expected.
        </p>
      </div>

      {joinPlanId && joinPlan && !isMemberOfJoinPlan && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Join plan: {joinPlan.title}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to this co-op reading plan. Join to track your progress with the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleJoinPlan()} disabled={submittingJoin}>
              {submittingJoin ? 'Joining...' : 'Join Plan'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <button
          type="button"
          onClick={() => setShowCreatePlan(!showCreatePlan)}
          className="w-full text-left"
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Co-op Plan
                </CardTitle>
                <CardDescription>Define chapter range, start date, and plan duration.</CardDescription>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 transition-transform ${showCreatePlan ? 'rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
        </button>
        {showCreatePlan && (
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreatePlan}>
            <div className="space-y-2">
              <label htmlFor="plan-title" className="text-sm font-medium">Title</label>
              <Input
                id="plan-title"
                placeholder="NT Sprint"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="plan-description" className="text-sm font-medium">Description</label>
              <Input
                id="plan-description"
                placeholder="Daily morning reading with friends"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="start-date" className="text-sm font-medium">Start date</label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="total-days" className="text-sm font-medium">Total days</label>
                <Input
                  id="total-days"
                  type="number"
                  min={1}
                  max={730}
                  value={totalDays}
                  onChange={(event) => setTotalDays(Number(event.target.value))}
                  required
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <h3 className="text-sm font-semibold">Start chapter</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={startBook} onChange={(event) => setStartBook(event.target.value)}>
                  {BIBLE_BOOKS.map((book) => (
                    <option key={book.name} value={book.name}>
                      {book.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={BIBLE_BOOKS.find((book) => book.name === startBook)?.chapters || 1}
                  value={startChapter}
                  onChange={(event) => setStartChapter(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <h3 className="text-sm font-semibold">End chapter</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={endBook} onChange={(event) => setEndBook(event.target.value)}>
                  {BIBLE_BOOKS.map((book) => (
                    <option key={book.name} value={book.name}>
                      {book.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={BIBLE_BOOKS.find((book) => book.name === endBook)?.chapters || 1}
                  value={endChapter}
                  onChange={(event) => setEndChapter(Number(event.target.value))}
                />
              </div>
            </div>

            <Button type="submit" disabled={submittingPlan || !title.trim()}>
              {submittingPlan ? 'Creating...' : 'Create Plan'}
            </Button>
          </form>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Co-op Plans</CardTitle>
          <CardDescription>Choose a plan to view adjusted pacing and member progress.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPlans ? (
            <div className="text-sm text-muted-foreground">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="text-sm text-muted-foreground">No plans yet. Create your first co-op plan above.</div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => {
                const isSelected = plan.$id === selectedPlanId
                return (
                  <button
                    key={plan.$id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.$id)}
                    className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{plan.title}</p>
                      <span className="text-xs text-muted-foreground">{plan.totalDays} days</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.startBook} {plan.startChapter} - {plan.endBook} {plan.endChapter}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlan && planView && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{selectedPlan.title}</CardTitle>
                  <CardDescription>
                    Original plan stays fixed. Adjusted plan updates from your current completion.
                  </CardDescription>
                </div>
                {isPlanOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label="Delete plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPlanDetails ? (
                <p className="text-sm text-muted-foreground">Loading plan details...</p>
              ) : (
                <>
                  {scheduleStatus && (
                    <div
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        scheduleStatus === 'ahead'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                          : scheduleStatus === 'behind'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
                            : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200'
                      }`}
                    >
                      {scheduleStatus === 'ahead' && <TrendingUp className="h-5 w-5 shrink-0" />}
                      {(scheduleStatus === 'on-track' || scheduleStatus === 'today-pending') && (
                        <CheckCircle className="h-5 w-5 shrink-0" />
                      )}
                      {scheduleStatus === 'behind' && <AlertCircle className="h-5 w-5 shrink-0" />}
                      <span className="font-medium">
                        {scheduleStatus === 'ahead' && 'Ahead of schedule'}
                        {scheduleStatus === 'on-track' && 'Up to date'}
                        {scheduleStatus === 'today-pending' && 'On schedule'}
                        {scheduleStatus === 'behind' && 'Behind schedule'}
                      </span>
                      <span className="text-sm opacity-90">
                        {scheduleStatus === 'today-pending' &&
                          ` Read the next ${chaptersToReadToday} chapter${chaptersToReadToday === 1 ? '' : 's'} today to keep it up.`}
                        {scheduleStatus === 'behind' &&
                          ` ${planView.completedCount} / ${expectedByToday} chapters expected by today.`}
                        {scheduleStatus === 'on-track' && ' — Keep going!'}
                        {scheduleStatus === 'ahead' && ' — Great progress!'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Total chapters</p>
                      <p className="text-lg font-semibold">{planView.allChapters.length}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-lg font-semibold">{planView.completedCount}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-semibold">{planView.remainingCount}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Days planned</p>
                      <p className="text-lg font-semibold">{selectedPlan.totalDays}</p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <h3 className="font-medium text-sm">Original plan for today</h3>
                    {originalToday ? (
                      <p className="text-sm text-muted-foreground">{formatDayPreview(originalToday)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No original day found for today.</p>
                    )}
                  </div>

                  {isBehind && (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setShowAdjustedPlan(!showAdjustedPlan)}
                      >
                        <span>View adjusted plan</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showAdjustedPlan ? 'rotate-180' : ''}`}
                        />
                      </Button>
                      {showAdjustedPlan && adjustedToday && (
                        <div className="rounded-md border p-3 space-y-3">
                          <h3 className="font-medium text-sm">Adjusted today — catch up</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDayPreview(adjustedToday)}
                          </p>
                          {adjustedToday.chapters.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Quick mark as read
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {adjustedToday.chapters.map((chapter) => {
                                  const key = chapterKey(chapter.book, chapter.chapter)
                                  const completed = userCompletedChapters.has(key)
                                  return (
                                    <Button
                                      key={key}
                                      type="button"
                                      size="sm"
                                      variant={completed ? 'secondary' : 'outline'}
                                      disabled={completed || submittingLog}
                                      onClick={() => {
                                        void quickLogChapter(chapter.book, chapter.chapter)
                                      }}
                                    >
                                      {chapterLabel(chapter)}
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Progress</CardTitle>
              <CardDescription>
                Tap a member to see which chapters they&apos;ve read.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members found yet.</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const completion = memberCompletion[member.userId] || 0
                    const isSelected = selectedMemberId === member.userId
                    return (
                      <button
                        key={member.$id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.userId)}
                        className={cn(
                          'w-full rounded-md border p-3 space-y-2 text-left transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-accent',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {member.userId === user?.$id
                              ? (user.name || user.email || member.userId)
                              : (member.userName || member.userEmail || member.userId)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {member.role} - {completion}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    {selectedMemberId
                      ? `Reading progress — ${
                          selectedMemberId === user?.$id
                            ? (user.name || user.email || 'You')
                            : (members.find((m) => m.userId === selectedMemberId)?.userName ||
                               members.find((m) => m.userId === selectedMemberId)?.userEmail ||
                               'Member')
                        }`
                      : 'Log Chapter Read'}
                  </CardTitle>
                  <CardDescription>
                    {selectedMemberId
                      ? 'View which chapters this member has read.'
                      : 'Click books to expand, then tap chapters to mark read or unread. Blue ring = today, amber = next up.'}
                  </CardDescription>
                </div>
                {selectedMemberId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMemberId(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedMemberId && (
                <>
                  {todayChapterKeys.size > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Today&apos;s chapters</p>
                      <div className="flex flex-wrap gap-2">
                        {originalToday?.chapters.map((chapter) => {
                          const key = chapterKey(chapter.book, chapter.chapter)
                          const completed = userCompletedChapters.has(key)
                          return (
                            <Button
                              key={key}
                              type="button"
                              size="sm"
                              variant={completed ? 'secondary' : 'outline'}
                              disabled={submittingLog}
                              onClick={() => {
                                if (completed) {
                                  const logs = readLogs
                                    .filter(
                                      (l) =>
                                        l.userId === user?.$id &&
                                        l.chapterBook === chapter.book &&
                                        l.chapterNumber === chapter.chapter,
                                    )
                                    .sort(
                                      (a, b) =>
                                        new Date(b.readDate).getTime() -
                                        new Date(a.readDate).getTime(),
                                    )
                                  if (logs[0]) void handleUnmarkChapter(logs[0].$id)
                                } else {
                                  void quickLogChapter(chapter.book, chapter.chapter)
                                }
                              }}
                            >
                              {chapterLabel(chapter)}
                              {completed && ' ✓'}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {selectedMemberId ? 'Chapters by book' : 'All chapters by book'}
                </p>
                <BiblePlanChapters
                  planChapters={planView.allChapters}
                  readLogs={viewedUserReadLogs}
                  todayChapterKeys={todayChapterKeys}
                  nextUpChapterKeys={nextUpChapterKeys}
                  onMarkRead={
                    !selectedMemberId
                      ? (book, chapter) => void quickLogChapter(book, chapter)
                      : undefined
                  }
                  onUnmarkRead={
                    !selectedMemberId ? (logId) => void handleUnmarkChapter(logId) : undefined
                  }
                  readOnly={!!selectedMemberId}
                  disabled={submittingLog}
                />
              </div>
            </CardContent>
          </Card>

          {isPlanOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Members
                </CardTitle>
                <CardDescription>
                  Invite friends by email and share the invite link. They must have an account to join.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 min-w-[180px]"
                  />
                  <Button type="submit" disabled={submittingInvite || !inviteEmail.trim()}>
                    {submittingInvite ? 'Sending...' : 'Invite'}
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={handleCopyInviteLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy invite link
                  </Button>
                </div>
                {invites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pending invites</p>
                    <ul className="space-y-1">
                      {invites.map((inv) => (
                        <li
                          key={inv.$id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">{inv.inviteeEmail}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRemoveInvite(inv.$id)}
                            aria-label="Remove invite"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className={`grid gap-4 ${isBehind ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Original Plan Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {originalPreview.map((day) => (
                  <div key={`original-${day.dayNumber}`} className="rounded-md border p-2">
                    <p className="text-xs text-muted-foreground">Day {day.dayNumber} - {day.date}</p>
                    <p className="text-sm">{formatDayPreview(day)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {isBehind && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Adjusted Plan Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {adjustedPreview.map((day) => (
                    <div key={`adjusted-${day.dayNumber}`} className="rounded-md border p-2">
                      <p className="text-xs text-muted-foreground">Day {day.dayNumber} - {day.date}</p>
                      <p className="text-sm">{formatDayPreview(day)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete plan"
        description="This will permanently delete the plan, all member records, invites, and reading logs. This cannot be undone."
        confirmText={submittingDelete ? 'Deleting...' : 'Delete plan'}
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleDeletePlan()}
      />
    </div>
  )
}
