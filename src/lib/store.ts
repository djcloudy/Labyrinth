import { Project, Document, Snippet, MediaItem } from './types';

const KEYS = {
  projects: 'labyrinth_projects',
  documents: 'labyrinth_documents',
  snippets: 'labyrinth_snippets',
  media: 'labyrinth_media',
};

function get<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return crypto.randomUUID();
}

// Projects
export const projectStore = {
  getAll: (): Project[] => get(KEYS.projects),
  getById: (id: string): Project | undefined => get<Project>(KEYS.projects).find(p => p.id === id),
  create: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const projects = get<Project>(KEYS.projects);
    const project: Project = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects.push(project);
    set(KEYS.projects, projects);
    return project;
  },
  update: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | undefined => {
    const projects = get<Project>(KEYS.projects);
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    projects[idx] = { ...projects[idx], ...data, updatedAt: new Date().toISOString() };
    set(KEYS.projects, projects);
    return projects[idx];
  },
  delete: (id: string) => {
    set(KEYS.projects, get<Project>(KEYS.projects).filter(p => p.id !== id));
    // Unlink related items
    set(KEYS.documents, get<Document>(KEYS.documents).map(d => d.projectId === id ? { ...d, projectId: null } : d));
    set(KEYS.snippets, get<Snippet>(KEYS.snippets).map(s => s.projectId === id ? { ...s, projectId: null } : s));
    set(KEYS.media, get<MediaItem>(KEYS.media).map(m => m.projectId === id ? { ...m, projectId: null } : m));
  },
};

// Documents
export const documentStore = {
  getAll: (): Document[] => get(KEYS.documents),
  getById: (id: string): Document | undefined => get<Document>(KEYS.documents).find(d => d.id === id),
  getByProject: (projectId: string): Document[] => get<Document>(KEYS.documents).filter(d => d.projectId === projectId),
  create: (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Document => {
    const docs = get<Document>(KEYS.documents);
    const doc: Document = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    docs.push(doc);
    set(KEYS.documents, docs);
    return doc;
  },
  update: (id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Document | undefined => {
    const docs = get<Document>(KEYS.documents);
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) return undefined;
    docs[idx] = { ...docs[idx], ...data, updatedAt: new Date().toISOString() };
    set(KEYS.documents, docs);
    return docs[idx];
  },
  delete: (id: string) => {
    set(KEYS.documents, get<Document>(KEYS.documents).filter(d => d.id !== id));
  },
};

// Snippets
export const snippetStore = {
  getAll: (): Snippet[] => get(KEYS.snippets),
  getById: (id: string): Snippet | undefined => get<Snippet>(KEYS.snippets).find(s => s.id === id),
  getByProject: (projectId: string): Snippet[] => get<Snippet>(KEYS.snippets).filter(s => s.projectId === projectId),
  create: (data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Snippet => {
    const snippets = get<Snippet>(KEYS.snippets);
    const snippet: Snippet = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    snippets.push(snippet);
    set(KEYS.snippets, snippets);
    return snippet;
  },
  update: (id: string, data: Partial<Omit<Snippet, 'id' | 'createdAt'>>): Snippet | undefined => {
    const snippets = get<Snippet>(KEYS.snippets);
    const idx = snippets.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    snippets[idx] = { ...snippets[idx], ...data, updatedAt: new Date().toISOString() };
    set(KEYS.snippets, snippets);
    return snippets[idx];
  },
  delete: (id: string) => {
    set(KEYS.snippets, get<Snippet>(KEYS.snippets).filter(s => s.id !== id));
  },
};

// Media
export const mediaStore = {
  getAll: (): MediaItem[] => get(KEYS.media),
  getByProject: (projectId: string): MediaItem[] => get<MediaItem>(KEYS.media).filter(m => m.projectId === projectId),
  create: (data: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const media = get<MediaItem>(KEYS.media);
    const item: MediaItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    media.push(item);
    set(KEYS.media, media);
    return item;
  },
  delete: (id: string) => {
    set(KEYS.media, get<MediaItem>(KEYS.media).filter(m => m.id !== id));
  },
};
