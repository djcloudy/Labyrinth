export type SnippetLanguage = 'YAML' | 'BASH' | 'PYTHON';
export type ContentSource = 'manual' | 'assistant' | 'import' | 'api';

export interface BaseMeta {
  tags?: string[];
  source?: ContentSource;
  createdBy?: string;
  updatedBy?: string;
  externalRef?: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document extends BaseMeta {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Snippet extends BaseMeta {
  id: string;
  title: string;
  language: SnippetLanguage;
  code: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  type: string;
  projectId: string | null;
  createdAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task extends BaseMeta {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  dueDate?: string;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Revision<T = unknown> {
  revisionId: string;
  timestamp: string;
  updatedBy?: string | null;
  source?: ContentSource;
  snapshot: T;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'capture';
  collection: string;
  source: ContentSource;
  title?: string;
  type?: string;
}

export type AIProvider = 'openai' | 'gemini' | 'ollama';
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: AIProvider;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeKind = 'note' | 'snippet' | 'image' | 'link';

export interface KnowledgeEntry extends BaseMeta {
  id: string;
  kind: KnowledgeKind;
  title: string;
  tags: string[];
  /** note: markdown body */
  content?: string;
  /** snippet: code body */
  code?: string;
  /** snippet: language */
  language?: SnippetLanguage;
  /** image: data url; link: external url */
  url?: string;
  /** image: mime type */
  mediaType?: string;
  /** link: short description */
  description?: string;
  createdAt: string;
  updatedAt: string;
}
