import { databases } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

const DATABASE_ID =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || "6942473d00010ac2bf23";
const PROJECTS_COLLECTION = "projects";
const BOARDS_COLLECTION = "boards";
const TASKS_COLLECTION = "tasks";
const PROJECT_SHARES_COLLECTION = "projectShares";
const BOARD_SHARES_COLLECTION = "boardShares";

export interface Project {
  $id: string;
  name: string;
  description?: string;
  requiresAuth?: boolean;
  ownerId?: string; // User ID who owns the project
  userId?: string; // Legacy field, kept for backward compatibility
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  $id: string;
  projects: string; // Relationship to projects collection
  name: string;
  description?: string;
  ownerId?: string; // User ID who owns the board
  userId?: string; // Legacy field, kept for backward compatibility
  createdAt: string;
  updatedAt: string;
}

export type Permission = "read" | "write";

export interface ProjectShare {
  $id: string;
  projectId: string; // Relationship to projects collection
  userId: string; // User ID who has access
  userEmail?: string; // User email for display
  userName?: string; // User name for display
  permission: Permission;
  createdAt: string;
  updatedAt: string;
}

export interface BoardShare {
  $id: string;
  boardId: string; // Relationship to boards collection
  userId: string; // User ID who has access
  userEmail?: string; // User email for display
  userName?: string; // User name for display
  permission: Permission;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  $id: string;
  boards: string; // Relationship to boards collection
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID who created the task
  createdByName?: string; // User name who created the task
  statusChangedAt?: string; // Timestamp when moved to current status
  assignedTo?: string; // User ID who is assigned to the task
  assignedToName?: string; // User name who is assigned to the task
  assignedToEmail?: string; // User email who is assigned to the task
}

// Projects
export async function createProject(
  name: string,
  description?: string,
  requiresAuth: boolean = false,
  userId?: string
): Promise<Project> {
  try {
    return (await databases.createDocument(
      DATABASE_ID,
      PROJECTS_COLLECTION,
      ID.unique(),
      {
        name,
        description: description || "",
        requiresAuth: requiresAuth || false,
        ownerId: userId || "",
        userId: userId || "", // Keep for backward compatibility
      }
    )) as unknown as Project;
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    console.error("Error creating project:", error);
    throw new Error(
      appwriteError.message ||
        `Failed to create project. Error code: ${
          appwriteError.code || "unknown"
        }. ` +
          `Make sure the collection "${PROJECTS_COLLECTION}" exists and has proper permissions.`
    );
  }
}

export async function getProjects(userId?: string): Promise<Project[]> {
  try {
    if (!userId) {
      // Return empty array if no user ID provided
      return [];
    }
    
    // Get projects owned by user
    const ownedProjects = await databases.listDocuments(
      DATABASE_ID,
      PROJECTS_COLLECTION,
      [Query.equal("ownerId", userId)]
    );
    
    // Get projects shared with user
    let sharedProjects: Project[] = [];
    try {
      const shares = await databases.listDocuments(
        DATABASE_ID,
        PROJECT_SHARES_COLLECTION,
        [Query.equal("userId", userId)]
      );
      
      if (shares.documents.length > 0) {
        const sharedProjectIds = shares.documents.map((s: any) => s.projectId);
        // Fetch each shared project individually (Appwrite doesn't support IN queries easily)
        const projectPromises = sharedProjectIds.map((projectId: string) =>
          databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION, projectId).catch(() => null)
        );
        const projectResults = await Promise.all(projectPromises);
        sharedProjects = projectResults.filter(p => p !== null) as unknown as Project[];
      }
    } catch (shareError) {
      // If shares collection doesn't exist yet, just continue with owned projects
      console.warn("Could not fetch shared projects:", shareError);
    }
    
    // Combine and deduplicate
    const allProjects = [...ownedProjects.documents, ...sharedProjects] as unknown as Project[];
    const uniqueProjects = Array.from(
      new Map(allProjects.map(p => [p.$id, p])).values()
    );
    
    return uniqueProjects;
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      console.error(
        "Database or collection not found. Please create:\n" +
          `1. Database with ID: "${DATABASE_ID}"\n` +
          `2. Collection with ID: "${PROJECTS_COLLECTION}" in that database\n` +
          "See the Appwrite console for setup instructions."
      );
      // Return empty array instead of throwing
      return [];
    }
    throw error;
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, PROJECTS_COLLECTION, projectId);
}

// Boards
export async function createBoard(
  projectId: string,
  name: string,
  description?: string,
  userId?: string
): Promise<Board> {
  return (await databases.createDocument(
    DATABASE_ID,
    BOARDS_COLLECTION,
    ID.unique(),
    {
      projects: projectId, // Use relationship field name
      name,
      description: description || "",
      ownerId: userId || "",
      userId: userId || "", // Keep for backward compatibility
    }
  )) as unknown as Board;
}

