import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Edit2, Eye, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  checkBoardPermission,
  getBoardShares,
  type Task,
  type BoardShare,
} from "@/lib/scrumban";

interface KanbanBoardProps {
  boardId: string;
}

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    id: "done",
    title: "Done",
    color: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
] as const;

type Status = "todo" | "in-progress" | "done";

function TaskCard({
  task,
  canWrite,
  onOpenDetails,
}: {
  task: Task;
  canWrite: boolean;
  onOpenDetails: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.$id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) {
        return "just now";
      } else if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      } else if (diffDays < 10) {
        return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
      } else {
        // If more than 10 days, show full date
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      return "N/A";
    }
  };

  // Get the actual timestamp values (Appwrite uses $createdAt and $updatedAt)
  const updatedAt = (task as any).$updatedAt || task.updatedAt;
  const statusChangedAt = task.statusChangedAt;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 transition-shadow ${
        canWrite
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "cursor-default opacity-90"
      }`}
      {...(canWrite ? { ...attributes, ...listeners } : {})}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium flex-1">
            {task.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onOpenDetails();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {statusChangedAt ? (
              <span>Updated {formatRelativeTime(statusChangedAt)}</span>
            ) : updatedAt ? (
              <span>Updated {formatRelativeTime(updatedAt)}</span>
            ) : null}
          </div>
          {task.assignedToName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">
                {task.assignedToName}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Column({
  id,
  title,
  color,
  tasks,
  onTaskDetails,
  canWrite,
}: {
  id: Status;
  title: string;
  color: string;
  tasks: Task[];
  onTaskDetails: (task: Task) => void;
  canWrite: boolean;
}) {
  const taskIds = tasks.map((task) => task.$id);
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
      status: id,
    },
  });

  return (
    <div className="flex-1 min-w-[300px]">
      <div className={`p-3 rounded-t-lg ${color} mb-4`}>
        <h3 className="font-semibold">
          {title} ({tasks.length})
        </h3>
      </div>
      <div
        ref={setNodeRef}
        className={`rounded-b-lg border-2 min-h-[200px] p-2 transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-transparent"
        }`}
        style={{ minHeight: "200px" }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[150px]">
            {tasks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Drop tasks here
              </div>
            )}
            {tasks.map((task) => (
              <TaskCard
                key={task.$id}
                task={task}
                onOpenDetails={() => onTaskDetails(task)}
                canWrite={canWrite}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });
  const [taskDetailsDialog, setTaskDetailsDialog] = useState<Task | null>(null);

  // Check board permissions
  const { data: permissionInfo } = useQuery({
    queryKey: ["boardPermission", boardId, user?.$id],
    queryFn: () => {
      if (!user?.$id)
        return { hasAccess: false, permission: undefined, isOwner: false };
      return checkBoardPermission(boardId, user.$id);
    },
    enabled: !!boardId && !!user?.$id,
  });

  const canWrite =
    permissionInfo?.permission === "write" || permissionInfo?.isOwner || false;
  const hasAccess = permissionInfo?.hasAccess ?? false;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
      disabled: !canWrite, // Disable drag for read-only users
    })
  );

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", boardId],
    queryFn: () => getTasks(boardId),
  });

  // Fetch board collaborators
  const { data: boardShares = [] } = useQuery({
    queryKey: ["boardShares", boardId],
    queryFn: async () => {
      try {
        return await getBoardShares(boardId);
      } catch (error: any) {
        // If unauthorized, return empty array (user might not have access to view shares)
        if (error.code === 401 || error.message?.includes("unauthorized")) {
          console.warn("Could not fetch board shares:", error.message);
          return [];
        }
        throw error;
      }
    },
    enabled: !!boardId,
  });

  // Get list of available collaborators (board owner + board shares)
  const collaborators = useMemo(() => {
    const collabs: Array<{ userId: string; name: string; email?: string }> = [];

    // Add board owner if available
    if (permissionInfo?.isOwner && user) {
      collabs.push({
        userId: user.$id,
        name: user.name || user.email || "You",
        email: user.email,
      });
    }

    // Add board shares
    boardShares.forEach((share: BoardShare) => {
      if (share.userId && !collabs.find((c) => c.userId === share.userId)) {
        collabs.push({
          userId: share.userId,
          name: share.userName || share.userEmail || "Unknown",
          email: share.userEmail,
        });
      }
    });

    return collabs;
  }, [boardShares, permissionInfo, user]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: () =>
      createTask(
        boardId,
        taskTitle,
        taskDescription,
        "todo",
        user?.$id,
        user?.name || user?.email || "Anonymous"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      setShowTaskDialog(false);
      setTaskTitle("");
      setTaskDescription("");
    },
  });

  // Update task mutation with optimistic updates
  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      updates,
      currentTask,
    }: {
      taskId: string;
      updates: Partial<Task>;
      currentTask?: Task;
    }) => updateTask(taskId, updates, currentTask),
    onMutate: async ({ taskId, updates, currentTask }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tasks", boardId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>([
        "tasks",
        boardId,
      ]);

      // Optimistically update to the new value
      if (previousTasks && currentTask) {
        queryClient.setQueryData<Task[]>(["tasks", boardId], (old) => {
          if (!old) return old;
          return old.map((t) => (t.$id === taskId ? { ...t, ...updates } : t));
        });
      }

      return { previousTasks };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", boardId], context.previousTasks);
      }
      console.error("Error updating task:", error);
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskTitle("");
      setTaskDescription("");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
    },
  });

  const tasksByStatus = {
    todo: tasks
      .filter((t) => t.status === "todo")
      .sort((a, b) => a.order - b.order),
    "in-progress": tasks
      .filter((t) => t.status === "in-progress")
      .sort((a, b) => a.order - b.order),
    done: tasks
      .filter((t) => t.status === "done")
      .sort((a, b) => a.order - b.order),
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.$id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: any) => {
    // This helps with drop detection
    const { over } = event;
    if (over) {
      // Visual feedback is handled by isOver in Column component
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const task = tasks.find((t) => t.$id === active.id);
    if (!task) {
      setActiveTask(null);
      return;
    }

    // Check if over.id is a valid status (column ID)
    const validStatuses: Status[] = ["todo", "in-progress", "done"];
    let newStatus: Status | undefined;

    // First check if dropped directly on a column (check both id and data)
    if (validStatuses.includes(over.id as Status)) {
      newStatus = over.id as Status;
    } else if (
      over.data?.current?.status &&
      validStatuses.includes(over.data.current.status as Status)
    ) {
      // Check droppable data
      newStatus = over.data.current.status as Status;
    } else {
      // Dropped on a task - find which column that task belongs to
      const overTask = tasks.find((t) => t.$id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      } else {
        // Try to find by checking tasksByStatus
        for (const status of validStatuses) {
          if (tasksByStatus[status].some((t) => t.$id === over.id)) {
            newStatus = status;
            break;
          }
        }
      }
    }

    // If still no status found, don't update
    if (!newStatus) {
      setActiveTask(null);
      return;
    }

    // Don't update if status hasn't changed
    if (task.status === newStatus) {
      setActiveTask(null);
      return;
    }

    // Check write permission before updating
    if (!canWrite) {
      alert("You only have read access to this board");
      setActiveTask(null);
      return;
    }

    // Calculate new order (place at end of new column)
    const newColumnTasks = tasksByStatus[newStatus];
    const maxOrder =
      newColumnTasks.length > 0
        ? Math.max(...newColumnTasks.map((t) => t.order))
        : -1;
    const newOrder = maxOrder + 1;

    // Update task status with current task for status change tracking
    updateTaskMutation.mutate(
      {
        taskId: task.$id,
        updates: {
          status: newStatus,
          order: newOrder,
        },
        currentTask: task,
      },
      {
        onSuccess: () => {
          // Hide drag overlay after successful update
          setActiveTask(null);
        },
        onError: () => {
          // Hide drag overlay even on error
          setActiveTask(null);
        },
      }
    );
  };

  const handleCreateTask = () => {
    if (!canWrite) {
      alert("You only have read access to this board");
      return;
    }
    if (taskTitle.trim()) {
      createTaskMutation.mutate();
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setShowTaskDialog(true);
  };

  const handleUpdateTask = () => {
    if (!canWrite) {
      alert("You only have read access to this board");
      return;
    }
    if (taskTitle.trim() && editingTask) {
      updateTaskMutation.mutate({
        taskId: editingTask.$id,
        updates: {
          title: taskTitle,
          description: taskDescription,
        },
        currentTask: editingTask,
      });
    }
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            You don't have access to this board.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        {canWrite && (
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskTitle("");
              setTaskDescription("");
              setShowTaskDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
        {!canWrite && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Read-only access
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              onTaskDetails={(task) => {
                setTaskDetailsDialog(task);
              }}
              canWrite={canWrite}
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
                  <p className="text-sm text-muted-foreground">
                    {activeTask.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent
          onClose={() => {
            setShowTaskDialog(false);
            setEditingTask(null);
            setTaskTitle("");
            setTaskDescription("");
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update task details"
                : "Add a new task to your board"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Task Title
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingTask ? handleUpdateTask() : handleCreateTask();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description (optional)
              </label>
              <Input
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Task description"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingTask ? handleUpdateTask() : handleCreateTask();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTaskDialog(false);
                setEditingTask(null);
                setTaskTitle("");
                setTaskDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTask ? handleUpdateTask : handleCreateTask}
              disabled={!taskTitle.trim()}
            >
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      {taskDetailsDialog && (
        <Dialog
          open={!!taskDetailsDialog}
          onOpenChange={(open) => !open && setTaskDetailsDialog(null)}
        >
          <DialogContent onClose={() => setTaskDetailsDialog(null)}>
            <DialogHeader>
              <DialogTitle>{taskDetailsDialog.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {taskDetailsDialog.description && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description
                  </label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {taskDetailsDialog.description}
                  </p>
                </div>
              )}
              {canWrite && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Assign to
                  </label>
                  <Select
                    value={taskDetailsDialog.assignedTo || ""}
                    onChange={(e) => {
                      const selectedUserId = e.target.value;
                      const selectedCollaborator = collaborators.find(
                        (c) => c.userId === selectedUserId
                      );

                      if (selectedCollaborator) {
                        updateTaskMutation.mutate({
                          taskId: taskDetailsDialog.$id,
                          updates: {
                            assignedTo: selectedCollaborator.userId,
                            assignedToName: selectedCollaborator.name,
                            assignedToEmail: selectedCollaborator.email,
                          },
                          currentTask: taskDetailsDialog,
                        });
                        // Optimistically update the dialog
                        setTaskDetailsDialog({
                          ...taskDetailsDialog,
                          assignedTo: selectedCollaborator.userId,
                          assignedToName: selectedCollaborator.name,
                          assignedToEmail: selectedCollaborator.email,
                        });
                      } else {
                        // Unassign
                        updateTaskMutation.mutate({
                          taskId: taskDetailsDialog.$id,
                          updates: {
                            assignedTo: "",
                            assignedToName: "",
                            assignedToEmail: "",
                          },
                          currentTask: taskDetailsDialog,
                        });
                        // Optimistically update the dialog
                        setTaskDetailsDialog({
                          ...taskDetailsDialog,
                          assignedTo: undefined,
                          assignedToName: undefined,
                          assignedToEmail: undefined,
                        });
                      }
                    }}
                  >
                    <option value="">Unassigned</option>
                    {collaborators.map((collab) => (
                      <option key={collab.userId} value={collab.userId}>
                        {collab.name} {collab.email ? `(${collab.email})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {!canWrite && taskDetailsDialog.assignedToName && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Assigned to
                  </label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{taskDetailsDialog.assignedToName}</span>
                    {taskDetailsDialog.assignedToEmail && (
                      <span className="text-xs">
                        ({taskDetailsDialog.assignedToEmail})
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2 text-sm border-t pt-4">
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="text-muted-foreground">
                    {taskDetailsDialog.status === "todo"
                      ? "To Do"
                      : taskDetailsDialog.status === "in-progress"
                      ? "In Progress"
                      : "Done"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  <span className="text-muted-foreground">
                    {taskDetailsDialog.createdByName || "Anonymous"} on{" "}
                    {(() => {
                      const createdAt =
                        (taskDetailsDialog as any).$createdAt ||
                        taskDetailsDialog.createdAt;
                      if (!createdAt) return "N/A";
                      try {
                        const date = new Date(createdAt);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } catch {
                        return "N/A";
                      }
                    })()}
                  </span>
                </div>
                {taskDetailsDialog.statusChangedAt && (
                  <div>
                    <span className="font-medium">
                      Moved to current status:
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {(() => {
                        if (!taskDetailsDialog.statusChangedAt) return "N/A";
                        try {
                          const date = new Date(
                            taskDetailsDialog.statusChangedAt
                          );
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / (1000 * 60));
                          const diffHours = Math.floor(
                            diffMs / (1000 * 60 * 60)
                          );
                          const diffDays = Math.floor(
                            diffMs / (1000 * 60 * 60 * 24)
                          );

                          if (diffMins < 1) return "just now";
                          else if (diffMins < 60)
                            return `${diffMins} ${
                              diffMins === 1 ? "minute" : "minutes"
                            } ago`;
                          else if (diffHours < 24)
                            return `${diffHours} ${
                              diffHours === 1 ? "hour" : "hours"
                            } ago`;
                          else if (diffDays < 10)
                            return `${diffDays} ${
                              diffDays === 1 ? "day" : "days"
                            } ago`;
                          else {
                            return date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                          }
                        } catch {
                          return "N/A";
                        }
                      })()}
                    </span>
                  </div>
                )}
                {(() => {
                  const updatedAt =
                    (taskDetailsDialog as any).$updatedAt ||
                    taskDetailsDialog.updatedAt;
                  if (!updatedAt || taskDetailsDialog.statusChangedAt)
                    return null;
                  return (
                    <div>
                      <span className="font-medium">Last updated:</span>{" "}
                      <span className="text-muted-foreground">
                        {(() => {
                          try {
                            const date = new Date(updatedAt);
                            const now = new Date();
                            const diffMs = now.getTime() - date.getTime();
                            const diffMins = Math.floor(diffMs / (1000 * 60));
                            const diffHours = Math.floor(
                              diffMs / (1000 * 60 * 60)
                            );
                            const diffDays = Math.floor(
                              diffMs / (1000 * 60 * 60 * 24)
                            );

                            if (diffMins < 1) return "just now";
                            else if (diffMins < 60)
                              return `${diffMins} ${
                                diffMins === 1 ? "minute" : "minutes"
                              } ago`;
                            else if (diffHours < 24)
                              return `${diffHours} ${
                                diffHours === 1 ? "hour" : "hours"
                              } ago`;
                            else if (diffDays < 10)
                              return `${diffDays} ${
                                diffDays === 1 ? "day" : "days"
                              } ago`;
                            else {
                              return date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            }
                          } catch {
                            return "N/A";
                          }
                        })()}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
            {canWrite && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTaskDetailsDialog(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEditTask(taskDetailsDialog);
                    setTaskDetailsDialog(null);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setTaskDetailsDialog(null);
                    setDeleteTaskDialog({
                      open: true,
                      taskId: taskDetailsDialog.$id,
                    });
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogFooter>
            )}
            {!canWrite && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTaskDetailsDialog(null);
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

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
            deleteTaskMutation.mutate(deleteTaskDialog.taskId);
          }
        }}
      />
    </div>
  );
}
