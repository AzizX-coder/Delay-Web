import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCalendarStore } from "@/stores/calendarStore";
import { useTasksStore } from "@/stores/tasksStore";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  CalendarCheck,
  Bell,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
  addHours,
} from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EVENT_COLORS, type CalendarView, type CalendarEvent } from "@/types/event";

const EVENT_TYPES = [
  { value: "event", label: "Event", icon: <CalendarCheck size={14} /> },
  { value: "task", label: "Task", icon: <Clock size={14} /> },
  { value: "reminder", label: "Reminder", icon: <Bell size={14} /> },
] as const;

export function CalendarPage() {
  const {
    events,
    currentDate,
    view,
    loadEvents,
    createEvent,
    deleteEvent,
    setView,
    navigate,
    getEventsForDate,
  } = useCalendarStore();

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventColor, setEventColor] = useState(EVENT_COLORS[0]);
  const [eventAllDay, setEventAllDay] = useState(true);
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventType, setEventType] = useState<string>("event");
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [detailDate, setDetailDate] = useState<Date | null>(null);

  const { loadTasks, tasks, toggleTask, deleteTask: deleteTaskFromStore } = useTasksStore();

  useEffect(() => {
    loadEvents();
    loadTasks();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDayClick = (day: Date) => {
    setDetailDate(day);
    setShowDayDetail(true);
  };

  const openCreateModal = (day: Date) => {
    setSelectedDate(day);
    setShowEventModal(true);
    setEventTitle("");
    setEventColor(EVENT_COLORS[0]);
    setEventAllDay(true);
    setEventType("event");
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !selectedDate) return;

    let startTime: number;
    let endTime: number;

    if (eventAllDay) {
      startTime = Math.floor(selectedDate.setHours(0, 0, 0, 0) / 1000);
      endTime = startTime + 86400;
    } else {
      const [sh, sm] = eventStartTime.split(":").map(Number);
      const [eh, em] = eventEndTime.split(":").map(Number);
      startTime = Math.floor(
        setMinutes(setHours(selectedDate, sh), sm).getTime() / 1000
      );
      endTime = Math.floor(
        setMinutes(setHours(selectedDate, eh), em).getTime() / 1000
      );
    }

    if (eventType === "task") {
      useTasksStore.getState().createTask(eventTitle.trim()).then(id => {
        useTasksStore.getState().updateTask(id, { due_date: startTime });
      });
    } else {
      createEvent({
        title: eventTitle.trim(),
        description: "",
        start_time: startTime,
        end_time: endTime,
        all_day: eventAllDay ? 1 : 0,
        color: eventColor,
        recurrence: null,
      });
    }

    setShowEventModal(false);
  };

  const viewButtons: { view: CalendarView; label: string }[] = [
    { view: "month", label: "Month" },
    { view: "week", label: "Week" },
    { view: "day", label: "Day" },
  ];

  const detailEvents = detailDate ? getEventsForDate(detailDate) : [];
  const dayTasks = detailDate
    ? tasks.filter((t) => !t.completed && t.due_date && isSameDay(t.due_date * 1000, detailDate))
    : [];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="text-[22px] font-bold text-text-primary">
            {view === "day"
              ? format(currentDate, "EEEE, MMMM d")
              : view === "week"
              ? `Week of ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h1>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("prev")}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("today")}
            >
              Today
            </Button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("next")}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-0.5 bg-bg-secondary rounded-lg p-0.5 border border-border-light">
            {viewButtons.map((vb) => (
              <button
                key={vb.view}
                onClick={() => setView(vb.view)}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer
                  ${
                    view === vb.view
                      ? "bg-bg-primary text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                {vb.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar views */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "month" && (
          <div className="flex-1 overflow-x-auto no-scrollbar pb-2">
            <div className="min-w-[700px] h-full flex flex-col">
              <MonthView
                days={days}
                currentDate={currentDate}
                getEventsForDate={getEventsForDate}
                onDayClick={handleDayClick}
              />
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="flex-1 overflow-x-auto no-scrollbar pb-2">
            <div className="min-w-[700px] h-full flex flex-col">
              <WeekView
                weekDays={weekDays}
                hours={hours}
                getEventsForDate={getEventsForDate}
                onDayClick={handleDayClick}
              />
            </div>
          </div>
        )}

        {view === "day" && (
          <DayView
            currentDate={currentDate}
            hours={hours}
            getEventsForDate={getEventsForDate}
            onHourClick={(hour) => {
              setSelectedDate(setHours(currentDate, hour));
              setEventAllDay(false);
              setEventStartTime(`${String(hour).padStart(2, "0")}:00`);
              setEventEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
              setShowEventModal(true);
              setEventTitle("");
              setEventColor(EVENT_COLORS[0]);
              setEventType("event");
            }}
          />
        )}
      </div>

      {/* Day detail slide-over */}
      <AnimatePresence>
        {showDayDetail && detailDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex justify-end"
            onClick={() => setShowDayDetail(false)}
          >
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="w-full max-w-[320px] h-full bg-bg-elevated border-l border-border-light shadow-lg p-5 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold text-text-primary">
                  {format(detailDate, "EEEE, MMM d")}
                </h3>
                <button
                  onClick={() => setShowDayDetail(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md
                    text-text-tertiary hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <button
                onClick={() => {
                  setShowDayDetail(false);
                  openCreateModal(detailDate);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl
                  bg-accent/10 text-accent text-[13px] font-medium
                  hover:bg-accent/15 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add event
              </button>

              {detailEvents.length === 0 && dayTasks.length === 0 ? (
                <p className="text-[13px] text-text-tertiary text-center py-8">
                  No activities for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {[...detailEvents.map(e => ({ ...e, type: 'event' })), ...dayTasks.map(t => ({ ...t, type: 'task', color: '#10B981' }))].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-light"
                    >
                      <div className="shrink-0 mt-1">
                        {item.type === 'task' ? <CheckCircle2 size={14} className="text-success" /> : (
                          <div
                            className="w-3 h-3 rounded-full"
                             style={{ backgroundColor: item.color || EVENT_COLORS[0] }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${item.type === 'task' ? 'text-success' : 'text-text-primary'}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-text-tertiary">
                          {item.type === 'task' ? "Task" : ((item as any).all_day
                            ? "All day"
                            : `${format((item as any).start_time * 1000, "h:mm a")} – ${format((item as any).end_time * 1000, "h:mm a")}`)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (item.type === 'task') deleteTaskFromStore(item.id);
                          else deleteEvent(item.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md shrink-0
                          text-text-tertiary hover:text-danger hover:bg-danger/10
                          transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event creation modal */}
      <Modal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        title={
          selectedDate
            ? `New Event — ${format(selectedDate, "MMM d, yyyy")}`
            : "New Event"
        }
      >
        <div className="space-y-4">
          <Input
            label="Event title"
            placeholder="Meeting, Lunch, Workout..."
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
            autoFocus
          />

          {/* Event type */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              Type
            </label>
            <div className="flex gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setEventType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium
                    transition-all cursor-pointer border
                    ${
                      eventType === t.value
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-bg-secondary text-text-secondary border-border-light hover:bg-bg-hover"
                    }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={eventAllDay}
              onChange={(e) => setEventAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-accent"
            />
            <span className="text-[13px] text-text-secondary">All day</span>
          </label>

          {/* Time pickers */}
          {!eventAllDay && (
            <div className="flex gap-3">
              <Input
                label="Start"
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
              />
              <Input
                label="End"
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
              />
            </div>
          )}

          {/* Color picker */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEventColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer
                    ${eventColor === color ? "scale-110 ring-2 ring-offset-2 ring-accent" : "hover:scale-105"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowEventModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>Create Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════ Month View ═══════════════ */
function MonthView({
  days,
  currentDate,
  getEventsForDate,
  onDayClick,
}: {
  days: Date[];
  currentDate: Date;
  getEventsForDate: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-medium text-text-tertiary uppercase tracking-wider py-2"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 gap-px bg-border-light rounded-[--radius-lg] overflow-hidden border border-border-light">
        {days.map((day, i) => {
          const dayEvents = getEventsForDate(day);
          const dayTasks = useTasksStore.getState().tasks.filter(t => !t.completed && t.due_date && isSameDay(t.due_date * 1000, day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <motion.div
              key={i}
              whileHover={{ backgroundColor: "var(--color-bg-hover)" }}
              onClick={() => onDayClick(day)}
              className={`min-h-[90px] p-1.5 cursor-pointer transition-colors
                bg-bg-primary
                ${!isCurrentMonth ? "opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[12px] w-6 h-6 flex items-center justify-center rounded-full
                    ${
                      today
                        ? "bg-accent text-white font-semibold"
                        : "text-text-secondary font-medium"
                    }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5">
                {[...dayEvents.map(e => ({ ...e, type: 'event' })), ...dayTasks.map(t => ({ ...t, type: 'task', color: '#10B981' }))].slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate 
                      ${item.type === 'task' ? 'border border-success/30 bg-success/10 text-success' : 'text-white'}`}
                    style={item.type === 'event' ? { backgroundColor: item.color || EVENT_COLORS[0] } : {}}
                  >
                    {item.type === 'task' && "✓ "}{item.title}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

/* ═══════════════ Week View ═══════════════ */
function WeekView({
  weekDays,
  hours,
  getEventsForDate,
  onDayClick,
}: {
  weekDays: Date[];
  hours: number[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden border border-border-light rounded-[--radius-lg]">
      {/* Header row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border-light bg-bg-secondary/50">
        <div className="p-2" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center py-3 text-[12px] font-medium cursor-pointer hover:bg-bg-hover transition-colors
              ${isToday(day) ? "text-accent" : "text-text-secondary"}`}
            onClick={() => onDayClick(day)}
          >
            <div className="text-[10px] uppercase tracking-wider">
              {format(day, "EEE")}
            </div>
            <div className={`text-[16px] font-semibold mt-0.5 ${isToday(day) ? "bg-accent text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto" : ""}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Hour grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="text-[10px] text-text-tertiary text-right pr-2 py-3 border-b border-border-light">
                {format(setHours(new Date(), hour), "h a")}
              </div>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const hourEvents = dayEvents.filter((e) => {
                  const eventHour = new Date(e.start_time * 1000).getHours();
                  return eventHour === hour && !e.all_day;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="border-b border-l border-border-light min-h-[48px] p-0.5 hover:bg-bg-hover/50 transition-colors cursor-pointer"
                    onClick={() => onDayClick(day)}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate text-white mb-0.5"
                        style={{ backgroundColor: event.color || EVENT_COLORS[0] }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Day View ═══════════════ */
function DayView({
  currentDate,
  hours,
  getEventsForDate,
  onHourClick,
}: {
  currentDate: Date;
  hours: number[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  onHourClick: (hour: number) => void;
}) {
  const dayEvents = getEventsForDate(currentDate);
  const allDayEvents = dayEvents.filter((e) => e.all_day);

  return (
    <div className="flex-1 flex flex-col overflow-hidden border border-border-light rounded-[--radius-lg]">
      {/* All day events */}
      {allDayEvents.length > 0 && (
        <div className="p-2 border-b border-border-light bg-bg-secondary/30">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">All Day</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-white"
                style={{ backgroundColor: event.color || EVENT_COLORS[0] }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hour slots */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((e) => {
            const eventHour = new Date(e.start_time * 1000).getHours();
            return eventHour === hour && !e.all_day;
          });

          return (
            <div
              key={hour}
              className="flex border-b border-border-light min-h-[56px] hover:bg-bg-hover/50 transition-colors cursor-pointer"
              onClick={() => onHourClick(hour)}
            >
              <div className="w-16 text-[11px] text-text-tertiary text-right pr-3 py-3 shrink-0">
                {format(setHours(new Date(), hour), "h a")}
              </div>
              <div className="flex-1 border-l border-border-light p-1">
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-2 py-1 rounded-md text-[12px] font-medium text-white mb-0.5"
                    style={{ backgroundColor: event.color || EVENT_COLORS[0] }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
