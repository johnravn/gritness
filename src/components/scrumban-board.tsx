import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderKanban, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { KanbanBoard } from '@/components/kanban-board'
import {
  createProject,
  getProjects,
  deleteProject,
  createBoard,
  getBoards,
  deleteBoard,
} from '@/lib/scrumban'

export function ScrumbanBoard() {
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showBoardDialog, setShowBoardDialog] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [boardName, setBoardName] = useState('')
  const [boardDescription, setBoardDescription] = useState('')
  const [deleteProjectDialog, setDeleteProjectDialog] = useState<{ open: boolean; projectId: string | null }>({ open: false, projectId: null })
  const [deleteBoardDialog, setDeleteBoardDialog] = useState<{ open: boolean; boardId: string | null }>({ open: false, boardId: null })

  // Fetch projects
  const { data: projects = [], error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  // Fetch boards for selected project
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', selectedProjectId],
    queryFn: () => selectedProjectId ? getBoards(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId,
  })

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: () => createProject(projectName, projectDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowProjectDialog(false)
      setProjectName('')
      setProjectDescription('')
    },
    onError: (error: any) => {
      console.error('Error creating project:', error)
      alert(`Failed to create project: ${error.message || 'Unknown error'}. Check console for details.`)
    },
  })

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (selectedProjectId) {
        setSelectedProjectId(null)
        setSelectedBoardId(null)
      }
    },
  })

  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: () => selectedProjectId ? createBoard(selectedProjectId, boardName, boardDescription) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', selectedProjectId] })
      setShowBoardDialog(false)
      setBoardName('')
      setBoardDescription('')
    },
    onError: (error: any) => {
      console.error('Error creating board:', error)
      alert(`Failed to create board: ${error.message || 'Unknown error'}. Check console for details.`)
    },
  })

  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', selectedProjectId] })
      if (selectedBoardId) {
        setSelectedBoardId(null)
      }
    },
  })

  const handleCreateProject = () => {
    if (projectName.trim()) {
      createProjectMutation.mutate()
    }
  }

  const handleCreateBoard = () => {
    if (boardName.trim() && selectedProjectId) {
      createBoardMutation.mutate()
    }
  }

  // Check if there's a setup error
  const setupError = projectsError as any

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Scrumban Board</h1>
        <p className="text-muted-foreground">
          Manage your projects, boards, and tasks
        </p>
      </div>

      {setupError?.code === 404 && (
        <Card className="mb-6 border-yellow-500 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-300">
              Database Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              The Appwrite database needs to be set up. Please create:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              <li>Database with ID: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">scrumban</code></li>
              <li>Collection with ID: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">projects</code> (attributes: name, description)</li>
              <li>Collection with ID: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">boards</code> (attributes: projectId, name, description)</li>
              <li>Collection with ID: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">tasks</code> (attributes: boardId, title, description, status, order)</li>
            </ol>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-4">
              See the Appwrite Console to set this up. The page will refresh automatically once the database is created.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Projects View */}
      {!selectedProjectId && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Projects</h2>
            <Button onClick={() => setShowProjectDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button onClick={() => setShowProjectDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.$id}
                  className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer relative group"
                  onClick={() => setSelectedProjectId(project.$id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <FolderKanban className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{project.name}</CardTitle>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteProjectDialog({ open: true, projectId: project.$id })
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {project.description && (
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to view boards →
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Boards View */}
      {selectedProjectId && !selectedBoardId && (
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedProjectId(null)
                setSelectedBoardId(null)
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-semibold">
              {projects.find(p => p.$id === selectedProjectId)?.name || 'Boards'}
            </h2>
            <Button onClick={() => setShowBoardDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Button>
          </div>
          {boards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No boards yet</p>
                <Button onClick={() => setShowBoardDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Board
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => (
                <Card
                  key={board.$id}
                  className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer relative group"
                  onClick={() => setSelectedBoardId(board.$id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <FolderKanban className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{board.name}</CardTitle>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteBoardDialog({ open: true, boardId: board.$id })
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {board.description && (
                      <CardDescription className="mt-2">{board.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to open board →
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {selectedBoardId && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedBoardId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-semibold">
              {boards.find(b => b.$id === selectedBoardId)?.name || 'Board'}
            </h2>
          </div>
          <KanbanBoard boardId={selectedBoardId} />
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent onClose={() => setShowProjectDialog(false)}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your boards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Project"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject()
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Project description"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!projectName.trim() || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Board Dialog */}
      <Dialog open={showBoardDialog} onOpenChange={setShowBoardDialog}>
        <DialogContent onClose={() => setShowBoardDialog(false)}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new board in the selected project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Board Name</label>
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="My Board"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBoard()
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
                placeholder="Board description"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBoard()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBoardDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBoard} 
              disabled={!boardName.trim() || createBoardMutation.isPending}
            >
              {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Alert Dialog */}
      <AlertDialog
        open={deleteProjectDialog.open}
        onOpenChange={(open) => setDeleteProjectDialog({ open, projectId: null })}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and will delete all boards and tasks within this project."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteProjectDialog.projectId) {
            deleteProjectMutation.mutate(deleteProjectDialog.projectId)
          }
        }}
      />

      {/* Delete Board Alert Dialog */}
      <AlertDialog
        open={deleteBoardDialog.open}
        onOpenChange={(open) => setDeleteBoardDialog({ open, boardId: null })}
        title="Delete Board"
        description="Are you sure you want to delete this board? This action cannot be undone and will delete all tasks within this board."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteBoardDialog.boardId) {
            deleteBoardMutation.mutate(deleteBoardDialog.boardId)
          }
        }}
      />
    </div>
  )
}

