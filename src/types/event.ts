export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  all_day: number;
  color: string | null;
  recurrence: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number;
}

export type CalendarView = "month" | "week" | "day";

export const EVENT_COLORS = [
  "#007AFF",
  "#34C759",
  "#FF9500",
  "#FF3B30",
  "#AF52DE",
  "#5856D6",
  "#FF2D55",
  "#00C7BE",
];
