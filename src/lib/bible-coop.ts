import { ID, Query, type Models } from 'appwrite'
import { databases } from '@/lib/appwrite'
import {
  buildChapterRange,
  chapterKey,
  distributeChaptersAcrossDays,
  daysBetween,
  type PlannedDay,
  type ChapterRef,
} from '@/lib/bible'

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '6942473d00010ac2bf23'
const PLANS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_BIBLE_COOP_PLANS_COLLECTION_ID || 'biblecoopplans'
const MEMBERS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_BIBLE_COOP_MEMBERS_COLLECTION_ID || 'biblecoopmembers'
const READ_LOGS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_BIBLE_COOP_READ_LOGS_COLLECTION_ID || 'biblecoopreadlogs'
const INVITES_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_BIBLE_COOP_INVITES_COLLECTION_ID || 'biblecoopinvites'

export type CoopMemberRole = 'owner' | 'member'

export interface CoopInvite extends Models.Document {
  planId: string
  inviteeEmail: string
  inviterId: string
}

export interface CoopPlan extends Models.Document {
  title: string
  description?: string
  ownerId: string
  ownerName?: string
  startDate: string
  totalDays: number
  startBook: string
  startChapter: number
  endBook: string
  endChapter: number
  status?: 'active' | 'archived'
}

export interface CoopMember extends Models.Document {
  planId: string
  userId: string
  userName?: string
  userEmail?: string
  role: CoopMemberRole
}

export interface CoopReadLog extends Models.Document {
  planId: string
  userId: string
  userName?: string
  chapterBook: string
  chapterNumber: number
  readDate: string
}

export interface CreateCoopPlanInput {
  title: string
  description?: string
  startDate: string
  totalDays: number
  startBook: string
  startChapter: number
  endBook: string
  endChapter: number
}

export interface ChapterProgress {
  chapter: ChapterRef
  completed: boolean
}

export interface PlanViewModel {
  allChapters: ChapterRef[]
  originalPlan: PlannedDay[]
  adjustedPlan: PlannedDay[]
  completedCount: number
  remainingCount: number
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  return 'code' in error && (error as { code?: number }).code === 404
}

function sortByCreatedAt<T extends Models.Document>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
}

export async function createCoopPlan(input: CreateCoopPlanInput, owner: {
  id: string
  name?: string
  email?: string
}): Promise<CoopPlan> {
  const allChapters = buildChapterRange(
    input.startBook,
    input.startChapter,
    input.endBook,
    input.endChapter,
  )

  if (allChapters.length === 0) {
    throw new Error('Selected chapter range cannot be empty.')
  }

  const plan = (await databases.createDocument(
    DATABASE_ID,
    PLANS_COLLECTION_ID,
    ID.unique(),
    {
      title: input.title,
      description: input.description || '',
      ownerId: owner.id,
      ownerName: owner.name || '',
      startDate: input.startDate,
      totalDays: input.totalDays,
      startBook: input.startBook,
      startChapter: input.startChapter,
      endBook: input.endBook,
      endChapter: input.endChapter,
      status: 'active',
    },
  )) as unknown as CoopPlan

  await databases.createDocument(
    DATABASE_ID,
    MEMBERS_COLLECTION_ID,
    ID.unique(),
    {
      planId: plan.$id,
      userId: owner.id,
      userName: owner.name || '',
      userEmail: owner.email || '',
      role: 'owner',
    },
  )

  return plan
}

