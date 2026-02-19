import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoute, Link } from '@tanstack/react-router'
import { rootRoute } from '@/routes/__root'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  createChordProFolder,
  createChordProSong,
  deleteChordProSong,
  listChordProFolders,
  listChordProSongs,
  updateChordProSong,
  type ChordProFolder,
  type ChordProSong,
} from '@/lib/chordpro-bank'
import {
  convertChordProToAccidentalStyle,
  inferPreferSharpsFromKey,
  parseChordPro,
  transposeChordSymbol,
  transposeChordPro,
} from '@/lib/chordpro'
import { exportChordProToPdf } from '@/lib/chordpro-pdf'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Download, FolderPlus, Save, Trash2 } from 'lucide-react'

const DEFAULT_CHORDPRO = `{title: New Song}
{subtitle: Artist Name}
{key: C}

{start_of_verse: Verse 1}
[C]Amazing [G]grace how [Am]sweet the [F]sound
[C]That saved a [G]wretch like [F]me
{end_of_verse}

{start_of_chorus: Chorus}
[F]I once was [C]lost but [G]now I'm [Am]found
[F]Was blind but [G]now I [C]see
{end_of_chorus}
`

export const chordProRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/chordpro',
  component: ChordProPage,
})

function semitoneLabel(value: number): string {
  if (value === 0) {
    return '0'
  }
  return value > 0 ? `+${value}` : `${value}`
}

const KEY_OPTIONS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
]

