// 共享数据库实体类型

export interface Project {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  summary: string;
  status: "draft" | "writing" | "completed";
  created_at: string;
  updated_at: string;
}

export interface Volume {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  volume_id: string;
  title: string;
  content: string;
  word_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  description: string;
  traits: Record<string, any>;
  relations: any[];
  created_at: string;
}

export interface AiHistory {
  id: string;
  user_id: string;
  project_id: string;
  chapter_id: string;
  prompt: string;
  generated_content: string;
  model_used: string;
  created_at: string;
}

export interface UserProfile {
  email: string;
  id: string;
  created_at?: string;
}
