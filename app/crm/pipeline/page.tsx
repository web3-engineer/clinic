"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreVertical, Calendar, Phone, X, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Patient = {
  id: string;
  name: string;
  phone: string;
  pipelineStatus: string;
  stageEnteredAt: string;
  healthPlan: string | null;
  appointments: { date: string; type: string; status: string }[];
  _count: { appointments: number };
};

const COLUMNS = [
  { id: "new", title: "Novos Contatos", color: "bg-blue-500" },
  { id: "quote", title: "Em Negociação", color: "bg-yellow-500" },
  { id: "scheduled", title: "Consulta Marcada", color: "bg-purple-500" },
  { id: "attended", title: "Atendido", color: "bg-green-500" },
  { id: "noshow", title: "Faltou", color: "bg-red-500" },
  { id: "returning", title: "Aguardando Retorno", color: "bg-orange-500" },
];

function avatarGradient(name: string) {
  const gradients = [
    "from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-green-400 to-green-600", "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600", "from-teal-400 to-teal-600",
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
}

function LeadCard({ patient, overlay = false }: { patient: Patient; overlay?: boolean }) {
  const lastAppt = patient.appointments[0];
  const initials = patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const daysInStage = Math.floor(
    (Date.now() - new Date(patient.stageEnteredAt).getTime()) / 86400000
  );

  return (
    <div className={`bg-white dark:bg-[#111] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm transition-all ${overlay ? "opacity-90 shadow-xl scale-105" : "hover:shadow-md hover:-translate-y-0.5"}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(patient.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-black dark:text-white text-sm truncate">{patient.name}</h4>
          <p className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />{patient.phone}
          </p>
        </div>
        {daysInStage > 0 && (
          <span className="text-[10px] font-medium bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {daysInStage}d
          </span>
        )}
      </div>

      {patient.healthPlan && (
        <p className="text-xs text-black/40 dark:text-white/40 mb-2">{patient.healthPlan}</p>
      )}
      {lastAppt && (
        <p className="text-xs text-black/50 dark:text-white/50 mb-3 truncate">
          Último: {lastAppt.type} ·{" "}
          {formatDistanceToNow(new Date(lastAppt.date), { addSuffix: true, locale: ptBR })}
        </p>
      )}

      <div className="flex gap-2 pt-3 border-t border-black/5 dark:border-white/5">
        <Link href={`/crm/patients/${patient.id}`} onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-black dark:text-white text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-all">
          <User className="h-3 w-3" />Prontuário
        </Link>
        <Link href={`/crm/whatsapp?patientId=${patient.id}`} onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all">
          <MessageCircle className="h-3 w-3" />WhatsApp
        </Link>
      </div>
    </div>
  );
}

function SortableCard({ patient }: { patient: Patient }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: patient.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <LeadCard patient={patient} />
    </div>
  );
}

export default function CRMPipeline() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", healthPlan: "", service: "Consulta Geral" });
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchPatients = useCallback(async () => {
    const res = await fetch("/api/patients");
    setPatients(await res.json());
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleDragStart = (event: DragStartEvent) => {
    const patient = patients.find((p) => p.id === event.active.id);
    setActivePatient(patient ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActivePatient(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    const patient = patients.find((p) => p.id === active.id);
    if (!patient) return;

    const newStatus = targetColumn?.id ?? patients.find((p) => p.id === overId)?.pipelineStatus ?? patient.pipelineStatus;
    if (newStatus === patient.pipelineStatus) return;

    setPatients((prev) =>
      prev.map((p) => p.id === patient.id ? { ...p, pipelineStatus: newStatus, stageEnteredAt: new Date().toISOString() } : p)
    );

    await fetch(`/api/patients/${patient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStatus: newStatus, stageEnteredAt: new Date().toISOString() }),
    });
    toast.success("Lead movido!");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("Lead adicionado!");
      setIsModalOpen(false);
      setForm({ name: "", phone: "", healthPlan: "", service: "Consulta Geral" });
      fetchPatients();
    } catch {
      toast.error("Erro ao criar lead");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full relative">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Gestão de Leads</h1>
          <p className="text-black/60 dark:text-white/60">Arraste os cards para mover entre etapas do funil</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95">
          <Plus className="h-4 w-4" />Adicionar Lead
        </button>
      </motion.div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]" style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {COLUMNS.map((column) => {
            const columnPatients = patients.filter((p) => p.pipelineStatus === column.id);
            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: COLUMNS.indexOf(column) * 0.05 }}
                id={column.id}
                className="flex-shrink-0 w-[300px] flex flex-col gap-3 rounded-3xl bg-white/30 dark:bg-[#0a0a0a]/30 p-4 backdrop-blur-xl border border-black/5 dark:border-white/5"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-black dark:text-white flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                    {column.title}
                    <span className="bg-black/8 dark:bg-white/10 text-black/60 dark:text-white/60 text-xs py-0.5 px-2 rounded-full">{columnPatients.length}</span>
                  </h3>
                  <button className="text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white"><MoreVertical className="h-4 w-4" /></button>
                </div>

                <SortableContext items={columnPatients.map((p) => p.id)} strategy={verticalListSortingStrategy} id={column.id}>
                  <div className="flex flex-col gap-3 flex-1 min-h-[100px]">
                    {columnPatients.map((patient) => (
                      <SortableCard key={patient.id} patient={patient} />
                    ))}
                    {column.id === "new" && (
                      <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/5 transition-all text-sm">
                        <Plus className="h-4 w-4" />Novo Lead
                      </button>
                    )}
                  </div>
                </SortableContext>
              </motion.div>
            );
          })}
        </div>

        <DragOverlay>
          {activePatient && <LeadCard patient={activePatient} overlay />}
        </DragOverlay>
      </DndContext>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl shadow-2xl p-6 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black dark:text-white">Novo Lead</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                {[
                  { key: "name", label: "Nome Completo", type: "text", required: true, placeholder: "Ex: Roberto Silva" },
                  { key: "phone", label: "WhatsApp", type: "tel", required: true, placeholder: "(11) 90000-0000" },
                  { key: "healthPlan", label: "Plano de Saúde", type: "text", required: false, placeholder: "Unimed, Particular..." },
                ].map(({ key, label, type, required, placeholder }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60">{label}</label>
                    <input type={type} required={required} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 outline-none text-black dark:text-white text-sm" />
                  </div>
                ))}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black/60 dark:text-white/60">Serviço de Interesse</label>
                  <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent outline-none text-black dark:text-white text-sm">
                    {["Consulta Geral", "Exame de Retina", "Cirurgia Refrativa", "Cirurgia de Catarata", "Lentes de Contato"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={isSaving} className="mt-2 w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                  {isSaving ? "Salvando..." : "Adicionar Lead"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