export async function getBoards(projectId: string, userId?: string): Promise<Board[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOARDS_COLLECTION,
      [Query.equal("projects", projectId)] // Query by relationship field using Query helper
    );
    
    // If userId is provided, also get boards shared with the user
    let sharedBoards: Board[] = [];
    if (userId) {
      try {
        const shares = await databases.listDocuments(
          DATABASE_ID,
          BOARD_SHARES_COLLECTION,
          [Query.equal("userId", userId)]
        );
        
        if (shares.documents.length > 0) {
          const sharedBoardIds = shares.documents
            .map((s: any) => s.boardId)
            .filter((id: string) => {
              // Only include boards that belong to this project
              return response.documents.some((b: any) => b.$id === id && b.projects === projectId);
            });
          
          const boardPromises = sharedBoardIds.map((boardId: string) =>
            databases.getDocument(DATABASE_ID, BOARDS_COLLECTION, boardId).catch(() => null)
          );
          const boardResults = await Promise.all(boardPromises);
          sharedBoards = boardResults.filter(b => b !== null) as unknown as Board[];
        }
      } catch (shareError) {
        console.warn("Could not fetch shared boards:", shareError);
      }
    }
    
    // Combine and deduplicate
    const allBoards = [...response.documents, ...sharedBoards] as unknown as Board[];
    const uniqueBoards = Array.from(
      new Map(allBoards.map(b => [b.$id, b])).values()
    );
    
    return uniqueBoards;
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      console.error(
        "Database or collection not found. Please create:\n" +
          `1. Database with ID: "${DATABASE_ID}"\n` +
          `2. Collection with ID: "${BOARDS_COLLECTION}" in that database`
      );
      return [];
    }
    throw error;
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, BOARDS_COLLECTION, boardId);
}

// Tasks
export async function createTask(
  boardId: string,
  title: string,
  description?: string,
  status: Task["status"] = "todo",
  userId?: string,
  userName?: string
): Promise<Task> {
  // Get current max order for this board and status
  const existingTasks = await getTasks(boardId);
  const statusTasks = existingTasks.filter((t) => t.status === status);
  const maxOrder =
    statusTasks.length > 0 ? Math.max(...statusTasks.map((t) => t.order)) : -1;

  const now = new Date().toISOString();

  const taskData: any = {
    boards: boardId, // Use relationship field name
    title,
    description: description || "",
    status,
    order: maxOrder + 1,
  };

  // Only include optional fields if they might exist in the database
  // These will be added when the user adds the attributes to Appwrite
  if (userId) taskData.createdBy = userId;
  if (userName) taskData.createdByName = userName;
  taskData.statusChangedAt = now; // Will fail gracefully if attribute doesn't exist
  // assignedTo fields are optional and will be set when assigning

  try {
    return (await databases.createDocument(
      DATABASE_ID,
      TASKS_COLLECTION,
      ID.unique(),
      taskData
    )) as unknown as Task;
  } catch (error: any) {
    // If error is about unknown attributes, retry without optional fields
    if (error.message?.includes('Unknown attribute')) {
      const { createdBy, createdByName, statusChangedAt, assignedTo, assignedToName, assignedToEmail, ...requiredFields } = taskData;
      return (await databases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION,
        ID.unique(),
        requiredFields
      )) as unknown as Task;
    }
    throw error;
  }
}

export async function getTasks(boardId: string): Promise<Task[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      TASKS_COLLECTION,
      [Query.equal("boards", boardId)] // Query by relationship field
    );
    return response.documents as unknown as Task[];
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      console.error(
        "Database or collection not found. Please create:\n" +
          `1. Database with ID: "${DATABASE_ID}"\n` +
          `2. Collection with ID: "${TASKS_COLLECTION}" in that database`
      );
      return [];
    }
    throw error;
  }
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  currentTask?: Task
): Promise<Task> {
  // If status is changing, try to update statusChangedAt timestamp
  // Only include it if the attribute exists in the database
  const finalUpdates = { ...updates };
  
  // Remove statusChangedAt if it's in updates but might not exist in DB
  // We'll try to add it, but if it fails, we'll retry without it
  let statusChangedAtValue: string | undefined;
  if (updates.status && currentTask && currentTask.status !== updates.status) {
    statusChangedAtValue = new Date().toISOString();
    // Only add if we're updating status (will be handled in try-catch if it fails)
    finalUpdates.statusChangedAt = statusChangedAtValue;
  }

  try {
    return (await databases.updateDocument(
      DATABASE_ID,
      TASKS_COLLECTION,
      taskId,
      finalUpdates
    )) as unknown as Task;
  } catch (error: any) {
    // If error is about unknown attribute, retry without statusChangedAt
    if (error.message?.includes('Unknown attribute') && statusChangedAtValue) {
      const { statusChangedAt, ...updatesWithoutStatusChangedAt } = finalUpdates;
      return (await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION,
        taskId,
        updatesWithoutStatusChangedAt
      )) as unknown as Task;
    }
    throw error;
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION, taskId);
}

