import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
} from '@/lib/scrumban'

interface KanbanBoardProps {
  boardId: string
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' },
  { id: 'done', title: 'Done', color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
] as const

type Status = 'todo' | 'in-progress' | 'done'

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.$id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="mb-2 cursor-move hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{task.title}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="flex items-center text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{task.description}</p>
        </CardContent>
      )}
    </Card>
  )
}

function Column({ id, title, color, tasks, onTaskEdit, onTaskDelete }: {
  id: Status
  title: string
  color: string
  tasks: Task[]
  onTaskEdit: (task: Task) => void
  onTaskDelete: (taskId: string) => void
}) {
  const taskIds = tasks.map((task) => task.$id)
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px]">
      <div className={`p-3 rounded-t-lg ${color} mb-4`}>
        <h3 className="font-semibold">
          {title} ({tasks.length})
        </h3>
      </div>
      <div className={`rounded-b-lg border-2 min-h-[200px] p-2 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.$id}
                task={task}
                onEdit={() => onTaskEdit(task)}
                onDelete={() => onTaskDelete(task.$id)}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', boardId],
    queryFn: () => getTasks(boardId),
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: () => createTask(boardId, taskTitle, taskDescription, 'todo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })
      setShowTaskDialog(false)
      setTaskTitle('')
      setTaskDescription('')
    },
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })
      setShowTaskDialog(false)
      setEditingTask(null)
      setTaskTitle('')
      setTaskDescription('')
    },
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })
    },
  })

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo').sort((a, b) => a.order - b.order),
    'in-progress': tasks.filter((t) => t.status === 'in-progress').sort((a, b) => a.order - b.order),
    done: tasks.filter((t) => t.status === 'done').sort((a, b) => a.order - b.order),
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.$id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const task = tasks.find((t) => t.$id === active.id)
    if (!task) return

    // Check if over.id is a valid status (column ID)
    const validStatuses: Status[] = ['todo', 'in-progress', 'done']
    let newStatus: Status | undefined

    if (validStatuses.includes(over.id as Status)) {
      // Dropped directly on a column droppable
      newStatus = over.id as Status
    } else {
      // Dropped on a task - find which column that task belongs to by checking tasksByStatus
      // We need to find which column contains this task
      for (const status of validStatuses) {
        if (tasksByStatus[status].some(t => t.$id === over.id)) {
          newStatus = status
          break
        }
      }
      
      // Fallback: if we still don't have a status, find the task and use its status
      if (!newStatus) {
        const overTask = tasks.find((t) => t.$id === over.id)
        if (overTask) {
          newStatus = overTask.status
        } else {
          return
        }
      }
    }

    if (!newStatus || task.status === newStatus) return

    // Update task status
    updateTaskMutation.mutate({ taskId: task.$id, updates: { status: newStatus } })
  }

  const handleCreateTask = () => {
    if (taskTitle.trim()) {
      createTaskMutation.mutate()
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description || '')
    setShowTaskDialog(true)
  }

  const handleUpdateTask = () => {
    if (taskTitle.trim() && editingTask) {
      updateTaskMutation.mutate({
        taskId: editingTask.$id,
        updates: {
          title: taskTitle,
          description: taskDescription,
        },
      })
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => {
          setEditingTask(null)
          setTaskTitle('')
          setTaskDescription('')
          setShowTaskDialog(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              onTaskEdit={handleEditTask}
              onTaskDelete={(taskId) => {
                setDeleteTaskDialog({ open: true, taskId })
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <Card className="w-[300px] opacity-90">
              <CardHeader>
                <CardTitle className="text-base">{activeTask.title}</CardTitle>
              </CardHeader>
              {activeTask.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{activeTask.description}</p>
                </CardContent>
              )}
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent onClose={() => {
          setShowTaskDialog(false)
          setEditingTask(null)
          setTaskTitle('')
          setTaskDescription('')
        }}>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details' : 'Add a new task to your board'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Task Title</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingTask ? handleUpdateTask() : handleCreateTask()
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Task description"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingTask ? handleUpdateTask() : handleCreateTask()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTaskDialog(false)
                setEditingTask(null)
                setTaskTitle('')
                setTaskDescription('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleCreateTask}
              disabled={!taskTitle.trim()}
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Alert Dialog */}
      <AlertDialog
        open={deleteTaskDialog.open}
        onOpenChange={(open) => setDeleteTaskDialog({ open, taskId: null })}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteTaskDialog.taskId) {
            deleteTaskMutation.mutate(deleteTaskDialog.taskId)
          }
        }}
      />
    </div>
  )
}

