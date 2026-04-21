export type SearchEntityType = "course" | "user" | "group";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  relevance_score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  q: string;
  types?: SearchEntityType[];
  limit?: number;
  cursor?: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  next_cursor: string | null;
  total_by_type?: Record<string, number>;
}

export const SEARCH_ENTITY_LABELS: Record<
  SearchEntityType,
  { ru: string; en: string }
> = {
  course: { ru: "Курсы", en: "Courses" },
  user: { ru: "Пользователи", en: "Users" },
  group: { ru: "Группы", en: "Groups" },
};