export async function getPlansForUser(userId: string): Promise<CoopPlan[]> {
  try {
    const owned = await databases.listDocuments(
      DATABASE_ID,
      PLANS_COLLECTION_ID,
      [Query.equal('ownerId', userId)],
    )

    let memberPlans: CoopPlan[] = []
    try {
      const memberships = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        [Query.equal('userId', userId)],
      )
      const memberPlanIds = memberships.documents
        .map((doc) => (doc as unknown as CoopMember).planId)
        .filter((planId, index, values) => values.indexOf(planId) === index)

      const memberPlanRequests = memberPlanIds.map((planId) =>
        databases
          .getDocument(DATABASE_ID, PLANS_COLLECTION_ID, planId)
          .then((doc) => doc as unknown as CoopPlan)
          .catch(() => null),
      )
      const memberPlanResults = await Promise.all(memberPlanRequests)
      memberPlans = memberPlanResults.filter((plan): plan is CoopPlan => plan !== null)
    } catch (membershipError: unknown) {
      if (!isNotFoundError(membershipError)) {
        throw membershipError
      }
    }

    const combined = [...(owned.documents as unknown as CoopPlan[]), ...memberPlans]
    const deduplicated = Array.from(new Map(combined.map((plan) => [plan.$id, plan])).values())
    return sortByCreatedAt(deduplicated)
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const [readLogs, members, invites] = await Promise.all([
    getPlanReadLogs(planId),
    databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [Query.equal('planId', planId)]),
    databases.listDocuments(DATABASE_ID, INVITES_COLLECTION_ID, [Query.equal('planId', planId)]),
  ])
  const deleteDoc = (collectionId: string, docId: string) =>
    databases.deleteDocument(DATABASE_ID, collectionId, docId)
  await Promise.all([
    ...readLogs.map((d) => deleteDoc(READ_LOGS_COLLECTION_ID, d.$id)),
    ...members.documents.map((d) => deleteDoc(MEMBERS_COLLECTION_ID, d.$id)),
    ...invites.documents.map((d) => deleteDoc(INVITES_COLLECTION_ID, d.$id)),
  ])
  await databases.deleteDocument(DATABASE_ID, PLANS_COLLECTION_ID, planId)
}

export async function getPlanById(planId: string): Promise<CoopPlan | null> {
  try {
    return (await databases.getDocument(
      DATABASE_ID,
      PLANS_COLLECTION_ID,
      planId,
    )) as unknown as CoopPlan
  } catch (error: unknown) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

export async function getPlanMembers(planId: string): Promise<CoopMember[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MEMBERS_COLLECTION_ID,
      [Query.equal('planId', planId)],
    )
    return response.documents as unknown as CoopMember[]
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

export async function inviteMemberToPlan(
  planId: string,
  inviteeEmail: string,
  inviterId: string,
): Promise<CoopInvite> {
  const normalizedEmail = inviteeEmail.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Please enter an email address.')
  }
  const existing = await databases.listDocuments(
    DATABASE_ID,
    INVITES_COLLECTION_ID,
    [
      Query.equal('planId', planId),
      Query.equal('inviteeEmail', normalizedEmail),
    ],
  )
  if (existing.documents.length > 0) {
    throw new Error('This person has already been invited.')
  }
  const members = await getPlanMembers(planId)
  const alreadyMember = members.some(
    (m) => (m.userEmail || '').toLowerCase() === normalizedEmail,
  )
  if (alreadyMember) {
    throw new Error('This person is already a member.')
  }
  return (await databases.createDocument(
    DATABASE_ID,
    INVITES_COLLECTION_ID,
    ID.unique(),
    {
      planId,
      inviteeEmail: normalizedEmail,
      inviterId,
    },
  )) as unknown as CoopInvite
}

export async function getPlanInvites(planId: string): Promise<CoopInvite[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      INVITES_COLLECTION_ID,
      [Query.equal('planId', planId)],
    )
    return response.documents as unknown as CoopInvite[]
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

export async function removeInvite(inviteId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, INVITES_COLLECTION_ID, inviteId)
}

export async function addMemberToPlan(
  planId: string,
  user: { id: string; name?: string; email?: string },
): Promise<CoopMember> {
  const members = await getPlanMembers(planId)
  if (members.some((m) => m.userId === user.id)) {
    throw new Error('You are already a member of this plan.')
  }
  return (await databases.createDocument(
    DATABASE_ID,
    MEMBERS_COLLECTION_ID,
    ID.unique(),
    {
      planId,
      userId: user.id,
      userName: user.name || '',
      userEmail: user.email || '',
      role: 'member',
    },
  )) as unknown as CoopMember
}

