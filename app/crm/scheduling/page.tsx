"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User, Clock, Calendar, ChevronRight, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const FullCalendarWrapper = dynamic(
  () => import("@/components/crm/FullCalendarWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="w-8 h-8 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
      </div>
    ),
  }
);

type Doctor = { id: string; name: string; color: string };
type Patient = { id: string; name: string; phone: string };
type Appointment = {
  id: string; patientId: string; patient: Patient;
  doctorId: string | null; doctor: Doctor | null;
  date: string; duration: number; type: string; status: string; notes: string | null;
};

const SERVICE_TYPES = [
  "Consulta Geral", "Exame de Retina", "Cirurgia Refrativa",
  "Cirurgia de Catarata", "Mapeamento", "Lentes de Contato", "Pré-operatório", "Pós-operatório",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B", CONFIRMED: "#10B981", ATTENDED: "#3B82F6",
  NO_SHOW: "#EF4444", CANCELLED: "#6B7280",
};

const FALLBACK_DOCTORS: Doctor[] = [
  { id: "doc-1", name: "Dr. Rafael Melo", color: "#3B82F6" },
  { id: "doc-2", name: "Dra. Fernanda Costa", color: "#8B5CF6" },
];

export default function SchedulingPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>(FALLBACK_DOCTORS);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [form, setForm] = useState({ patientId: "", doctorId: "", type: "Consulta Geral", duration: 30, notes: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 864e5),
    end: new Date(Date.now() + 14 * 864e5),
  });

  const fetchAppointments = useCallback(async () => {
    const { start, end } = dateRange;
    const res = await fetch(`/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`);
    const data = await res.json();
    setAppointments(data);
  }, [dateRange]);

  useEffect(() => {
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const calendarEvents = appointments.map((a) => ({
    id: a.id,
    title: `${a.patient.name} · ${a.type}`,
    start: a.date,
    end: new Date(new Date(a.date).getTime() + a.duration * 60000).toISOString(),
    backgroundColor: a.doctor?.color ?? STATUS_COLORS[a.status] ?? "#3B82F6",
    borderColor: "transparent",
    extendedProps: a,
  }));

  const handleEventDrop = async (info: { event: { id: string; start: Date | null } }) => {
    if (!info.event.start) return;
    await fetch(`/api/appointments/${info.event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: info.event.start.toISOString() }),
    });
    toast.success("Consulta reagendada!");
    fetchAppointments();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !selectedSlot) return;
    setIsSaving(true);
    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: selectedSlot.toISOString(), doctorId: form.doctorId || null }),
      });
      toast.success("Consulta agendada!");
      setIsCreateOpen(false);
      setForm({ patientId: "", doctorId: "", type: "Consulta Geral", duration: 30, notes: "" });
      fetchAppointments();
    } catch {
      toast.error("Erro ao agendar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success("Status atualizado!");
    setSelectedEvent(null);
    fetchAppointments();
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Agendamentos</h1>
          <p className="text-black/60 dark:text-white/60">Clique em um horário para agendar · Arraste para reagendar</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-2">
            {doctors.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 dark:bg-[#0a0a0a]/50 border border-black/5 dark:border-white/5 text-xs font-medium text-black dark:text-white">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name.split(" ").slice(0, 2).join(" ")}
              </div>
            ))}
          </div>
          <button onClick={() => { setSelectedSlot(new Date()); setIsCreateOpen(true); }} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" />Nova Consulta
          </button>
        </div>
      </motion.div>

      <div className="flex-1 rounded-3xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl p-2 md:p-4 min-h-[600px]">
        <FullCalendarWrapper
          events={calendarEvents}
          onEventDrop={handleEventDrop}
          onEventClick={(info) => setSelectedEvent(info.event.extendedProps as Appointment)}
          onDateSelect={(info) => { setSelectedSlot(info.start); setIsCreateOpen(true); }}
          onDatesSet={(range) => setDateRange({ start: range.start, end: range.end })}
        />
      </div>

      {/* Event SlideOver */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEvent(null)} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white dark:bg-[#0a0a0a] border-l border-black/5 dark:border-white/5 p-6 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-black dark:text-white">Detalhes</h3>
                <button onClick={() => setSelectedEvent(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X className="h-4 w-4 text-black/60 dark:text-white/60" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">{selectedEvent.patient.name.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-black dark:text-white">{selectedEvent.patient.name}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">{selectedEvent.patient.phone}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-black/60 dark:text-white/60"><Calendar className="h-4 w-4" />{format(new Date(selectedEvent.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p className="flex items-center gap-2 text-black/60 dark:text-white/60"><Clock className="h-4 w-4" />{selectedEvent.duration} min · {selectedEvent.type}</p>
                  {selectedEvent.doctor && <p className="flex items-center gap-2 text-black/60 dark:text-white/60"><User className="h-4 w-4" />{selectedEvent.doctor.name}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED"].map((s) => (
                    <button key={s} onClick={() => handleStatusUpdate(selectedEvent.id, s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedEvent.status === s ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10"}`}>
                      {s === "CONFIRMED" ? "Confirmar" : s === "ATTENDED" ? "Atendido" : s === "NO_SHOW" ? "Faltou" : "Cancelar"}
                    </button>
                  ))}
                </div>
                <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                  <a href={`/crm/patients/${selectedEvent.patientId}`} className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-sm font-medium text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-all">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" />Ver Prontuário</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </a>
                  <a href={`/crm/whatsapp?patientId=${selectedEvent.patientId}`} className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-green-500/10 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-all">
                    <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl shadow-2xl p-6 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black dark:text-white">Nova Consulta</h2>
                <button onClick={() => setIsCreateOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60"><X className="h-5 w-5" /></button>
              </div>
              {selectedSlot && (
                <p className="text-sm text-black/60 dark:text-white/60 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />{format(selectedSlot, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">Paciente *</label>
                  <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white text-sm">
                    <option value="">Selecione...</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60">Médico</label>
                    <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                      <option value="">Qualquer</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>{d.name.split(" ").slice(0, 2).join(" ")}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60">Duração</label>
                    <select value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })} className="w-full px-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                      {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={isSaving} className="mt-2 w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                  {isSaving ? "Agendando..." : "Confirmar Agendamento"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
