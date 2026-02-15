import { Project, Document, Snippet, MediaItem, Task } from './types';
import { isApiAvailable, apiGetAll, apiCreate, apiUpdate, apiDelete } from './api';

const KEYS = {
  projects: 'labyrinth_projects',
  documents: 'labyrinth_documents',
  snippets: 'labyrinth_snippets',
  media: 'labyrinth_media',
  tasks: 'labyrinth_tasks',
};

function getLocal<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return crypto.randomUUID();
}

function useApi(): boolean {
  return isApiAvailable() === true;
}

// Projects
export const projectStore = {
  getAll: async (): Promise<Project[]> => {
    if (useApi()) return apiGetAll<Project>('projects');
    return getLocal(KEYS.projects);
  },
  getById: async (id: string): Promise<Project | undefined> => {
    if (useApi()) {
      const all = await apiGetAll<Project>('projects');
      return all.find(p => p.id === id);
    }
    return getLocal<Project>(KEYS.projects).find(p => p.id === id);
  },
  create: async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
    if (useApi()) return apiCreate<Project>('projects', data);
    const projects = getLocal<Project>(KEYS.projects);
    const project: Project = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects.push(project);
    setLocal(KEYS.projects, projects);
    return project;
  },
  update: async (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | undefined> => {
    if (useApi()) return apiUpdate<Project>('projects', id, data);
    const projects = getLocal<Project>(KEYS.projects);
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    projects[idx] = { ...projects[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.projects, projects);
    return projects[idx];
  },
  delete: async (id: string): Promise<void> => {
    if (useApi()) return apiDelete('projects', id);
    setLocal(KEYS.projects, getLocal<Project>(KEYS.projects).filter(p => p.id !== id));
    setLocal(KEYS.documents, getLocal<Document>(KEYS.documents).map(d => d.projectId === id ? { ...d, projectId: null } : d));
    setLocal(KEYS.snippets, getLocal<Snippet>(KEYS.snippets).map(s => s.projectId === id ? { ...s, projectId: null } : s));
    setLocal(KEYS.media, getLocal<MediaItem>(KEYS.media).map(m => m.projectId === id ? { ...m, projectId: null } : m));
    setLocal(KEYS.tasks, getLocal<Task>(KEYS.tasks).filter(t => t.projectId !== id));
  },
};

// Documents
export const documentStore = {
  getAll: async (): Promise<Document[]> => {
    if (useApi()) return apiGetAll<Document>('documents');
    return getLocal(KEYS.documents);
  },
  getById: async (id: string): Promise<Document | undefined> => {
    if (useApi()) {
      const all = await apiGetAll<Document>('documents');
      return all.find(d => d.id === id);
    }
    return getLocal<Document>(KEYS.documents).find(d => d.id === id);
  },
  getByProject: async (projectId: string): Promise<Document[]> => {
    if (useApi()) {
      const all = await apiGetAll<Document>('documents');
      return all.filter(d => d.projectId === projectId);
    }
    return getLocal<Document>(KEYS.documents).filter(d => d.projectId === projectId);
  },
  create: async (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> => {
    if (useApi()) return apiCreate<Document>('documents', data);
    const docs = getLocal<Document>(KEYS.documents);
    const doc: Document = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    docs.push(doc);
    setLocal(KEYS.documents, docs);
    return doc;
  },
  update: async (id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Promise<Document | undefined> => {
    if (useApi()) return apiUpdate<Document>('documents', id, data);
    const docs = getLocal<Document>(KEYS.documents);
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) return undefined;
    docs[idx] = { ...docs[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.documents, docs);
    return docs[idx];
  },
  delete: async (id: string): Promise<void> => {
    if (useApi()) return apiDelete('documents', id);
    setLocal(KEYS.documents, getLocal<Document>(KEYS.documents).filter(d => d.id !== id));
  },
};

// Snippets
export const snippetStore = {
  getAll: async (): Promise<Snippet[]> => {
    if (useApi()) return apiGetAll<Snippet>('snippets');
    return getLocal(KEYS.snippets);
  },
  getById: async (id: string): Promise<Snippet | undefined> => {
    if (useApi()) {
      const all = await apiGetAll<Snippet>('snippets');
      return all.find(s => s.id === id);
    }
    return getLocal<Snippet>(KEYS.snippets).find(s => s.id === id);
  },
  getByProject: async (projectId: string): Promise<Snippet[]> => {
    if (useApi()) {
      const all = await apiGetAll<Snippet>('snippets');
      return all.filter(s => s.projectId === projectId);
    }
    return getLocal<Snippet>(KEYS.snippets).filter(s => s.projectId === projectId);
  },
  create: async (data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Snippet> => {
    if (useApi()) return apiCreate<Snippet>('snippets', data);
    const snippets = getLocal<Snippet>(KEYS.snippets);
    const snippet: Snippet = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    snippets.push(snippet);
    setLocal(KEYS.snippets, snippets);
    return snippet;
  },
  update: async (id: string, data: Partial<Omit<Snippet, 'id' | 'createdAt'>>): Promise<Snippet | undefined> => {
    if (useApi()) return apiUpdate<Snippet>('snippets', id, data);
    const snippets = getLocal<Snippet>(KEYS.snippets);
    const idx = snippets.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    snippets[idx] = { ...snippets[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.snippets, snippets);
    return snippets[idx];
  },
  delete: async (id: string): Promise<void> => {
    if (useApi()) return apiDelete('snippets', id);
    setLocal(KEYS.snippets, getLocal<Snippet>(KEYS.snippets).filter(s => s.id !== id));
  },
};

// Media
export const mediaStore = {
  getAll: async (): Promise<MediaItem[]> => {
    if (useApi()) return apiGetAll<MediaItem>('media');
    return getLocal(KEYS.media);
  },
  getByProject: async (projectId: string): Promise<MediaItem[]> => {
    if (useApi()) {
      const all = await apiGetAll<MediaItem>('media');
      return all.filter(m => m.projectId === projectId);
    }
    return getLocal<MediaItem>(KEYS.media).filter(m => m.projectId === projectId);
  },
  create: async (data: Omit<MediaItem, 'id' | 'createdAt'>): Promise<MediaItem> => {
    if (useApi()) return apiCreate<MediaItem>('media', data);
    const media = getLocal<MediaItem>(KEYS.media);
    const item: MediaItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    media.push(item);
    setLocal(KEYS.media, media);
    return item;
  },
  update: async (id: string, data: Partial<Omit<MediaItem, 'id' | 'createdAt'>>): Promise<MediaItem | undefined> => {
    if (useApi()) return apiUpdate<MediaItem>('media', id, data);
    const media = getLocal<MediaItem>(KEYS.media);
    const idx = media.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    media[idx] = { ...media[idx], ...data };
    setLocal(KEYS.media, media);
    return media[idx];
  },
  delete: async (id: string): Promise<void> => {
    if (useApi()) return apiDelete('media', id);
    setLocal(KEYS.media, getLocal<MediaItem>(KEYS.media).filter(m => m.id !== id));
  },
};

// Tasks
export const taskStore = {
  getAll: async (): Promise<Task[]> => {
    if (useApi()) return apiGetAll<Task>('tasks');
    return getLocal(KEYS.tasks);
  },
  getByProject: async (projectId: string): Promise<Task[]> => {
    if (useApi()) {
      const all = await apiGetAll<Task>('tasks');
      return all.filter(t => t.projectId === projectId);
    }
    return getLocal<Task>(KEYS.tasks).filter(t => t.projectId === projectId);
  },
  create: async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    if (useApi()) return apiCreate<Task>('tasks', data);
    const tasks = getLocal<Task>(KEYS.tasks);
    const task: Task = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    tasks.push(task);
    setLocal(KEYS.tasks, tasks);
    return task;
  },
  update: async (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task | undefined> => {
    if (useApi()) return apiUpdate<Task>('tasks', id, data);
    const tasks = getLocal<Task>(KEYS.tasks);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
    setLocal(KEYS.tasks, tasks);
    return tasks[idx];
  },
  delete: async (id: string): Promise<void> => {
    if (useApi()) return apiDelete('tasks', id);
    setLocal(KEYS.tasks, getLocal<Task>(KEYS.tasks).filter(t => t.id !== id));
  },
};
