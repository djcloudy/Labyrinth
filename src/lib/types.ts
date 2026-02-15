export type SnippetLanguage = 'YAML' | 'BASH' | 'PYTHON';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Snippet {
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