// Collaboration functions for Projects
export async function inviteUserToProject(
  projectId: string,
  userEmail: string,
  permission: Permission,
  inviterUserId?: string,
  inviterUserName?: string
): Promise<ProjectShare> {
  // In a real app, you'd look up the user by email from Appwrite's Users API
  // For now, we'll store the email and let the backend handle user lookup
  // This requires the user to exist in Appwrite first
  try {
    return (await databases.createDocument(
      DATABASE_ID,
      PROJECT_SHARES_COLLECTION,
      ID.unique(),
      {
        projectId,
        userEmail,
        permission,
        // Note: userId will need to be set when the user accepts or is found
        // For now, we store email and look it up later
      }
    )) as unknown as ProjectShare;
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    console.error("Error inviting user to project:", error);
    throw new Error(
      appwriteError.message || "Failed to invite user to project"
    );
  }
}

export async function getProjectShares(projectId: string): Promise<ProjectShare[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PROJECT_SHARES_COLLECTION,
      [Query.equal("projectId", projectId)]
    );
    return response.documents as unknown as ProjectShare[];
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      return [];
    }
    throw error;
  }
}

export async function removeProjectShare(shareId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, PROJECT_SHARES_COLLECTION, shareId);
}

export async function checkProjectPermission(
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; permission?: Permission; isOwner: boolean }> {
  try {
    // Check if user is owner
    const project = await databases.getDocument(
      DATABASE_ID,
      PROJECTS_COLLECTION,
      projectId
    ) as unknown as Project;
    
    if (project.ownerId === userId || project.userId === userId) {
      return { hasAccess: true, permission: "write", isOwner: true };
    }
    
    // Check if user has a share
    const shares = await databases.listDocuments(
      DATABASE_ID,
      PROJECT_SHARES_COLLECTION,
      [
        Query.equal("projectId", projectId),
        Query.equal("userId", userId)
      ]
    );
    
    if (shares.documents.length > 0) {
      const share = shares.documents[0] as unknown as ProjectShare;
      return { hasAccess: true, permission: share.permission, isOwner: false };
    }
    
    return { hasAccess: false, isOwner: false };
  } catch (error) {
    console.error("Error checking project permission:", error);
    return { hasAccess: false, isOwner: false };
  }
}

// Collaboration functions for Boards
export async function inviteUserToBoard(
  boardId: string,
  userEmail: string,
  permission: Permission,
  inviterUserId?: string,
  inviterUserName?: string
): Promise<BoardShare> {
  try {
    return (await databases.createDocument(
      DATABASE_ID,
      BOARD_SHARES_COLLECTION,
      ID.unique(),
      {
        boardId,
        userEmail,
        permission,
      }
    )) as unknown as BoardShare;
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    console.error("Error inviting user to board:", error);
    throw new Error(
      appwriteError.message || "Failed to invite user to board"
    );
  }
}

export async function getBoardShares(boardId: string): Promise<BoardShare[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOARD_SHARES_COLLECTION,
      [Query.equal("boardId", boardId)]
    );
    return response.documents as unknown as BoardShare[];
  } catch (error: unknown) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      return [];
    }
    throw error;
  }
}

export async function removeBoardShare(shareId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, BOARD_SHARES_COLLECTION, shareId);
}

export async function checkBoardPermission(
  boardId: string,
  userId: string
): Promise<{ hasAccess: boolean; permission?: Permission; isOwner: boolean }> {
  try {
    // Check if user is owner
    const board = await databases.getDocument(
      DATABASE_ID,
      BOARDS_COLLECTION,
      boardId
    ) as unknown as Board;
    
    if (board.ownerId === userId || board.userId === userId) {
      return { hasAccess: true, permission: "write", isOwner: true };
    }
    
    // Check if user has a share
    const shares = await databases.listDocuments(
      DATABASE_ID,
      BOARD_SHARES_COLLECTION,
      [
        Query.equal("boardId", boardId),
        Query.equal("userId", userId)
      ]
    );
    
    if (shares.documents.length > 0) {
      const share = shares.documents[0] as unknown as BoardShare;
      return { hasAccess: true, permission: share.permission, isOwner: false };
    }
    
    // Check project-level access
    const project = await databases.getDocument(
      DATABASE_ID,
      PROJECTS_COLLECTION,
      board.projects
    ) as unknown as Project;
    
    if (project) {
      const projectPermission = await checkProjectPermission(board.projects, userId);
      if (projectPermission.hasAccess) {
        return { 
          hasAccess: true, 
          permission: projectPermission.permission, 
          isOwner: false 
        };
      }
    }
    
    return { hasAccess: false, isOwner: false };
  } catch (error) {
    console.error("Error checking board permission:", error);
    return { hasAccess: false, isOwner: false };
  }
}
