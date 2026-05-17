export interface Note {
  id: string;
  title: string;
  content: string;
  content_text: string;
  color: string | null;
  pinned: number;
  created_at: number;
  updated_at: number;
  deleted_at: number;
  // Public sharing
  is_public?: number;    // 0 | 1
  public_slug?: string | null;
}

export type NoteColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange"
  | "gray"
  | null;

export const NOTE_COLORS: Record<string, string> = {
  yellow: "var(--color-note-yellow)",
  green: "var(--color-note-green)",
  blue: "var(--color-note-blue)",
  pink: "var(--color-note-pink)",
  purple: "var(--color-note-purple)",
  orange: "var(--color-note-orange)",
  gray: "var(--color-note-gray)",
};