function ChordProPage() {
  const { user, isAuthenticated } = useAuth()
  const [songTitle, setSongTitle] = useState('New Song')
  const [artist, setArtist] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [content, setContent] = useState(DEFAULT_CHORDPRO)
  const [transposeSemitones, setTransposeSemitones] = useState(0)
  const [folders, setFolders] = useState<ChordProFolder[]>([])
  const [songs, setSongs] = useState<ChordProSong[]>([])
  const [activeSongId, setActiveSongId] = useState('')
  const [folderNameInput, setFolderNameInput] = useState('')
  const [loadingBank, setLoadingBank] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfTextSize, setPdfTextSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [pdfColumns, setPdfColumns] = useState<1 | 2>(1)
  const [pdfIncludeMetadata, setPdfIncludeMetadata] = useState(true)
  const [originalKey, setOriginalKey] = useState('C')
  const [accidentalStyle, setAccidentalStyle] = useState<'auto' | 'sharp' | 'flat'>('auto')
  const [transposeSectionOpen, setTransposeSectionOpen] = useState(false)
  const [pdfSectionOpen, setPdfSectionOpen] = useState(false)

  const parsed = useMemo(() => parseChordPro(content), [content])
  const preferSharps = useMemo(() => {
    if (accidentalStyle === 'sharp') {
      return true
    }
    if (accidentalStyle === 'flat') {
      return false
    }
    return inferPreferSharpsFromKey(originalKey || parsed.key || 'C')
  }, [accidentalStyle, originalKey, parsed.key])
  const transposedPreview = useMemo(
    () => transposeChordPro(content, transposeSemitones, preferSharps),
    [content, transposeSemitones, preferSharps],
  )
  const targetKey = useMemo(
    () => transposeChordSymbol(originalKey || 'C', transposeSemitones, preferSharps),
    [originalKey, transposeSemitones, preferSharps],
  )

  const filteredSongs = useMemo(() => {
    if (!selectedFolderId) {
      return songs
    }
    return songs.filter((song) => (song.folderId || '') === selectedFolderId)
  }, [songs, selectedFolderId])

  const loadBank = useCallback(async () => {
    if (!user) {
      setSongs([])
      setFolders([])
      return
    }

    setLoadingBank(true)
    try {
      const [folderResults, songResults] = await Promise.all([
        listChordProFolders(user.$id),
        listChordProSongs(user.$id),
      ])
      setFolders(folderResults)
      setSongs(songResults)
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your song bank. Check Appwrite collection setup.'
      toast.error(message)
    } finally {
      setLoadingBank(false)
    }
  }, [user])

  useEffect(() => {
    void loadBank()
  }, [loadBank])

  useEffect(() => {
    if (!parsed.title.trim()) {
      return
    }
    setSongTitle((current) => (current.trim() ? current : parsed.title))
  }, [parsed.title])

  useEffect(() => {
    if (!parsed.key?.trim()) {
      return
    }
    if (!originalKey || originalKey === 'C') {
      setOriginalKey(parsed.key)
    }
  }, [parsed.key, originalKey])

  const resetForm = () => {
    setActiveSongId('')
    setSongTitle('New Song')
    setArtist('')
    setSelectedFolderId('')
    setTransposeSemitones(0)
    setOriginalKey('C')
    setAccidentalStyle('auto')
    setContent(DEFAULT_CHORDPRO)
    toast.success('Started new song.')
  }

  const openSong = (song: ChordProSong) => {
    setActiveSongId(song.$id)
    setSongTitle(song.title || 'Untitled')
    setArtist(song.artist || '')
    setSelectedFolderId(song.folderId || '')
    setContent(song.content || '')
    setTransposeSemitones(0)
    setOriginalKey(song.key || parseChordPro(song.content || '').key || 'C')
    setAccidentalStyle('auto')
    toast.success(`Loaded "${song.title}".`)
  }

  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) {
      toast.error('Please log in to create folders in your song bank.')
      return
    }
    if (!folderNameInput.trim()) {
      return
    }

    try {
      await createChordProFolder(user.$id, folderNameInput)
      setFolderNameInput('')
      await loadBank()
      toast.success('Folder created.')
    } catch (createError: unknown) {
      toast.error(createError instanceof Error ? createError.message : 'Could not create folder.')
    }
  }

  const handleSaveSong = async () => {
    if (!user) {
      toast.error('Login is required to save songs in your Appwrite bank.')
      return
    }
    if (!songTitle.trim()) {
      toast.error('Song title is required before saving.')
      return
    }

    setSaving(true)
    try {
      const input = {
        folderId: selectedFolderId || '',
        title: songTitle,
        content,
        key: originalKey,
        artist,
      }

      if (activeSongId) {
        const updated = await updateChordProSong(activeSongId, input)
        setActiveSongId(updated.$id)
        toast.success('Song updated in bank.')
      } else {
        const created = await createChordProSong({
          ownerId: user.$id,
          ...input,
        })
        setActiveSongId(created.$id)
        toast.success('Song saved to bank.')
      }

      await loadBank()
    } catch (saveError: unknown) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not save song.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSong = async () => {
    if (!activeSongId) {
      return
    }

    try {
      await deleteChordProSong(activeSongId)
      toast.success('Song deleted from bank.')
      resetForm()
      await loadBank()
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Could not delete song.')
    }
  }

  const applyTransposeToEditor = () => {
    if (transposeSemitones === 0) {
      return
    }
    setContent(transposedPreview)
    setTransposeSemitones(0)
    toast.success('Transpose applied to editor.')
  }

  const downloadPdf = () => {
    exportChordProToPdf(transposedPreview, {
      songTitle,
      transposeLabel: semitoneLabel(transposeSemitones),
      textSize: pdfTextSize,
      columns: pdfColumns,
      includeMetadata: pdfIncludeMetadata,
      originalKey,
      keyOverride: targetKey,
    })
    toast.success('PDF downloaded.')
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">ChordPro Studio</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Write ChordPro songs, transpose in one click, and export clean PDFs. You can use editor + export
          without login. Login only if you want your song bank saved in Appwrite.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Song Editor</CardTitle>
                  <CardDescription>
                    Use ChordPro directives like {'{title: ...}'}, {'{start_of_chorus}'}, and inline chords like [Am].
                  </CardDescription>
                </div>
                {activeSongId && (
                  <div className="shrink-0 rounded-md border-2 border-primary bg-primary/10 px-4 py-2">
                    <p className="text-sm font-semibold text-primary">Editing existing song</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={songTitle}>
                      {songTitle || 'Untitled'}
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transpose - expandable */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setTransposeSectionOpen((o) => !o)}
                >
                  <div className="flex items-center gap-2">
                    {transposeSectionOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">Transpose</span>
                    <span className="text-sm text-muted-foreground">
                      {originalKey} → {targetKey} {transposeSemitones !== 0 && `(${semitoneLabel(transposeSemitones)})`}
                    </span>
                  </div>
                </button>
                {transposeSectionOpen && (
                  <div className="border-t px-4 py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label htmlFor="original-key" className="text-sm font-medium">Original key</label>
                        <Select
                          id="original-key"
                          value={originalKey}
                          onChange={(event) => setOriginalKey(event.target.value)}
                        >
                          {KEY_OPTIONS.map((key) => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="accidental-style" className="text-sm font-medium">Accidental style</label>
                        <Select
                          id="accidental-style"
                          value={accidentalStyle}
                          onChange={(event) => setAccidentalStyle(event.target.value as 'auto' | 'sharp' | 'flat')}
                        >
                          <option value="auto">Auto (from original key)</option>
                          <option value="sharp">Prefer sharps (#)</option>
                          <option value="flat">Prefer flats (b)</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => setTransposeSemitones((c) => c - 1)}>-1</Button>
                      <span className="text-sm font-medium min-w-16 text-center">{semitoneLabel(transposeSemitones)}</span>
                      <Button type="button" variant="outline" onClick={() => setTransposeSemitones((c) => c + 1)}>+1</Button>
                      <Button type="button" variant="outline" disabled={transposeSemitones === 0} onClick={() => setTransposeSemitones(0)}>Reset</Button>
                      <Button type="button" disabled={transposeSemitones === 0} onClick={applyTransposeToEditor}>Apply Transpose</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const converted = convertChordProToAccidentalStyle(transposedPreview, preferSharps)
                          if (converted !== content) {
                            setContent(converted)
                            toast.success('Accidental style applied to editor.')
                          }
                        }}
                      >
                        Apply {preferSharps ? '#' : 'b'} style
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Export - expandable */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => setPdfSectionOpen((o) => !o)}
                >
                  <div className="flex items-center gap-2">
                    {pdfSectionOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">PDF Export</span>
                  </div>
                  {!pdfSectionOpen && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); downloadPdf() }}
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  )}
                </button>
                {pdfSectionOpen && (
                  <div className="border-t px-4 py-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label htmlFor="pdf-text-size" className="text-sm font-medium">Text size</label>
                        <Select id="pdf-text-size" value={pdfTextSize} onChange={(e) => setPdfTextSize(e.target.value as 'small' | 'medium' | 'large')}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="pdf-columns" className="text-sm font-medium">Columns</label>
                        <Select id="pdf-columns" value={String(pdfColumns)} onChange={(e) => setPdfColumns(e.target.value === '2' ? 2 : 1)}>
                          <option value="1">One column</option>
                          <option value="2">Two columns</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="pdf-metadata" className="text-sm font-medium">Metadata</label>
                        <Select id="pdf-metadata" value={pdfIncludeMetadata ? 'show' : 'hide'} onChange={(e) => setPdfIncludeMetadata(e.target.value === 'show')}>
                          <option value="show">Show metadata</option>
                          <option value="hide">Hide metadata</option>
                        </Select>
                      </div>
                    </div>
                    <Button type="button" onClick={downloadPdf}>
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="song-title" className="text-sm font-medium">Song title</label>
                  <Input
                    id="song-title"
                    value={songTitle}
                    onChange={(event) => setSongTitle(event.target.value)}
                    placeholder="Song title"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="song-artist" className="text-sm font-medium">Artist / Subtitle</label>
                  <Input
                    id="song-artist"
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    placeholder="Artist, band, or subtitle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="chordpro-editor" className="text-sm font-medium">ChordPro content</label>
                <textarea
                  id="chordpro-editor"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="flex min-h-[340px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  New Song
                </Button>
                <Button type="button" onClick={handleSaveSong} disabled={saving || !songTitle.trim()}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : activeSongId ? 'Update Song' : 'Save to Bank'}
                </Button>
                {activeSongId && (
                  <Button type="button" variant="destructive" onClick={handleDeleteSong}>
                    <Trash2 className="h-4 w-4" />
                    Delete Song
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Song Bank</CardTitle>
              <CardDescription>Folders + songs are stored in your Appwrite account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAuthenticated ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    You can still write and export PDF without login.
                  </p>
                  <Link
                    to="/auth/login"
                    search={{ redirect: '/projects/chordpro' }}
                    className="text-primary hover:underline"
                  >
                    Login to save songs in your bank
                  </Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleCreateFolder} className="space-y-2">
                    <label htmlFor="new-folder" className="text-sm font-medium">Create folder</label>
                    <div className="flex gap-2">
                      <Input
                        id="new-folder"
                        value={folderNameInput}
                        onChange={(event) => setFolderNameInput(event.target.value)}
                        placeholder="Sunday Set"
                      />
                      <Button type="submit" variant="outline" disabled={!folderNameInput.trim()}>
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    <label htmlFor="folder-filter" className="text-sm font-medium">Filter folder</label>
                    <Select
                      id="folder-filter"
                      value={selectedFolderId}
                      onChange={(event) => setSelectedFolderId(event.target.value)}
                    >
                      <option value="">All folders</option>
                      {folders.map((folder) => (
                        <option key={folder.$id} value={folder.$id}>
                          {folder.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Songs</p>
                    {loadingBank ? (
                      <p className="text-sm text-muted-foreground">Loading your songs...</p>
                    ) : filteredSongs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No songs in this folder yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
                        {filteredSongs.map((song) => (
                          <button
                            key={song.$id}
                            type="button"
                            onClick={() => openSong(song)}
                            className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                              song.$id === activeSongId
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <p className="text-sm font-medium">{song.title || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {(song.folderId && folders.find((folder) => folder.$id === song.folderId)?.name) || 'No folder'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
