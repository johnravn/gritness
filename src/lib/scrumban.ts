import { databases } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

const DATABASE_ID = "6942473d00010ac2bf23";
const PROJECTS_COLLECTION = "projects";
const BOARDS_COLLECTION = "boards";
const TASKS_COLLECTION = "tasks";

export interface Project {
  $id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  $id: string;
  projects: string; // Relationship to projects collection
  name: string;
  description?: string;
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
}

// Projects
export async function createProject(
  name: string,
  description?: string
): Promise<Project> {
  try {
    return (await databases.createDocument(
      DATABASE_ID,
      PROJECTS_COLLECTION,
      ID.unique(),
      {
        name,
        description: description || "",
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

export async function getProjects(): Promise<Project[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      PROJECTS_COLLECTION
    );
    return response.documents as unknown as Project[];
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
  description?: string
): Promise<Board> {
  return (await databases.createDocument(
    DATABASE_ID,
    BOARDS_COLLECTION,
    ID.unique(),
    {
      projects: projectId, // Use relationship field name
      name,
      description: description || "",
    }
  )) as unknown as Board;
}

export async function getBoards(projectId: string): Promise<Board[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      BOARDS_COLLECTION,
      [Query.equal("projects", projectId)] // Query by relationship field using Query helper
    );
    return response.documents as unknown as Board[];
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
  status: Task["status"] = "todo"
): Promise<Task> {
  // Get current max order for this board and status
  const existingTasks = await getTasks(boardId);
  const statusTasks = existingTasks.filter((t) => t.status === status);
  const maxOrder =
    statusTasks.length > 0 ? Math.max(...statusTasks.map((t) => t.order)) : -1;

  return (await databases.createDocument(
    DATABASE_ID,
    TASKS_COLLECTION,
    ID.unique(),
    {
      boards: boardId, // Use relationship field name
      title,
      description: description || "",
      status,
      order: maxOrder + 1,
    }
  )) as unknown as Task;
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
  updates: Partial<Task>
): Promise<Task> {
  return (await databases.updateDocument(
    DATABASE_ID,
    TASKS_COLLECTION,
    taskId,
    updates
  )) as unknown as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION, taskId);
}
