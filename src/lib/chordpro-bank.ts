import { ID, Query, type Models } from 'appwrite'
import { databases } from '@/lib/appwrite'

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '6942473d00010ac2bf23'
const FOLDERS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_CHORDPRO_FOLDERS_COLLECTION_ID || 'chordproFolders'
const SONGS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_CHORDPRO_SONGS_COLLECTION_ID || 'chordproSongs'

export interface ChordProFolder extends Models.Document {
  ownerId: string
  name: string
}

export interface ChordProSong extends Models.Document {
  ownerId: string
  folderId?: string
  title: string
  content: string
  key?: string
  artist?: string
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  return 'code' in error && (error as { code?: number }).code === 404
}

function sortByCreatedAtDesc<T extends Models.Document>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
}

export async function listChordProFolders(ownerId: string): Promise<ChordProFolder[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, FOLDERS_COLLECTION_ID, [
      Query.equal('ownerId', ownerId),
    ])
    return sortByCreatedAtDesc(response.documents as unknown as ChordProFolder[])
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

export async function createChordProFolder(ownerId: string, name: string): Promise<ChordProFolder> {
  return (await databases.createDocument(DATABASE_ID, FOLDERS_COLLECTION_ID, ID.unique(), {
    ownerId,
    name: name.trim(),
  })) as unknown as ChordProFolder
}

export async function listChordProSongs(ownerId: string): Promise<ChordProSong[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, SONGS_COLLECTION_ID, [
      Query.equal('ownerId', ownerId),
    ])
    return sortByCreatedAtDesc(response.documents as unknown as ChordProSong[])
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }
    throw error
  }
}

export async function createChordProSong(input: {
  ownerId: string
  folderId?: string
  title: string
  content: string
  key?: string
  artist?: string
}): Promise<ChordProSong> {
  return (await databases.createDocument(DATABASE_ID, SONGS_COLLECTION_ID, ID.unique(), {
    ownerId: input.ownerId,
    folderId: input.folderId || '',
    title: input.title.trim(),
    content: input.content,
    key: input.key || '',
    artist: input.artist || '',
  })) as unknown as ChordProSong
}

export async function updateChordProSong(
  songId: string,
  input: {
    folderId?: string
    title: string
    content: string
    key?: string
    artist?: string
  },
): Promise<ChordProSong> {
  return (await databases.updateDocument(DATABASE_ID, SONGS_COLLECTION_ID, songId, {
    folderId: input.folderId || '',
    title: input.title.trim(),
    content: input.content,
    key: input.key || '',
    artist: input.artist || '',
  })) as unknown as ChordProSong
}

export async function deleteChordProSong(songId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, SONGS_COLLECTION_ID, songId)
}
