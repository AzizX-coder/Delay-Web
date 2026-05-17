import { create } from "zustand";
import { db, generateId, now } from "@/lib/database";
import type { CalendarEvent, CalendarView } from "@/types/event";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";

interface CalendarState {
  events: CalendarEvent[];
  currentDate: Date;
  view: CalendarView;
  loading: boolean;
  loadEvents: () => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, "id" | "created_at" | "updated_at" | "deleted_at">) => Promise<string>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setView: (view: CalendarView) => void;
  navigate: (direction: "prev" | "next" | "today") => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  currentDate: new Date(),
  view: "month",
  loading: true,

  loadEvents: async () => {
    try {
      const events = await db.events.where("deleted_at").equals(0).sortBy("start_time");
      set({ events, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createEvent: async (eventData) => {
    const id = generateId();
    const timestamp = now();
    const event: CalendarEvent = {
      ...eventData,
      id,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: 0,
    };

    set((state) => ({ events: [...state.events, event] }));
    try {
      await db.events.add(event);
    } catch {
      set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    }
    return id;
  },

  updateEvent: async (id, data) => {
    const timestamp = now();
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, ...data, updated_at: timestamp } : e
      ),
    }));
    try {
      await db.events.update(id, { ...data, updated_at: timestamp });
    } catch {
      // silent
    }
  },

  deleteEvent: async (id) => {
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    try {
      await db.events.update(id, { deleted_at: now() });
    } catch {
      // silent
    }
  },

  setView: (view) => set({ view }),

  navigate: (direction) => {
    const { currentDate, view } = get();
    let newDate: Date;

    if (direction === "today") {
      newDate = new Date();
    } else if (view === "month") {
      newDate = direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    } else if (view === "week") {
      newDate = direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    } else {
      newDate = direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1);
    }

    set({ currentDate: newDate });
  },

  getEventsForDate: (date: Date) => {
    const { events } = get();
    const dayStart = Math.floor(new Date(date).setHours(0, 0, 0, 0) / 1000);
    const dayEnd = dayStart + 86400;
    return events.filter((e) => e.start_time < dayEnd && e.end_time > dayStart);
  },
}));