export async function createReadLog(input: {
  planId: string
  userId: string
  userName?: string
  chapterBook: string
  chapterNumber: number
  readDate: string
}): Promise<CoopReadLog> {
  const existing = await databases.listDocuments(
    DATABASE_ID,
    READ_LOGS_COLLECTION_ID,
    [
      Query.equal('planId', input.planId),
      Query.equal('userId', input.userId),
      Query.equal('chapterBook', input.chapterBook),
      Query.equal('chapterNumber', input.chapterNumber),
    ],
  )

  const duplicate = (existing.documents as unknown as CoopReadLog[]).find(
    (doc) => doc.readDate === input.readDate,
  )
  if (duplicate) {
    return duplicate
  }

  return (await databases.createDocument(
    DATABASE_ID,
    READ_LOGS_COLLECTION_ID,
    ID.unique(),
    {
      planId: input.planId,
      userId: input.userId,
      userName: input.userName || '',
      chapterBook: input.chapterBook,
      chapterNumber: input.chapterNumber,
      readDate: input.readDate,
    },
  )) as unknown as CoopReadLog
}

export async function deleteReadLog(logId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, READ_LOGS_COLLECTION_ID, logId)
}

const READ_LOGS_PAGE_SIZE = 100

export async function getPlanReadLogs(planId: string): Promise<CoopReadLog[]> {
  try {
    const all: CoopReadLog[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        READ_LOGS_COLLECTION_ID,
        [
          Query.equal('planId', planId),
          Query.limit(READ_LOGS_PAGE_SIZE),
          Query.offset(offset),
        ],
      )
      const docs = response.documents as unknown as CoopReadLog[]
      all.push(...docs)
      offset += docs.length
      hasMore = docs.length === READ_LOGS_PAGE_SIZE
    }

    return sortByCreatedAt(all)
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

function buildAdjustedPlanFromToday(
  allChapters: ChapterRef[],
  completedChapterKeys: Set<string>,
  totalDays: number,
  startDate: string,
  today: string,
): PlannedDay[] {
  const remainingChapters = allChapters.filter(
    (chapter) => !completedChapterKeys.has(chapterKey(chapter.book, chapter.chapter)),
  )

  const elapsedDays = Math.max(0, daysBetween(startDate, today))
  const remainingDays = Math.max(1, totalDays - elapsedDays)
  return distributeChaptersAcrossDays(remainingChapters, remainingDays, today)
}

export function buildPlanViewModel(
  plan: CoopPlan,
  readLogs: CoopReadLog[],
  userId: string,
): PlanViewModel {
  const allChapters = buildChapterRange(
    plan.startBook,
    plan.startChapter,
    plan.endBook,
    plan.endChapter,
  )
  const originalPlan = distributeChaptersAcrossDays(allChapters, plan.totalDays, plan.startDate)
  const completedChapterKeys = new Set(
    readLogs
      .filter((log) => log.userId === userId)
      .map((log) => chapterKey(log.chapterBook, log.chapterNumber)),
  )
  const today = new Date().toISOString().slice(0, 10)
  const adjustedPlan = buildAdjustedPlanFromToday(
    allChapters,
    completedChapterKeys,
    plan.totalDays,
    plan.startDate,
    today,
  )

  return {
    allChapters,
    originalPlan,
    adjustedPlan,
    completedCount: completedChapterKeys.size,
    remainingCount: Math.max(0, allChapters.length - completedChapterKeys.size),
  }
}

export function buildMemberCompletionMap(
  allChapters: ChapterRef[],
  members: CoopMember[],
  readLogs: CoopReadLog[],
): Record<string, number> {
  const total = allChapters.length
  const completionByUser: Record<string, number> = {}

  for (const member of members) {
    const completed = new Set(
      readLogs
        .filter((log) => log.userId === member.userId)
        .map((log) => chapterKey(log.chapterBook, log.chapterNumber)),
    )
    completionByUser[member.userId] = total > 0 ? Math.round((completed.size / total) * 100) : 0
  }

  return completionByUser
}
