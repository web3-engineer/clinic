"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventClickArg, EventDropArg, DateSelectArg, DatesSetArg } from "@fullcalendar/core";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: Record<string, unknown>;
};

type Props = {
  events: CalendarEvent[];
  onEventDrop: (info: EventDropArg) => void;
  onEventClick: (info: EventClickArg) => void;
  onDateSelect: (info: DateSelectArg) => void;
  onDatesSet: (range: DatesSetArg) => void;
};

export default function FullCalendarWrapper({
  events,
  onEventDrop,
  onEventClick,
  onDateSelect,
  onDatesSet,
}: Props) {
  return (
    <>
      <style>{`
        .fc { --fc-border-color: rgba(0,0,0,0.05); --fc-today-bg-color: rgba(59,130,246,0.05); }
        .dark .fc { --fc-border-color: rgba(255,255,255,0.05); --fc-today-bg-color: rgba(59,130,246,0.08); }
        .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; }
        .fc .fc-button { background: transparent; border: 1px solid rgba(0,0,0,0.1); color: inherit; border-radius: 10px; font-size: 0.75rem; font-weight: 600; padding: 6px 12px; }
        .fc .fc-button:hover { background: rgba(0,0,0,0.05); }
        .fc .fc-button-primary:not(.fc-button-active) { background: transparent; border-color: rgba(0,0,0,0.1); }
        .fc .fc-button-primary.fc-button-active { background: #000; color: #fff; border-color: #000; }
        .dark .fc .fc-button { border-color: rgba(255,255,255,0.1); color: #fff; }
        .dark .fc .fc-button:hover { background: rgba(255,255,255,0.05); }
        .dark .fc .fc-button-primary.fc-button-active { background: #fff; color: #000; }
        .fc-event { border-radius: 8px; font-size: 0.72rem; padding: 2px 4px; cursor: pointer; }
        .fc-event:hover { opacity: 0.85; }
        .fc-daygrid-event { border-radius: 6px; }
        .fc-col-header-cell-cushion, .fc-daygrid-day-number, .fc-timegrid-slot-label { color: inherit; opacity: 0.7; font-size: 0.75rem; }
        .fc-scrollgrid { border-radius: 16px; overflow: hidden; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: var(--fc-border-color); }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        locale={ptBrLocale}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        events={events}
        editable
        selectable
        selectMirror
        dayMaxEvents
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        eventDrop={onEventDrop}
        eventClick={onEventClick}
        select={onDateSelect}
        datesSet={onDatesSet}
        height="auto"
        nowIndicator
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
      />
    </>
  );
}
